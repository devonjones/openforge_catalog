"""
Incremental scanner for OpenForge file processing.

This module provides functionality for incremental processing of OpenForge files,
only calculating MD5s for files that have changed, dramatically improving performance.
"""

import os
import sys
import json
import hashlib
import traceback
from typing import Dict, List, Set, Optional, Tuple
from datetime import datetime, timezone
import time

from openforge.openapi import validate_schema
from yaml import safe_load
import boto3
from botocore.client import Config
import sh
from .metadata import get_metadata_file, apply_metadata, apply_default_metadata, convert_tags_for_metadata
from .scanner import parse_file_tags, validate, print_files, _sort_and_clean_recursively, _convert_tags_to_pipe_delimited
from .io import get_s3_client, create_image, upload_file, create_thumbnail, get_s3_key_cache
from openforge.db.sql.tag_utils import process_tag
from openforge.data.transformers import DeprecatedEntryTransformer
from .utils import set_handler


class IncrementalScanner:
    """Handles incremental scanning of OpenForge files."""
    
    def __init__(self, fixture_path: str, verbose: bool = False, skip_schema_validation: bool = False):
        """Initialize incremental scanner.
        
        Args:
            fixture_path: Path to existing fixture file (JSON or YAML)
            verbose: Whether to output debug messages
            skip_schema_validation: Whether to skip schema validation for old fixture files
        """
        self.fixture_path = fixture_path
        self.verbose = verbose
        self.skip_schema_validation = skip_schema_validation
        self.existing_data = self._load_fixture()
        self.existing_data_map = {item["file_metadata"]["full_name"]: item for item in self.existing_data}
        self.subset_path = self._detect_subset_path()
        
    def _load_fixture(self) -> List[Dict]:
        """Load and validate fixture file.
        
        Returns:
            List of fixture objects
            
        Raises:
            FileNotFoundError: If fixture file doesn't exist
            ValueError: If fixture file is invalid or missing required fields
        """
        if not os.path.exists(self.fixture_path):
            raise FileNotFoundError(f"Fixture file not found: {self.fixture_path}")
            
        with open(self.fixture_path, 'r') as f:
            if self.fixture_path.endswith('.json'):
                data = json.load(f)
            else:
                # Assume YAML
                data = safe_load(f)
                
        # Validate schema (unless skipped)
        if not self.skip_schema_validation:
            validate_schema("blueprint.fixture.json", data)
        else:
            if self.verbose:
                sys.stderr.write("Skipping schema validation for old fixture file\n")
        
        # Ensure all entries have file_metadata
        for item in data:
            if "file_metadata" not in item:
                raise ValueError(f"Missing file_metadata in fixture item: {item.get('name', 'unknown')}")
                
        return data
        
    def _detect_subset_path(self) -> str:
        """Detect subset path from fixture data.
        
        Returns:
            Common substring from full_name fields
            
        Raises:
            ValueError: If cannot determine subset path
        """
        if not self.existing_data:
            raise ValueError("No data in fixture file")
            
        full_names = [item["file_metadata"]["full_name"] for item in self.existing_data]
        
        # Find common prefix
        if not full_names:
            raise ValueError("No full_name fields found")
            
        # Split by '/' and find common prefix
        paths = [name.split('/') for name in full_names]
        min_len = min(len(path) for path in paths)
        
        common_parts = []
        for i in range(min_len):
            if all(path[i] == paths[0][i] for path in paths):
                common_parts.append(paths[0][i])
            else:
                break
                
        if not common_parts:
            return ""  # Return empty string instead of raising error
            
        # For single files, return the directory path (exclude the filename)
        if len(full_names) == 1:
            # Remove the filename from the path
            path_parts = full_names[0].split('/')
            if len(path_parts) > 1:
                return '/'.join(path_parts[:-1])
            else:
                return ""
                
        return '/'.join(common_parts)
        
    def _calculate_md5(self, file_path: str) -> str:
        """Calculate MD5 hash of file.
        
        Args:
            file_path: Path to file
            
        Returns:
            MD5 hash as hex string
        """
        start_time = time.time()
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        md5_hash = hash_md5.hexdigest()
        
        return md5_hash
        
    def _get_file_info(self, file_path: str) -> Dict:
        """Get file metadata including size and modification time.
        
        Args:
            file_path: Path to file
            
        Returns:
            Dict with size and modified info
        """
        stat = os.stat(file_path)
        # Use UTC time interpretation for consistent behavior across environments
        utc_time = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        final_time = utc_time.isoformat()

        return {
            "size": stat.st_size,
            "file_modified_at": final_time
        }
        
    def _find_existing_entry(self, full_name: str) -> Optional[Dict]:
        """Find existing fixture entry by full_name.
        
        Args:
            full_name: Full name to search for
            
        Returns:
            Existing entry or None
        """
        return self.existing_data_map.get(full_name)
        
    def _get_existing_modified_time(self, existing_metadata: Dict) -> str:
        """Get existing modification time with fallback for old 'modified' key.
        
        Args:
            existing_metadata: File metadata dictionary
            
        Returns:
            Modification time string or None
        """
        existing_modified = existing_metadata.get("file_modified_at")
        if existing_modified is None:
            existing_modified = existing_metadata.get("modified")
        return existing_modified
        
    def _has_file_changed(self, file_path: str, existing_entry: Dict) -> bool:
        """Check if a file has changed by comparing metadata.
        
        Args:
            file_path: Path to current file
            existing_entry: Existing fixture entry
            
        Returns:
            True if file has changed, False if identical
        """
        if existing_entry is None:
            return True  # New file, consider it "changed"
            
        current_info = self._get_file_info(file_path)
        existing_metadata = existing_entry["file_metadata"]
        
        # Compare size and modification time
        if current_info["size"] != existing_metadata["size"]:
            return True
            
        existing_modified = self._get_existing_modified_time(existing_metadata)
        if current_info["file_modified_at"] != existing_modified:
            return True
            
        return False
        

        
    def _has_changes_for_output(self, file_path: str, existing_entry: Dict, new_entry: Dict) -> bool:
        """Determine if file has changes that should trigger output.
        
        Args:
            file_path: Path to current file
            existing_entry: Existing fixture entry
            new_entry: New entry being created
            
        Returns:
            True if file has relevant changes
        """
        # Check if MD5 changed (compare actual MD5 values, not the changed timestamp)
        existing_md5 = existing_entry["file_metadata"]["md5"]
        new_md5 = new_entry["file_metadata"]["md5"]
        if existing_md5 != new_md5:
            if self.verbose:
                sys.stderr.write(f"DEBUG: MD5 changed for {file_path}: {existing_md5} -> {new_md5}\n")
            return True
            
        # Check if modification time or size changed (even if MD5 didn't change)
        existing_modified = self._get_existing_modified_time(existing_entry["file_metadata"])
        new_modified = new_entry["file_metadata"]["file_modified_at"]
        existing_size = existing_entry["file_metadata"]["size"]
        new_size = new_entry["file_metadata"]["size"]
        
        if existing_modified != new_modified or existing_size != new_size:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Modification time or size changed for {file_path}: modified {existing_modified} -> {new_modified}, size {existing_size} -> {new_size}\n")
            return True
            
        # Check if tags changed (compare as sets of pipe-delimited strings)
        existing_tags = set(_normalize_tags_to_pipe_delimited(existing_entry.get("tags", [])))
        new_tags = set(_normalize_tags_to_pipe_delimited(new_entry.get("tags", [])))
        if existing_tags != new_tags:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Tags changed for {file_path}\n")
            return True
            
        # Check if config changed
        existing_config = existing_entry.get("config", {})
        new_config = new_entry.get("config", {})
        if existing_config != new_config:
            if self.verbose:
                sys.stderr.write(f"DEBUG: Config changed for {file_path}\n")
            return True
            
        return False
        
    def _create_deprecation_entry(self, existing_entry: Dict) -> Dict:
        """Create a deprecation entry from an existing entry.
        
        Args:
            existing_entry: Existing fixture entry
            
        Returns:
            Deprecation entry with deprecated flag
        """
        deprecation_entry = existing_entry.copy()
        deprecation_entry["deprecated"] = True
        return deprecation_entry
        
    def process_file(self, file_path: str, full_name: str, tags: Set, config: Dict = None) -> Tuple[List[Dict], bool]:
        """Process a single file with incremental logic.
        
        Args:
            file_path: Path to file
            full_name: Full name for fixture
            tags: Tags for the file
            config: Config for the file
            
        Returns:
            Tuple of (list of processed fixture entries, whether file changed)
        """
        existing_entry = self._find_existing_entry(full_name)
        file_changed = self._has_file_changed(file_path, existing_entry)
        
        if existing_entry is None:
            # New file - always calculate MD5
            md5 = self._calculate_md5(file_path)
            file_info = self._get_file_info(file_path)
            
            result = [{
                "type": "model",
                "file_metadata": {
                    "full_name": full_name,
                    "file": os.path.basename(file_path),
                    "md5": md5,
                    "size": file_info["size"],
                    "file_modified_at": file_info["file_modified_at"]
                },
                "tags": _convert_tags_to_pipe_delimited(tags),
                "config": config or {}
            }]
        else:
            # Existing file - check if MD5 needs recalculation
            if self._has_file_changed(file_path, existing_entry):
                # Recalculate MD5
                md5 = self._calculate_md5(file_path)
                file_info = self._get_file_info(file_path)
                
                # Check if MD5 actually changed
                if md5 != existing_entry["file_metadata"]["md5"]:
                    # MD5 changed - create deprecation entry for old MD5 and new entry for new MD5
                    if self.verbose:
                        sys.stderr.write(f"DEBUG: MD5 changed for {file_path}: {existing_entry['file_metadata']['md5']} -> {md5}\n")
                    
                    deprecation_entry = self._create_deprecation_entry(existing_entry)
                    new_entry = {
                        "type": "model",
                        "file_metadata": {
                            "full_name": full_name,
                            "file": os.path.basename(file_path),
                            "md5": md5,
                            "size": file_info["size"],
                            "file_modified_at": file_info["file_modified_at"]
                        },
                        "tags": _convert_tags_to_pipe_delimited(tags),
                        "config": config or {}
                    }
                    result = [deprecation_entry, new_entry]
                else:
                    # MD5 didn't change, just metadata fields changed
                    new_entry = {
                        "type": "model",
                        "file_metadata": {
                            "full_name": full_name,
                            "file": os.path.basename(file_path),
                            "md5": md5,
                            "size": file_info["size"],
                            "file_modified_at": file_info["file_modified_at"]
                        },
                        "tags": _convert_tags_to_pipe_delimited(tags),
                        "config": config or {}
                    }
                    result = [new_entry]
            else:
                # Copy existing file_metadata but update other fields
                new_entry = {
                    "type": "model",
                    "file_metadata": existing_entry["file_metadata"].copy(),
                    "tags": _convert_tags_to_pipe_delimited(tags),
                    "config": config or {}
                }
                # Keep the original changed timestamp when copying existing metadata
                # Don't update the changed field to avoid false change detection
                # The changed field should remain exactly as it was in the existing entry
                # The file_metadata.copy() already preserves the original changed field
                
                result = [new_entry]
        
        return result, file_changed
        
    def get_subset_path(self) -> str:
        """Get detected subset path.
        
        Returns:
            Subset path string
        """
        return self.subset_path
        
    def get_missing_files(self, current_files: Set[str]) -> List[Dict]:
        """Get deprecation entries for missing files.
        
        Args:
            current_files: Set of current full_name values
            
        Returns:
            List of deprecation entries
        """
        missing = []
        existing_full_names = {item["file_metadata"]["full_name"] for item in self.existing_data}
        
        for full_name in existing_full_names - current_files:
            # Find the existing entry
            existing_entry = self._find_existing_entry(full_name)
            if existing_entry:
                # Create deprecation tombstone
                deprecation_entry = existing_entry.copy()
                deprecation_entry["deprecated"] = True
                missing.append(deprecation_entry)
                
        return missing
        
    def get_existing_deprecated_files(self) -> List[Dict]:
        """Get all existing deprecated entries from the fixture file.
        
        Returns:
            List of existing deprecated entries
        """
        deprecated = []
        for item in self.existing_data:
            if item.get("deprecated", False):
                deprecated.append(item)
        return deprecated


