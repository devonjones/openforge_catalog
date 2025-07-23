"""Version 12: Add is_live flag to documentation tables

- Add is_live column to blueprint_documentation table
- Add is_live column to tag_documentation table
- Set existing documentation as live by default
- Add indexes for performance
"""

from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(12)
class SchemaVersion12(SchemaBase):
    def up_impl(self, curs: cursor):
        self.add_is_live_to_blueprint_documentation(curs)
        self.add_is_live_to_tag_documentation(curs)
        self.create_documentation_indexes(curs)

    def down_impl(self, curs: cursor):
        self.drop_documentation_indexes(curs)
        self.remove_is_live_from_tag_documentation(curs)
        self.remove_is_live_from_blueprint_documentation(curs)

    def add_is_live_to_blueprint_documentation(self, curs: cursor):
        # Add is_live column to blueprint_documentation table
        query = sql.SQL(
            """
ALTER TABLE blueprint_documentation 
ADD COLUMN is_live boolean NOT NULL DEFAULT true
"""
        )
        curs.execute(query)
        print("  added is_live column to blueprint_documentation table")

    def add_is_live_to_tag_documentation(self, curs: cursor):
        # Add is_live column to tag_documentation table
        query = sql.SQL(
            """
ALTER TABLE tag_documentation 
ADD COLUMN is_live boolean NOT NULL DEFAULT true
"""
        )
        curs.execute(query)
        print("  added is_live column to tag_documentation table")

    def create_documentation_indexes(self, curs: cursor):
        # Create indexes for performance on is_live queries
        query = sql.SQL(
            """
CREATE INDEX idx_blueprint_documentation_live ON blueprint_documentation(is_live)
"""
        )
        curs.execute(query)
        print("  created idx_blueprint_documentation_live index")

        query = sql.SQL(
            """
CREATE INDEX idx_tag_documentation_live ON tag_documentation(is_live)
"""
        )
        curs.execute(query)
        print("  created idx_tag_documentation_live index")

    def drop_documentation_indexes(self, curs: cursor):
        query = sql.SQL("DROP INDEX IF EXISTS idx_tag_documentation_live")
        curs.execute(query)
        print("  dropped idx_tag_documentation_live index")

        query = sql.SQL("DROP INDEX IF EXISTS idx_blueprint_documentation_live")
        curs.execute(query)
        print("  dropped idx_blueprint_documentation_live index")

    def remove_is_live_from_tag_documentation(self, curs: cursor):
        query = sql.SQL("ALTER TABLE tag_documentation DROP COLUMN IF EXISTS is_live")
        curs.execute(query)
        print("  dropped is_live column from tag_documentation table")

    def remove_is_live_from_blueprint_documentation(self, curs: cursor):
        query = sql.SQL("ALTER TABLE blueprint_documentation DROP COLUMN IF EXISTS is_live")
        curs.execute(query)
        print("  dropped is_live column from blueprint_documentation table") 