from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(3)
class SchemaVersion3(SchemaBase):
    def up_impl(self, curs: cursor):
        self.add_images_constraint(curs)
        self.add_blueprint_images_constraint(curs)

    def down_impl(self, curs: cursor):
        self.drop_images_constraint(curs)
        self.drop_blueprint_images_constraint(curs)

    def add_images_constraint(self, curs: cursor):
        query = sql.SQL(
            """
ALTER TABLE images
  ADD CONSTRAINT image_url_unique UNIQUE (image_url)
"""
        )
        curs.execute(query)
        print("  added images constraint")

    def drop_images_constraint(self, curs: cursor):
        query = sql.SQL(
            """
ALTER TABLE images
  DROP CONSTRAINT image_url_unique
"""
        )
        curs.execute(query)
        print("  dropped images constraint")

    def add_blueprint_images_constraint(self, curs: cursor):
        query = sql.SQL(
            """
ALTER TABLE blueprint_images
  ADD CONSTRAINT blueprint_images_unique UNIQUE (
    blueprint_id, image_id
  )
"""
        )
        curs.execute(query)
        print("  added blueprint_images constraint")

    def drop_blueprint_images_constraint(self, curs: cursor):
        query = sql.SQL(
            """
ALTER TABLE blueprint_images
  DROP CONSTRAINT blueprint_images_unique
"""
        )
        curs.execute(query)
        print("  dropped blueprint_images constraint")