def _normalize_tags_to_pipe_delimited(tags):
    """Convert tags to pipe-delimited format, handling both old array format and new string format."""
    normalized = []
    for tag in tags:
        def to_pipe_delimited(tag_array):
            normalized.append("|".join(str(item) for item in tag_array))
        process_tag(tag, to_pipe_delimited)
    return normalized


def parse_files_incremental(path, files, scanner, verbose, upload, config, dry_run, incremental):
    """Parse files using incremental scanner logic."""
    
    def _get_metadata(path, fn):
        data = get_metadata_file(path)
        if data:
            if fn in data:
                metadata = data[fn]
                # Validate individual metadata entry
                validate_schema("metadata.yaml", metadata)
                return metadata
        return None



    newfiles = []
    s3_client = get_s3_client(config) if upload else None
    # S3 key cache - pre-fetch for efficient upload checking
    # Skip cache if dry_run or if explicitly disabled for performance
    skip_cache = dry_run or config.get("SKIP_S3_CACHE", False)
    s3_key_cache = set() if skip_cache else (get_s3_key_cache(s3_client, config, verbose) if upload else set())

    # Track current files for missing file detection
    current_files = set()

    for file in files:
        if verbose:
            sys.stderr.write(f"Processing: {file}\n")
        
        try:
            full_file = os.path.join(path, file)
            local_path = os.path.dirname(full_file)
            fn = os.path.basename(full_file)
            
            # Get metadata
            metadata = _get_metadata(local_path, fn)
            if metadata and metadata.get("ignore", False):
                continue

            # Parse tags
            t = set()
            f_info = {"file": fn, "path": file.split("/")}
            parse_file_tags(f_info, t, metadata)

            # Process with incremental scanner
            config_dict = {}
            if metadata:
                config_dict = metadata.get("config", {})
            
            # Use incremental scanner to process the file
            results, file_changed = scanner.process_file(full_file, file, t, config_dict)
            
            # Process each result (may be multiple if MD5 changed)
            for result in results:
                # Add metadata flag
                result["metadata"] = metadata is not None
                
                # Convert tags back to set format for metadata processing
                if "tags" in result:
                    result["tags"] = convert_tags_for_metadata(result["tags"])
                
                # Apply metadata and default metadata
                if metadata:
                    apply_metadata(metadata, result)
                apply_default_metadata(result)
                
                # Convert tags back to pipe-delimited format for output
                if "tags" in result:
                    result["tags"] = _convert_tags_to_pipe_delimited(result["tags"])
                
                # Validate
                validate(result)
                
                # Handle upload if needed (only for non-deprecated entries)
                if upload and not result.get("deprecated"):
                    if "md5" not in result["file_metadata"]:
                        raise Exception("MD5 is required for upload")
                    
                    model_address = upload_file(result["file_metadata"], full_file, s3_client, "models", s3_key_cache, config, verbose)
                    result["file_metadata"]["storage_address"] = f"{config['FILE_DOMAIN']}/{model_address}"
                    
                    # Only create thumbnail if file has changed
                    if file_changed:
                        thumb_path = create_thumbnail(full_file)
                        thumb_address = upload_file(result["file_metadata"], thumb_path, s3_client, "thumbnails", s3_key_cache, config, verbose)
                        images = result.get("images", [])
                        images.append(create_image("thumbnail", f"{config['FILE_DOMAIN']}/{thumb_address}"))
                        result["images"] = images
                    else:
                        # Use existing thumbnail from fixture
                        existing_entry = scanner._find_existing_entry(file)
                        if existing_entry and "images" in existing_entry:
                            result["images"] = existing_entry["images"]
                
                newfiles.append(result)
            
            current_files.add(file)
            
        except Exception as e:
            sys.stderr.write(f"ERROR processing file {file}: {e}\n")
            traceback.print_exc()
            raise

    # Add missing files as deprecated
    missing_files = scanner.get_missing_files(current_files)
    if missing_files and verbose:
        sys.stderr.write(f"Creating {len(missing_files)} deprecation entries for missing files\n")
    newfiles.extend(missing_files)
    
    # Add existing deprecated files from the fixture
    existing_deprecated = scanner.get_existing_deprecated_files()
    if existing_deprecated and verbose:
        sys.stderr.write(f"Preserving {len(existing_deprecated)} existing deprecated entries\n")
    newfiles.extend(existing_deprecated)

    return newfiles


