from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
from jsonschema.exceptions import ValidationError

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
from openforge.openapi import validate_schema


def get_blueprints():
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_all_blueprints(cursor)
            return jsonify(data)


def create_blueprint():
    try:
        validate_schema("blueprint.yaml", request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            req_data = request.json
            data = blueprint_sql.insert_blueprint(cursor, req_data)
            if "tags" in req_data:
                for tag in req_data["tags"]:
                    tag_sql.insert_tag(cursor, data["id"], tag)
            data["tags"] = [tag["tag"] for tag in tag_sql.get_tags(cursor, data["id"])]
            return jsonify(data), 201


def get_blueprint_by_id(blueprint_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_blueprint_by_id(cursor, blueprint_id)
            data["tags"] = [
                tag["tag"] for tag in tag_sql.get_tags(cursor, blueprint_id)
            ]
            return jsonify(data)


def update_blueprint(blueprint_id):
    try:
        validate_schema("blueprint.yaml", request.json, required=False)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            req_data = request.json
            data = blueprint_sql.update_blueprint(cursor, blueprint_id, req_data)
            if "tags" in req_data:
                try:
                    tag_sql.delete_blueprint_tags(cursor, blueprint_id)
                except NotFound:
                    pass
                for tag in req_data["tags"]:
                    tag_sql.insert_tag(cursor, blueprint_id, tag)
            data["tags"] = [
                tag["tag"] for tag in tag_sql.get_tags(cursor, blueprint_id)
            ]
            return jsonify(data)


def delete_blueprint(blueprint_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                tag_sql.delete_blueprint_tags(cursor, blueprint_id)
            except NotFound:
                pass
            rows = blueprint_sql.delete_blueprint(cursor, blueprint_id)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)
