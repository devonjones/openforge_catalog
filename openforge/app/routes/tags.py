import uuid
from flask import jsonify, current_app, make_response, abort
from psycopg.rows import dict_row

import openforge.db.sql.tags as tag_sql


def get_blueprint_tags(blueprint_id: uuid.UUID):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tag_sql.get_tags(cursor, blueprint_id)
            return jsonify(data)


def create_blueprint_tags(blueprint_id: uuid.UUID, tags: list[str]):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = []
            for tag in tags:
                data.append(tag_sql.insert_tag(cursor, blueprint_id, tag))
            return jsonify(data)


def replace_blueprint_tags(blueprint_id: uuid.UUID, tags: list[str]):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            tag_sql.delete_all_blueprint_tags(cursor, blueprint_id)
            for tag in tags:
                tag_sql.insert_tag(cursor, blueprint_id, tag)


def delete_blueprint_tag(blueprint_id: uuid.UUID, tag: str):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            rows = tag_sql.delete_tag(cursor, blueprint_id, tag)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)


def delete_blueprint_tags(blueprint_id: uuid.UUID):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tag_sql.delete_all_blueprint_tags(cursor, blueprint_id)
            return jsonify(data)


def get_blueprint_ids_by_tag(tag: str):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tag_sql.get_blueprint_ids_by_tag(cursor, tag)
            return jsonify(data)
