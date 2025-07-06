"""
Tests for incremental scanner functionality.
"""

import pytest
import tempfile
import os
import json
import shutil
from datetime import datetime

from openforge.data.incremental import IncrementalScanner


class TestIncrementalScanner:
    """Test cases for IncrementalScanner class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
        
    @pytest.fixture
    def sample_fixture(self, temp_dir):
        """Create sample fixture file for testing."""
        fixture_data = [
            {
                "type": "model",
                "file_metadata": {
                    "full_name": "tiles/dungeon_stone/floor/file1.stl",
                    "file": "file1.stl",
                    "md5": "old_md5_1",
                    "size": 1000,
                    "file_modified_at": "2023-01-01T10:00:00",
                    "changed": "2023-01-01T10:00:00",
                    "modified": "2023-01-01T10:00:00"
                },
                "tags": [["shape", "floor"], ["texture", "stone"]],
                "config": {}
            },
            {
                "type": "model", 
                "file_metadata": {
                    "full_name": "tiles/dungeon_stone/floor/file2.stl",
                    "file": "file2.stl",
                    "md5": "old_md5_2",
                    "size": 2000,
                    "file_modified_at": "2023-01-02T10:00:00",
                    "changed": "2023-01-02T10:00:00",
                    "modified": "2023-01-02T10:00:00"
                },
                "tags": [["shape", "wall"], ["texture", "stone"]],
                "config": {}
            }
        ]
        
        fixture_path = os.path.join(temp_dir, "test_fixture.json")
        with open(fixture_path, 'w') as f:
            json.dump(fixture_data, f)
            
        return fixture_path
        
    @pytest.fixture
    def sample_files(self, temp_dir):
        """Create sample files for testing."""
        files = {}
        
        # Create file1.stl
        file1_path = os.path.join(temp_dir, "file1.stl")
        with open(file1_path, 'w') as f:
            f.write("content1")
        files["file1"] = file1_path
        
        # Create file2.stl  
        file2_path = os.path.join(temp_dir, "file2.stl")
        with open(file2_path, 'w') as f:
            f.write("content2")
        files["file2"] = file2_path
        
        # Create file3.stl (new file)
        file3_path = os.path.join(temp_dir, "file3.stl")
        with open(file3_path, 'w') as f:
            f.write("content3")
        files["file3"] = file3_path
        
        return files
        
    def test_init_valid_fixture(self, sample_fixture):
        """Test initialization with valid fixture file."""
        scanner = IncrementalScanner(sample_fixture)
        assert len(scanner.existing_data) == 2
        assert scanner.subset_path == "tiles/dungeon_stone/floor"
        
    def test_init_missing_fixture(self, temp_dir):
        """Test initialization with missing fixture file."""
        missing_path = os.path.join(temp_dir, "missing.json")
        with pytest.raises(FileNotFoundError):
            IncrementalScanner(missing_path)
            
    def test_init_invalid_fixture(self, temp_dir):
        """Test initialization with invalid fixture file."""
        invalid_path = os.path.join(temp_dir, "invalid.json")
        with open(invalid_path, 'w') as f:
            f.write('{"invalid": "data"}')
            
        with pytest.raises(Exception):  # Can be ValueError or ValidationError
            IncrementalScanner(invalid_path)
            
    def test_init_fixture_missing_file_metadata(self, temp_dir):
        """Test initialization with fixture missing file_metadata."""
        invalid_data = [
            {
                "type": "model",
                "name": "test"
                # Missing file_metadata
            }
        ]
        
        invalid_path = os.path.join(temp_dir, "invalid.json")
        with open(invalid_path, 'w') as f:
            json.dump(invalid_data, f)
            
        with pytest.raises(ValueError, match="Missing file_metadata"):
            IncrementalScanner(invalid_path)
            
    def test_detect_subset_path(self, sample_fixture):
        """Test subset path detection."""
        scanner = IncrementalScanner(sample_fixture)
        assert scanner.get_subset_path() == "tiles/dungeon_stone/floor"
        
    def test_detect_subset_path_single_file(self, temp_dir):
        """Test subset path detection with single file."""
        single_data = [
            {
                "type": "model",
                "file_metadata": {
                    "full_name": "tiles/dungeon_stone/floor/file1.stl",
                    "file": "file1.stl",
                    "md5": "test",
                    "size": 1000,
                    "changed": "2023-01-01T10:00:00",
                    "modified": "2023-01-01T10:00:00"
                }
            }
        ]
        
        fixture_path = os.path.join(temp_dir, "single.json")
        with open(fixture_path, 'w') as f:
            json.dump(single_data, f)
            
        scanner = IncrementalScanner(fixture_path)
        assert scanner.get_subset_path() == "tiles/dungeon_stone/floor"
        
    def test_detect_subset_path_no_common(self, temp_dir):
        """Test subset path detection with no common prefix."""
        no_common_data = [
            {
                "type": "model",
                "file_metadata": {
                    "full_name": "tiles/dungeon_stone/floor/file1.stl",
                    "file": "file1.stl",
                    "md5": "test",
                    "size": 1000,
                    "changed": "2023-01-01T10:00:00",
                    "modified": "2023-01-01T10:00:00"
                }
            },
            {
                "type": "model",
                "file_metadata": {
                    "full_name": "other/path/file2.stl",
                    "file": "file2.stl", 
                    "md5": "test",
                    "size": 1000,
                    "changed": "2023-01-01T10:00:00",
                    "modified": "2023-01-01T10:00:00"
                }
            }
        ]
        
        fixture_path = os.path.join(temp_dir, "no_common.json")
        with open(fixture_path, 'w') as f:
            json.dump(no_common_data, f)
            
        scanner = IncrementalScanner(fixture_path)
        assert scanner.get_subset_path() == ""  # Empty string for no common prefix
        
    def test_process_new_file(self, sample_fixture, sample_files):
        """Test processing a new file."""
        scanner = IncrementalScanner(sample_fixture)
        
        result = scanner.process_file(
            sample_files["file3"],
            "tiles/dungeon_stone/floor/file3.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {}
        )
        
        assert result["type"] == "model"
        assert result["file_metadata"]["full_name"] == "tiles/dungeon_stone/floor/file3.stl"
        assert result["file_metadata"]["file"] == "file3.stl"
        assert "md5" in result["file_metadata"]
        assert result["file_metadata"]["size"] > 0
        assert "file_modified_at" in result["file_metadata"]
        assert result["tags"] == [["shape", "floor"], ["texture", "stone"]]
        assert result["config"] == {}
        
    def test_process_existing_file_unchanged(self, sample_fixture, sample_files):
        """Test processing existing file that hasn't changed."""
        scanner = IncrementalScanner(sample_fixture)

        # Create file with content that matches the expected metadata
        # We need to create a file that has size 1000 and modification time 2023-01-01T10:00:00
        with open(sample_files["file1"], 'w') as f:
            f.write("x" * 1000)  # Create file with size 1000
            
        # Set modification time to match fixture (2023-01-01T10:00:00 UTC)
        # 2023-01-01T10:00:00 UTC = 1672567200
        os.utime(sample_files["file1"], (1672567200, 1672567200))
        
        result = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {}
        )

        # Should copy existing file_metadata since file hasn't changed
        assert result["file_metadata"]["size"] == 1000
        # The timestamp will include timezone info, so we check the date part
        assert "2023-01-01T10:00:00" in result["file_metadata"]["file_modified_at"]
        # Verify that the MD5 was copied from existing entry (not recalculated)
        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        assert result["file_metadata"]["md5"] == existing_entry["file_metadata"]["md5"]
        
    def test_process_existing_file_changed(self, sample_fixture, sample_files):
        """Test processing existing file that has changed."""
        scanner = IncrementalScanner(sample_fixture)
        
        # Modify file to trigger recalculation
        with open(sample_files["file1"], 'w') as f:
            f.write("modified content")
            
        result = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {}
        )
        
        # Should recalculate MD5
        assert result["file_metadata"]["md5"] != "old_md5_1"
        assert result["file_metadata"]["size"] != 1000
        
    def test_get_missing_files(self, sample_fixture):
        """Test getting missing files."""
        scanner = IncrementalScanner(sample_fixture)
        
        current_files = {"tiles/dungeon_stone/floor/file1.stl"}  # Only file1 exists
        
        missing = scanner.get_missing_files(current_files)
        
        assert len(missing) == 1
        assert missing[0]["file_metadata"]["full_name"] == "tiles/dungeon_stone/floor/file2.stl"
        assert missing[0]["deprecated"] is True
        
    def test_has_changes_for_output_md5_changed(self, sample_fixture, sample_files):
        """Test change detection when MD5 changes."""
        scanner = IncrementalScanner(sample_fixture)
        
        # Modify file to change MD5
        with open(sample_files["file1"], 'w') as f:
            f.write("modified content")
            
        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        new_entry = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {}
        )
        
        assert scanner._has_changes_for_output(sample_files["file1"], existing_entry, new_entry) is True
        
    def test_has_changes_for_output_tags_changed(self, sample_fixture, sample_files):
        """Test change detection when tags change."""
        scanner = IncrementalScanner(sample_fixture)
        
        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        new_entry = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "wall"], ["texture", "stone"]],  # Changed tags
            {}
        )
        
        assert scanner._has_changes_for_output(sample_files["file1"], existing_entry, new_entry) is True
        
    def test_has_changes_for_output_config_changed(self, sample_fixture, sample_files):
        """Test change detection when config changes."""
        scanner = IncrementalScanner(sample_fixture)
        
        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        new_entry = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {"parts": []}  # Changed config
        )
        
        assert scanner._has_changes_for_output(sample_files["file1"], existing_entry, new_entry) is True
        
    def test_has_changes_for_output_no_changes(self, sample_fixture, sample_files):
        """Test change detection when nothing changes."""
        scanner = IncrementalScanner(sample_fixture)

        # Set up file to match existing metadata
        with open(sample_files["file1"], 'w') as f:
            f.write("x" * 1000)  # Create file with size 1000
        os.utime(sample_files["file1"], (1672567200, 1672567200))  # 2023-01-01T10:00:00

        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        new_entry = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],  # Same tags
            {}  # Same config
        )

        assert scanner._has_changes_for_output(sample_files["file1"], existing_entry, new_entry) is False
        
    def test_tag_comparison_unordered(self, sample_fixture, sample_files):
        """Test that tag comparison works with unordered tags."""
        scanner = IncrementalScanner(sample_fixture)

        # Set up file to match existing metadata
        with open(sample_files["file1"], 'w') as f:
            f.write("x" * 1000)  # Create file with size 1000
        os.utime(sample_files["file1"], (1672567200, 1672567200))  # 2023-01-01T10:00:00

        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        new_entry = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["texture", "stone"], ["shape", "floor"]],  # Same tags, different order
            {}
        )

        assert scanner._has_changes_for_output(sample_files["file1"], existing_entry, new_entry) is False
        
    def test_process_existing_file_unchanged_debug(self, sample_fixture, sample_files):
        """Debug test to understand why changed field is being updated."""
        scanner = IncrementalScanner(sample_fixture)

        # Create file with content that matches the expected metadata
        with open(sample_files["file1"], 'w') as f:
            f.write("x" * 1000)  # Create file with size 1000
            
        # Set modification time to match fixture (2023-01-01T10:00:00 UTC)
        os.utime(sample_files["file1"], (1672567200, 1672567200))
        
        existing_entry = scanner._find_existing_entry("tiles/dungeon_stone/floor/file1.stl")
        print(f"Existing entry changed: {existing_entry['file_metadata']['changed']}")
        
        result = scanner.process_file(
            sample_files["file1"],
            "tiles/dungeon_stone/floor/file1.stl",
            [["shape", "floor"], ["texture", "stone"]],
            {}
        )
        
        print(f"Result changed: {result['file_metadata']['changed']}")
        print(f"Needs recalculation: {scanner._needs_md5_recalculation(sample_files['file1'], existing_entry)}")
        
        # Should copy existing file_metadata since file hasn't changed
        assert result["file_metadata"]["size"] == 1000
        assert "2023-01-01T10:00:00" in result["file_metadata"]["file_modified_at"]
        # Verify that the MD5 was copied from existing entry (not recalculated)
        assert result["file_metadata"]["md5"] == existing_entry["file_metadata"]["md5"]
        # Verify that the changed field was NOT updated
        assert result["file_metadata"]["changed"] == existing_entry["file_metadata"]["changed"] 