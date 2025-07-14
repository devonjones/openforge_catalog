from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(7)
class SchemaVersion7(SchemaBase):
    def up_impl(self, curs: cursor):
        self.remove_file_changed_at_column(curs)

    def down_impl(self, curs: cursor):
        self.add_file_changed_at_column(curs)

    def remove_file_changed_at_column(self, curs: cursor):
        """Remove file_changed_at column from blueprints table."""
        
        query = sql.SQL(
            """
ALTER TABLE blueprints 
  DROP COLUMN IF EXISTS file_changed_at
"""
        )
        curs.execute(query)
        print("  removed file_changed_at column")

    def add_file_changed_at_column(self, curs: cursor):
        """Add file_changed_at column back to blueprints table (for rollback)."""
        
        query = sql.SQL(
            """
ALTER TABLE blueprints 
  ADD COLUMN file_changed_at TIMESTAMP
"""
        )
        curs.execute(query)
        print("  added file_changed_at column back") 