"""
Pytest tests for Tag Documentation API endpoints.
"""

import pytest
import requests


class TestTagDocumentation:
    """Test tag documentation endpoints."""
    
    def test_get_tag_documentation(self, api_client, test_tag_documentation):
        """Test GET /api/tags/{tag_array}/documentation."""
        # Test with a tag that should have documentation (if test data exists)
        response = api_client.get("/api/tags/texture/dungeon_stone/documentation")
        
        # If test data exists, should return 200 with data
        # If no test data exists, should return 404
        if response.status_code == 200:
            data = response.json()
            assert "documentation" in data
            assert isinstance(data["documentation"], list)
            assert len(data["documentation"]) >= 1
            
            # Check that the documentation is for the correct tag
            for doc in data["documentation"]:
                assert doc["tag"] == "texture|dungeon_stone"
        else:
            assert response.status_code == 404
    
    def test_get_tag_documentation_empty(self, api_client):
        """Test GET /api/tags/{tag_array}/documentation for tag with no documentation."""
        response = api_client.get("/api/tags/nonexistent/tag/documentation")
        
        assert response.status_code == 404
    
    def test_create_tag_documentation(self, api_client, cleanup_test_data):
        """Test POST /api/tags/{tag_array}/documentation."""
        test_doc = {
            "document": "Test tag documentation entry",
            "document_type": "instructions"
        }
        
        response = api_client.post("/api/tags/test/tag/documentation", data=test_doc)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "documentation" in data
        assert data["documentation"]["document"] == test_doc["document"]
        assert data["documentation"]["document_type"] == test_doc["document_type"]
        assert data["documentation"]["tag"] == "test|tag"
        assert "id" in data["documentation"]
    
    def test_update_tag_documentation(self, api_client, cleanup_test_data):
        """Test PUT /api/tags/{tag_array}/documentation/{doc_id}."""
        # First create a document
        test_doc = {
            "document": "Test tag documentation for update",
            "document_type": "instructions"
        }
        
        create_response = api_client.post("/api/tags/test/tag/documentation", data=test_doc)
        assert create_response.status_code in [200, 201]
        doc_id = create_response.json()["documentation"]["id"]
        
        # Now update it
        update_doc = {
            "document": "Updated tag documentation entry",
            "document_type": "instructions"
        }
        
        response = api_client.put(f"/api/tags/test/tag/documentation/{doc_id}", data=update_doc)
        
        assert response.status_code == 200
        data = response.json()
        assert "documentation" in data
        assert data["documentation"]["document"] == update_doc["document"]
        assert data["documentation"]["id"] == doc_id
        assert data["documentation"]["tag"] == "test|tag"
    
    def test_delete_tag_documentation(self, api_client, cleanup_test_data):
        """Test DELETE /api/tags/{tag_array}/documentation/{doc_id}."""
        # First create a document
        test_doc = {
            "document": "Test tag documentation for deletion",
            "document_type": "instructions"
        }
        
        create_response = api_client.post("/api/tags/test/tag/documentation", data=test_doc)
        assert create_response.status_code in [200, 201]
        doc_id = create_response.json()["documentation"]["id"]
        
        # Now delete it
        response = api_client.delete(f"/api/tags/test/tag/documentation/{doc_id}")
        
        assert response.status_code == 204
    
    def test_create_tag_documentation_requires_auth(self, api_client_no_auth):
        """Test that creating tag documentation requires authentication."""
        test_doc = {
            "document": "Test tag documentation without auth",
            "document_type": "instructions"
        }
        
        response = api_client_no_auth.post("/api/tags/test/tag/documentation", data=test_doc)
        
        assert response.status_code == 401
    
    def test_update_tag_documentation_requires_auth(self, api_client_no_auth):
        """Test that updating tag documentation requires authentication."""
        update_doc = {
            "document": "Updated tag documentation without auth",
            "document_type": "instructions"
        }
        
        response = api_client_no_auth.put("/api/tags/test/tag/documentation/test-id", data=update_doc)
        
        assert response.status_code == 401
    
    def test_delete_tag_documentation_requires_auth(self, api_client_no_auth):
        """Test that deleting tag documentation requires authentication."""
        response = api_client_no_auth.delete("/api/tags/test/tag/documentation/test-id")
        
        assert response.status_code == 401
    
    def test_invalid_tag_format(self, api_client):
        """Test handling of invalid tag format."""
        # Test with invalid tag format
        response = api_client.get("/api/tags/invalid-tag-format/documentation")
        
        # Should handle gracefully, might return 200 with empty results or 400
        assert response.status_code in [200, 400]
    
    def test_nonexistent_tag_documentation_id(self, api_client):
        """Test updating/deleting non-existent tag documentation."""
        # Test update
        update_doc = {
            "document": "Updated tag documentation",
            "document_type": "instructions"
        }
        
        response = api_client.put("/api/tags/test/tag/documentation/00000000-0000-0000-0000-000000000001", data=update_doc)
        assert response.status_code == 404
        
        # Test delete
        response = api_client.delete("/api/tags/test/tag/documentation/00000000-0000-0000-0000-000000000001")
        assert response.status_code == 404
    
    def test_multiple_tag_documentation(self, api_client, test_tag_documentation):
        """Test that multiple documentation entries can exist for the same tag."""
        # Create first document
        test_doc1 = {
            "document": "First test tag documentation",
            "document_type": "instructions"
        }
        
        response1 = api_client.post("/api/tags/multiple/test/documentation", data=test_doc1)
        assert response1.status_code in [200, 201]
        
        # Create second document
        test_doc2 = {
            "document": "Second test tag documentation",
            "document_type": "instructions"
        }
        
        response2 = api_client.post("/api/tags/multiple/test/documentation", data=test_doc2)
        assert response2.status_code in [200, 201]
        
        # Verify both documents exist
        get_response = api_client.get("/api/tags/multiple/test/documentation")
        assert get_response.status_code == 200
        data = get_response.json()
        assert len(data["documentation"]) >= 2
        
        # Clean up
        doc1_id = response1.json()["documentation"]["id"]
        doc2_id = response2.json()["documentation"]["id"]
        
        api_client.delete(f"/api/tags/multiple/test/documentation/{doc1_id}")
        api_client.delete(f"/api/tags/multiple/test/documentation/{doc2_id}")
    
    def test_tag_documentation_types(self, api_client, cleanup_test_data):
        """Test different document types for tag documentation."""
        # Tags only support "instructions" type according to implementation plan
        test_docs = [
            {
                "document": "Test instructions",
                "document_type": "instructions"
            }
        ]
        
        created_ids = []
        
        for test_doc in test_docs:
            response = api_client.post("/api/tags/test/types/documentation", data=test_doc)
            assert response.status_code in [200, 201]
            data = response.json()
            assert data["documentation"]["document_type"] == test_doc["document_type"]
            created_ids.append(data["documentation"]["id"])
        
        # Test that changelog type is rejected for tags
        invalid_doc = {
            "document": "Test changelog",
            "document_type": "changelog"
        }
        response = api_client.post("/api/tags/test/types/documentation", data=invalid_doc)
        assert response.status_code == 400
        
        # Clean up
        for doc_id in created_ids:
            api_client.delete(f"/api/tags/test/types/documentation/{doc_id}")
    
    def test_tag_documentation_ordering(self, api_client, test_tag_documentation):
        """Test that tag documentation is returned in correct order (newest first)."""
        response = api_client.get("/api/tags/texture/dungeon_stone/documentation")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["documentation"]) >= 2:
            # Check that documents are ordered by created_at DESC
            docs = data["documentation"]
            for i in range(len(docs) - 1):
                assert docs[i]["created_at"] >= docs[i + 1]["created_at"] 