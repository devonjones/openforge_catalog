import uuid
from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from jsonschema.exceptions import ValidationError

import openforge.db.sql.tags as tag_sql
from openforge.openapi import validate_schema


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
    try:
        validate_schema("tags.yaml", tags)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
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


def query_tags():
    try:
        validate_schema("tag_query.yaml", request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            require = request.json.get("require", [])
            deny = request.json.get("deny", [])
            paging = request.args.get("paging")
            bp_data = tag_sql.tag_search_blueprints(cursor, require, deny, paging)
            tag_data = tag_sql.tag_search_tags(cursor, require, deny, paging)
            count = tag_sql.tag_search_blueprint_count(cursor, require, deny)
            tag_count = tag_sql.tag_search_tag_count(cursor, require, deny)
            tag_count = {"|".join(tag["tag"]): tag["tag_count"] for tag in tag_count}
            image_data = tag_sql.tag_search_blueprint_images(
                cursor, require, deny, paging
            )
            bps = _merge_blueprint_tag_data(bp_data, tag_data)
            bps = _merge_blueprint_image_data(bps, image_data)
            next_paging = bps[-1]["id"] if len(bps) > 0 else None
            return jsonify(
                {
                    "total_count": count,
                    "next_paging": next_paging,
                    "blueprints": bps,
                    "tag_counts": tag_count,
                }
            )


def _merge_blueprint_tag_data(bp_data: list[dict], tag_data: list[dict]) -> list[dict]:
    for bp in bp_data:
        bp["tags"] = [
            _munge_tag(tag) for tag in tag_data if tag["blueprint_id"] == bp["id"]
        ]
    return bp_data


def _munge_tag(tag: dict) -> dict:
    return "|".join(tag["tag"])


def _merge_blueprint_image_data(
    bp_data: list[dict], image_data: list[dict]
) -> list[dict]:
    for bp in bp_data:
        bp["images"] = [
            _munge_image(image)
            for image in image_data
            if image["blueprint_id"] == bp["id"]
        ]
    return bp_data


def _munge_image(image: dict) -> dict:
    return {
        "id": image["id"],
        "image_name": image["image_name"],
        "image_url": image["image_url"],
        "created_at": image["created_at"],
        "updated_at": image["updated_at"],
    }
