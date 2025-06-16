from psycopg.rows import dict_row
import uuid
from typing import Any, Dict, List
import random
import string

def create_test_image(
    image_name: str = "test_image",
    image_url: str = "http://test.com/image.jpg",
    blueprint_ids: List[uuid.UUID] = None
) -> Dict[str, Any]:
    """Create a test image dictionary matching the schema."""
    return {
        "image_name": image_name,
        "image_url": image_url,
        "blueprint_ids": blueprint_ids or []
    }

def create_test_blueprint(
    blueprint_name: str = "test_blueprint",
    blueprint_type: str = "blueprint",
    blueprint_config: Dict = None,
    file_md5: str = None,
    file_size: int = 1024,
    file_name: str = "test.stl",
    full_name: str = "Test Blueprint",
    file_changed_at: str = "2024-02-20T00:00:00Z",
    file_modified_at: str = "2024-02-20T00:00:00Z",
    storage_address: str = "test/address",
    tags: List[str] = None,
    images: List[Dict] = None
) -> Dict[str, Any]:
    """Create a test blueprint dictionary matching the schema."""
    if file_md5 is None:
        file_md5 = "md5_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=24))
    if tags is None:
        tags = ["test|tag"]
    if images is None:
        images = [
            {
                "image_name": "test_image",
                "image_url": "http://test.com/image.jpg"
            }
        ]
    return {
        "blueprint_name": blueprint_name,
        "blueprint_type": blueprint_type,
        "blueprint_config": blueprint_config or {"test": "config"},
        "file_md5": file_md5,
        "file_size": file_size,
        "file_name": file_name,
        "full_name": full_name,
        "file_changed_at": file_changed_at,
        "file_modified_at": file_modified_at,
        "storage_address": storage_address,
        "tags": tags,
        "images": images
    }

def assert_image_matches(image: Dict[str, Any], expected: Dict[str, Any]) -> None:
    """Assert that an image matches expected values."""
    assert image["image_name"] == expected["image_name"]
    assert image["image_url"] == expected["image_url"]
    if "blueprint_ids" in expected:
        # If blueprint_ids not in image, assume empty list
        actual_ids = image.get("blueprint_ids", [])
        assert set(actual_ids) == set(expected["blueprint_ids"])

def assert_blueprint_matches(blueprint: Dict[str, Any], expected: Dict[str, Any]) -> None:
    """Assert that a blueprint matches expected values."""
    assert blueprint["blueprint_name"] == expected["blueprint_name"]
    assert blueprint["blueprint_type"] == expected["blueprint_type"]
    assert blueprint["blueprint_config"] == expected["blueprint_config"]
    if "file_md5" in expected:
        assert blueprint["file_md5"] == expected["file_md5"]

def assert_tag_matches(tag, expected_tag, expected_blueprint_id):
    assert tag["tag"] == expected_tag
    assert str(tag["blueprint_id"]) == str(expected_blueprint_id) 