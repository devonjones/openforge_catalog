"""
Incremental fixtures loading for OpenForge database.

This module provides functionality for incremental loading of fixture data,
comparing with existing database records and only updating what has changed.
"""

import sys
from typing import Dict, List, Set, Optional, Tuple
from datetime import datetime
from psycopg import connection, cursor
from psycopg.rows import dict_row

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
import openforge.db.sql.images as image_sql
from openforge.db.sql.tag_utils import array_to_tag
from openforge.data.transformers import DeprecatedEntryTransformer
from .utils import munge_blueprint, get_words


def _parse_timestamp(timestamp) -> Optional[datetime]:
    """Parse timestamp into datetime object, handling various formats.
    
    Args:
        timestamp: Timestamp as string, datetime object, or other format
        
    Returns:
        datetime object if parsing successful, None otherwise
    """
    if timestamp is None:
        return None
        
    # If already a datetime object, return it
    if isinstance(timestamp, datetime):
        return timestamp
        
    # Convert to string for parsing
    timestamp_str = str(timestamp)
    
    try:
        # Try parsing as ISO format first
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except ValueError:
        try:
            # Try parsing with space separator (common format)
            return datetime.fromisoformat(timestamp_str.replace(' ', 'T'))
        except ValueError:
            # If all parsing fails, return None
            return None


class ComparisonResult:
    """Result of comparing fixture data with existing database records."""
    
    def __init__(self):
        self.added = []      # New blueprints
        self.modified = []   # Updated blueprints  
        self.deprecated = [] # Deprecated blueprints
        self.consolidated = [] # Path consolidation updates
        self.errors = []     # Processing errors
        
    def has_changes(self) -> bool:
        """Check if there are any changes to apply."""
        return bool(self.added or self.modified or self.deprecated or self.consolidated)
        
    def summary(self) -> str:
        """Get a summary of changes."""
        parts = []
        if self.added:
            parts.append(f"{len(self.added)} added")
        if self.modified:
            parts.append(f"{len(self.modified)} modified")
        if self.deprecated:
            parts.append(f"{len(self.deprecated)} deprecated")
        if self.consolidated:
            parts.append(f"{len(self.consolidated)} consolidated")
        if self.errors:
            parts.append(f"{len(self.errors)} errors")
            
        return ", ".join(parts) if parts else "no changes"