def print_incremental_diff(files, scanner, verbose=False):
    """Print diff format showing only incremental changes."""
    
    added = []
    modified = []
    removed = []
    
    # Track detailed changes for modified files (only if verbose)
    modified_details = {}
    
    for file in files:
        existing_entry = scanner._find_existing_entry(file["file_metadata"]["full_name"])
        if existing_entry:
            # Check if this file has changes
            if scanner._has_changes_for_output(file["file_metadata"]["full_name"], existing_entry, file):
                # Check if MD5 changed - if so, treat as addition and removal
                if file["file_metadata"]["md5"] != existing_entry["file_metadata"]["md5"]:
                    # MD5 changed - this is a removal of old entry and addition of new entry
                    removed.append(file["file_metadata"]["full_name"])
                    added.append(file["file_metadata"]["full_name"])
                else:
                    # Other changes (tags, config, modification time, size) - treat as modification
                    modified.append(file["file_metadata"]["full_name"])
                    
                    # Track what changed (only if verbose)
                    if verbose:
                        changes = {}
                        
                        # Check modification time changes
                        if file["file_metadata"]["file_modified_at"] != existing_entry["file_metadata"]["file_modified_at"]:
                            changes["modified"] = {
                                "old": existing_entry["file_metadata"]["file_modified_at"],
                                "new": file["file_metadata"]["file_modified_at"]
                            }
                        
                        # Check size changes
                        if file["file_metadata"]["size"] != existing_entry["file_metadata"]["size"]:
                            changes["size"] = {
                                "old": existing_entry["file_metadata"]["size"],
                                "new": file["file_metadata"]["size"]
                            }
                        
                        # Check tags changes (compare as sets to handle unordered nature)
                        # existing_entry tags are arrays, file tags are pipe-delimited strings
                        existing_tags = set(tuple(tag) for tag in existing_entry.get("tags", []))
                        new_tags = set(tuple(tag.split('|')) for tag in file.get("tags", []))
                        if existing_tags != new_tags:
                            changes["tags"] = {
                                "old": list(existing_entry.get("tags", [])),
                                "new": list(file.get("tags", []))
                            }
                        
                        # Check config changes (deep comparison)
                        existing_config = existing_entry.get("config", {})
                        new_config = file.get("config", {})
                        if existing_config != new_config:
                            changes["config"] = {
                                "old": existing_config,
                                "new": new_config
                            }
                        
                        if changes:
                            modified_details[file["file_metadata"]["full_name"]] = changes
        else:
            added.append(file["file_metadata"]["full_name"])
    
    # Check for missing files (already included in files list with deprecated: true)
    for file in files:
        if file.get("deprecated"):
            removed.append(file["file_metadata"]["full_name"])
    
    result = {
        "added": added,
        "modified": modified,
        "removed": removed
    }
    
    # Add detailed changes if any and verbose mode
    if verbose and modified_details:
        result["modified_details"] = modified_details
    
    # Sort all lists recursively for consistent git diffs
    # Exclude config.parts from sorting to preserve order
    sorted_result = _sort_and_clean_recursively(result, exclude_paths=["config.parts"])
    print(json.dumps(sorted_result, indent=2, sort_keys=True))


