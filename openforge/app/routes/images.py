import uuid
from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from jsonschema.exceptions import ValidationError

import openforge.db.sql.images as image_sql
from openforge.openapi import validate_schema


def get_images():
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = image_sql.get_all_images(cursor)
            blueprint_images = image_sql.get_all_blueprint_images(cursor)
            blueprint_images_map = {}
            for bi in blueprint_images:
                blueprint_images_map.setdefault(bi["image_id"], []).append(
                    bi["blueprint_id"]
                )
            for image in data:
                image["blueprint_ids"] = blueprint_images_map.get(image["id"], [])
            return jsonify(data)


def create_image():
    try:
        validate_schema("image.yaml", request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            req_data = request.json
            data = image_sql.insert_image(cursor, **req_data)
            for blueprint_id in req_data.get("blueprint_ids", []):
                image_sql.insert_blueprint_image(cursor, blueprint_id, data["id"])
            data["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, data["id"]
            )
            return jsonify(data), 201


def get_image_by_id(image_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = image_sql.get_image_by_id(cursor, image_id)
            if not data:
                return jsonify({"error": "Image not found"}), 404
            data["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, image_id
            )
            return jsonify(data), 200


def update_image(image_id):
    try:
        validate_schema("image.yaml", request.json, required=False)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            image = image_sql.update_image(cursor, image_id, request.json)
            if request.json.get("blueprint_ids"):
                image_sql.replace_blueprints_for_image(
                    cursor, image_id, request.json["blueprint_ids"]
                )
            image["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, image_id
            )
            return jsonify(image), 200


def delete_image(image_id):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            rows = image_sql.delete_image(cursor, image_id)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)