class IncrementalFixturesLoader:
    """Handles incremental loading of fixture data."""
    
    def __init__(self, conn: connection, verbose: bool = False):
        """Initialize incremental fixtures loader.
        
        Args:
            conn: Database connection
            verbose: Whether to output debug messages
        """
        self.conn = conn
        self.verbose = verbose
        self.existing_blueprints = self._load_existing_blueprints()
        self.transformer = DeprecatedEntryTransformer()
        
    def _load_existing_blueprints(self) -> Dict[str, Dict]:
        """Load existing blueprints from database for comparison.
        
        Returns:
            Dictionary mapping full_name to blueprint data with tags and images loaded
        """
        with self.conn.cursor(row_factory=dict_row) as curs:
            blueprints = blueprint_sql.get_non_deprecated_blueprints(curs)
            
        # Get all blueprint IDs for batch loading
        blueprint_ids = [bp["id"] for bp in blueprints]
        
        # Batch load all tags and images
        with self.conn.cursor(row_factory=dict_row) as curs:
            all_tags = tag_sql.get_tags_for_blueprints(curs, blueprint_ids)
            all_images = image_sql.get_images_for_blueprints(curs, blueprint_ids)
        
        # Group tags by blueprint_id
        tags_by_blueprint = {}
        for tag in all_tags:
            bp_id = tag["blueprint_id"]
            if bp_id not in tags_by_blueprint:
                tags_by_blueprint[bp_id] = []
            tags_by_blueprint[bp_id].append(tag["tag"])
        
        # Group images by blueprint_id
        images_by_blueprint = {}
        for image in all_images:
            bp_id = image["blueprint_id"]
            if bp_id not in images_by_blueprint:
                images_by_blueprint[bp_id] = []
            # Remove blueprint_id from image dict to match expected format
            image_copy = {k: v for k, v in image.items() if k != "blueprint_id"}
            images_by_blueprint[bp_id].append(image_copy)
        
        # Create final mapping
        blueprint_map = {}
        for bp in blueprints:
            full_name = bp.get("full_name")
            if full_name:
                bp["tags"] = tags_by_blueprint.get(bp["id"], [])
                bp["images"] = images_by_blueprint.get(bp["id"], [])
                blueprint_map[full_name] = bp
                
        if self.verbose:
            sys.stderr.write(f"Loaded {len(blueprint_map)} existing blueprints with tags and images\n")
            
        return blueprint_map
        
    def compare_fixture_data(self, fixture_data: List[Dict]) -> ComparisonResult:
        """Compare fixture data with existing database records.
        
        Args:
            fixture_data: List of blueprint fixture objects
            
        Returns:
            ComparisonResult with changes detected
        """
        result = ComparisonResult()
        
        for fixture_item in fixture_data:
            self._compare_single_item(fixture_item, result)
                    
        return result
        
    def _compare_single_item(self, fixture_item: Dict, result: ComparisonResult):
        """Compare a single fixture item with existing data."""
        if "file_metadata" not in fixture_item:
            # Skip items without file_metadata (tag descriptions, etc.)
            return
            
        full_name = fixture_item["file_metadata"]["full_name"]
        md5 = fixture_item["file_metadata"]["md5"]
        
        existing_bp = self.existing_blueprints.get(full_name)
        
        if existing_bp is None:
            # New file
            result.added.append(fixture_item)
            if self.verbose:
                sys.stderr.write(f"ADDED: {full_name}\n")
        else:
            # Existing file - check for changes
            if self._has_significant_changes(fixture_item, existing_bp):
                if md5 != existing_bp["file_md5"]:
                    # MD5 changed - this is a version change
                    result.deprecated.append(existing_bp)
                    result.added.append(fixture_item)
                    if self.verbose:
                        sys.stderr.write(f"VERSION CHANGE: {full_name} ({existing_bp['file_md5']} -> {md5})\n")
                else:
                    # Other changes (tags, config, etc.)
                    result.modified.append(fixture_item)
                    if self.verbose:
                        sys.stderr.write(f"MODIFIED: {full_name}\n")
                        
    def _has_significant_changes(self, fixture_item: Dict, existing_bp: Dict) -> bool:
        """Check if fixture item has significant changes compared to existing blueprint."""
        full_name = fixture_item["file_metadata"]["full_name"]
        
        # Check MD5
        if fixture_item["file_metadata"]["md5"] != existing_bp["file_md5"]:
            if self.verbose:
                sys.stderr.write(f"DEBUG: MD5 changed for {full_name}: {existing_bp['file_md5']} -> {fixture_item['file_metadata']['md5']}\n")
            return True
            
        # Check modification time using robust datetime comparison
        existing_modified = existing_bp["file_modified_at"]
        new_modified = fixture_item["file_metadata"]["file_modified_at"]
        
        if existing_modified and new_modified:
            # Parse both timestamps into datetime objects
            existing_dt = _parse_timestamp(existing_modified)
            new_dt = _parse_timestamp(new_modified)
            
            # Compare datetime objects if both parsed successfully
            if existing_dt is not None and new_dt is not None:
                if existing_dt != new_dt:
                    if self.verbose:
                        sys.stderr.write(f"DEBUG: Modified time changed for {full_name}: {existing_bp['file_modified_at']} -> {fixture_item['file_metadata']['file_modified_at']}\n")
                    return True
            else:
                # Fallback to string comparison if parsing failed
                existing_str = str(existing_modified)
                new_str = str(new_modified)
                if existing_str != new_str:
                    if self.verbose:
                        sys.stderr.write(f"DEBUG: Modified time changed for {full_name}: {existing_bp['file_modified_at']} -> {fixture_item['file_metadata']['file_modified_at']}\n")
                    return True
            
        # Check size
        if fixture_item["file_metadata"]["size"] != existing_bp["file_size"]:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Size changed for {full_name}: {existing_bp['file_size']} -> {fixture_item['file_metadata']['size']}\n")
            return True
            
        # Check tags (compare as sets to handle unordered nature)
        # existing_bp tags are arrays from database, fixture_item tags are pipe-delimited strings
        existing_tags = set(tuple(tag) for tag in existing_bp.get("tags", []))
        new_tags = set(tuple(tag.split('|')) for tag in fixture_item.get("tags", []))
        if existing_tags != new_tags:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Tags changed for {full_name}\n")
                sys.stderr.write(f"  Existing: {sorted(existing_tags)}\n")
                sys.stderr.write(f"  New: {sorted(new_tags)}\n")
            return True
            
        # Check images (compare as sets to handle unordered nature)
        existing_images = set((img["image_name"], img["image_url"]) for img in existing_bp.get("images", []))
        new_images = set((img["image_name"], img["image_url"]) for img in fixture_item.get("images", []))
        if existing_images != new_images:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Images changed for {full_name}\n")
                sys.stderr.write(f"  Existing: {sorted(existing_images)}\n")
                sys.stderr.write(f"  New: {sorted(new_images)}\n")
            return True
            
        # Check config
        existing_config = existing_bp.get("blueprint_config", {})
        new_config = fixture_item.get("config", {})
        if existing_config != new_config:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Config changed for {full_name}\n")
                sys.stderr.write(f"  Existing: {existing_config}\n")
                sys.stderr.write(f"  New: {new_config}\n")
            return True
            
        return False
        
    def apply_incremental_changes(self, changes: ComparisonResult, dry_run: bool = False):
        """Apply incremental changes to database.
        
        Args:
            changes: ComparisonResult with changes to apply
            dry_run: If True, don't actually apply changes
        """
        if dry_run:
            if self.verbose:
                sys.stderr.write(f"DRY RUN: Would apply {changes.summary()}\n")
            return
            
        with self.conn.cursor(row_factory=dict_row) as curs:
            # Process deprecations first
            for deprecated_bp in changes.deprecated:
                self._handle_deprecation(curs, deprecated_bp)
                
            # Process additions
            for new_item in changes.added:
                self._handle_addition(curs, new_item)
                
            # Process modifications
            for modified_item in changes.modified:
                self._handle_modification(curs, modified_item)
                
            # Process consolidations
            for consolidated_item in changes.consolidated:
                self._handle_consolidation(curs, consolidated_item)
                
        if self.verbose:
            sys.stderr.write(f"Applied {changes.summary()}\n")
            
    def _handle_deprecation(self, curs: cursor, deprecated_bp: Dict):
        """Handle deprecation of an existing blueprint."""
        blueprint_id = deprecated_bp["id"]
        
        # Remove tags and images for deprecated blueprint
        tag_sql.delete_all_blueprint_tags(curs, blueprint_id)
        image_sql.delete_images_for_blueprint(curs, blueprint_id)
        
        # Mark as deprecated
        blueprint_sql.mark_blueprint_deprecated(curs, blueprint_id)
        
        if self.verbose:
            sys.stderr.write(f"Deprecated blueprint {blueprint_id} and removed tags/images\n")
            
    def _handle_addition(self, curs: cursor, new_item: Dict):
        """Handle addition of a new blueprint."""
        # Convert fixture format to database format
        bp_data = self._munge_blueprint(new_item)
        
        # Insert new blueprint
        bp = blueprint_sql.insert_blueprint(
            curs, bp_data, rescue_md5_conflict=True, 
            words=self._get_words(new_item)
        )
        
        if bp:
            # Insert tags
            for tag in new_item.get("tags", []):
                tag_sql.insert_tag(curs, bp["id"], array_to_tag(tag))
                
            # Insert images
            for image in new_item.get("images", []):
                image_sql.insert_image_for_blueprint(curs, bp["id"], image)
                
        if self.verbose:
            sys.stderr.write(f"Added blueprint {bp['id'] if bp else 'skipped'}\n")
            
    def _handle_modification(self, curs: cursor, modified_item: Dict):
        """Handle modification of an existing blueprint."""
        full_name = modified_item["file_metadata"]["full_name"]
        existing_bp = self.existing_blueprints.get(full_name)
        
        if not existing_bp:
            # Shouldn't happen, but handle gracefully
            self._handle_addition(curs, modified_item)
            return
            
        blueprint_id = existing_bp["id"]
        
        # Update blueprint data
        bp_data = self._munge_blueprint(modified_item)
        blueprint_sql.update_blueprint(curs, blueprint_id, bp_data)
        
        # Update tags (delete old, insert new)
        tag_sql.delete_all_blueprint_tags(curs, blueprint_id)
        for tag in modified_item.get("tags", []):
            tag_sql.insert_tag(curs, blueprint_id, array_to_tag(tag))
            
        # Update images (delete old, insert new)
        image_sql.delete_images_for_blueprint(curs, blueprint_id)
        for image in modified_item.get("images", []):
            image_sql.insert_image_for_blueprint(curs, blueprint_id, image)
            
        if self.verbose:
            sys.stderr.write(f"Modified blueprint {blueprint_id}\n")
            
    def _handle_consolidation(self, curs: cursor, consolidated_item: Dict):
        """Handle path consolidation (file moved but same MD5)."""
        # This is a placeholder for future implementation
        # Path consolidation logic would go here
        if self.verbose:
            sys.stderr.write(f"Consolidation not yet implemented\n")
            
    def _munge_blueprint(self, data: dict) -> dict:
        """Convert fixture format to database format."""
        return munge_blueprint(data)
        
    def _get_words(self, data: dict) -> list[str]:
        """Extract search words from blueprint data."""
        return get_words(data)
        
    def create_deprecation_entry(self, blueprint_id: str, successor_id: str = None):
        """Mark blueprint as deprecated with optional successor."""
        with self.conn.cursor(row_factory=dict_row) as curs:
            return blueprint_sql.mark_blueprint_deprecated(curs, blueprint_id, successor_id)
            
 

    def transform_deprecated_entries(self, fixtures: List[Dict]) -> List[Dict]:
        """Transform deprecated entries to current schema format.
        
        This should be called before schema validation to ensure all
        deprecated entries conform to the current fixture format.
        
        Args:
            fixtures: List of fixture objects
            
        Returns:
            List of fixtures with deprecated entries transformed
        """
        return self.transformer.transform_list(fixtures) 