def print_incremental_changes(files, scanner):
    """Print only changed data by full_path."""
    
    changed_files = []
    deprecated_files = []
    
    for file in files:
        if file.get("deprecated"):
            deprecated_files.append(file)
            continue

        existing_entry = scanner._find_existing_entry(file["file_metadata"]["full_name"])
        # A file is a change if it's new or its content/metadata has changed.
        if not existing_entry or scanner._has_changes_for_output(
            file["file_metadata"]["full_name"], existing_entry, file
        ):
            changed_files.append(file)

    # Transform deprecated entries to fix their schema
    transformer = DeprecatedEntryTransformer()
    transformed_deprecated = transformer.transform_list(deprecated_files)
    
    # Combine non-deprecated changed files with transformed deprecated files
    final_files = changed_files + transformed_deprecated

    print_files(final_files)


def print_files_with_transformer(files):
    """Print files with transformer applied to deprecated entries."""
    # Apply transformer to the entire list - it will only transform deprecated entries
    transformer = DeprecatedEntryTransformer()
    transformed_files = transformer.transform_list(files)
    
    # Sort all lists recursively for consistent git diffs, but preserve top-level array order
    # Exclude config.parts from sorting to preserve order, and exclude top-level array (empty path)
    sorted_files = _sort_and_clean_recursively(transformed_files, exclude_paths=["config.parts", ""])
    print(json.dumps(sorted_files, default=set_handler, indent=4, sort_keys=True)) 