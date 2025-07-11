"""
Tests for incremental fixtures loading functionality.
"""

import pytest
from unittest.mock import Mock, MagicMock
from openforge.db.fixtures.incremental import IncrementalFixturesLoader, ComparisonResult


def create_mock_connection():
    """Create a mock database connection that supports the required methods."""
    mock_conn = Mock()
    
    # Mock cursor that supports context manager
    mock_cursor = Mock()
    mock_cursor.__enter__ = Mock(return_value=mock_cursor)
    mock_cursor.__exit__ = Mock(return_value=None)
    mock_cursor.fetchall = Mock(return_value=[])
    mock_cursor.fetchone = Mock(return_value=None)
    
    # Mock connection that returns the cursor
    mock_conn.cursor = Mock(return_value=mock_cursor)
    mock_conn.transaction = Mock()
    mock_conn.transaction.__enter__ = Mock(return_value=mock_conn.transaction)
    mock_conn.transaction.__exit__ = Mock(return_value=None)
    mock_conn.commit = Mock()
    
    return mock_conn


def create_mock_blueprint(full_name, md5, tags=None, images=None):
    """Create a mock blueprint for testing."""
    return {
        "id": f"test-{md5[:8]}",
        "full_name": full_name,
        "file_md5": md5,
        "file_size": 1000,
        "file_modified_at": "2020-01-01T12:00:00",
        "blueprint_config": {},
        "tags": tags or [],
        "images": images or []
    }


def create_mock_fixture_item(full_name, md5, tags=None, images=None):
    """Create a mock fixture item for testing."""
    return {
        "type": "model",
        "file_metadata": {
            "full_name": full_name,
            "md5": md5,
            "size": 1000,
            "modified": "2020-01-01T12:00:00"
        },
        "tags": tags or [],
        "images": images or [],
        "config": {}
    }


