"""Version 17: Thingiverse sync-state tables

- Create thingiverse_thing_status enum (draft, published, deleted)
- Create thingiverse_file_type enum (model, image, zip, other)
- Create thingiverse_things table: one row per Thingiverse thing the
  publish/sync tool manages (thing_id, status, published/synced timestamps)
- Create thingiverse_files table: the per-file diff ledger tying a thing's
  remote files to their catalog sources (blueprints/images/ad-hoc paths)
  with local and remote hashes for change detection
- Add indexes on the foreign keys used by sync queries

Local-only operational state: these tables live in the local catalog DB.
Production receives only the derived mapping (blueprint_id, thing_id,
public_url) via the fixture path (openforge_catalog-8yb).

Hash columns: local_md5 mirrors the catalog's existing MD5 tracking;
local_sha256 is included defensively because Thingiverse's remote hash
algorithm is unconfirmed until the API contract work lands
(openforge_catalog-hnr, suspected SHA-256).
"""

from psycopg import cursor, sql

from openforge.db.schema import SchemaBase, SchemaVersionDecorator


@SchemaVersionDecorator(17)
class SchemaVersion17(SchemaBase):
    def up_impl(self, curs: cursor):
        self.create_thingiverse_thing_status(curs)
        self.create_thingiverse_file_type(curs)
        self.create_thingiverse_things(curs)
        self.create_thingiverse_files(curs)
        self.create_thingiverse_indexes(curs)

    def down_impl(self, curs: cursor):
        self.drop_thingiverse_indexes(curs)
        self.drop_thingiverse_files(curs)
        self.drop_thingiverse_things(curs)
        self.drop_thingiverse_file_type(curs)
        self.drop_thingiverse_thing_status(curs)

    def create_thingiverse_thing_status(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TYPE thingiverse_thing_status
  AS ENUM ('draft', 'published', 'deleted')
"""
        )
        curs.execute(query)
        print("  created thingiverse_thing_status")

    def drop_thingiverse_thing_status(self, curs: cursor):
        query = sql.SQL("DROP TYPE thingiverse_thing_status")
        curs.execute(query)
        print("  dropped thingiverse_thing_status")

    def create_thingiverse_file_type(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TYPE thingiverse_file_type
  AS ENUM ('model', 'image', 'zip', 'other')
"""
        )
        curs.execute(query)
        print("  created thingiverse_file_type")

    def drop_thingiverse_file_type(self, curs: cursor):
        query = sql.SQL("DROP TYPE thingiverse_file_type")
        curs.execute(query)
        print("  dropped thingiverse_file_type")

    def create_thingiverse_things(self, curs: cursor):
        query = sql.SQL(
            """
CREATE TABLE thingiverse_things (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thing_id BIGINT,
  name TEXT NOT NULL,
  public_url TEXT,
  manifest_path TEXT,
  status thingiverse_thing_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (thing_id)
)
"""
        )
        curs.execute(query)
        print("  created thingiverse_things")

    def drop_thingiverse_things(self, curs: cursor):
        query = sql.SQL("DROP TABLE thingiverse_things")
        curs.execute(query)
        print("  dropped thingiverse_things")

    def create_thingiverse_files(self, curs: cursor):
        # Each row ties one remote file to its local source. Exactly which
        # local reference is set depends on file_type: catalog models point
        # at blueprints, gallery photos at images, and ad-hoc artifacts
        # (zips etc.) carry a filesystem path. At least one must be set.
        # Blueprint/image FKs are RESTRICT (not SET NULL): SET NULL would
        # trip the CHECK below and make the parent delete fail confusingly;
        # RESTRICT makes the rule explicit — unlink the ledger row (so the
        # sync engine deletes the remote file) before removing the source.
        query = sql.SQL(
            """
CREATE TABLE thingiverse_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thingiverse_thing_id UUID NOT NULL
    REFERENCES thingiverse_things(id) ON DELETE CASCADE,
  file_type thingiverse_file_type NOT NULL,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE RESTRICT,
  image_id UUID REFERENCES images(id) ON DELETE RESTRICT,
  local_path TEXT,
  local_md5 TEXT,
  local_sha256 TEXT,
  remote_file_id BIGINT,
  remote_file_name TEXT,
  remote_hash TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (num_nonnulls(blueprint_id, image_id, local_path) >= 1)
)
"""
        )
        curs.execute(query)
        print("  created thingiverse_files")

    def drop_thingiverse_files(self, curs: cursor):
        query = sql.SQL("DROP TABLE thingiverse_files")
        curs.execute(query)
        print("  dropped thingiverse_files")

    def create_thingiverse_indexes(self, curs: cursor):
        query = sql.SQL(
            """
CREATE INDEX idx_thingiverse_files_thing
  ON thingiverse_files(thingiverse_thing_id)
"""
        )
        curs.execute(query)
        query = sql.SQL(
            """
CREATE INDEX idx_thingiverse_files_blueprint
  ON thingiverse_files(blueprint_id)
"""
        )
        curs.execute(query)
        query = sql.SQL(
            """
CREATE INDEX idx_thingiverse_files_image
  ON thingiverse_files(image_id)
"""
        )
        curs.execute(query)
        print("  created thingiverse indexes")

    def drop_thingiverse_indexes(self, curs: cursor):
        query = sql.SQL("DROP INDEX idx_thingiverse_files_image")
        curs.execute(query)
        query = sql.SQL("DROP INDEX idx_thingiverse_files_blueprint")
        curs.execute(query)
        query = sql.SQL("DROP INDEX idx_thingiverse_files_thing")
        curs.execute(query)
        print("  dropped thingiverse indexes")
