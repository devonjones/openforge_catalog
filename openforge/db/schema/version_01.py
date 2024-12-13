# vim:foldmethod=indent
from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(1)
class SchemaVersion1(SchemaBase):
    def up(self):
        with self.conn.cursor() as curs:
            self.up_impl(curs)

    def up_impl(self, curs: cursor):
        self.create_schema_versions(curs)
        self.insert_version(curs)

    def down(self, ver: int):
        with self.conn.cursor() as curs:
            self.down_impl(curs)

    def down_impl(self, curs: cursor):
        self.drop_schema_versions(curs)

    def create_schema_versions(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE IF NOT EXISTS schema_versions (
  version INTEGER PRIMARY KEY,
  created_at TIMESTAMP
)
"""
        )
        curs.execute(query)

    def insert_version(self, curs: cursor):
        query = sql.SQL(
            """
INSERT INTO schema_versions
  (version, created_at)
  VALUES (1, NOW())
  ON CONFLICT DO NOTHING
"""
        ).format(sql.Literal(self.version))
        curs.execute(query)

    def drop_schema_versions(self, curs: cursor):
        query = sql.SQL("DROP TABLE schema_versions")
        curs.execute(query)
