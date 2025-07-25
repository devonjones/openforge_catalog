"""Pagination utilities for API endpoints."""
from flask import jsonify
from typing import Tuple, Union


def validate_pagination_params(limit: int = 10, offset: int = 0) -> Union[Tuple[int, int], Tuple[dict, int]]:
    """Validate pagination parameters.
    
    Args:
        limit: Number of items to return (default: 10)
        offset: Number of items to skip (default: 0)
        
    Returns:
        Tuple of (limit, offset) if valid, or (error_response, status_code) if invalid
    """
    if limit < 1 or limit > 1000:
        return jsonify({"error": "Limit must be between 1 and 1000"}), 400
    
    if offset < 0:
        return jsonify({"error": "Offset must be non-negative"}), 400
    
    return limit, offset