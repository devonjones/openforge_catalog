import uuid
from pprint import pprint
from psycopg import cursor, sql


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


def insert_image(curs: cursor, image_name: str, image_url: str) -> dict:
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


def delete_all_images(curs: cursor) -> dict:
    query = sql.SQL("TRUNCATE images CASCADE")
    curs.execute(query)
    return curs.rowcount
