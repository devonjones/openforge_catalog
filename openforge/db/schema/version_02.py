from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(2)
class SchemaVersion2(SchemaBase):
    def up_impl(self, curs: cursor):
        self.create_blueprint_type(curs)
        self.create_blueprint(curs)
        self.create_tag(curs)
        self.create_image(curs)
        self.create_blueprint_image(curs)
        self.create_documentation(curs)
        self.create_blueprint_documentation(curs)

    def down_impl(self, curs: cursor):
        self.drop_blueprint_documentation(curs)
        self.drop_blueprint_image(curs)
        self.drop_tag(curs)
        self.drop_image(curs)
        self.drop_documentation(curs)
        self.drop_blueprint(curs)
        self.drop_blueprint_type(curs)

    def create_blueprint_type(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TYPE blueprint_type
  AS ENUM ('model', 'blueprint')
"""
        )
        curs.execute(query)
        print("created blueprint_type")

    def drop_blueprint_type(self, curs: cursor):
        query = sql.SQL("DROP TYPE blueprint_type")
        curs.execute(query)
        print("dropped blueprint_type")

    def create_blueprint(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_name TEXT NOT NULL,
  blueprint_type blueprint_type NOT NULL,
  config JSONB NOT NULL,
  file_md5 TEXT,
  file_size INT,
  file_name TEXT,
  full_name TEXT,
  file_changed_at TIMESTAMP,
  file_modified_at TIMESTAMP,
  storage_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (file_md5)
)
"""
        )
        curs.execute(query)
        print("created blueprint")

    def drop_blueprint(self, curs: cursor):
        query = sql.SQL("DROP TABLE blueprints")
        curs.execute(query)
        print("dropped blueprint")

    def create_tag(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  tag TEXT ARRAY NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (blueprint_id, tag)
)
"""
        )
        curs.execute(query)
        print("created tag")

    def drop_tag(self, curs: cursor):
        query = sql.SQL("DROP TABLE tags")
        curs.execute(query)
        print("dropped tag")

    def create_image(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
        )
        curs.execute(query)
        print("created image")

    def drop_image(self, curs: cursor):
        query = sql.SQL("DROP TABLE images")
        curs.execute(query)
        print("dropped image")

    def create_blueprint_image(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE blueprint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  image_id UUID NOT NULL REFERENCES images(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
        )
        curs.execute(query)
        print("created blueprint_image")

    def drop_blueprint_image(self, curs: cursor):
        query = sql.SQL("DROP TABLE blueprint_images")
        curs.execute(query)
        print("dropped blueprint_image")

    def create_documentation(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_name TEXT NOT NULL,
  document TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
        )
        curs.execute(query)
        print("created documentation")

    def drop_documentation(self, curs: cursor):
        query = sql.SQL("DROP TABLE documentation")
        curs.execute(query)
        print("dropped documentation")

    def create_blueprint_documentation(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE blueprint_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  documentation_id UUID NOT NULL REFERENCES documentation(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""
        )
        curs.execute(query)
        print("created blueprint_documentation")

    def drop_blueprint_documentation(self, curs: cursor):
        query = sql.SQL("DROP TABLE blueprint_documentation")
        curs.execute(query)
        print("dropped blueprint_documentation")
