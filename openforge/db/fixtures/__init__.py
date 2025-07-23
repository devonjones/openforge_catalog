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





def _is_blueprint_fixture(data):
    """Validate data against the blueprint fixture schema."""
    validate_schema("blueprint.fixture.json", data)


def _is_tag_description_fixture(data):
    """Validate data against the tag description fixture schema."""
    validate_schema("tag_description.fixture.json", data)


def load_fixtures(conn: connection, alt: str, files: list = None, incremental: bool = True, dry_run: bool = False, verbose: bool = False):
    ffiles = files if files is not None else find_fixtures(alt)
    
    if incremental:
        # Import here to avoid circular imports
        from .incremental import IncrementalFixturesLoader
        
        loader = IncrementalFixturesLoader(conn, verbose=verbose)
        for f in ffiles:
            data = _load_data(f, verbose=verbose)
            
            # Try blueprint fixture validation first
            try:
                _is_blueprint_fixture(data)
                # If we get here, it's a valid blueprint fixture
                # Use transaction to ensure all-or-nothing behavior
                with conn.transaction():
                    with conn.cursor(row_factory=dict_row) as curs:
                        changes = loader.compare_fixture_data(data, curs=curs)
                        if dry_run:
                            print_comparison_results(changes)
                        else:
                            loader.apply_incremental_changes(changes, curs=curs)
            except Exception as blueprint_error:
                # Try tag description fixture validation
                try:
                    _is_tag_description_fixture(data)
                    # If we get here, it's a valid tag description fixture
                    # Handle tag descriptions in incremental mode
                    with conn.transaction():
                        with conn.cursor(row_factory=dict_row) as curs:
                            if dry_run:
                                sys.stderr.write(f"DRY RUN: Would load tag description fixture: {f}\n")
                            else:
                                load_tag_description_fixture(curs, data)
                                if verbose:
                                    sys.stderr.write(f"Loaded tag description fixture: {f}\n")
                except Exception as tag_error:
                    # Neither validation passed, raise the original blueprint error
                    raise blueprint_error
    else:
        # Existing full replacement logic
        with conn.cursor(row_factory=dict_row) as curs:
            # Use transaction to ensure all-or-nothing behavior
            with conn.transaction():
                clear_db(curs)
                for f in ffiles:
                    data = _load_data(f, verbose=verbose)
                    
                    # Try blueprint fixture validation first
                    try:
                        _is_blueprint_fixture(data)
                        # If we get here, it's a valid blueprint fixture
                        for rec in data:
                            load_blueprint_fixture(curs, rec)
                    except Exception as blueprint_error:
                        # Try tag description fixture validation
                        try:
                            _is_tag_description_fixture(data)
                            # If we get here, it's a valid tag description fixture
                            load_tag_description_fixture(curs, data)
                        except Exception as tag_error:
                            # Neither validation passed, raise the original blueprint error
                            raise blueprint_error


def _load_data(f, verbose=False):
    if verbose:
        sys.stderr.write(f"Loading {f}\n")
    with open(f, "r") as fh:
        if str(f).endswith(".json"):
            return json.load(fh)
        elif str(f).endswith(".yaml"):
            return safe_load(fh)
        raise ValueError(f"Unsupported file type: {f}")


from .utils import munge_blueprint, get_words

def _munge_blueprint(data: dict):
    return munge_blueprint(data)


def _get_words(data: dict):
    return get_words(data)


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
        tag_description_sql.upsert_tag_description(curs, tag_arr, description)


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
            if "file_metadata" in item:
                name = item.get("file_metadata", {}).get("full_name", "unknown")
            else:
                name = item.get("name", "unknown")
            print(f"  - {name}")
            
    if changes.modified:
        print(f"\nModified blueprints:")
        for item in changes.modified:
            if "file_metadata" in item:
                name = item.get("file_metadata", {}).get("full_name", "unknown")
            else:
                name = item.get("name", "unknown")
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
