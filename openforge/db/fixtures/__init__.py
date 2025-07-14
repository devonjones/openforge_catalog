import json
import sys
from importlib import resources as impresources
from pathlib import Path
from psycopg import cursor, connection
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
import jsonschema

try:
    from yaml import CLoader as Loader, CDumper as Dumper, safe_load
except ImportError:
    from yaml import Loader, Dumper, safe_load


import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
import openforge.db.sql.images as image_sql
import openforge.db.sql.tag_descriptions as tag_description_sql
from openforge.db.sql.tag_utils import array_to_tag, tag_to_array, process_tag
from openforge.openapi import validate_schema


def find_fixtures(dir: str):
    if dir:
        return find_fixtures_directory(dir)
    else:
        return find_fixtures_package()


def find_fixtures_package():
    import openforge.db.fixtures as fixtures

    ffiles = []
    for f in impresources.files(fixtures).iterdir():
        if str(f).endswith(".json"):
            ffiles.append(f)
        elif str(f).endswith(".yaml"):
            ffiles.append(f)
    return ffiles


def find_fixtures_directory(dir: str):
    ffiles = []
    for f in Path(dir).iterdir():
        if str(f).endswith(".json"):
            ffiles.append(f)
        elif str(f).endswith(".yaml"):
            ffiles.append(f)
    return ffiles


def clear_db(curs: cursor):
    tag_sql.delete_all_tags(curs)
    blueprint_sql.delete_all_blueprints(curs)
    image_sql.delete_all_images(curs)
    tag_description_sql.delete_all_tag_descriptions(curs)


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.is_valid = True

    def add_error(self, error):
        self.errors.append(error)
        self.is_valid = False

    def merge(self, other):
        self.errors.extend(other.errors)
        self.is_valid = self.is_valid and other.is_valid


def _is_blueprint_fixture(data):
    result = ValidationResult()
    try:
        validate_schema("blueprint.fixture.json", data)
    except jsonschema.exceptions.ValidationError as e:
        result.add_error(f"Schema validation failed: {e.message}")
        result.add_error(f"Path: {'/'.join(str(p) for p in e.path)}")
        result.add_error(f"Schema path: {'/'.join(str(p) for p in e.schema_path)}")
    except Exception as e:
        result.add_error(f"Unexpected error during validation: {str(e)}")
    return result


def _is_tag_description_fixture(data):
    result = ValidationResult()
    try:
        validate_schema("tag_description.fixture.json", data)
    except jsonschema.exceptions.ValidationError as e:
        result.add_error(f"Schema validation failed: {e.message}")
        result.add_error(f"Path: {'/'.join(str(p) for p in e.path)}")
        result.add_error(f"Schema path: {'/'.join(str(p) for p in e.schema_path)}")
    except Exception as e:
        result.add_error(f"Unexpected error during validation: {str(e)}")
    return result


def load_fixtures(conn: connection, alt: str, files: list = None, incremental: bool = True, dry_run: bool = False):
    ffiles = files if files is not None else find_fixtures(alt)
    
    if incremental:
        # Import here to avoid circular imports
        from .incremental import IncrementalFixturesLoader
        
        loader = IncrementalFixturesLoader(conn, verbose=True)
        for f in ffiles:
            data = _load_data(f)
            blueprint_result = _is_blueprint_fixture(data)
            tag_result = _is_tag_description_fixture(data)
            
            if blueprint_result.is_valid:
                changes = loader.compare_fixture_data(data)
                if dry_run:
                    print_comparison_results(changes)
                else:
                    # Use transaction to ensure all-or-nothing behavior
                    with conn.transaction():
                        loader.apply_incremental_changes(changes)
            elif tag_result.is_valid:
                # Tag descriptions are handled differently - they don't have file_metadata
                # For now, skip tag descriptions in incremental mode
                sys.stderr.write(f"Skipping tag description fixture in incremental mode: {f}\n")
            else:
                print(f"Validation failed for {f}")
                for error in blueprint_result.errors + tag_result.errors:
                    print(error)
                raise ValueError(f"File {f} does not match any known fixture format")
    else:
        # Existing full replacement logic
        with conn.cursor(row_factory=dict_row) as curs:
            # Use transaction to ensure all-or-nothing behavior
            with conn.transaction():
                clear_db(curs)
                for f in ffiles:
                    data = _load_data(f)
                    blueprint_result = _is_blueprint_fixture(data)
                    tag_result = _is_tag_description_fixture(data)
                    
                    if blueprint_result.is_valid:
                        for rec in data:
                            load_blueprint_fixture(curs, rec)
                    elif tag_result.is_valid:
                        load_tag_description_fixture(curs, data)
                    else:
                        # Only show errors if all validations failed
                        print(f"\nValidation failed for {f}:")
                        for error in blueprint_result.errors + tag_result.errors:
                            print(error)
                        raise ValueError(f"File {f} does not match any known fixture format")


