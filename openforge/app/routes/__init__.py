import os
from functools import wraps
from typing import Union

from flask import request, jsonify, current_app, g
from openforge.app.services.session_service import SessionService
from openforge.app.middleware.csrf import generate_csrf_token


def authenticate(methods: list[str]):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.method not in methods:
                return f(*args, **kwargs)
            
            # Check for session authentication first (for web interface)
            session_token = request.cookies.get('session_token')
            if session_token:
                session_service = SessionService(current_app.db, current_app.config.get('API_TOKEN'))
                session_data = session_service.validate_session(session_token)
                if session_data:
                    # Set CSRF token in g for CSRF protection
                    # Use a consistent token based on session ID for this session
                    g.csrf_token = session_service.get_csrf_token_for_session(session_data['id'])
                    return f(*args, **kwargs)
            
            # Fall back to API key authentication (for programmatic access)
            token = request.headers.get("Authorization")
            if not validate_api_token(token):
                return jsonify({"error": "Unauthorized", "message": "Valid session or API key required"}), 401
            return f(*args, **kwargs)

        return wrapper

    return decorator


def validate_api_token(token: Union[str, None]):
    def _get_api_token():
        parts = token.split(" ")
        if len(parts) == 1:
            return parts[0]
        elif len(parts) == 2:
            if parts[0] == "Bearer":
                return parts[1]
        raise ValueError("Invalid API token format")

    if not token:
        return False
    return _get_api_token() == current_app.config["API_TOKEN"]
