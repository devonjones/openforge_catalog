import uuid
from psycopg import cursor, sql


def _convert_tag(tag: dict) -> dict:
    tag["tag"] = "|".join(tag["tag"])
    return tag


def get_tags(curs: cursor, blueprint_id: uuid.UUID) -> list[dict]:
    query = sql.SQL(
        """
SELECT id, blueprint_id, tag, created_at, updated_at
  FROM tags
  WHERE blueprint_id = {blueprint_id}
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    return [_convert_tag(row) for row in curs.fetchall()]


def get_tag_by_id(curs: cursor, tag_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT id, blueprint_id, tag, created_at, updated_at
  FROM tags
  WHERE id = {tag_id}
"""
    ).format(tag_id=sql.Literal(tag_id))
    curs.execute(query)
    return _convert_tag(curs.fetchone())


def insert_tag(curs: cursor, blueprint_id: uuid.UUID, tag: str) -> dict:
    query = sql.SQL(
        """
WITH new_tags AS (
  INSERT INTO tags (
    blueprint_id, tag
  ) VALUES (
    {blueprint_id}, {tag}
  ) ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT COALESCE(
  (SELECT id FROM new_tags),
  (SELECT id FROM tags WHERE blueprint_id = {blueprint_id} AND tag = {tag})
) AS id
"""
    ).format(blueprint_id=sql.Literal(blueprint_id), tag=sql.Literal(tag.split("|")))
    curs.execute(query)
    return get_tag_by_id(curs, curs.fetchone()["id"])


def delete_tag(curs: cursor, blueprint_id: uuid.UUID, tag: str) -> dict:
    query = sql.SQL(
        """
DELETE FROM tags
  WHERE blueprint_id = {blueprint_id}
    AND tag = {tag}
"""
    ).format(blueprint_id=sql.Literal(blueprint_id), tag=sql.Literal(tag.split("|")))
    curs.execute(query)
    return curs.rowcount


def delete_all_blueprint_tags(curs: cursor, blueprint_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
DELETE FROM tags
  WHERE blueprint_id = {blueprint_id}
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    return curs.rowcount


def get_blueprint_ids_by_tag(curs: cursor, tag: str) -> list[uuid.UUID]:
    tags = tag.split("|")
    query_list = [
        sql.SQL(
            """
SELECT DISTINCT blueprint_id
  FROM tags
  WHERE tag[1] = {tag}
"""
        ).format(tag=sql.Literal(tags.pop(0)))
    ]
    counter = 1
    for tag in tags:
        counter += 1
        query_list.append(
            sql.SQL(
                """
    AND tag[{counter}] = {tag}
"""
            ).format(tag=sql.Literal(tag), counter=sql.Literal(counter))
        )
    query = sql.Composed(query_list)
    curs.execute(query.join("\n"))
    return [row["blueprint_id"] for row in curs.fetchall()]
