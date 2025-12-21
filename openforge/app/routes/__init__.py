import os
from functools import wraps

from flask import request, jsonify
from flask import current_app as app


def authenticate(methods: list[str]):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.method not in methods:
                return f(*args, **kwargs)
            token = request.headers.get("Authorization")
            if not validate_api_token(token):
                return jsonify({"error": "Unauthorized"}), 401
            return f(*args, **kwargs)

        return wrapper

    return decorator


def validate_api_token(token: str):
    def _get_api_token():
        parts = token.split(" ")
        if len(parts) == 1:
            return parts[0]
        elif len(parts) == 2:
            if parts[0] == "Bearer":
                return parts[1]
        raise ValueError("Invalid API token format")

    return _get_api_token() == app.config["API_TOKEN"]
