from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row

import openforge.db.sql.blueprints as blueprint_sql


def get_blueprints():
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_all_blueprints(cursor)
            return jsonify(data)


def create_blueprint():
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.insert_blueprint(cursor, request.json)
            return jsonify(data)


def get_blueprint_by_id(blueprint_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_blueprint_by_id(cursor, blueprint_id)
            return jsonify(data)


def update_blueprint(blueprint_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.update_blueprint(cursor, blueprint_id, request.json)
            return jsonify(data)


def delete_blueprint(blueprint_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            rows = blueprint_sql.delete_blueprint(cursor, blueprint_id)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)
