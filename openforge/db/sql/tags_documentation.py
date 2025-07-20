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
  VALUES ({tag_array}, %s, %s)
  RETURNING id, tag, document, document_type, created_at, updated_at
"""
    ).format(tag_array=sql.Literal(tag_array))
    curs.execute(query, (document, document_type))
    return convert_tag_dict(dict(curs.fetchone()))


def update_tag_documentation(curs, doc_id: uuid.UUID, document: str, document_type: str = None):
    """Update specific tag documentation entry."""
    update_fields = [sql.SQL("document = %s")]
    params = [document]

    if document_type is not None:
        update_fields.append(sql.SQL("document_type = %s"))
        params.append(document_type)

    query = sql.SQL(
        """
UPDATE tag_documentation
  SET {fields}, updated_at = CURRENT_TIMESTAMP
  WHERE id = {doc_id}
  RETURNING id, tag, document, document_type, created_at, updated_at
"""
    ).format(
        fields=sql.SQL(', ').join(update_fields),
        doc_id=sql.Literal(doc_id)
    )
    curs.execute(query, tuple(params))

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


def get_tag_documentation_for_multiple_tags(curs, tag_arrays: list[list[str]]):
    """Get documentation for multiple tags in a single query.
    
    Args:
        curs: Database cursor
        tag_arrays: List of tag arrays to get documentation for
        
    Returns:
        dict: Mapping of tag string (pipe-delimited) to list of documentation
    """
    if not tag_arrays:
        return {}
    
    # Build the query with multiple tag conditions
    conditions = []
    for tag_array in tag_arrays:
        conditions.append(sql.SQL("tag = {}").format(sql.Literal(tag_array)))
    
    query = sql.SQL(
        """
SELECT id, tag, document, document_type, created_at, updated_at
  FROM tag_documentation
  WHERE {conditions}
  ORDER BY tag, created_at DESC
"""
    ).format(conditions=sql.SQL(" OR ").join(conditions))
    
    curs.execute(query)
    results = [convert_tag_dict(dict(row)) for row in curs.fetchall()]
    
    # Group results by tag
    tag_documentation = {}
    for tag_array in tag_arrays:
        tag_string = array_to_tag(tag_array)
        tag_documentation[tag_string] = []
    
    for result in results:
        tag_string = result["tag"]  # This is already converted to pipe-delimited string
        if tag_string in tag_documentation:
            tag_documentation[tag_string].append(result)
    
    return tag_documentation 