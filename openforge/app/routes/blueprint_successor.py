from flask import jsonify, current_app
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid
import logging

import openforge.db.sql.blueprints as blueprint_sql
import openforge.db.sql.blueprint_documentation as blueprint_doc_sql

logger = logging.getLogger(__name__)


def disconnect_successor(blueprint_id: str):
    """Disconnect a successor relationship and delete any associated changelog.
    
    This endpoint:
    1. Sets the successor_id to null on the deprecated blueprint
    2. Deletes any changelog documentation on the successor
    """
    try:
        blueprint_uuid = uuid.UUID(blueprint_id)
    except ValueError:
        return jsonify({"error": "Invalid blueprint ID format"}), 400
    
    with current_app.db.connection() as conn:
        with conn.transaction():
            with conn.cursor(row_factory=dict_row) as cursor:
                # First, get the blueprint to find its successor
                try:
                    blueprint = blueprint_sql.get_blueprint_by_id(cursor, blueprint_uuid)
                except NotFound:
                    return jsonify({"error": "Blueprint not found"}), 404
                
                if not blueprint.get('successor_id'):
                    return jsonify({"error": "Blueprint has no successor"}), 400
                
                successor_id = blueprint['successor_id']
                
                # Delete any changelog documentation on the successor
                try:
                    # Get all documentation for the successor
                    docs = blueprint_doc_sql.get_blueprint_documentation(cursor, successor_id)
                    
                    # Delete any changelog entries
                    for doc in docs:
                        if doc['document_type'] == 'changelog':
                            blueprint_doc_sql.delete_blueprint_documentation(cursor, doc['id'])
                            logger.info(f"Deleted changelog {doc['id']} from successor {successor_id}")
                except NotFound:
                    logger.warning(f"No changelog documentation found for successor {successor_id}")
                    # Continue if no changelog exists
                except Exception as e:
                    logger.error(f"Unexpected error deleting changelog: {e}", exc_info=True)
                    # Continue even if changelog deletion fails
                
                # Remove the successor relationship
                updated_blueprint = blueprint_sql.update_blueprint(cursor, blueprint_uuid, {
                    'successor_id': None
                })
                
                return jsonify({
                    "success": True,
                    "blueprint": updated_blueprint
                })