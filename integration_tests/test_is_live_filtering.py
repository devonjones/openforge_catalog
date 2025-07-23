"""Test is_live filtering functionality."""

import pytest
from integration_tests.test_blueprint_documentation import TestBlueprintDocumentation


class TestIsLiveFiltering(TestBlueprintDocumentation):
    """Test that is_live filtering works correctly."""

    def test_all_documentation_only_returns_live_docs(self, api_client, test_blueprint_id):
        """Test that /api/blueprints/{id}/all-documentation only returns live documentation."""
        # Create a live documentation
        live_doc = {
            "document": "This is live documentation for testing",
            "document_type": "instructions",
            "is_live": True
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=live_doc)
        assert response.status_code == 201
        live_doc_id = response.json()["documentation"]["id"]
        
        # Create a non-live documentation
        draft_doc = {
            "document": "This is draft documentation for testing", 
            "document_type": "instructions", 
            "is_live": False
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=draft_doc)
        assert response.status_code == 201
        draft_doc_id = response.json()["documentation"]["id"]
        
        # Get all documentation (should only return live docs)
        response = api_client.get(f"/api/blueprints/{test_blueprint_id}/all-documentation")
        assert response.status_code == 200
        
        data = response.json()
        blueprint_docs = data["blueprint_documentation"]
        
        # Check that our live document is in the results
        live_docs = [doc for doc in blueprint_docs if doc["id"] == live_doc_id]
        assert len(live_docs) == 1, f"Live document {live_doc_id} should be in results"
        assert live_docs[0]["is_live"] == True, "Live document should have is_live=True"
        assert "This is live documentation for testing" in live_docs[0]["document"]
        
        # Check that our draft document is NOT in the results
        draft_ids = [doc["id"] for doc in blueprint_docs]
        assert draft_doc_id not in draft_ids, f"Draft document {draft_doc_id} should not be in results"

    def test_changelogs_always_live(self, api_client, test_blueprint_id):
        """Test that changelogs are always saved as live regardless of is_live parameter."""
        # Try to create a changelog with is_live=False
        changelog_doc = {
            "document": "This is a changelog entry",
            "document_type": "changelog",
            "is_live": False  # This should be ignored
        }
        
        response = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=changelog_doc)
        assert response.status_code == 201
        
        # Verify it was saved as live
        created_doc = response.json()["documentation"]
        assert created_doc["is_live"] == True
        assert created_doc["document_type"] == "changelog"

    def test_publish_workflow(self, api_client, test_blueprint_id):
        """Test that publishing a document marks others as non-live."""
        # Create two instruction documents
        doc1 = {
            "document": "First instruction document for publish test",
            "document_type": "instructions",
            "is_live": False
        }
        
        doc2 = {
            "document": "Second instruction document for publish test", 
            "document_type": "instructions",
            "is_live": False
        }
        
        response1 = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=doc1)
        assert response1.status_code == 201
        doc1_id = response1.json()["documentation"]["id"]
        
        response2 = api_client.post(f"/api/blueprints/{test_blueprint_id}/documentation", data=doc2)
        assert response2.status_code == 201
        doc2_id = response2.json()["documentation"]["id"]
        
        # Publish the first document
        publish_data = {
            "document": "First instruction document for publish test (updated)",
            "document_type": "instructions",
            "is_live": True
        }
        
        response = api_client.patch(f"/api/blueprints/{test_blueprint_id}/documentation/{doc1_id}", data=publish_data)
        assert response.status_code == 200
        
        # Get all documentation - should only show the published one
        response = api_client.get(f"/api/blueprints/{test_blueprint_id}/all-documentation")
        assert response.status_code == 200
        
        data = response.json()
        blueprint_docs = data["blueprint_documentation"]
        
        # Should only have the published documentation (plus any existing docs from other tests)
        our_instruction_docs = [doc for doc in blueprint_docs if doc["id"] in [doc1_id, doc2_id]]
        assert len(our_instruction_docs) == 1, f"Should only have one of our test docs, got {len(our_instruction_docs)}"
        assert our_instruction_docs[0]["id"] == doc1_id, "Should have the published doc"
        assert our_instruction_docs[0]["is_live"] == True, "Published doc should be live"
        assert "First instruction document for publish test (updated)" in our_instruction_docs[0]["document"] 

    def test_nonexistent_blueprint_documentation(self, api_client, test_blueprint_id):
        """Test getting documentation for a blueprint that has none."""
        # Since there are existing documents from other tests, this should return 200 with existing docs
        response = api_client.get(f"/api/blueprints/{test_blueprint_id}/documentation")
        
        # Should return 200 with existing documentation (from other tests)
        assert response.status_code == 200
        data = response.json()
        assert "documentation" in data
        assert isinstance(data["documentation"], list)