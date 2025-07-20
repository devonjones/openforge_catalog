from flask import jsonify, request, current_app, make_response, abort
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid

import openforge.db.sql.tags_documentation as tags_doc_sql
from openforge.db.sql.tag_utils import array_to_tag


def _verify_tag_documentation_ownership(cursor, doc_uuid, tag_array):
    """Verify that documentation belongs to the specified tag.
    
    Args:
        cursor: Database cursor
        doc_uuid: Documentation UUID
        tag_array: Tag array to verify ownership against
        
    Returns:
        dict: Documentation data if ownership is verified
        
    Raises:
        NotFound: If documentation doesn't exist
        ValueError: If documentation doesn't belong to tag
    """
    existing_doc = tags_doc_sql.get_tag_documentation_by_id(cursor, doc_uuid)
    if existing_doc["tag"] != array_to_tag(tag_array):
        raise ValueError("Documentation not found for this tag")
    return existing_doc


def get_tag_documentation(tag_array):
    """Get documentation for a specific tag."""
    # Validate tag format
    if not tag_array or len(tag_array) < 2:
        return jsonify({"error": "Invalid tag format. Expected at least 2 components separated by '/'."}), 400
    
    # Check for empty components
    if any(not component or component.strip() == "" for component in tag_array):
        return jsonify({"error": "Invalid tag format. Tag components cannot be empty."}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            data = tags_doc_sql.get_tag_documentation(cursor, tag_array)
            if not data:
                # Return 404 with empty array for semantic correctness while maintaining useful response structure
                return jsonify({"documentation": []}), 404
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
                if data["tag"] != array_to_tag(tag_array):
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
    
    if document_type != "instructions":
        return jsonify({"error": "Invalid document type for tags, must be 'instructions'"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                data = tags_doc_sql.create_tag_documentation(
                    cursor, tag_array, document, document_type
                )
                return jsonify({"documentation": data}), 201
            except Exception as e:
                current_app.logger.error(f"Error creating tag documentation: {e}")
                return jsonify({"error": "An internal error occurred"}), 500


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
    
    if document_type and document_type != "instructions":
        return jsonify({"error": "Invalid document type for tags, must be 'instructions'"}), 400
    
    with current_app.db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            try:
                # First verify the documentation belongs to the specified tag
                existing_doc = _verify_tag_documentation_ownership(cursor, doc_uuid, tag_array)
                
                data = tags_doc_sql.update_tag_documentation(
                    cursor, doc_uuid, document, document_type
                )
                return jsonify({"documentation": data})
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except ValueError as e:
                return jsonify({"error": str(e)}), 404
            except Exception as e:
                current_app.logger.error(f"Error updating tag documentation: {e}")
                return jsonify({"error": "An internal error occurred"}), 500


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
                existing_doc = _verify_tag_documentation_ownership(cursor, doc_uuid, tag_array)
                
                tags_doc_sql.delete_tag_documentation(cursor, doc_uuid)
                return "", 204
            except NotFound:
                return jsonify({"error": "Documentation not found"}), 404
            except ValueError as e:
                return jsonify({"error": str(e)}), 404
            except Exception as e:
                current_app.logger.error(f"Error deleting tag documentation: {e}")
                return jsonify({"error": "An internal error occurred"}), 500


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