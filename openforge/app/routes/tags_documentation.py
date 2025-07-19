from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid

import openforge.db.sql.tags_documentation as tags_doc_sql


def get_tag_documentation(tag_array):
    """Get documentation for a specific tag."""
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tags_doc_sql.get_tag_documentation(cursor, tag_array)
            return jsonify({"documentation": data})


def get_tag_documentation_entry(tag_array, doc_id):
    """Get specific tag documentation entry."""
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid documentation ID"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = tags_doc_sql.get_tag_documentation_by_id(cursor, doc_uuid)
                # Verify the documentation belongs to the specified tag
                if data["tag"] != tag_array:
                    return jsonify({"error": "Documentation not found for this tag"}), 404
                return jsonify({"documentation": data})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404


def create_tag_documentation(tag_array):
    """Create new documentation for a tag."""
    if not request.json:
        return jsonify({"error": "Request body required"}), 400
    
    document = request.json.get("document")
    document_type = request.json.get("document_type", "instructions")
    
    if not document:
        return jsonify({"error": "Document content required"}), 400
    
    if document_type not in ["changelog", "instructions"]:
        return jsonify({"error": "Invalid document type"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = tags_doc_sql.create_tag_documentation(
                    cursor, tag_array, document, document_type
                )
                return jsonify({"documentation": data}), 201
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def update_tag_documentation(tag_array, doc_id):
    """Update specific tag documentation entry."""
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid documentation ID"}), 400
    
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
                # First verify the documentation belongs to the specified tag
                existing_doc = tags_doc_sql.get_tag_documentation_by_id(cursor, doc_uuid)
                if existing_doc["tag"] != tag_array:
                    return jsonify({"error": "Documentation not found for this tag"}), 404
                
                data = tags_doc_sql.update_tag_documentation(
                    cursor, doc_uuid, document, document_type
                )
                return jsonify({"documentation": data})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def delete_tag_documentation(tag_array, doc_id):
    """Delete specific tag documentation entry."""
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        return jsonify({"error": "Invalid documentation ID"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                # First verify the documentation belongs to the specified tag
                existing_doc = tags_doc_sql.get_tag_documentation_by_id(cursor, doc_uuid)
                if existing_doc["tag"] != tag_array:
                    return jsonify({"error": "Documentation not found for this tag"}), 404
                
                tags_doc_sql.delete_tag_documentation(cursor, doc_uuid)
                return jsonify({"success": True})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except Exception as e:
                return jsonify({"error": str(e)}), 500


def get_all_tag_documentation():
    """Get all tag documentation."""
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tags_doc_sql.get_all_tag_documentation(cursor)
            return jsonify({"documentation": data})


def get_tag_documentation_by_tag_prefix(tag):
    """Get tag documentation by tag, including child tags (prefix match)."""
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tags_doc_sql.get_tag_documentation_by_tag_prefix(cursor, tag)
            return jsonify({"documentation": data}) 