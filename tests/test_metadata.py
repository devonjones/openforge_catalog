import pytest
import tempfile
import os
import yaml
from unittest.mock import patch, mock_open
from openforge.data.metadata import (
    get_metadata_file,
    metadata_ignore,
    metadata_auto,
    apply_metadata,
    apply_metadata_edit,
    has_tag,
    has_tags,
    has_no_tags,
    add_tag,
    remove_tag,
    apply_default_metadata,
    is_openforge_wall,
    is_openforge_floor,
    is_thick_wall,
    apply_openforge_wall,
    apply_openforge_floor,
    apply_thick_wall
)


class TestMetadataFileReading:
    """Test metadata file reading and validation."""
    
    def test_get_metadata_file_nonexistent(self):
        """Test reading non-existent metadata file returns None."""
        with tempfile.TemporaryDirectory() as temp_dir:
            result = get_metadata_file(temp_dir)
            assert result is None
    
    def test_get_metadata_file_valid(self):
        """Test reading valid metadata file."""
        metadata_content = {
            "ignore": False,
            "auto": True,
            "tags": ["shape|wall", "connection|openforge"]
        }
        
        with tempfile.TemporaryDirectory() as temp_dir:
            metadata_file = os.path.join(temp_dir, "metadata.yaml")
            with open(metadata_file, "w") as f:
                yaml.dump(metadata_content, f)
            
            result = get_metadata_file(temp_dir)
            assert result == metadata_content
    
    def test_get_metadata_file_invalid_yaml(self):
        """Test reading invalid YAML file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            metadata_file = os.path.join(temp_dir, "metadata.yaml")
            with open(metadata_file, "w") as f:
                f.write("invalid: yaml: content: [")
            
            result = get_metadata_file(temp_dir)
            assert result is None
    
    def test_get_metadata_file_invalid_schema(self):
        """Test reading metadata file with invalid schema."""
        metadata_content = {
            "invalid_field": "should_not_be_allowed",
            "tags": ["shape|wall"]
        }
        
        with tempfile.TemporaryDirectory() as temp_dir:
            metadata_file = os.path.join(temp_dir, "metadata.yaml")
            with open(metadata_file, "w") as f:
                yaml.dump(metadata_content, f)
            
            # Should return None due to validation error
            result = get_metadata_file(temp_dir)
            assert result is None
    
    def test_get_metadata_file_valid_schema(self):
        """Test reading metadata file with valid schema."""
        metadata_content = {
            "ignore": True,
            "auto": False,
            "tags": ["shape|wall", "connection|openforge"],
            "config": {
                "parts": [
                    {
                        "name": "base",
                        "tags": {
                            "require": [{"tag": "shape|base"}]
                        }
                    }
                ]
            },
            "edit": {
                "tags": {
                    "add": ["texture|stone"],
                    "remove": ["shape|floor"]
                }
            }
        }
        
        with tempfile.TemporaryDirectory() as temp_dir:
            metadata_file = os.path.join(temp_dir, "metadata.yaml")
            with open(metadata_file, "w") as f:
                yaml.dump(metadata_content, f)
            
            result = get_metadata_file(temp_dir)
            assert result == metadata_content


class TestMetadataFlags:
    """Test metadata flag functions."""
    
    def test_metadata_ignore_none(self):
        """Test metadata_ignore with None metadata."""
        assert metadata_ignore(None) is False
    
    def test_metadata_ignore_false(self):
        """Test metadata_ignore with ignore=False."""
        metadata = {"ignore": False}
        assert metadata_ignore(metadata) is False
    
    def test_metadata_ignore_true(self):
        """Test metadata_ignore with ignore=True."""
        metadata = {"ignore": True}
        assert metadata_ignore(metadata) is True
    
    def test_metadata_ignore_missing(self):
        """Test metadata_ignore with missing ignore field."""
        metadata = {"tags": ["shape|wall"]}
        assert metadata_ignore(metadata) is False
    
    def test_metadata_auto_none(self):
        """Test metadata_auto with None metadata."""
        assert metadata_auto(None) is True
    
    def test_metadata_auto_true(self):
        """Test metadata_auto with auto=True."""
        metadata = {"auto": True}
        assert metadata_auto(metadata) is True
    
    def test_metadata_auto_false(self):
        """Test metadata_auto with auto=False."""
        metadata = {"auto": False}
        assert metadata_auto(metadata) is False
    
    def test_metadata_auto_missing(self):
        """Test metadata_auto with missing auto field."""
        metadata = {"tags": ["shape|wall"]}
        assert metadata_auto(metadata) is True


class TestMetadataApplication:
    """Test metadata application functions."""
    
    def test_apply_metadata_none(self):
        """Test apply_metadata with None metadata."""
        obj = {"tags": set()}
        apply_metadata(None, obj)
        assert obj == {"tags": set()}
    
    def test_apply_metadata_tags(self):
        """Test apply_metadata with tags."""
        metadata = {"tags": ["shape|wall", "connection|openforge"]}
        obj = {"tags": set()}
        apply_metadata(metadata, obj)
        assert ("shape", "wall") in obj["tags"]
        assert ("connection", "openforge") in obj["tags"]
        assert len(metadata) == 0  # All fields consumed
    
    def test_apply_metadata_config(self):
        """Test apply_metadata with config."""
        config = {"parts": [{"name": "base"}]}
        metadata = {"config": config}
        obj = {}
        apply_metadata(metadata, obj)
        assert obj["config"] == config
        assert len(metadata) == 0
    
    def test_apply_metadata_edit(self):
        """Test apply_metadata with edit section."""
        metadata = {
            "edit": {
                "tags": {
                    "add": ["shape|wall"],
                    "remove": ["shape|floor"]
                }
            }
        }
        obj = {"tags": {("shape", "floor")}}
        apply_metadata(metadata, obj)
        assert ("shape", "wall") in obj["tags"]
        assert ("shape", "floor") not in obj["tags"]
        assert len(metadata) == 0
    
    def test_apply_metadata_ignore_and_auto_removed(self):
        """Test that ignore and auto fields are removed from metadata."""
        metadata = {
            "ignore": True,
            "auto": False,
            "tags": ["shape|wall"]
        }
        obj = {"tags": set()}
        apply_metadata(metadata, obj)
        assert ("shape", "wall") in obj["tags"]
        assert "ignore" not in metadata
        assert "auto" not in metadata
        assert len(metadata) == 0
    
    def test_apply_metadata_all_fields_consumed(self):
        """Test that all metadata fields are consumed and assertion passes."""
        metadata = {
            "ignore": True,
            "auto": False,
            "tags": ["shape|wall"],
            "config": {"parts": []},
            "edit": {"tags": {"add": ["texture|stone"]}}
        }
        obj = {"tags": set()}
        apply_metadata(metadata, obj)
        assert len(metadata) == 0
    
    def test_apply_metadata_edit_empty(self):
        """Test apply_metadata_edit with empty edit section."""
        edit = {}
        obj = {"tags": set()}
        apply_metadata_edit(edit, obj)
        assert len(edit) == 0
    
    def test_apply_metadata_edit_add_tags(self):
        """Test apply_metadata_edit with add tags."""
        edit = {"tags": {"add": ["shape|wall", "connection|openforge"]}}
        obj = {"tags": set()}
        apply_metadata_edit(edit, obj)
        assert ("shape", "wall") in obj["tags"]
        assert ("connection", "openforge") in obj["tags"]
        assert len(edit) == 0
    
    def test_apply_metadata_edit_remove_tags(self):
        """Test apply_metadata_edit with remove tags."""
        edit = {"tags": {"remove": ["shape|floor"]}}
        obj = {"tags": {("shape", "floor"), ("shape", "wall")}}
        apply_metadata_edit(edit, obj)
        assert ("shape", "floor") not in obj["tags"]
        assert ("shape", "wall") in obj["tags"]
        assert len(edit) == 0
    
    def test_apply_metadata_edit_empty_tags(self):
        """Test apply_metadata_edit with empty tags section."""
        edit = {"tags": {}}
        obj = {"tags": set()}
        apply_metadata_edit(edit, obj)
        assert len(edit) == 0
    
    def test_apply_metadata_edit_no_tags(self):
        """Test apply_metadata_edit with no tags section."""
        edit = {}
        obj = {"tags": set()}
        apply_metadata_edit(edit, obj)
        assert len(edit) == 0


class TestTagOperations:
    """Test tag manipulation functions."""
    
    def test_has_tag_true(self):
        """Test has_tag returns True when tag exists."""
        obj = {"tags": {("shape", "wall"), ("connection", "openforge")}}
        assert has_tag(obj, ("shape", "wall")) is True
    
    def test_has_tag_false(self):
        """Test has_tag returns False when tag doesn't exist."""
        obj = {"tags": {("shape", "wall")}}
        assert has_tag(obj, ("connection", "openforge")) is False
    
    def test_has_tags_all_true(self):
        """Test has_tags returns True when all tags exist."""
        obj = {"tags": {("shape", "wall"), ("connection", "openforge")}}
        assert has_tags(obj, [("shape", "wall"), ("connection", "openforge")]) is True
    
    def test_has_tags_some_false(self):
        """Test has_tags returns False when some tags don't exist."""
        obj = {"tags": {("shape", "wall")}}
        assert has_tags(obj, [("shape", "wall"), ("connection", "openforge")]) is False
    
    def test_has_no_tags_true(self):
        """Test has_no_tags returns True when no tags exist."""
        obj = {"tags": {("shape", "wall")}}
        assert has_no_tags(obj, [("connection", "openforge"), ("texture", "stone")]) is True
    
    def test_has_no_tags_false(self):
        """Test has_no_tags returns False when any tag exists."""
        obj = {"tags": {("shape", "wall"), ("connection", "openforge")}}
        assert has_no_tags(obj, [("shape", "wall"), ("texture", "stone")]) is False
    
    def test_add_tag_new(self):
        """Test add_tag with new tag."""
        obj = {"tags": set()}
        add_tag(obj, "shape|wall")
        assert ("shape", "wall") in obj["tags"]
    
    def test_add_tag_no_tags_key(self):
        """Test add_tag when object has no tags key."""
        obj = {}
        add_tag(obj, "shape|wall")
        assert "tags" in obj
        assert ("shape", "wall") in obj["tags"]
    
    def test_add_tag_existing(self):
        """Test add_tag with existing tag."""
        obj = {"tags": {("shape", "wall")}}
        add_tag(obj, "shape|wall")
        assert ("shape", "wall") in obj["tags"]
        assert len(obj["tags"]) == 1  # No duplicate
    
    def test_remove_tag_exists(self):
        """Test remove_tag with existing tag."""
        obj = {"tags": {("shape", "wall"), ("connection", "openforge")}}
        remove_tag(obj, "shape|wall")
        assert ("shape", "wall") not in obj["tags"]
        assert ("connection", "openforge") in obj["tags"]
    
    def test_remove_tag_not_exists(self):
        """Test remove_tag with non-existing tag."""
        obj = {"tags": {("shape", "wall")}}
        # Should not raise exception
        remove_tag(obj, "connection|openforge")
        assert ("shape", "wall") in obj["tags"]


