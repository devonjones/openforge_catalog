import uuid
from pprint import pprint

from psycopg import cursor, sql
from werkzeug.exceptions import NotFound


def get_all_images(curs: cursor) -> list[dict]:
    query = sql.SQL(
        """
SELECT id, image_name, image_url, created_at, updated_at
  FROM images
  ORDER BY id
"""
    )
    curs.execute(query)
    return curs.fetchall()


def get_all_blueprint_images(curs: cursor) -> list[dict]:
    query = sql.SQL(
        """
SELECT id, blueprint_id, image_id, created_at, updated_at
  FROM blueprint_images
  ORDER BY image_id
"""
    )
    curs.execute(query)
    return curs.fetchall()


def get_images_for_blueprint(curs: cursor, blueprint_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT i.id AS id, i.image_name AS image_name, i.image_url AS image_url,
    i.created_at AS created_at, i.updated_at AS updated_at
  FROM images i
    JOIN blueprint_images bi ON bi.image_id = i.id
  WHERE bi.blueprint_id = {blueprint_id}
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    return curs.fetchall()


def get_image_by_id(curs: cursor, image_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT id, image_name, image_url, created_at, updated_at
  FROM images
  WHERE id = {image_id}
"""
    ).format(image_id=sql.Literal(image_id))
    curs.execute(query)
    return curs.fetchone()


def insert_image(curs: cursor, image_name: str, image_url: str, **kwargs) -> dict:
    query = sql.SQL(
        """
WITH new_images AS (
  INSERT INTO images (
    image_name, image_url
  ) VALUES (
    {image_name}, {image_url}
  ) ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT COALESCE(
  (SELECT id FROM new_images),
  (SELECT id FROM images WHERE image_url = {image_url})
) AS id
"""
    ).format(image_name=sql.Literal(image_name), image_url=sql.Literal(image_url))
    curs.execute(query)
    return get_image_by_id(curs, curs.fetchone()["id"])


def get_blueprint_image_by_id(curs: cursor, blueprint_image_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT id, blueprint_id, image_id, created_at, updated_at
  FROM blueprint_images
  WHERE id = {blueprint_image_id}
"""
    ).format(blueprint_image_id=sql.Literal(blueprint_image_id))
    curs.execute(query)
    return curs.fetchone()


def insert_blueprint_image(
    curs: cursor, blueprint_id: uuid.UUID, image_id: uuid.UUID
) -> dict:
    query = sql.SQL(
        """
INSERT INTO blueprint_images (
  blueprint_id, image_id
) VALUES (
  {blueprint_id}, {image_id}
) ON CONFLICT DO NOTHING
RETURNING id
"""
    ).format(blueprint_id=sql.Literal(blueprint_id), image_id=sql.Literal(image_id))
    curs.execute(query)
    return get_blueprint_image_by_id(curs, curs.fetchone()["id"])


def insert_image_for_blueprint(
    curs: cursor, blueprint_id: uuid.UUID, image: dict
) -> dict:
    image = insert_image(curs, image["image_name"], image["image_url"])
    insert_blueprint_image(curs, blueprint_id, image["id"])
    return image


def replace_images_for_blueprint(
    curs: cursor, blueprint_id: uuid.UUID, images: list[dict]
) -> dict:
    image_ids = []
    try:
        image_ids = delete_images_for_blueprint(curs, blueprint_id)
    except NotFound:
        pass
    for image in images:
        insert_image_for_blueprint(curs, blueprint_id, image)
    delete_images_by_ids(curs, image_ids)


def delete_images_for_blueprint(curs: cursor, blueprint_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
DELETE FROM blueprint_images
  WHERE blueprint_id = {blueprint_id}
  RETURNING image_id
"""
    ).format(blueprint_id=sql.Literal(blueprint_id))
    curs.execute(query)
    rows = curs.fetchall()
    return [row["image_id"] for row in rows]


def get_blueprints_ids_for_image(curs: cursor, image_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
SELECT blueprint_id
  FROM blueprint_images
  WHERE image_id = {image_id}
"""
    ).format(image_id=sql.Literal(image_id))
    curs.execute(query)
    return [row["blueprint_id"] for row in curs.fetchall()]


def delete_images_by_ids(curs: cursor, image_ids: list[uuid.UUID]) -> dict:
    query = sql.SQL(
        """
DELETE FROM images
  WHERE id IN ({image_ids})
    AND NOT EXISTS (
      SELECT FROM blueprint_images bi
        WHERE  bi.image_id = images.id
    )
"""
    ).format(
        image_ids=sql.SQL(",").join(sql.Literal(image_id) for image_id in image_ids)
    )
    curs.execute(query)
    return curs.rowcount


def delete_all_images(curs: cursor) -> dict:
    query = sql.SQL("TRUNCATE images CASCADE")
    curs.execute(query)
    return curs.rowcount


def delete_image(curs: cursor, image_id: uuid.UUID) -> dict:
    query = sql.SQL(
        """
DELETE FROM blueprint_images
  WHERE image_id = {image_id}
"""
    ).format(image_id=sql.Literal(image_id))
    curs.execute(query)
    query = sql.SQL(
        """
DELETE FROM images
  WHERE id = {image_id}
"""
    ).format(image_id=sql.Literal(image_id))
    curs.execute(query)
    return curs.rowcount


def update_image(curs: cursor, image_id: uuid.UUID, data: dict) -> dict:
    newdata = {}
    newdata.update(data)
    query_list = [
        sql.SQL("UPDATE images"),
        sql.SQL("  SET"),
    ]

    fields = [
        "image_name",
        "image_url",
    ]

    comma = ""
    for field in fields:
        if field in data:
            query_list.append(
                sql.SQL(f"{comma}{field} = " + "{value}").format(value=data[field])
            )
            comma = ", "
    query_list.append(sql.SQL(f"{comma}updated_at = NOW()"))

    query_list.append(
        sql.SQL("  WHERE id = {image_id}").format(image_id=sql.Literal(image_id))
    )
    query = sql.Composed(query_list)
    curs.execute(query.join("\n"))
    if curs.rowcount > 0:
        return get_image_by_id(curs, image_id)
    else:
        raise NotFound("Image not found")


def replace_blueprints_for_image(
    curs: cursor, image_id: uuid.UUID, blueprint_ids: list[uuid.UUID]
) -> dict:
    query = sql.SQL(
        """
DELETE FROM blueprint_images
  WHERE image_id = {image_id}
"""
    ).format(image_id=sql.Literal(image_id))
    curs.execute(query)
    for blueprint_id in blueprint_ids:
        insert_blueprint_image(curs, blueprint_id, image_id)
