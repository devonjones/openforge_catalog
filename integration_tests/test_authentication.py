"""
Pytest tests for Authentication and Error Handling.
"""

import pytest
import requests


class TestAuthentication:
    """Test authentication requirements."""
    
    def test_blueprint_documentation_requires_auth(self, api_client_no_auth, test_blueprint_id):
        """Test that blueprint documentation operations require authentication."""
        test_doc = {
            "document": "Test document without auth",
            "document_type": "changelog"
        }
        
        # Test POST without auth
        response = api_client_no_auth.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=test_doc)
        assert response.status_code == 401
        
        # Test PUT without auth
        response = api_client_no_auth.put(f"/api/blueprints/{test_blueprint_id}/documentation/test-id", data=test_doc)
        assert response.status_code == 401
        
        # Test DELETE without auth
        response = api_client_no_auth.delete(f"/api/blueprints/{test_blueprint_id}/documentation/test-id")
        assert response.status_code == 401
    
    def test_tag_documentation_requires_auth(self, api_client_no_auth):
        """Test that tag documentation operations require authentication."""
        test_doc = {
            "document": "Test tag document without auth",
            "document_type": "instructions"
        }
        
        # Test POST without auth
        response = api_client_no_auth.post("/api/tags/test/tag/documentation", data=test_doc)
        assert response.status_code == 401
        
        # Test PUT without auth
        response = api_client_no_auth.put("/api/tags/test/tag/documentation/test-id", data=test_doc)
        assert response.status_code == 401
        
        # Test DELETE without auth
        response = api_client_no_auth.delete("/api/tags/test/tag/documentation/test-id")
        assert response.status_code == 401
    
    def test_read_operations_dont_require_auth(self, api_client_no_auth, test_blueprint_id, test_tag_documentation):
        """Test that read operations don't require authentication."""
        # Test GET blueprint documentation without auth
        response = api_client_no_auth.get(f"/api/blueprints/{test_blueprint_id}/documentation")
        assert response.status_code == 200
        
        # Test GET changelog history without auth
        response = api_client_no_auth.get(f"/api/blueprints/{test_blueprint_id}/changelog-history")
        assert response.status_code == 200
        
        # Test GET all documentation without auth
        response = api_client_no_auth.get(f"/api/blueprints/{test_blueprint_id}/all-documentation")
        assert response.status_code == 200
        
        # Test GET tag documentation without auth
        response = api_client_no_auth.get("/api/tags/texture/dungeon_stone/documentation")
        assert response.status_code == 200


