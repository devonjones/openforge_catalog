# vim:foldmethod=indent
from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(1)
class SchemaVersion1(SchemaBase):
    def up(self) -> bool:
        with self.conn.cursor() as curs:
            self.up_impl(curs)
            return True

    def up_impl(self, curs: cursor):
        print(f"Upgrading schema version {self.version}")
        self.create_schema_versions(curs)
        self.insert_version(curs)

    def down(self, ver: int) -> bool:
        if self.version >= ver:
            with self.conn.cursor() as curs:
                self.down_impl(curs)
                return True
        return False

    def down_impl(self, curs: cursor):
        print(f"Downgrading schema version {self.version}")
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
        print("created schema_versions")

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
        print("dropped schema_versions")
