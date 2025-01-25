import json
import sys
from importlib import resources as impresources

from psycopg import cursor, connection
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation

try:
    from yaml import CLoader as Loader, CDumper as Dumper, safe_load
except ImportError:
    from yaml import Loader, Dumper, safe_load


import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
import openforge.db.sql.images as image_sql


def find_fixtures():
    import openforge.db.fixtures as fixtures

    ffiles = []
    for f in impresources.files(fixtures).iterdir():
        if str(f).endswith(".json"):
            ffiles.append(f)
        elif str(f).endswith(".yaml"):
            ffiles.append(f)
    return ffiles


def clear_db(curs: cursor):
    tag_sql.delete_all_tags(curs)
    blueprint_sql.delete_all_blueprints(curs)
    image_sql.delete_all_images(curs)


def load_fixtures(conn: connection):
    ffiles = find_fixtures()
    with conn.cursor(row_factory=dict_row) as curs:
        clear_db(curs)
        conn.commit()
        for f in ffiles:
            data = _load_data(f)
            for rec in data:
                load_fixture(curs, rec)


def _load_data(f):
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
    return bp


def load_fixture(curs: cursor, data: dict):
    bp_data = _munge_blueprint(data)
    try:
        bp = blueprint_sql.insert_blueprint(curs, bp_data, rescue_md5_conflict=True)
        for tag in data.get("tags", []):
            tag_sql.insert_tag(curs, bp["id"], _munge_tag(tag))
        for image in data.get("images", []):
            image_sql.insert_image_for_blueprint(curs, bp["id"], _munge_image(image))
    except UniqueViolation:
        sys.stderr.write(f"MD5 not unique for {bp_data['blueprint_name']}\n")


def _munge_tag(tag: list):
    return "|".join(str(t) for t in tag)


def _munge_image(image: dict):
    # placeholder for additional work if needed
    return image
