from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid

import openforge.db.sql.blueprint_documentation as blueprint_doc_sql


def get_blueprint_documentation(blueprint_id):
    """Get all documentation for a blueprint."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
    except ValueError:
        return jsonify({"error": "Invalid blueprint ID"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = blueprint_doc_sql.get_blueprint_documentation(cursor, blueprint_uuid)
            return jsonify({"documentation": data})


def get_blueprint_documentation_entry(blueprint_id, doc_id):
    """Get specific documentation entry."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid ID"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = blueprint_doc_sql.get_blueprint_documentation_by_id(cursor, doc_uuid)
                # Verify the documentation belongs to the specified blueprint
                if str(data["blueprint_id"]) != blueprint_id:
                    return jsonify({"error": "Documentation not found for this blueprint"}), 404
                return jsonify({"documentation": data})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404


def create_blueprint_documentation(blueprint_id):
    """Create new documentation for a blueprint."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
    except ValueError:
        return jsonify({"error": "Invalid blueprint ID"}), 400
    
    if not request.json:
        return jsonify({"error": "Request body required"}), 400
    
    document = request.json.get("document")
    document_type = request.json.get("document_type", "changelog")
    
    if not document:
        return jsonify({"error": "Document content required"}), 400
    
    if document_type not in ["changelog", "instructions"]:
        return jsonify({"error": "Invalid document type"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = blueprint_doc_sql.create_blueprint_documentation(
                    cursor, blueprint_uuid, document, document_type
                )
                return jsonify({"documentation": data}), 201
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def update_blueprint_documentation(blueprint_id, doc_id):
    """Update specific documentation entry."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid ID"}), 400
    
    if not request.json:
        return jsonify({"error": "Request body required"}), 400
    
    document = request.json.get("document")
    document_type = request.json.get("document_type")
    
    if not document:
        return jsonify({"error": "Document content required"}), 400
    
    if document_type and document_type not in ["changelog", "instructions"]:
        return jsonify({"error": "Invalid document type"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                # First verify the documentation belongs to the specified blueprint
                existing_doc = blueprint_doc_sql.get_blueprint_documentation_by_id(cursor, doc_uuid)
                if str(existing_doc["blueprint_id"]) != blueprint_id:
                    return jsonify({"error": "Documentation not found for this blueprint"}), 404
                
                data = blueprint_doc_sql.update_blueprint_documentation(
                    cursor, doc_uuid, document, document_type
                )
                return jsonify({"documentation": data})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def delete_blueprint_documentation(blueprint_id, doc_id):
    """Delete specific documentation entry."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid ID"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                # First verify the documentation belongs to the specified blueprint
                existing_doc = blueprint_doc_sql.get_blueprint_documentation_by_id(cursor, doc_uuid)
                if str(existing_doc["blueprint_id"]) != blueprint_id:
                    return jsonify({"error": "Documentation not found for this blueprint"}), 404
                
                blueprint_doc_sql.delete_blueprint_documentation(cursor, doc_uuid)
                return jsonify({"success": True})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def get_blueprint_changelog_history(blueprint_id):
    """Get changelog history for blueprint."""
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
    except ValueError:
        return jsonify({"error": "Invalid blueprint ID"}), 400
    
    limit = request.args.get("limit", 10, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    if limit < 1 or limit > 100:
        return jsonify({"error": "Limit must be between 1 and 100"}), 400
    
    if offset < 0:
        return jsonify({"error": "Offset must be non-negative"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = blueprint_doc_sql.get_blueprint_changelog_history(
                    cursor, blueprint_uuid, limit, offset
                )
                return jsonify(data)
            except Exception as e:
                return jsonify({"error": str(e)}), 500 