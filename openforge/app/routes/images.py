import uuid
import os
from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from jsonschema.exceptions import ValidationError
import boto3
from werkzeug.utils import secure_filename
from botocore.config import Config

import openforge.db.sql.images as image_sql
from openforge.openapi import validate_schema


def get_images():
    with current_app.db.connection() as conn:
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
    # Check if this is a multipart request with file upload
    if request.content_type and 'multipart/form-data' in request.content_type:
        return _create_image_with_upload()
    elif request.content_type and 'application/json' in request.content_type:
        return _create_image_metadata_only()
    else:
        return jsonify({"error": "Invalid content type. Use application/json for metadata only or multipart/form-data for file upload"}), 400

def _create_image_metadata_only():
    try:
        validate_schema("image.yaml", request.json)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            req_data = request.json
            data = image_sql.insert_image(cursor, **req_data)
            for blueprint_id in req_data.get("blueprint_ids", []):
                image_sql.insert_blueprint_image(cursor, blueprint_id, data["id"])
            data["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, data["id"]
            )
            return jsonify(data), 201

def _create_image_with_upload():
    try:
        # Get JSON metadata from form data
        metadata_json = request.form.get('metadata')
        if not metadata_json:
            return jsonify({"error": "metadata field is required"}), 400
        
        import json
        metadata = json.loads(metadata_json)
        # Don't validate schema yet - we'll add image_url after S3 upload
    except (json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 400
    
    # Check if file was uploaded (following Flask patterns)
    if 'file' not in request.files:
        return jsonify({"error": "file field is required"}), 400
    
    file = request.files['file']
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        return jsonify({"error": "no file selected"}), 400
    
    # Upload to S3
    filename = secure_filename(file.filename)
    s3_path = f"documentation/images/{filename}"
    
    try:
        # Use Cloudflare R2 configuration
        endpoint_url = current_app.config.get('CLOUDFLARE_ENDPOINT')
        access_key_id = current_app.config.get('CLOUDFLARE_ACCESS_KEY_ID')
        secret_access_key = current_app.config.get('CLOUDFLARE_SECRET_ACCESS_KEY')
        bucket_name = current_app.config.get('S3_BUCKET_NAME')
        
        if not all([endpoint_url, access_key_id, secret_access_key, bucket_name]):
            return jsonify({"error": "Cloudflare R2 configuration incomplete"}), 500
        
        s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )
        
        # Upload file to S3
        s3_client.upload_fileobj(
            file,
            bucket_name,
            s3_path,
            ExtraArgs={'ContentType': file.content_type or 'application/octet-stream'}
        )
        
        # Generate URL using FILE_DOMAIN
        file_domain = current_app.config.get('FILE_DOMAIN', f"https://{bucket_name}.s3.amazonaws.com")
        image_url = f"{file_domain}/{s3_path}"
        
        # Update metadata with the S3 URL
        metadata['image_url'] = image_url
        
        # Now validate the complete metadata
        try:
            validate_schema("image.yaml", metadata)
        except ValidationError as e:
            return jsonify({"error": str(e)}), 400
        
        with current_app.db.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                data = image_sql.insert_image(cursor, **metadata)
                for blueprint_id in metadata.get("blueprint_ids", []):
                    image_sql.insert_blueprint_image(cursor, blueprint_id, data["id"])
                data["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                    cursor, data["id"]
                )
                return jsonify(data), 201
                
    except Exception as e:
        return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500


def get_image_by_id(image_id):
    with current_app.db.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = image_sql.get_image_by_id(cursor, image_id)
            if not data:
                return jsonify({"error": "Image not found"}), 404
            data["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, image_id
            )
            return jsonify(data), 200


def update_image(image_id):
    # Check if this is a multipart request with file upload
    if request.content_type and 'multipart/form-data' in request.content_type:
        return _update_image_with_upload(image_id)
    elif request.content_type and 'application/json' in request.content_type:
        return _update_image_metadata_only(image_id)
    else:
        return jsonify({"error": "Invalid content type. Use application/json for metadata only or multipart/form-data for file upload"}), 400

def _update_image_metadata_only(image_id):
    try:
        validate_schema("image.yaml", request.json, required=False)
    except ValidationError as e:
        return jsonify({"error": str(e)}), 400
    with current_app.db.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            image = image_sql.update_image(cursor, image_id, request.json)
            if request.json and request.json.get("blueprint_ids"):
                image_sql.replace_blueprints_for_image(
                    cursor, image_id, request.json["blueprint_ids"]
                )
            image["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, image_id
            )
            return jsonify(image), 200

def _update_image_with_upload(image_id):
    try:
        # Get JSON metadata from form data (optional for PATCH)
        metadata = {}
        if 'metadata' in request.form:
            import json
            metadata = json.loads(request.form['metadata'])
            validate_schema("image.yaml", metadata, required=False)
    except (ValidationError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 400
    
    # Check if file was uploaded
    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            # Upload to S3
            filename = secure_filename(file.filename)
            s3_path = f"documentation/images/{filename}"
            
            try:
                # Use Cloudflare R2 configuration
                endpoint_url = current_app.config.get('CLOUDFLARE_ENDPOINT')
                access_key_id = current_app.config.get('CLOUDFLARE_ACCESS_KEY_ID')
                secret_access_key = current_app.config.get('CLOUDFLARE_SECRET_ACCESS_KEY')
                bucket_name = current_app.config.get('S3_BUCKET_NAME')
                
                if not all([endpoint_url, access_key_id, secret_access_key, bucket_name]):
                    return jsonify({"error": "Cloudflare R2 configuration incomplete"}), 500
                
                s3_client = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key,
                    config=Config(signature_version="s3v4"),
                    region_name="auto"
                )
                
                # Upload file to S3
                s3_client.upload_fileobj(
                    file,
                    bucket_name,
                    s3_path,
                    ExtraArgs={'ContentType': file.content_type}
                )
                
                # Generate URL using FILE_DOMAIN and add to metadata
                file_domain = current_app.config.get('FILE_DOMAIN', f"https://{bucket_name}.s3.amazonaws.com")
                image_url = f"{file_domain}/{s3_path}"
                metadata['image_url'] = image_url
                
            except Exception as e:
                return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500
    
    with current_app.db.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            image = image_sql.update_image(cursor, image_id, metadata)
            if metadata.get("blueprint_ids"):
                image_sql.replace_blueprints_for_image(
                    cursor, image_id, metadata["blueprint_ids"]
                )
            image["blueprint_ids"] = image_sql.get_blueprints_ids_for_image(
                cursor, image_id
            )
            return jsonify(image), 200


def delete_image(image_id):
    with current_app.db.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            rows = image_sql.delete_image(cursor, image_id)
            if rows != 0:
                return make_response("", 204)
            else:
                abort(404)
