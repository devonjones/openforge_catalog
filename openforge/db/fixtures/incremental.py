"""
Incremental fixtures loading for OpenForge database.

This module provides functionality for incremental loading of fixture data,
comparing with existing database records and only updating what has changed.
"""

import sys
from typing import Dict, List, Set, Optional, Tuple
from datetime import datetime, timezone
from psycopg import connection, cursor
from psycopg.rows import dict_row

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
import openforge.db.sql.images as image_sql
from openforge.db.sql.tag_utils import array_to_tag, process_tag
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
        # Try parsing as ISO format first (handles timezone info)
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        # Normalize to UTC if timezone info is present
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        try:
            # Try parsing with space separator (common format without timezone)
            dt = datetime.fromisoformat(timestamp_str.replace(' ', 'T'))
            return dt
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
        self.version_changes = {}  # Map of deprecated blueprint ID to new fixture item
        
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
        self.transformer = DeprecatedEntryTransformer()
        
    def _load_existing_blueprints(self, curs: cursor = None) -> Dict[str, Dict]:
        """Load existing blueprints from database for comparison.
        
        Args:
            curs: Optional cursor to use (for transaction context)
            
        Returns:
            Dictionary mapping full_name to blueprint data with tags and images loaded
        """
        # Use provided cursor or create new one
        if curs is not None:
            blueprints = blueprint_sql.get_non_deprecated_blueprints(curs)
        else:
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
                # File-based blueprint - use full_name as key
                bp["tags"] = tags_by_blueprint.get(bp["id"], [])
                bp["images"] = images_by_blueprint.get(bp["id"], [])
                blueprint_map[full_name] = bp
            elif bp.get("blueprint_type") == "blueprint":
                # Configuration blueprint - use blueprint_name as key
                blueprint_name = bp.get("blueprint_name")
                if blueprint_name:
                    bp["tags"] = tags_by_blueprint.get(bp["id"], [])
                    bp["images"] = images_by_blueprint.get(bp["id"], [])
                    blueprint_map[blueprint_name] = bp
                
        if self.verbose:
            sys.stderr.write(f"Loaded {len(blueprint_map)} existing blueprints with tags and images\n")
            
        return blueprint_map
        
    def _find_deprecated_blueprint(self, full_name: str) -> Optional[Dict]:
        """Find a deprecated blueprint by full_name.
        
        Args:
            full_name: Full name of the blueprint to find
            
        Returns:
            Deprecated blueprint data if found, None otherwise
        """
        with self.conn.cursor(row_factory=dict_row) as curs:
            query = """
                SELECT id, blueprint_name, blueprint_type, config, file_md5, file_size,
                       file_name, full_name, file_modified_at, storage_address,
                       consolidated_paths, deprecated, successor_id,
                       created_at, updated_at
                FROM blueprints
                WHERE full_name = %s AND deprecated = true
                ORDER BY created_at DESC
                LIMIT 1
            """
            curs.execute(query, (full_name,))
            result = curs.fetchone()
            
            if result:
                # Load tags and images for the deprecated blueprint
                blueprint_id = result["id"]
                
                # Get tags
                tags = tag_sql.get_tags(curs, blueprint_id)
                result["tags"] = [tag["tag"] for tag in tags]
                
                # Get images
                images = image_sql.get_images_for_blueprint(curs, blueprint_id)
                result["images"] = list(images)
                
                return result
                
            return None
        
    def compare_fixture_data(self, fixture_data: List[Dict], curs: cursor = None, skip_load_existing: bool = False) -> ComparisonResult:
        """Compare fixture data with existing database records.
        
        Args:
            fixture_data: List of blueprint fixture objects
            curs: Optional cursor to use (for transaction context)
            skip_load_existing: If True, skip loading existing blueprints (for testing)
            
        Returns:
            ComparisonResult with changes detected
        """
        # Load existing blueprints within transaction context (unless skipped for testing)
        if skip_load_existing:
            # Use existing blueprints that were set up for testing
            existing_blueprints = self.existing_blueprints
        elif curs is not None:
            existing_blueprints = self._load_existing_blueprints(curs)
        else:
            # Fallback for standalone usage
            existing_blueprints = self._load_existing_blueprints()
        
        result = ComparisonResult()
        
        for fixture_item in fixture_data:
            self._compare_single_item(fixture_item, result, existing_blueprints)
                    
        return result
        
    def _compare_single_item(self, fixture_item: Dict, result: ComparisonResult, existing_blueprints: Dict[str, Dict]):
        """Compare a single fixture item with existing data."""
        # Handle non-file-based blueprints (type "blueprint") that don't have file_metadata
        if "file_metadata" not in fixture_item:
            # For non-file-based blueprints, use the name as the identifier
            blueprint_name = fixture_item.get("name")
            if not blueprint_name:
                if self.verbose:
                    sys.stderr.write(f"DEBUG: Skipping blueprint without name or file_metadata\n")
                return
                
            # Check if this configuration blueprint already exists
            existing_bp = existing_blueprints.get(blueprint_name)
            
            if existing_bp is None:
                # New configuration blueprint
                result.added.append(fixture_item)
                if self.verbose:
                    sys.stderr.write(f"ADDED CONFIG: {blueprint_name}\n")
            else:
                # Check if configuration blueprint has changes
                if self._has_config_changes(fixture_item, existing_bp):
                    result.modified.append(fixture_item)
                    if self.verbose:
                        sys.stderr.write(f"MODIFIED CONFIG: {blueprint_name}\n")
            return
            
        # Handle file-based blueprints (type "model") with file_metadata
        full_name = fixture_item["file_metadata"]["full_name"]
        md5 = fixture_item["file_metadata"]["md5"]
        
        existing_bp = existing_blueprints.get(full_name)
        
        if existing_bp is None:
            # Check if this file is already in consolidated_paths of any existing blueprint
            already_consolidated = False
            for bp in existing_blueprints.values():
                consolidated_paths = bp.get("consolidated_paths", [])
                if full_name in consolidated_paths:
                    already_consolidated = True
                    if self.verbose:
                        sys.stderr.write(f"DEBUG: Skipping {full_name} - already in consolidated_paths of {bp['full_name']}\n")
                    break
            
            if not already_consolidated:
                # New file
                result.added.append(fixture_item)
                # Always show what was added
                sys.stderr.write(f"ADDED: {full_name}\n")
        else:
            # Existing file - check for changes
            # First check if MD5 is different - if so, this is a new version, not a modification
            if md5 != existing_bp["file_md5"]:
                # Different MD5 means this is a new version, not a modification
                # Add it as a new blueprint and let post-processing handle the linking
                result.added.append(fixture_item)
                if self.verbose:
                    sys.stderr.write(f"ADDED (new version): {full_name} (MD5: {existing_bp['file_md5']} -> {md5})\n")
            elif self._has_significant_changes(fixture_item, existing_bp):
                # Same MD5 but other changes (tags, config, etc.)
                result.modified.append(fixture_item)
                if self.verbose:
                    sys.stderr.write(f"MODIFIED: {full_name}\n")
                        
    def _has_config_changes(self, fixture_item: Dict, existing_bp: Dict) -> bool:
        """Check if configuration blueprint has changes compared to existing blueprint.
        
        Args:
            fixture_item: New fixture item
            existing_bp: Existing blueprint from database
            
        Returns:
            True if configuration has changed
        """
        blueprint_name = fixture_item.get("name", "")
        
        # Check tags (compare as sets to handle unordered nature)
        existing_tags = set(existing_bp.get("tags", []))
        new_tags = set(fixture_item.get("tags", []))
        if existing_tags != new_tags:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Tags changed for config blueprint {blueprint_name}\n")
                sys.stderr.write(f"  Existing: {sorted(existing_tags)}\n")
                sys.stderr.write(f"  New: {sorted(new_tags)}\n")
            return True
            
        # Check config
        existing_config = existing_bp.get("blueprint_config", {})
        new_config = fixture_item.get("config", {})
        if existing_config != new_config:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Config changed for config blueprint {blueprint_name}\n")
                sys.stderr.write(f"  Existing: {existing_config}\n")
                sys.stderr.write(f"  New: {new_config}\n")
            return True
            
        return False
        
    def _has_significant_changes(self, fixture_item: Dict, existing_bp: Dict) -> bool:
        """Check if fixture item has significant changes compared to existing blueprint."""
        full_name = fixture_item["file_metadata"]["full_name"]
        
        # Note: MD5 changes are not checked here anymore since they're handled
        # by the post-processing linking approach in _link_deprecated_to_successors
            
        # Check modification time using robust datetime comparison
        existing_modified = existing_bp["file_modified_at"]
        new_modified = fixture_item["file_metadata"]["file_modified_at"]
        
        if existing_modified and new_modified:
            # Parse both timestamps into datetime objects
            existing_dt = _parse_timestamp(existing_modified)
            new_dt = _parse_timestamp(new_modified)
            
            # Fail fast if timestamp parsing fails
            if existing_dt is None:
                raise ValueError(f"Failed to parse existing timestamp for {full_name}: {existing_modified}")
            if new_dt is None:
                raise ValueError(f"Failed to parse new timestamp for {full_name}: {new_modified}")
            
            # Compare datetime objects
            if existing_dt != new_dt:
                if self.verbose:
                    sys.stderr.write(f"DEBUG: Modified time changed for {full_name}: {existing_bp['file_modified_at']} -> {fixture_item['file_metadata']['file_modified_at']}\n")
                return True
            
        # Check size
        if fixture_item["file_metadata"]["size"] != existing_bp["file_size"]:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Size changed for {full_name}: {existing_bp['file_size']} -> {fixture_item['file_metadata']['size']}\n")
            return True
            
        # Check tags (compare as sets to handle unordered nature)
        # Both existing_bp tags and fixture_item tags are pipe-delimited strings
        existing_tags = set(existing_bp.get("tags", []))
        new_tags = set(fixture_item.get("tags", []))
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
        
    def apply_incremental_changes(self, changes: ComparisonResult, dry_run: bool = False, curs: cursor = None, filename: str = None):
        """Apply incremental changes to database.
        
        Args:
            changes: ComparisonResult with changes to apply
            dry_run: If True, don't actually apply changes
            curs: Optional cursor to use (for transaction context)
        """
        if dry_run:
            if self.verbose:
                sys.stderr.write(f"DRY RUN: Would apply {changes.summary()}\n")
            return
            
        # Use provided cursor or create new one
        if curs is not None:
            # Use the provided cursor (from outer transaction context)
            self._apply_changes_with_cursor(curs, changes)
        else:
            # Create new cursor context (fallback for standalone usage)
            with self.conn.cursor(row_factory=dict_row) as curs:
                self._apply_changes_with_cursor(curs, changes)
                
        # Always show the summary of what was applied
        if filename:
            sys.stderr.write(f"{filename}: Applied {changes.summary()}\n")
        else:
            sys.stderr.write(f"Applied {changes.summary()}\n")
        
    def _apply_changes_with_cursor(self, curs: cursor, changes: ComparisonResult):
        """Apply changes using the provided cursor."""
        # Load existing blueprints for modification handling
        existing_blueprints = self._load_existing_blueprints(curs)
        
        # Track new blueprint IDs for version change linking
        new_blueprint_ids = {}
        new_blueprint_ids_by_md5 = {}
        
        # Process additions first to get the new blueprint IDs
        for new_item in changes.added:
            new_bp = self._handle_addition(curs, new_item)
            if new_bp:
                if "file_metadata" in new_item:
                    # File-based blueprint
                    full_name = new_item["file_metadata"]["full_name"]
                    md5 = new_item["file_metadata"]["md5"]
                    new_blueprint_ids[full_name] = new_bp["id"]
                    new_blueprint_ids_by_md5[md5] = new_bp["id"]
                else:
                    # Configuration blueprint
                    blueprint_name = new_item.get("name")
                    if blueprint_name:
                        new_blueprint_ids[blueprint_name] = new_bp["id"]
        
        # Process deprecations (no version change linking here - that's done in post-processing)
        for deprecated_bp in changes.deprecated:
            self._handle_deprecation(curs, deprecated_bp)
            
        # Process modifications
        for modified_item in changes.modified:
            self._handle_modification(curs, modified_item, existing_blueprints)
            
        # Process consolidations
        for consolidated_item in changes.consolidated:
            self._handle_consolidation(curs, consolidated_item)
            
        # Post-process: Link deprecated blueprints to successors by file path
        self._link_deprecated_to_successors(curs)
            
    def _handle_deprecation(self, curs: cursor, deprecated_bp: Dict, successor_id: Optional[str] = None):
        """Handle deprecation of an existing blueprint.
        
        Args:
            curs: Database cursor
            deprecated_bp: Blueprint to deprecate
            successor_id: Optional ID of the successor blueprint (for version changes)
        """
        blueprint_id = deprecated_bp["id"]
        
        # Remove tags and images for deprecated blueprint
        tag_sql.delete_all_blueprint_tags(curs, blueprint_id)
        image_sql.delete_images_for_blueprint(curs, blueprint_id)
        
        # Mark as deprecated, only setting successor_id if not already set
        # IMPORTANT: Once a successor_id is set, it should never be changed
        # as this represents the changelog history that builds up over time
        if successor_id and deprecated_bp.get("successor_id") is None:
            blueprint_sql.mark_blueprint_deprecated(curs, blueprint_id, successor_id)
        else:
            blueprint_sql.mark_blueprint_deprecated(curs, blueprint_id)
        
        if self.verbose:
            if successor_id and deprecated_bp.get("successor_id") is None:
                sys.stderr.write(f"Deprecated blueprint {blueprint_id} and linked to successor {successor_id}\n")
            elif deprecated_bp.get("successor_id") is not None:
                sys.stderr.write(f"Deprecated blueprint {blueprint_id} (preserved existing successor_id: {deprecated_bp.get('successor_id')})\n")
            else:
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
            # Handle file-based blueprints with MD5 conflict checking
            if "file_metadata" in new_item:
                # Check if the returned blueprint matches our fixture data
                # This handles the case where there's an MD5 conflict with a different file
                if bp["full_name"] != new_item["file_metadata"]["full_name"]:
                    # The returned blueprint is different from what we're trying to add
                    # This means there's an MD5 conflict with a different file
                    # We should add the new path to consolidated_paths
                    if self.verbose:
                        sys.stderr.write(f"DEBUG: MD5 conflict detected for {new_item['file_metadata']['full_name']}\n")
                        sys.stderr.write(f"  Existing blueprint: {bp['full_name']}\n")
                        sys.stderr.write(f"  New blueprint: {new_item['file_metadata']['full_name']}\n")
                        sys.stderr.write(f"  Adding to consolidated_paths for blueprint {bp['id']}\n")
                    
                    # Add the new path to consolidated_paths
                    existing_paths = bp.get("consolidated_paths", [])
                    new_path = new_item["file_metadata"]["full_name"]
                    if new_path not in existing_paths:
                        existing_paths.append(new_path)
                        # Update the blueprint with the new consolidated_paths
                        update_data = {"consolidated_paths": existing_paths}
                        blueprint_sql.update_blueprint(curs, bp["id"], update_data)
                        
                    if self.verbose:
                        sys.stderr.write(f"Added path to consolidated_paths for blueprint {bp['id']}\n")
                else:
                    # Normal case - insert tags and images for new blueprint
                    for tag in new_item.get("tags", []):
                        def insert_tag_to_db(tag_array):
                            tag_sql.insert_tag(curs, bp["id"], array_to_tag(tag_array))
                        process_tag(tag, insert_tag_to_db)
                        
                    for image in new_item.get("images", []):
                        image_sql.insert_image_for_blueprint(curs, bp["id"], image)
                        
                    if self.verbose:
                        sys.stderr.write(f"Added blueprint {bp['id']}\n")
            else:
                # Configuration blueprint - insert tags and images
                for tag in new_item.get("tags", []):
                    def insert_tag_to_db(tag_array):
                        tag_sql.insert_tag(curs, bp["id"], array_to_tag(tag_array))
                    process_tag(tag, insert_tag_to_db)
                    
                for image in new_item.get("images", []):
                    image_sql.insert_image_for_blueprint(curs, bp["id"], image)
                    
                if self.verbose:
                    sys.stderr.write(f"Added configuration blueprint {bp['id']}\n")
        else:
            if self.verbose:
                sys.stderr.write(f"Added blueprint skipped\n")
            
        return bp
            
    def _handle_modification(self, curs: cursor, modified_item: Dict, existing_blueprints: Dict[str, Dict]):
        """Handle modification of an existing blueprint."""
        if "file_metadata" in modified_item:
            # File-based blueprint
            full_name = modified_item["file_metadata"]["full_name"]
            existing_bp = existing_blueprints.get(full_name)
        else:
            # Configuration blueprint
            blueprint_name = modified_item.get("name")
            existing_bp = existing_blueprints.get(blueprint_name)
        
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
            def insert_tag_to_db(tag_array):
                tag_sql.insert_tag(curs, blueprint_id, array_to_tag(tag_array))
            process_tag(tag, insert_tag_to_db)
            
        # Update images (delete old, insert new)
        image_sql.delete_images_for_blueprint(curs, blueprint_id)
        for image in modified_item.get("images", []):
            image_sql.insert_image_for_blueprint(curs, blueprint_id, image)
            
        if self.verbose:
            blueprint_name = existing_bp.get("blueprint_name", "unknown")
            sys.stderr.write(f"Modified blueprint {blueprint_id} ({blueprint_name})\n")
            
    def _handle_consolidation(self, curs: cursor, consolidated_item: Dict):
        """Handle path consolidation (file moved but same MD5)."""
        # This is a placeholder for future implementation
        # Path consolidation logic would go here
        if self.verbose:
            sys.stderr.write(f"Consolidation not yet implemented\n")
            
    def _link_deprecated_to_successors(self, curs: cursor):
        """Link deprecated blueprints to successors by file path.
        
        For every deprecated blueprint that doesn't have a successor_id,
        find a non-deprecated blueprint with the same file path and link them.
        """
        # Get all deprecated blueprints without successor_id
        query = """
            SELECT id, full_name, file_md5, successor_id
            FROM blueprints
            WHERE deprecated = true 
            AND successor_id IS NULL
        """
        curs.execute(query)
        deprecated_blueprints = curs.fetchall()
        
        if not deprecated_blueprints:
            return
            
        if self.verbose:
            sys.stderr.write(f"DEBUG: Found {len(deprecated_blueprints)} deprecated blueprints without successor_id\n")
        
        for deprecated_bp in deprecated_blueprints:
            full_name = deprecated_bp["full_name"]
            if not full_name:
                continue  # Skip blueprints without full_name
                
            # Find non-deprecated blueprint with same file path
            query = """
                SELECT id, file_md5
                FROM blueprints
                WHERE deprecated = false 
                AND full_name = %s
                ORDER BY created_at DESC
                LIMIT 1
            """
            curs.execute(query, (full_name,))
            successor_bp = curs.fetchone()
            
            if successor_bp:
                # Link the deprecated blueprint to the successor
                blueprint_sql.mark_blueprint_deprecated(curs, deprecated_bp["id"], successor_bp["id"])
                if self.verbose:
                    sys.stderr.write(f"LINKED: {full_name} (deprecated: {deprecated_bp['file_md5']} -> successor: {successor_bp['file_md5']})\n")
            else:
                if self.verbose:
                    sys.stderr.write(f"DEBUG: No successor found for deprecated blueprint {full_name}\n")
            
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