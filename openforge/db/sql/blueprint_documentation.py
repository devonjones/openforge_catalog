from psycopg import sql
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid


def get_blueprint_documentation(curs, blueprint_id: uuid.UUID):
    """Get all documentation for a blueprint."""
    query = sql.SQL(
        """
SELECT id, blueprint_id, document, document_type, created_at, updated_at
  FROM blueprint_documentation
  WHERE blueprint_id = {blueprint_id}
  ORDER BY created_at DESC
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    return [dict(row) for row in curs.fetchall()]


def get_blueprint_documentation_by_id(curs, doc_id: uuid.UUID):
    """Get specific documentation entry by ID."""
    query = sql.SQL(
        """
SELECT id, blueprint_id, document, document_type, created_at, updated_at
  FROM blueprint_documentation
  WHERE id = {doc_id}
"""
    ).format(doc_id=sql.Literal(doc_id))
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Blueprint documentation not found")
    return dict(result)


def create_blueprint_documentation(curs, blueprint_id: uuid.UUID, document: str, document_type: str = 'changelog'):
    """Create new documentation for a blueprint."""
    query = sql.SQL(
        """
INSERT INTO blueprint_documentation (blueprint_id, document, document_type)
  VALUES ({blueprint_id}, %s, %s)
  RETURNING id, blueprint_id, document, document_type, created_at, updated_at
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query, (document, document_type))
    return dict(curs.fetchone())


def update_blueprint_documentation(curs, doc_id: uuid.UUID, document: str, document_type: str = None):
    """Update specific documentation entry."""
    if document_type is not None:
        query = sql.SQL(
            """
UPDATE blueprint_documentation
  SET document = %s, document_type = %s, updated_at = CURRENT_TIMESTAMP
  WHERE id = {doc_id}
  RETURNING id, blueprint_id, document, document_type, created_at, updated_at
"""
        ).format(doc_id=sql.Literal(doc_id))
        curs.execute(query, (document, document_type))
    else:
        query = sql.SQL(
            """
UPDATE blueprint_documentation
  SET document = %s, updated_at = CURRENT_TIMESTAMP
  WHERE id = {doc_id}
  RETURNING id, blueprint_id, document, document_type, created_at, updated_at
"""
        ).format(doc_id=sql.Literal(doc_id))
        curs.execute(query, (document,))
    
    result = curs.fetchone()
    if not result:
        raise NotFound("Blueprint documentation not found")
    return dict(result)


def delete_blueprint_documentation(curs, doc_id: uuid.UUID):
    """Delete specific documentation entry."""
    query = sql.SQL(
        """
DELETE FROM blueprint_documentation
  WHERE id = {doc_id}
  RETURNING id
"""
    ).format(doc_id=sql.Literal(doc_id))
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Blueprint documentation not found")
    return dict(result)


def get_blueprint_changelog_history(curs, blueprint_id: uuid.UUID, limit: int = 10, offset: int = 0):
    """Get changelog history for blueprint using the SQL function."""
    query = sql.SQL(
        """
SELECT blueprint_id, blueprint_name, changelog, created_at, depth, successor_id, deprecated
  FROM get_blueprint_changelog_history({blueprint_id}, 10)
  ORDER BY depth ASC, created_at DESC NULLS LAST
  LIMIT {limit} OFFSET {offset}
"""
    ).format(
        blueprint_id=sql.Literal(blueprint_id),
        limit=sql.Literal(limit),
        offset=sql.Literal(offset)
    )
    curs.execute(query)
    changelogs = [dict(row) for row in curs.fetchall()]
    
    # Get total count for pagination
    count_query = sql.SQL(
        """
SELECT COUNT(*) as total_count
  FROM get_blueprint_changelog_history({blueprint_id}, 10)
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(count_query)
    total_count = curs.fetchone()['total_count']
    
    return {
        "changelogs": changelogs,
        "has_more": (offset + limit) < total_count,
        "total_count": total_count
    } 