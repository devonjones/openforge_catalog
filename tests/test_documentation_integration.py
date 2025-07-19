"""Integration tests for the documentation system."""

import pytest
from openforge.db.sql.tag_utils import tag_to_array, array_to_tag
from openforge.app.routes.tag_converter import TagConverter


class TestTagUtilities:
    """Test tag utility functions."""
    
    def test_tag_to_array_string(self):
        """Test converting pipe-delimited string to array."""
        result = tag_to_array("texture|dungeon_stone")
        assert result == ["texture", "dungeon_stone"]
    
    def test_tag_to_array_list(self):
        """Test converting list to array (no change)."""
        result = tag_to_array(["texture", "dungeon_stone"])
        assert result == ["texture", "dungeon_stone"]
    
    def test_array_to_tag(self):
        """Test converting array to pipe-delimited string."""
        result = array_to_tag(["texture", "dungeon_stone"])
        assert result == "texture|dungeon_stone"


class TestTagConverter:
    """Test URL path tag converter."""
    
    def setup_method(self):
        """Set up converter for each test."""
        self.converter = TagConverter(None, None)
    
    def test_to_python_url_path(self):
        """Test converting URL path to tag array."""
        result = self.converter.to_python("texture/dungeon_stone")
        assert result == ["texture", "dungeon_stone"]
    
    def test_to_url_array(self):
        """Test converting tag array to URL path."""
        result = self.converter.to_url(["texture", "dungeon_stone"])
        assert result == "texture/dungeon_stone"
    
    def test_to_url_pipe_string(self):
        """Test converting pipe-delimited string to URL path."""
        result = self.converter.to_url("texture|dungeon_stone")
        assert result == "texture/dungeon_stone"


class TestDocumentationSchemas:
    """Test that documentation schemas are properly defined."""
    
    def test_blueprint_documentation_schema_exists(self):
        """Test that blueprint documentation schema file exists."""
        import os
        schema_path = "openforge/openapi/schemas/blueprint_documentation.yaml"
        assert os.path.exists(schema_path), f"Schema file not found: {schema_path}"
    
    def test_tag_documentation_schema_exists(self):
        """Test that tag documentation schema file exists."""
        import os
        schema_path = "openforge/openapi/schemas/tag_documentation.yaml"
        assert os.path.exists(schema_path), f"Schema file not found: {schema_path}"
    
    def test_openapi_includes_documentation_schemas(self):
        """Test that main OpenAPI file includes documentation schemas."""
        import os
        openapi_path = "openforge/openapi/schemas/openapi.yaml"
        assert os.path.exists(openapi_path), f"OpenAPI file not found: {openapi_path}"
        
        with open(openapi_path, 'r') as f:
            content = f.read()
            # Check that documentation schemas are referenced
            assert "BlueprintDocumentation:" in content
            assert "TagDocumentation:" in content
            assert "ChangelogHistory:" in content


class TestDocumentationImports:
    """Test that documentation modules can be imported."""
    
    def test_blueprint_documentation_import(self):
        """Test importing blueprint documentation module."""
        try:
            import openforge.db.sql.blueprint_documentation
            assert True, "Blueprint documentation module imported successfully"
        except ImportError as e:
            pytest.fail(f"Failed to import blueprint documentation module: {e}")
    
    def test_tags_documentation_import(self):
        """Test importing tags documentation module."""
        try:
            import openforge.db.sql.tags_documentation
            assert True, "Tags documentation module imported successfully"
        except ImportError as e:
            pytest.fail(f"Failed to import tags documentation module: {e}")
    
    def test_documentation_routes_import(self):
        """Test importing documentation route modules."""
        try:
            import openforge.app.routes.blueprint_documentation
            import openforge.app.routes.tags_documentation
            assert True, "Documentation route modules imported successfully"
        except ImportError as e:
            pytest.fail(f"Failed to import documentation route modules: {e}")


if __name__ == "__main__":
    # Run basic tests
    print("Testing tag utilities...")
    test_utils = TestTagUtilities()
    test_utils.test_tag_to_array_string()
    test_utils.test_tag_to_array_list()
    test_utils.test_array_to_tag()
    print("✓ Tag utilities working correctly")
    
    print("Testing tag converter...")
    test_converter = TestTagConverter()
    test_converter.setup_method()
    test_converter.test_to_python_url_path()
    test_converter.test_to_url_array()
    test_converter.test_to_url_pipe_string()
    print("✓ Tag converter working correctly")
    
    print("Testing documentation schemas...")
    test_schemas = TestDocumentationSchemas()
    test_schemas.test_blueprint_documentation_schema_exists()
    test_schemas.test_tag_documentation_schema_exists()
    test_schemas.test_openapi_includes_documentation_schemas()
    print("✓ Documentation schemas properly defined")
    
    print("Testing documentation imports...")
    test_imports = TestDocumentationImports()
    test_imports.test_blueprint_documentation_import()
    test_imports.test_tags_documentation_import()
    test_imports.test_documentation_routes_import()
    print("✓ Documentation modules import successfully")
    
    print("\n🎉 All documentation system integration tests passed!") 