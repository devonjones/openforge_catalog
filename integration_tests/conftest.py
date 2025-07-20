"""
Pytest configuration and fixtures for Documentation System integration tests.
"""

import os
import sys
import pytest
import requests
from typing import Dict, Any, Optional

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from openforge.db import PgDB


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the API server."""
    return os.environ.get("TEST_BASE_URL", "http://localhost:5328")


@pytest.fixture(scope="session")
def api_key():
    """API key for authentication."""
    return os.environ.get("TEST_API_KEY", "1234567890")


@pytest.fixture(scope="session")
def db():
    """Database connection fixture."""
    try:
        db_conn = PgDB(os.environ)
        yield db_conn
    except Exception as e:
        pytest.skip(f"Database connection failed: {e}")


@pytest.fixture(scope="session")
def test_blueprint_id(base_url):
    """Get a test blueprint ID from the API."""
    try:
        response = requests.get(f"{base_url}/api/blueprints", timeout=10)
        response.raise_for_status()
        blueprints = response.json()
        
        if not blueprints:
            pytest.skip("No blueprints available for testing")
        
        return blueprints[0]["id"]
    except Exception as e:
        pytest.skip(f"Failed to get test blueprint: {e}")


@pytest.fixture(scope="function")
def cleanup_test_data(db):
    """Clean up test data before and after each test."""
    # Clean up before test
    with db.pool.connection() as conn:
        with conn.cursor() as curs:
            # Clean up test tag documentation (but preserve session test data)
            curs.execute("""
                DELETE FROM tag_documentation 
                WHERE document LIKE 'Test%' 
                   OR document LIKE 'Updated changelog entry%'
            """)
            
            # Clean up test blueprint documentation
            curs.execute("""
                DELETE FROM blueprint_documentation 
                WHERE document LIKE 'Test%' 
                   OR document LIKE 'Updated changelog entry%'
            """)
            conn.commit()
    
    yield
    
    # Clean up after test
    with db.pool.connection() as conn:
        with conn.cursor() as curs:
            # Clean up test tag documentation (but preserve session test data)
            curs.execute("""
                DELETE FROM tag_documentation 
                WHERE document LIKE 'Test%' 
                   OR document LIKE 'Updated changelog entry%'
            """)
            
            # Clean up test blueprint documentation
            curs.execute("""
                DELETE FROM blueprint_documentation 
                WHERE document LIKE 'Test%' 
                   OR document LIKE 'Updated changelog entry%'
            """)
            conn.commit()


@pytest.fixture(scope="session")
def test_tag_documentation(db):
    """Create test tag documentation for the test session."""
    test_tags = [
        {
            "tag_array": ["texture", "dungeon_stone"],
            "document": "Dungeon stone texture provides a dark, weathered appearance suitable for underground environments.",
            "document_type": "instructions"
        },
        {
            "tag_array": ["connection", "openforge"],
            "document": "OpenForge connection system allows for modular tile assembly with magnetic connections.",
            "document_type": "instructions"
        },
        {
            "tag_array": ["build", "topless"],
            "document": "Topless build style creates open-top structures for easy access and visibility.",
            "document_type": "instructions"
        }
    ]
    
    created_docs = []
    
    with db.pool.connection() as conn:
        with conn.cursor() as curs:
            for tag_data in test_tags:
                try:
                    query = """
                    INSERT INTO tag_documentation (tag, document, document_type)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                    RETURNING id, tag, document, document_type, created_at, updated_at
                    """
                    curs.execute(query, (tag_data["tag_array"], tag_data["document"], tag_data["document_type"]))
                    result = curs.fetchone()
                    
                    if result:
                        created_docs.append({
                            "id": result[0],
                            "tag": result[1],
                            "document": result[2],
                            "document_type": result[3]
                        })
                        
                except Exception as e:
                    print(f"Warning: Failed to create test tag documentation for {'/'.join(tag_data['tag_array'])}: {e}")
            
            conn.commit()
    
    yield created_docs
    
    # Clean up test tag documentation
    with db.pool.connection() as conn:
        with conn.cursor() as curs:
            curs.execute("""
                DELETE FROM tag_documentation 
                WHERE document LIKE 'Dungeon stone texture provides%'
                   OR document LIKE 'OpenForge connection system allows%'
                   OR document LIKE 'Topless build style creates%'
            """)
            conn.commit()


class APIClient:
    """Simple API client for making requests."""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json"
        })
    
    def request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                headers: Optional[Dict] = None, **kwargs) -> requests.Response:
        """Make an API request."""
        url = f"{self.base_url}{endpoint}"
        
        # Add authentication if not provided
        if headers is None:
            headers = {}
        if "Authorization" not in headers and self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Make the request with headers
        return self.session.request(method, url, json=data, headers=headers, **kwargs)
    
    def get(self, endpoint: str, **kwargs) -> requests.Response:
        return self.request("GET", endpoint, **kwargs)
    
    def post(self, endpoint: str, data: Optional[Dict] = None, **kwargs) -> requests.Response:
        return self.request("POST", endpoint, data=data, **kwargs)
    
    def put(self, endpoint: str, data: Optional[Dict] = None, **kwargs) -> requests.Response:
        return self.request("PUT", endpoint, data=data, **kwargs)
    
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        return self.request("DELETE", endpoint, **kwargs)


@pytest.fixture
def api_client(base_url, api_key):
    """API client fixture."""
    return APIClient(base_url, api_key)


@pytest.fixture
def api_client_no_auth(base_url):
    """API client fixture without authentication."""
    return APIClient(base_url, None) 