class TestDefaultMetadataApplication:
    """Test default metadata application functions."""
    
    def test_is_openforge_wall_true(self):
        """Test is_openforge_wall with valid wall."""
        obj = {
            "tags": {
                ("shape", "wall"),
                ("connection", "openforge"),
                ("build", "separate wall")
            }
        }
        assert is_openforge_wall(obj) is True
    
    def test_is_openforge_wall_false(self):
        """Test is_openforge_wall with invalid wall."""
        obj = {
            "tags": {
                ("shape", "floor"),
                ("connection", "openforge")
            }
        }
        assert is_openforge_wall(obj) is False
    
    def test_is_openforge_wall_low_true(self):
        """Test is_openforge_wall with low wall."""
        obj = {
            "tags": {
                ("shape", "wall", "low"),
                ("connection", "openforge"),
                ("build", "separate wall")
            }
        }
        assert is_openforge_wall(obj) is True
    
    def test_is_openforge_floor_true(self):
        """Test is_openforge_floor with valid floor."""
        obj = {
            "tags": {
                ("shape", "floor"),
                ("connection", "openforge")
            }
        }
        assert is_openforge_floor(obj) is True
    
    def test_is_openforge_floor_false(self):
        """Test is_openforge_floor with invalid floor."""
        obj = {
            "tags": {
                ("shape", "wall"),
                ("connection", "openforge")
            }
        }
        assert is_openforge_floor(obj) is False
    
    def test_is_thick_wall_true(self):
        """Test is_thick_wall with valid thick wall."""
        obj = {
            "tags": {
                ("build", "thick wall"),
                ("connection", "openforge"),
                ("component", "wall")
            }
        }
        assert is_thick_wall(obj) is True
    
    def test_is_thick_wall_false(self):
        """Test is_thick_wall with invalid thick wall."""
        obj = {
            "tags": {
                ("build", "thick wall"),
                ("connection", "openforge")
            }
        }
        assert is_thick_wall(obj) is False
    
    def test_apply_openforge_wall(self):
        """Test apply_openforge_wall adds correct config."""
        obj = {
            "tags": {
                ("shape", "wall"),
                ("connection", "openforge"),
                ("build", "separate wall")
            }
        }
        apply_openforge_wall(obj)
        assert "config" in obj
        assert "parts" in obj["config"]
        assert len(obj["config"]["parts"]) == 1
        part = obj["config"]["parts"][0]
        assert part["name"] == "base"
        assert part["optional"] is True
        assert "tags" in part
        assert "require" in part["tags"]
        assert "constrain" in part["tags"]
    
    def test_apply_openforge_wall_not_wall(self):
        """Test apply_openforge_wall returns early when not a wall."""
        obj = {
            "tags": {
                ("shape", "floor"),
                ("connection", "openforge")
            }
        }
        # Should return early without adding config
        apply_openforge_wall(obj)
        assert "config" not in obj
    
    def test_apply_openforge_floor(self):
        """Test apply_openforge_floor adds correct config."""
        obj = {
            "tags": {
                ("shape", "floor"),
                ("connection", "openforge")
            }
        }
        apply_openforge_floor(obj)
        assert "config" in obj
        assert "parts" in obj["config"]
        assert len(obj["config"]["parts"]) == 1
        part = obj["config"]["parts"][0]
        assert part["name"] == "base"
        assert part["optional"] is True
        assert "tags" in part
        assert "require" in part["tags"]
        assert "deny" in part["tags"]
        assert "constrain" in part["tags"]
    
    def test_apply_thick_wall(self):
        """Test apply_thick_wall adds correct config."""
        obj = {
            "tags": {
                ("build", "thick wall"),
                ("connection", "openforge"),
                ("component", "wall")
            }
        }
        apply_thick_wall(obj)
        assert "config" in obj
        assert "parts" in obj["config"]
        assert len(obj["config"]["parts"]) == 1
        part = obj["config"]["parts"][0]
        assert part["name"] == "base"
        assert part["optional"] is True
        assert "tags" in part
        assert "require" in part["tags"]
        assert "deny" in part["tags"]
        assert "constrain" in part["tags"]
    
    def test_apply_default_metadata(self):
        """Test apply_default_metadata applies all default rules."""
        obj = {
            "tags": {
                ("shape", "wall"),
                ("connection", "openforge"),
                ("build", "separate wall")
            }
        }
        apply_default_metadata(obj)
        assert "config" in obj
        assert "parts" in obj["config"]
        assert len(obj["config"]["parts"]) == 1


