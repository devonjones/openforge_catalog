import uuid
from pprint import pprint
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


def delete_all_tags(curs: cursor) -> dict:
    query = sql.SQL("DELETE FROM tags")
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


def tag_search_blueprints(
    curs: cursor, require: list[str], deny: list[str], paging: uuid.UUID | None = None
) -> list[uuid.UUID]:
    parts = [
        sql.SQL("SELECT *"),
        sql.SQL("  FROM blueprints"),
        sql.SQL("  WHERE blueprints.id IN ("),
        _query_tags_basics(require, deny, paging),
        sql.SQL("  )"),
        sql.SQL("  ORDER BY blueprints.id"),
    ]
    query = sql.Composed(parts)
    curs.execute(query)
    return curs.fetchall()


def tag_search_tags(
    curs: cursor,
    require: list[str],
    deny: list[str],
    paging: uuid.UUID | None = None,
) -> list[uuid.UUID]:
    parts = [
        sql.SQL("SELECT *"),
        sql.SQL("  FROM tags AS bptags"),
        sql.SQL("  WHERE bptags.blueprint_id IN ("),
        _query_tags_basics(require, deny, paging),
        sql.SQL("  )"),
        sql.SQL("  ORDER BY bptags.blueprint_id"),
    ]
    query = sql.Composed(parts)
    curs.execute(query)
    return curs.fetchall()


def tag_search_blueprint_count(
    curs: cursor, require: list[str], deny: list[str]
) -> int:
    parts = [
        sql.SQL("SELECT COUNT(*)"),
        sql.SQL("  FROM blueprints"),
        sql.SQL("  WHERE blueprints.id IN ("),
        _query_tags_basics(require, deny, limit=False),
        sql.SQL("  )"),
    ]
    query = sql.Composed(parts)
    curs.execute(query)
    return curs.fetchone()["count"]


def tag_search_tag_count(
    curs: cursor, require: list[str], deny: list[str]
) -> list[dict]:
    parts = [
        sql.SQL("SELECT COUNT(*) AS tag_count, t.tag"),
        sql.SQL("  FROM tags AS t"),
        sql.SQL("  WHERE t.blueprint_id IN ("),
        _query_tags_basics(require, deny, limit=False),
        sql.SQL("  )"),
        sql.SQL("  GROUP BY t.tag"),
    ]
    query = sql.Composed(parts)
    curs.execute(query)
    return curs.fetchall()


def _query_tags_basics(
    require: list[str],
    deny: list[str],
    paging: uuid.UUID | None = None,
    limit: bool = True,
) -> sql.Composed:
    query_parts = [
        sql.SQL(
            """
SELECT DISTINCT bp.id
  FROM blueprints AS bp"""
        )
    ]
    query_parts.append(_query_tags_require(require))
    deny_parts = []
    if len(deny) > 0:
        deny_parts.append(sql.SQL("    AND bp.id NOT IN ("))
        deny_parts.append(_query_tags_deny(deny))
        deny_parts.append(sql.SQL("    )"))

    if paging:
        query_parts.append(
            sql.SQL("  AND bp.id > {paging}").format(paging=sql.Literal(paging))
        )
    end_parts = [sql.SQL("  ORDER BY bp.id")]
    if limit:
        end_parts.append(sql.SQL("  LIMIT 100"))
    query = sql.Composed(query_parts + deny_parts + end_parts)
    return query.join("\n")


def _query_tags_require(require: list[str]) -> sql.Composed:
    joins = []
    wheres = []
    counter = 0
    where = "WHERE"
    for req in require:
        if "tag" in req:
            tags_name = f"tags_{counter}"
            joins.append(
                sql.SQL(
                    "    JOIN tags AS {table} ON bp.id = {table}.blueprint_id"
                ).format(table=sql.Identifier(tags_name))
            )
            tags = req["tag"].split("|")
            wheres.append(
                sql.SQL("  %s {table}.tag = {tags}" % where).format(
                    table=sql.Identifier(tags_name),
                    tags=sql.Literal(tags),
                )
            )
            counter += 1
            where = "  AND"
    return sql.Composed(joins + wheres).join("\n")


def _query_tags_deny(deny: list[str]) -> sql.Composed:
    deny_parts = []
    if len(deny) > 0:
        deny_parts.extend(
            [
                sql.SQL("      SELECT bp_neg.id"),
                sql.SQL("  FROM blueprints AS bp_neg"),
            ]
        )

        neg_joins = []
        neg_wheres = []
        neg_counter = 0
        neg_where = "WHERE"

        for d in deny:
            if "tag" in d:
                neg_tags_name = f"tags_{neg_counter}_neg"
                neg_tags = d["tag"].split("|")
                neg_joins.append(
                    sql.SQL(
                        "    JOIN tags AS {table} ON bp_neg.id = {table}.blueprint_id"
                    ).format(table=sql.Identifier(neg_tags_name))
                )
                neg_wheres.append(
                    sql.SQL("  %s {table}.tag = {tags}" % neg_where).format(
                        table=sql.Identifier(neg_tags_name),
                        tags=sql.Literal(neg_tags),
                    )
                )
                neg_where = "  AND"
                neg_counter += 1
    return sql.Composed(deny_parts + neg_joins + neg_wheres).join("\n      ")
