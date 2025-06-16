import pytest
from psycopg import sql
from psycopg.rows import dict_row
from werkzeug.exceptions import NotFound
import openforge.db.sql.blueprints as blueprint_sql
import uuid

def test_create_blueprint(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create test blueprint matching OpenAPI schema
            blueprint = {
                "blueprint_name": "test_blueprint",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"},
                "file_md5": "test_md5",
                "file_size": 1024,
                "file_name": "test.stl",
                "full_name": "Test Blueprint",
                "file_changed_at": "2024-02-20T00:00:00Z",
                "file_modified_at": "2024-02-20T00:00:00Z",
                "storage_address": "test/address",
                "tags": ["test|tag"],
                "images": [
                    {
                        "image_name": "test_image",
                        "image_url": "http://test.com/image.jpg"
                    }
                ]
            }
            
            result = blueprint_sql.insert_blueprint(curs, blueprint)
            assert result["blueprint_name"] == blueprint["blueprint_name"]
            assert result["blueprint_type"] == blueprint["blueprint_type"]
            assert result["blueprint_config"] == blueprint["blueprint_config"]
            
            # Verify it exists
            blueprints = blueprint_sql.get_all_blueprints(curs)
            assert len(blueprints) == 1
            assert blueprints[0]["blueprint_name"] == blueprint["blueprint_name"]
            assert blueprints[0]["blueprint_type"] == blueprint["blueprint_type"]
            assert blueprints[0]["blueprint_config"] == blueprint["blueprint_config"]

def test_get_blueprint_by_id(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create test blueprint
            blueprint = {
                "blueprint_name": "test_blueprint",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"}
            }
            
            created = blueprint_sql.insert_blueprint(curs, blueprint)
            
            # Get by ID
            result = blueprint_sql.get_blueprint_by_id(curs, created["id"])
            assert result["blueprint_name"] == blueprint["blueprint_name"]
            assert result["blueprint_type"] == blueprint["blueprint_type"]
            assert result["blueprint_config"] == blueprint["blueprint_config"]
            
            # Test not found
            with pytest.raises(NotFound):
                blueprint_sql.get_blueprint_by_id(curs, uuid.UUID("00000000-0000-0000-0000-000000000000"))

def test_get_blueprint_by_md5(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create test blueprint with MD5
            blueprint = {
                "blueprint_name": "test_blueprint",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"},
                "file_md5": "test_md5"
            }
            
            created = blueprint_sql.insert_blueprint(curs, blueprint)
            
            # Get by MD5
            result = blueprint_sql.get_blueprint_by_md5(curs, blueprint["file_md5"])
            assert result["blueprint_name"] == blueprint["blueprint_name"]
            assert result["blueprint_type"] == blueprint["blueprint_type"]
            assert result["blueprint_config"] == blueprint["blueprint_config"]
            assert result["file_md5"] == blueprint["file_md5"]
            
            # Test not found
            with pytest.raises(NotFound):
                blueprint_sql.get_blueprint_by_md5(curs, "nonexistent_md5")

def test_update_blueprint(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create test blueprint
            blueprint = {
                "blueprint_name": "test_blueprint",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"}
            }
            
            created = blueprint_sql.insert_blueprint(curs, blueprint)
            
            # Update blueprint
            update_data = {
                "blueprint_name": "updated_blueprint",
                "blueprint_config": {"updated": "config"}
            }
            
            result = blueprint_sql.update_blueprint(curs, created["id"], update_data)
            assert result["blueprint_name"] == update_data["blueprint_name"]
            assert result["blueprint_config"] == update_data["blueprint_config"]
            
            # Test not found
            with pytest.raises(NotFound):
                blueprint_sql.update_blueprint(curs, uuid.UUID("00000000-0000-0000-0000-000000000000"), update_data)

def test_delete_blueprint(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create test blueprint
            blueprint = {
                "blueprint_name": "test_blueprint",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"}
            }
            
            created = blueprint_sql.insert_blueprint(curs, blueprint)
            
            # Delete blueprint
            rows = blueprint_sql.delete_blueprint(curs, created["id"])
            assert rows == 1
            
            # Verify it's gone
            with pytest.raises(NotFound):
                blueprint_sql.get_blueprint_by_id(curs, created["id"])

def test_delete_all_blueprints(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create multiple blueprints
            blueprints = [
                {
                    "blueprint_name": f"test_blueprint_{i}",
                    "blueprint_type": "blueprint",
                    "blueprint_config": {"test": "config"}
                }
                for i in range(3)
            ]
            
            for bp in blueprints:
                blueprint_sql.insert_blueprint(curs, bp)
            
            # Delete all
            rows = blueprint_sql.delete_all_blueprints(curs)
            assert rows == 3
            
            # Verify none exist
            result = blueprint_sql.get_all_blueprints(curs)
            assert len(result) == 0

def test_md5_conflict(test_db):
    with test_db.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as curs:
            # Create first blueprint with MD5
            blueprint1 = {
                "blueprint_name": "test_blueprint_1",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"},
                "file_md5": "test_md5"
            }
            created1 = blueprint_sql.insert_blueprint(curs, blueprint1)
            
            # Try to create second blueprint with same MD5 (should fail)
            blueprint2 = {
                "blueprint_name": "test_blueprint_2",
                "blueprint_type": "blueprint",
                "blueprint_config": {"test": "config"},
                "file_md5": "test_md5"
            }
            with pytest.raises(Exception) as exc_info:
                blueprint_sql.insert_blueprint(curs, blueprint2)
            assert "duplicate key value violates unique constraint" in str(exc_info.value)
            conn.rollback()
            # Try again with rescue_md5_conflict=True (should succeed)
            created2 = blueprint_sql.insert_blueprint(curs, blueprint2, rescue_md5_conflict=True)
            # Debug: print all blueprints in the table
            all_bps = blueprint_sql.get_all_blueprints(curs)
            print('All blueprints after rescue insert:', all_bps)
            # Should return the existing blueprint (created1)
            assert created2["file_md5"] == created1["file_md5"] 