class TestMetadataSchemaValidation:
    """Test metadata schema validation."""
    
    def test_valid_metadata_schema(self):
        """Test that valid metadata passes schema validation."""
        valid_metadata = {
            "ignore": False,
            "auto": True,
            "tags": ["shape|wall", "connection|openforge"],
            "config": {
                "parts": [
                    {
                        "name": "base",
                        "tags": {
                            "require": [{"tag": "shape|base"}]
                        }
                    }
                ]
            },
            "edit": {
                "tags": {
                    "add": ["texture|stone"],
                    "remove": ["shape|floor"]
                }
            }
        }
        
        # Should not raise exception
        from openforge.openapi import validate_schema
        validate_schema("metadata.yaml", valid_metadata)
    
    def test_invalid_metadata_schema(self):
        """Test that invalid metadata fails schema validation."""
        invalid_metadata = {
            "invalid_field": "should_not_be_allowed",
            "tags": ["shape|wall"]
        }
        
        from openforge.openapi import validate_schema
        with pytest.raises(Exception):
            validate_schema("metadata.yaml", invalid_metadata)
    
    def test_invalid_tag_format(self):
        """Test that invalid tag format fails validation."""
        invalid_metadata = {
            "tags": ["invalid tag format", "shape|wall"]
        }
        
        from openforge.openapi import validate_schema
        with pytest.raises(Exception):
            validate_schema("metadata.yaml", invalid_metadata)
    
    def test_empty_metadata_valid(self):
        """Test that empty metadata is valid."""
        empty_metadata = {}
        
        from openforge.openapi import validate_schema
        validate_schema("metadata.yaml", empty_metadata) 