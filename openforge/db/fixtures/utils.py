"""Shared utilities for fixture processing."""

from typing import Dict


def munge_blueprint(data: dict) -> dict:
    """Convert fixture format to database format.
    
    This function converts blueprint fixture data from the fixture format
    to the database format used by the blueprint_sql module.
    
    Args:
        data: Blueprint fixture data in fixture format
        
    Returns:
        Dictionary in database format
    """
    bp = {}
    bp["blueprint_type"] = data["type"]
    bp["blueprint_name"] = data.get("name")
    bp["blueprint_config"] = data.get("config", {})
    
    # Phase 1 fields
    bp["deprecated"] = data.get("deprecated", False)
    bp["successor_id"] = data.get("successor_id")
    bp["consolidated_paths"] = data.get("consolidated_paths", [])
    
    # Fields for separate tables (not stored in blueprints table)
    bp["openscad_source"] = data.get("openscad_source")
    bp["changelog"] = data.get("changelog")
    
    if "file_metadata" in data:
        if not bp["blueprint_name"]:
            bp["blueprint_name"] = data["file_metadata"]["file"]
        bp["file_md5"] = data["file_metadata"]["md5"]
        bp["file_size"] = data["file_metadata"]["size"]
        bp["file_name"] = data["file_metadata"]["file"]
        bp["full_name"] = data["file_metadata"]["full_name"]
        bp["file_modified_at"] = data["file_metadata"]["file_modified_at"]
        bp["storage_address"] = data["file_metadata"].get("storage_address")
    return bp


def get_words(data: dict) -> list[str]:
    """Extract search words from blueprint data.
    
    Args:
        data: Blueprint fixture data
        
    Returns:
        List of search words extracted from tags
    """
    words = set()
    for t in data.get("tags", []):
        words.update([str(w) for w in t])
    return list(words) 