def _load_data(f):
    sys.stderr.write(f"Loading {f}\n")
    with open(f, "r") as fh:
        if str(f).endswith(".json"):
            return json.load(fh)
        elif str(f).endswith(".yaml"):
            return safe_load(fh)
        raise ValueError(f"Unsupported file type: {f}")


def _munge_blueprint(data: dict):
    bp = {}
    bp["blueprint_type"] = data["type"]
    bp["blueprint_name"] = data.get("name")
    bp["blueprint_config"] = data.get("config", {})
    
    # Phase 1 fields
    bp["deprecated"] = data.get("deprecated", False)
    bp["successor_id"] = data.get("successor_id")
    bp["predecessor_id"] = data.get("predecessor_id")
    bp["consolidated_paths"] = data.get("consolidated_paths", [])
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


def _get_words(data: dict):
    words = set()
    for t in data.get("tags", []):
        def extract_words(tag_array):
            words.update(str(w) for w in tag_array)
        process_tag(t, extract_words)
    return list(words)


def load_blueprint_fixture(curs: cursor, data: dict):
    try:
        bp_data = _munge_blueprint(data)
        bp = blueprint_sql.insert_blueprint(
            curs, bp_data, rescue_md5_conflict=True, words=_get_words(data))
        if bp is None:
            return  # Skip this record if it's a duplicate
        for tag in data["tags"]:
            def insert_tag_to_db(tag_array):
                tag_sql.insert_tag(curs, bp["id"], array_to_tag(tag_array))
            process_tag(tag, insert_tag_to_db)
        for image in data.get("images", []):
            image_sql.insert_image_for_blueprint(curs, bp["id"], _munge_image(image))
    except Exception as e:
        from pprint import pprint
        print("\nFailed record:")
        pprint(data)
        raise


def load_tag_description_fixture(curs: cursor, data: dict):
    for tag, description in data.items():
        tag_arr = tag_to_array(tag)
        try:
            tag_description_sql.insert_tag_description(curs, tag_arr, description)
        except UniqueViolation:
            raise ValueError(f"Tag description already exists for {tag}")


def _munge_image(image: dict):
    # placeholder for additional work if needed
    return image


def print_comparison_results(changes):
    """Print comparison results in a user-friendly format."""
    print(f"\nComparison Results:")
    print(f"  Added: {len(changes.added)}")
    print(f"  Modified: {len(changes.modified)}")
    print(f"  Deprecated: {len(changes.deprecated)}")
    print(f"  Consolidated: {len(changes.consolidated)}")
    print(f"  Errors: {len(changes.errors)}")
    
    if changes.added:
        print(f"\nAdded blueprints:")
        for item in changes.added:
            name = item.get("file_metadata", {}).get("full_name", "unknown")
            print(f"  - {name}")
            
    if changes.modified:
        print(f"\nModified blueprints:")
        for item in changes.modified:
            name = item.get("file_metadata", {}).get("full_name", "unknown")
            print(f"  - {name}")
            
    if changes.deprecated:
        print(f"\nDeprecated blueprints:")
        for item in changes.deprecated:
            name = item.get("full_name", "unknown")
            print(f"  - {name}")
            
    if changes.errors:
        print(f"\nErrors:")
        for error in changes.errors:
            print(f"  - {error}")