class TestIncrementalFixturesLoader:
    """Test cases for IncrementalFixturesLoader class."""
    
    @pytest.fixture
    def mock_loader(self):
        """Create a mock loader for testing."""
        mock_conn = create_mock_connection()
        loader = IncrementalFixturesLoader(mock_conn, verbose=True)
        # Override the existing blueprints to avoid database calls
        loader.existing_blueprints = {}
        return loader
    
    def test_has_significant_changes_no_changes(self, mock_loader):
        """Test _has_significant_changes with no changes."""
        existing = create_mock_blueprint("test.stl", "abc123")
        fixture = create_mock_fixture_item("test.stl", "abc123")
        
        result = mock_loader._has_significant_changes(fixture, existing)
        assert not result, f"Expected no changes, got {result}"
    
    def test_has_significant_changes_md5_change(self, mock_loader):
        """Test _has_significant_changes with MD5 change."""
        existing = create_mock_blueprint("test.stl", "abc123")
        fixture = create_mock_fixture_item("test.stl", "def456")
        
        result = mock_loader._has_significant_changes(fixture, existing)
        assert result, f"Expected changes for MD5 change, got {result}"
    
    def test_has_significant_changes_tags_change(self, mock_loader):
        """Test _has_significant_changes with tags change."""
        existing = create_mock_blueprint("test.stl", "abc123")
        fixture = create_mock_fixture_item("test.stl", "abc123")
        fixture["tags"] = [["new", "tag"]]
        
        result = mock_loader._has_significant_changes(fixture, existing)
        assert result, f"Expected changes for tags change, got {result}"
    
    def test_has_significant_changes_images_change(self, mock_loader):
        """Test _has_significant_changes with images change."""
        existing = create_mock_blueprint("test.stl", "abc123")
        fixture = create_mock_fixture_item("test.stl", "abc123")
        fixture["images"] = [{"image_name": "thumbnail", "image_url": "test.jpg"}]
        
        result = mock_loader._has_significant_changes(fixture, existing)
        assert result, f"Expected changes for images change, got {result}"
    
    def test_has_significant_changes_config_change(self, mock_loader):
        """Test _has_significant_changes with config change."""
        existing = create_mock_blueprint("test.stl", "abc123")
        fixture = create_mock_fixture_item("test.stl", "abc123")
        fixture["config"] = {"new": "value"}
        
        result = mock_loader._has_significant_changes(fixture, existing)
        assert result, f"Expected changes for config change, got {result}"
    
    def test_compare_fixture_data_new_file(self, mock_loader):
        """Test compare_fixture_data with new file."""
        fixture_data = [create_mock_fixture_item("new.stl", "new123")]
        
        result = mock_loader.compare_fixture_data(fixture_data)
        
        assert len(result.added) == 1
        assert result.added[0]["file_metadata"]["full_name"] == "new.stl"
        assert len(result.modified) == 0
        assert len(result.deprecated) == 0
    
    def test_compare_fixture_data_existing_file_no_changes(self, mock_loader):
        """Test compare_fixture_data with existing file and no changes."""
        mock_loader.existing_blueprints = {
            "existing.stl": create_mock_blueprint("existing.stl", "abc123")
        }
        
        fixture_data = [create_mock_fixture_item("existing.stl", "abc123")]
        
        result = mock_loader.compare_fixture_data(fixture_data)
        
        assert len(result.added) == 0
        assert len(result.modified) == 0
        assert len(result.deprecated) == 0
    
    def test_compare_fixture_data_modified_file(self, mock_loader):
        """Test compare_fixture_data with modified file."""
        mock_loader.existing_blueprints = {
            "modified.stl": create_mock_blueprint("modified.stl", "def456", 
                                                tags=[["old", "tag"]], 
                                                images=[{"image_name": "old", "image_url": "old.jpg"}])
        }
        
        fixture_data = [create_mock_fixture_item("modified.stl", "def456", 
                                               tags=[["new", "tag"]], 
                                               images=[{"image_name": "new", "image_url": "new.jpg"}])]
        
        result = mock_loader.compare_fixture_data(fixture_data)
        
        assert len(result.added) == 0
        assert len(result.modified) == 1
        assert result.modified[0]["file_metadata"]["full_name"] == "modified.stl"
        assert len(result.deprecated) == 0
    
    def test_compare_fixture_data_version_change(self, mock_loader):
        """Test compare_fixture_data with version change (MD5 different)."""
        mock_loader.existing_blueprints = {
            "version_change.stl": create_mock_blueprint("version_change.stl", "old789")
        }
        
        fixture_data = [create_mock_fixture_item("version_change.stl", "new789")]
        
        result = mock_loader.compare_fixture_data(fixture_data)
        
        # Version changes create both a new addition and a deprecation
        assert len(result.added) == 1
        assert result.added[0]["file_metadata"]["full_name"] == "version_change.stl"
        assert len(result.modified) == 0
        assert len(result.deprecated) == 1
        assert result.deprecated[0]["full_name"] == "version_change.stl"
    
    def test_compare_fixture_data_mixed_changes(self, mock_loader):
        """Test compare_fixture_data with mixed changes."""
        mock_loader.existing_blueprints = {
            "existing.stl": create_mock_blueprint("existing.stl", "abc123"),
            "modified.stl": create_mock_blueprint("modified.stl", "def456", 
                                                tags=[["old", "tag"]]),
            "version_change.stl": create_mock_blueprint("version_change.stl", "old789")
        }
        
        fixture_data = [
            create_mock_fixture_item("new.stl", "new123"),  # New file
            create_mock_fixture_item("existing.stl", "abc123"),  # No changes
            create_mock_fixture_item("modified.stl", "def456", 
                                   tags=[["new", "tag"]]),  # Modified
            create_mock_fixture_item("version_change.stl", "new789")  # Version change
        ]
        
        result = mock_loader.compare_fixture_data(fixture_data)
        
        # Verify results
        assert len(result.added) == 2  # new.stl + version_change.stl
        added_names = [item["file_metadata"]["full_name"] for item in result.added]
        assert "new.stl" in added_names
        assert "version_change.stl" in added_names
        
        assert len(result.modified) == 1
        assert result.modified[0]["file_metadata"]["full_name"] == "modified.stl"
        
        assert len(result.deprecated) == 1
        assert result.deprecated[0]["full_name"] == "version_change.stl"
    
    def test_munge_blueprint(self, mock_loader):
        """Test _munge_blueprint method."""
        fixture_item = {
            "type": "model",
            "name": "test_blueprint",
            "config": {"test": "value"},
            "deprecated": False,
            "successor_id": None,
            "predecessor_id": None,
            "consolidated_paths": [],
            "openscad_source": "test.scad",
            "changelog": "Test changelog",
            "file_metadata": {
                "file": "test.stl",
                "md5": "abc123",
                "size": 1000,
                "full_name": "test.stl",
                "changed": "2020-01-01T12:00:00",
                "modified": "2020-01-01T12:00:00",
                "storage_address": "https://example.com/test.stl"
            }
        }
        
        result = mock_loader._munge_blueprint(fixture_item)
        
        # Verify the conversion
        assert result["blueprint_type"] == "model"
        assert result["blueprint_name"] == "test_blueprint"
        assert result["blueprint_config"] == {"test": "value"}
        assert result["file_md5"] == "abc123"
        assert result["file_size"] == 1000
        assert result["file_name"] == "test.stl"
        assert result["full_name"] == "test.stl"
        assert result["openscad_source"] == "test.scad"
        assert result["changelog"] == "Test changelog"
    
    def test_get_words(self, mock_loader):
        """Test _get_words method."""
        data = {
            "tags": [
                ["shape", "floor"],
                ["size", "width", 1],
                ["texture", "cave"]
            ]
        }
        
        words = mock_loader._get_words(data)
        
        # Should extract all words from tags
        expected_words = {"shape", "floor", "size", "width", "1", "texture", "cave"}
        assert set(words) == expected_words
    
    def test_comparison_result_summary(self):
        """Test ComparisonResult summary method."""
        result = ComparisonResult()
        
        # Test empty result
        assert result.summary() == "no changes"
        assert not result.has_changes()
        
        # Test with changes
        result.added = [{"name": "test1"}]
        result.modified = [{"name": "test2"}]
        result.deprecated = [{"name": "test3"}]
        
        summary = result.summary()
        assert "1 added" in summary
        assert "1 modified" in summary
        assert "1 deprecated" in summary
        assert result.has_changes() 