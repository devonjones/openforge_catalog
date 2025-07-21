from flask import jsonify, request, current_app, g
from openforge.app.services.session_service import SessionService
from openforge.app.middleware.csrf import generate_csrf_token, csrf_protect
from functools import wraps


def create_session():
    """Create a new admin session."""
    data = request.get_json()
    if not data or 'api_key' not in data:
        return jsonify({"error": "API key required"}), 400
    
    session_service = SessionService(current_app.db, current_app.config.get('API_TOKEN'))
    try:
        session_data = session_service.create_session(data['api_key'])
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    
    # CSRF token is now included in session_data
    csrf_token = session_data["csrf_token"]
    
    # Set session cookie with secure settings
    response = jsonify({
        "message": "Session created successfully",
        "expires_at": session_data["expires_at"],
        "csrf_token": csrf_token
    })
    
    # Set secure session cookie
    response.set_cookie(
        'session_token',
        session_data["session_token"],
        max_age=30 * 24 * 60 * 60,  # 30 days in seconds
        httponly=True,
        secure=True,  # Requires HTTPS
        samesite='Strict'
    )
    
    # Set CSRF token in response headers
    response.headers['X-CSRF-Token'] = csrf_token
    
    return response, 201


def validate_session():
    """Validate current session."""
    session_token = request.cookies.get('session_token')
    if not session_token:
        return jsonify({"valid": False, "error": "No session token"}), 401
    
    session_service = SessionService(current_app.db, current_app.config.get('API_TOKEN'))
    session_data = session_service.validate_session(session_token)
    
    if not session_data:
        return jsonify({"valid": False, "error": "Invalid or expired session"}), 401
    
    # Clean up expired sessions during validation
    cleaned_count = session_service.cleanup_expired_sessions()
    if cleaned_count > 0:
        current_app.logger.info(f"Cleaned up {cleaned_count} expired sessions")
    
    # Generate consistent CSRF token for the session
    csrf_token = session_service.get_csrf_token_for_session(session_data['id'])
    
    response = jsonify({
        "valid": True,
        "expires_at": session_data["expires_at"].isoformat() if session_data["expires_at"] else None,
        "csrf_token": csrf_token
    })
    
    # Set CSRF token in response headers
    response.headers['X-CSRF-Token'] = csrf_token
    
    return response
        



def session_csrf_protect(f):
    """Decorator that validates session and sets CSRF token before applying CSRF protection."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.cookies.get('session_token')
        if not session_token:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Validate the session exists and is valid
        session_service = SessionService(current_app.db, current_app.config.get('API_TOKEN'))
        session_data = session_service.validate_session(session_token)
        
        if not session_data:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Set CSRF token in g for CSRF protection
        g.csrf_token = session_service.get_csrf_token_for_session(session_data['id'])
        
        # Now apply CSRF protection
        return csrf_protect(f)(*args, **kwargs)
    
    return decorated_function


@session_csrf_protect
def delete_session():
    """Delete current session (logout)."""
    # Delete the session
    session_token = request.cookies.get('session_token')
    session_service = SessionService(current_app.db, current_app.config.get('API_TOKEN'))
    success = session_service.delete_session(session_token)
    
    if not success:
        return jsonify({"error": "Session not found"}), 404
    
    # Clear the session cookie
    response = jsonify({"message": "Session deleted successfully"})
    response.delete_cookie('session_token')
    
    return response 