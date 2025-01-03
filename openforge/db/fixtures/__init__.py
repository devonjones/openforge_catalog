import json
import sys
from importlib import resources as impresources

from psycopg import cursor, connection
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql


def find_fixtures():
    import openforge.db.fixtures as fixtures

    ffiles = []
    for f in impresources.files(fixtures).iterdir():
        if str(f).endswith(".json"):
            ffiles.append(f)
    return ffiles


def clear_db(curs: cursor):
    tag_sql.delete_all_tags(curs)
    blueprint_sql.delete_all_blueprints(curs)


def load_fixtures(conn: connection):
    ffiles = find_fixtures()
    with conn.cursor(row_factory=dict_row) as curs:
        clear_db(curs)
        for f in ffiles:
            with open(f, "r") as f:
                data = json.load(f)
                for rec in data:
                    load_fixture(curs, rec)


def _munge_blueprint(data: dict):
    bp = {}
    bp["blueprint_name"] = data["file_metadata"]["file"]
    bp["blueprint_type"] = data["type"]
    bp["config"] = json.dumps(data.get("config", {}))
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
        print(f"loaded {bp['blueprint_name']}")
    except UniqueViolation:
        sys.stderr.write(f"MD5 not unique for {bp_data['blueprint_name']}\n")


def _munge_tag(tag: list):
    return "|".join(str(t) for t in tag)