class TestErrorHandling:
    """Test error handling for invalid inputs."""
    
    def test_invalid_blueprint_id_format(self, api_client):
        """Test handling of invalid blueprint ID format."""
        invalid_ids = [
            "invalid-uuid",
            "not-a-uuid",
            "123",
            "abc-def-ghi-jkl-mno-pqr-stu-vwx-yz"
        ]
        
        for invalid_id in invalid_ids:
            response = api_client.get(f"/api/blueprints/{invalid_id}/documentation")
            assert response.status_code == 400, f"Expected 400 for invalid ID: {invalid_id}"
        
        # Test empty string separately (results in 404 due to route redirection)
        response = api_client.get("/api/blueprints//documentation")
        assert response.status_code == 404, "Expected 404 for empty blueprint ID"
    
    def test_invalid_tag_format(self, api_client):
        """Test handling of invalid tag format."""
        # Test with various invalid tag formats
        invalid_tags = [
            "invalid-tag-format",
            "tag/with/multiple/slashes",
            "",
            "single_tag_without_slash"
        ]
        
        for invalid_tag in invalid_tags:
            response = api_client.get(f"/api/tags/{invalid_tag}/documentation")
            # Should handle gracefully - might return 404 (no data) or 400 (invalid format)
            assert response.status_code in [200, 400, 404], f"Unexpected status for tag: {invalid_tag}"
    
    def test_invalid_json_in_post(self, api_client, test_blueprint_id):
        """Test handling of invalid JSON in POST requests."""
        # Test with malformed JSON
        headers = {"Content-Type": "application/json"}
        
        # Test with invalid JSON structure
        invalid_data = {"invalid": "json", "missing": "required_fields"}
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", 
                                 data=invalid_data, headers=headers)
        assert response.status_code == 400
    
    def test_missing_required_fields(self, api_client, test_blueprint_id):
        """Test handling of missing required fields."""
        # Test missing document field
        incomplete_data = {"document_type": "changelog"}
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=incomplete_data)
        assert response.status_code == 400
        
        # Test missing document_type field
        incomplete_data = {"document": "Test document"}
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=incomplete_data)
        # This might succeed if document_type has a default value
        assert response.status_code in [200, 201, 400]
    
    def test_nonexistent_resources(self, api_client):
        """Test handling of requests to non-existent resources."""
        # Test non-existent blueprint documentation
        response = api_client.get("/api/blueprints/00000000-0000-0000-0000-000000000000/documentation")
        assert response.status_code == 200  # Should return empty list
        
        # Test non-existent tag documentation
        response = api_client.get("/api/tags/nonexistent/tag/documentation")
        assert response.status_code == 404  # Should return 404 when no documentation exists
        
        # Test non-existent documentation ID for update
        update_doc = {
            "document": "Updated document",
            "document_type": "changelog"
        }
        response = api_client.put("/api/blueprints/00000000-0000-0000-0000-000000000000/documentation/00000000-0000-0000-0000-000000000001", 
                                data=update_doc)
        assert response.status_code == 404
        
        # Test non-existent documentation ID for delete
        response = api_client.delete("/api/blueprints/00000000-0000-0000-0000-000000000000/documentation/00000000-0000-0000-0000-000000000001")
        assert response.status_code == 404
    
    def test_invalid_document_type(self, api_client, test_blueprint_id):
        """Test handling of invalid document types."""
        test_doc = {
            "document": "Test document with invalid type",
            "document_type": "invalid_type"
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=test_doc)
        assert response.status_code == 400
    
    def test_empty_document_content(self, api_client, test_blueprint_id):
        """Test handling of empty document content."""
        test_doc = {
            "document": "",
            "document_type": "changelog"
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=test_doc)
        # This might be allowed or rejected depending on validation rules
        assert response.status_code in [200, 201, 400]
    
    def test_very_large_document_content(self, api_client, test_blueprint_id):
        """Test handling of very large document content."""
        large_document = "x" * 10000  # 10KB document
        
        test_doc = {
            "document": large_document,
            "document_type": "changelog"
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=test_doc)
        # Should handle large content gracefully
        assert response.status_code in [200, 201, 400, 413]  # 413 = Payload Too Large
    
    def test_sql_injection_attempts(self, api_client):
        """Test handling of potential SQL injection attempts."""
        # Test with SQL injection in blueprint ID
        sql_injection_id = "'; DROP TABLE blueprints; --"
        response = api_client.get(f"/api/blueprints/{sql_injection_id}/documentation")
        assert response.status_code == 400
        
        # Test with SQL injection in tag
        sql_injection_tag = "'; DROP TABLE tag_documentation; --"
        response = api_client.get(f"/api/tags/{sql_injection_tag}/documentation")
        assert response.status_code in [200, 400]  # Should be handled safely
    
    def test_xss_attempts(self, api_client, test_blueprint_id):
        """Test handling of potential XSS attempts."""
        xss_document = "<script>alert('xss')</script>"
        
        test_doc = {
            "document": xss_document,
            "document_type": "changelog"
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=test_doc)
        # Should accept the content (XSS prevention is client-side)
        assert response.status_code in [200, 201]
        
        # Verify the content is stored as-is
        if response.status_code in [200, 201]:
            data = response.json()
            assert data["documentation"]["document"] == xss_document 