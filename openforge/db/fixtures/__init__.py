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
from openforge.db.sql.tag_utils import array_to_tag, tag_to_array
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


def load_fixtures(conn: connection, alt: str, files: list = None):
    ffiles = files if files is not None else find_fixtures(alt)
    with conn.cursor(row_factory=dict_row) as curs:
        clear_db(curs)
        conn.commit()
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
            conn.commit()


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
    print(data)
    bp["blueprint_type"] = data["type"]
    bp["blueprint_name"] = data.get("name")
    bp["blueprint_config"] = data.get("config", {})
    if "file_metadata" in data:
        if not bp["blueprint_name"]:
            bp["blueprint_name"] = data["file_metadata"]["file"]
        bp["file_md5"] = data["file_metadata"]["md5"]
        bp["file_size"] = data["file_metadata"]["size"]
        bp["file_name"] = data["file_metadata"]["file"]
        bp["full_name"] = data["file_metadata"]["full_name"]
        bp["file_changed_at"] = data["file_metadata"]["changed"]
        bp["file_modified_at"] = data["file_metadata"]["modified"]
        bp["storage_address"] = data["file_metadata"].get("storage_address")
    return bp


def _get_words(data: dict):
    words = set()
    for t in data.get("tags", []):
        words.update([str(w) for w in t])
    return list(words)


def load_blueprint_fixture(curs: cursor, data: dict):
    try:
        bp_data = _munge_blueprint(data)
        bp = blueprint_sql.insert_blueprint(
            curs, bp_data, rescue_md5_conflict=True, words=_get_words(data))
        if bp is None:
            return  # Skip this record if it's a duplicate
        for tag in data["tags"]:
            tag_sql.insert_tag(curs, bp["id"], array_to_tag(tag))
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
