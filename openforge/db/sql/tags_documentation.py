from psycopg import sql
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid
from .tag_utils import tag_to_array, array_to_tag, convert_tag_dict


def get_tag_documentation(curs, tag_array: list[str]):
    """Get documentation for a specific tag."""
    query = sql.SQL(
        """
SELECT id, tag, document, document_type, created_at, updated_at
  FROM tag_documentation
  WHERE tag = {tag_array}
  ORDER BY created_at DESC
"""
    ).format(tag_array=sql.Literal(tag_array))
    curs.execute(query)
    return [convert_tag_dict(dict(row)) for row in curs.fetchall()]


def get_tag_documentation_by_id(curs, doc_id: uuid.UUID):
    """Get specific tag documentation entry by ID."""
    query = sql.SQL(
        """
SELECT id, tag, document, document_type, created_at, updated_at
  FROM tag_documentation
  WHERE id = {doc_id}
"""
    ).format(doc_id=sql.Literal(doc_id))
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag documentation not found")
    return convert_tag_dict(dict(result))


def create_tag_documentation(curs, tag_array: list[str], document: str, document_type: str = 'instructions'):
    """Create new documentation for a tag."""
    query = sql.SQL(
        """
INSERT INTO tag_documentation (tag, document, document_type)
  VALUES ({tag_array}, {document}, {document_type})
  RETURNING id, tag, document, document_type, created_at, updated_at
"""
    ).format(
        tag_array=sql.Literal(tag_array),
        document=sql.Literal(document),
        document_type=sql.Literal(document_type)
    )
    curs.execute(query)
    return convert_tag_dict(dict(curs.fetchone()))


def update_tag_documentation(curs, doc_id: uuid.UUID, document: str, document_type: str = None):
    """Update specific tag documentation entry."""
    update_parts = [sql.SQL("document = {}").format(sql.Literal(document))]

    if document_type is not None:
        update_parts.append(sql.SQL("document_type = {}").format(sql.Literal(document_type)))

    query = sql.SQL(
        """
UPDATE tag_documentation
  SET {}, updated_at = CURRENT_TIMESTAMP
  WHERE id = {}
  RETURNING id, tag, document, document_type, created_at, updated_at
"""
    ).format(
        sql.SQL(', ').join(update_parts),
        sql.Literal(doc_id)
    )
    curs.execute(query)

    result = curs.fetchone()
    if not result:
        raise NotFound("Tag documentation not found")
    return convert_tag_dict(dict(result))


def delete_tag_documentation(curs, doc_id: uuid.UUID):
    """Delete specific tag documentation entry."""
    query = sql.SQL(
        """
DELETE FROM tag_documentation
  WHERE id = {doc_id}
  RETURNING id
"""
    ).format(doc_id=sql.Literal(doc_id))
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag documentation not found")
    return dict(result)


def get_all_tag_documentation(curs):
    """Get all tag documentation."""
    query = sql.SQL(
        """
SELECT id, tag, document, document_type, created_at, updated_at
  FROM tag_documentation
  ORDER BY tag, created_at DESC
"""
    )
    curs.execute(query)
    return [convert_tag_dict(dict(row)) for row in curs.fetchall()]


def get_tag_documentation_by_tag_prefix(curs, tag):
    """Get tag documentation by tag, including child tags (prefix match)."""
    tag_arr = tag_to_array(tag)
    n = len(tag_arr)
    query = sql.SQL(
        """
SELECT id, tag, document, document_type, created_at, updated_at
  FROM tag_documentation
  WHERE tag[1:{n}] = {prefix}
  ORDER BY array_length(tag, 1), tag, created_at DESC
"""
    ).format(
        n=sql.Literal(n),
        prefix=sql.Literal(tag_arr)
    )
    curs.execute(query)
    return [convert_tag_dict(dict(row)) for row in curs.fetchall()]


def get_tag_documentation_for_blueprint(curs, blueprint_id: uuid.UUID):
    """Get documentation for all tags associated with a blueprint.
    
    Args:
        curs: Database cursor
        blueprint_id: UUID of the blueprint to get tag documentation for
        
    Returns:
        dict: Mapping of tag string (pipe-delimited) to list of documentation
    """
    query = sql.SQL(
        """
SELECT td.id, td.tag, td.document, td.document_type, td.created_at, td.updated_at
  FROM tag_documentation td
  INNER JOIN tags t ON td.tag = t.tag
  WHERE t.blueprint_id = {}
  ORDER BY td.tag, td.created_at DESC
"""
    ).format(sql.Literal(blueprint_id))

    curs.execute(query)
    results = [convert_tag_dict(dict(row)) for row in curs.fetchall()]

    # Group results by tag
    tag_documentation = {}
    for result in results:
        tag_string = result["tag"]  # This is already converted to pipe-delimited string
        if tag_string not in tag_documentation:
            tag_documentation[tag_string] = []
        tag_documentation[tag_string].append(result)

    return tag_documentation 