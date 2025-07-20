from flask import jsonify, request, current_app, make_response, abort, redirect
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
from jsonschema.exceptions import ValidationError
import boto3
import re
from botocore.config import Config
from urllib.parse import urlparse
import uuid

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.tags as tag_sql
import openforge.db.sql.images as image_sql
from openforge.openapi import validate_schema


def _validate_uuid(uuid_string: str) -> None:
    """Validate that a string is a valid UUID, abort with 404 if not."""
    try:
        uuid.UUID(uuid_string)
    except ValueError:
        abort(404)


def get_blueprints():
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_all_blueprints(cursor)
            return jsonify(data)


def _create_blueprint_words(data: dict):
    words = set()
    for t in data.get("tags", []):
        words.update(re.split(r"[^a-zA-Z0-9]", t))
    return list(words)


def create_blueprint():
    try:
        validate_schema("blueprint.yaml", request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            req_data = request.json
            data = blueprint_sql.insert_blueprint(cursor, req_data, words=_create_blueprint_words(req_data))
            if "tags" in req_data:
                for tag in req_data["tags"]:
                    tag_sql.insert_tag(cursor, data["id"], tag)
            if "images" in req_data:
                for image in req_data["images"]:
                    image_sql.insert_image_for_blueprint(cursor, data["id"], image)
            data["tags"] = [tag["tag"] for tag in tag_sql.get_tags(cursor, data["id"])]
            data["images"] = image_sql.get_images_for_blueprint(cursor, data["id"])
            return jsonify(data), 201


def get_blueprint_by_id(blueprint_id):
    _validate_uuid(blueprint_id)
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_blueprint_by_id(cursor, blueprint_id)
            data["tags"] = [
                tag["tag"] for tag in tag_sql.get_tags(cursor, blueprint_id)
            ]
            data["images"] = image_sql.get_images_for_blueprint(cursor, data["id"])
            return jsonify(data)


def get_blueprint_by_md5(md5):
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_sql.get_blueprint_by_md5(cursor, md5)
            data["tags"] = [
                tag["tag"] for tag in tag_sql.get_tags(cursor, data["id"])
            ]
            data["images"] = image_sql.get_images_for_blueprint(cursor, data["id"])
            return jsonify(data)


def update_blueprint(blueprint_id):
    _validate_uuid(blueprint_id)
    
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
                    tag_sql.delete_all_blueprint_tags(cursor, blueprint_id)
                except NotFound:
                    pass
                for tag in req_data["tags"]:
                    tag_sql.insert_tag(cursor, blueprint_id, tag)
            if "images" in req_data:
                image_sql.replace_images_for_blueprint(
                    cursor, blueprint_id, req_data["images"]
                )
            data["tags"] = [
                tag["tag"] for tag in tag_sql.get_tags(cursor, blueprint_id)
            ]
            data["images"] = list(
                image_sql.get_images_for_blueprint(cursor, blueprint_id)
            )
            return jsonify(data)


def delete_blueprint(blueprint_id):
    _validate_uuid(blueprint_id)
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                tag_sql.delete_all_blueprint_tags(cursor, blueprint_id)
            except NotFound:
                pass
            rows = blueprint_sql.delete_blueprint(cursor, blueprint_id)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)


def download_blueprint(blueprint_id):
    _validate_uuid(blueprint_id)
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            bp = blueprint_sql.get_blueprint_by_id(cursor, blueprint_id)
            url = _get_signed_urls(bp)
            if url is None:
                abort(404)
            return redirect(url)


def _get_signed_urls(bp: dict):
    if current_app.config["CLOUDFLARE_ENDPOINT"] is None:
        return

    s3_client = boto3.client(
        "s3",
        endpoint_url=current_app.config["CLOUDFLARE_ENDPOINT"],
        aws_access_key_id=current_app.config["CLOUDFLARE_ACCESS_KEY_ID"],
        aws_secret_access_key=current_app.config["CLOUDFLARE_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
    )

    if bp["storage_address"] is None:
        return
    if bp["file_name"] is None:
        return
    parsed_url = urlparse(bp["storage_address"])
    key = parsed_url.path.lstrip("/")

    url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": "openforge-models",
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{bp["file_name"]}"',
        },
        ExpiresIn=3600,  # 1 hour
    )
    return url
