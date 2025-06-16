from psycopg import sql
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import uuid
from .tag_utils import tag_to_array, array_to_tag, convert_tag_dict


def get_all_tag_descriptions(curs):
    query = sql.SQL(
        """
SELECT id, tag, description, created_at, updated_at
  FROM tag_descriptions
  ORDER BY tag
"""
    )
    curs.execute(query)
    return [convert_tag_dict(dict(row)) for row in curs.fetchall()]


def get_tag_description_by_id(curs, tag_description_id: uuid.UUID):
    query = sql.SQL(
        """
SELECT id, tag, description, created_at, updated_at
  FROM tag_descriptions
  WHERE id = {id}
"""
    ).format(id=sql.Literal(tag_description_id))
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag description not found")
    return convert_tag_dict(dict(result))


def get_tag_description_by_tag(curs, tag):
    """Get tag descriptions by tag, including child tags (prefix match)."""
    tag_arr = tag_to_array(tag)
    n = len(tag_arr)
    query = sql.SQL(
        """
        SELECT id, tag, description, created_at, updated_at
        FROM tag_descriptions
        WHERE tag[1:{n}] = {prefix}
        ORDER BY array_length(tag, 1), tag
        """
    ).format(
        n=sql.Literal(n),
        prefix=sql.Literal(tag_arr)
    )
    curs.execute(query)
    return [convert_tag_dict(dict(row)) for row in curs.fetchall()]


def insert_tag_description(curs, tag: list[str], description: str):
    query = sql.SQL(
        """
INSERT INTO tag_descriptions (tag, description)
  VALUES (%s, %s)
  RETURNING id, tag, description, created_at, updated_at
"""
    )
    curs.execute(query, (tag, description))
    return convert_tag_dict(dict(curs.fetchone()))


def update_tag_description(curs, tag_description_id: uuid.UUID, description: str):
    query = sql.SQL(
        """
UPDATE tag_descriptions
  SET description = %s,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = %s
  RETURNING id, tag, description, created_at, updated_at
"""
    )
    curs.execute(query, (description, tag_description_id))
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag description not found")
    return convert_tag_dict(dict(result))


def update_tag_description_by_tag(curs, tag, description: str):
    tag_arr = tag_to_array(tag)
    clauses = [sql.SQL("array_length(tag, 1) = {n}").format(n=sql.Literal(len(tag_arr)))]
    for i, val in enumerate(tag_arr):
        clauses.append(sql.SQL("tag[{i}] = {val}").format(i=sql.Literal(i+1), val=sql.Literal(val)))
    where_clause = sql.SQL(" AND ").join(clauses)
    query = sql.SQL(
        """
UPDATE tag_descriptions
  SET description = %s,
      updated_at = CURRENT_TIMESTAMP
  WHERE {where_clause}
  RETURNING id, tag, description, created_at, updated_at
"""
    ).format(where_clause=where_clause)
    curs.execute(query, (description,))
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag description not found")
    return convert_tag_dict(dict(result))


def delete_tag_description(curs, tag_description_id: uuid.UUID):
    query = sql.SQL(
        """
DELETE FROM tag_descriptions
  WHERE id = %s
  RETURNING id
"""
    )
    curs.execute(query, (tag_description_id,))
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag description not found")
    return dict(result)


def delete_tag_description_by_tag(curs, tag):
    tag_arr = tag_to_array(tag)
    clauses = [sql.SQL("array_length(tag, 1) = {n}").format(n=sql.Literal(len(tag_arr)))]
    for i, val in enumerate(tag_arr):
        clauses.append(sql.SQL("tag[{i}] = {val}").format(i=sql.Literal(i+1), val=sql.Literal(val)))
    where_clause = sql.SQL(" AND ").join(clauses)
    query = sql.SQL(
        """
DELETE FROM tag_descriptions
  WHERE {where_clause}
  RETURNING id
"""
    ).format(where_clause=where_clause)
    curs.execute(query)
    result = curs.fetchone()
    if not result:
        raise NotFound("Tag description not found")
    return dict(result)


def get_tag_descriptions_by_tag(curs, tag):
    """Get tag descriptions by tag, including child tags."""
    curs.execute("""
        SELECT id, tag, description, created_at, updated_at
        FROM tag_descriptions
        WHERE tag @> %s
        ORDER BY array_length(tag, 1), tag
    """, (tag,))
    return curs.fetchall() 