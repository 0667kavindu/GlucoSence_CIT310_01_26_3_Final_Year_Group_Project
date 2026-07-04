# GlucoSense - Authentication Helper Functions

# This file contains helper functions used for JWT
# (JSON Web Token) authentication.


from functools import wraps
from datetime import datetime, timedelta
import jwt
from flask import request, jsonify, current_app
from database import User



# Create a JWT token for a logged-in user

def create_token(user):
    """
    Create a JWT token containing the user's basic information.

    The token includes:
      - User ID
      - Email address
      - Admin status
      - Issue time
      - Expiration time

    This token is returned to the frontend after login
    and must be sent with future protected requests.
    """

    secret_key = current_app.config["SECRET_KEY"]
    expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 24)

    payload = {
        "user_id": user.id,
        "email": user.email,
        "is_admin": bool(user.is_admin),
        "exp": datetime.utcnow() + timedelta(hours=expiry_hours),
        "iat": datetime.utcnow(),
    }

    # Create JWT using the application's secret key.
    token = jwt.encode(payload, secret_key, algorithm="HS256")

    # Older versions of PyJWT return bytes while newer
    # versions return a string. Convert if necessary.
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return token



# Decode an existing JWT token

def decode_token(token):
    """
    Decode and verify a JWT token.

    If the token has been modified, expired,
    or signed using the wrong secret key,
    an exception will be raised.
    """

    secret_key = current_app.config["SECRET_KEY"]

    return jwt.decode(
        token,
        secret_key,
        algorithms=["HS256"]
    )



# Read the Bearer token from request headers

def get_token_from_header():
    """
    Extract the JWT token from the Authorization header.

    Expected format:

        Authorization: Bearer <token>

    Returns:
        token -> if available
        error message -> if missing or invalid
    """

    auth_header = request.headers.get("Authorization", "")

    if not auth_header:
        return None, "Token is missing"

    parts = auth_header.split()

    # Ensure the header follows the Bearer token format.
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None, "Invalid token format. Use: Bearer <token>"

    return parts[1], None



# Authentication decorator

def token_required(require_admin=False):
    """
    Protect routes that require authentication.

    Before allowing access, this decorator:

      1. Reads the JWT token.
      2. Validates the token.
      3. Finds the logged-in user.
      4. Optionally checks whether the user is an admin.

    Examples:

        @token_required()

        Allows any logged-in user.

        @token_required(require_admin=True)

        Allows only administrators.
    """

    def decorator(f):

        @wraps(f)
        def decorated(*args, **kwargs):

            # Read JWT token from request header.
            token, error = get_token_from_header()

            if error:
                return jsonify({"error": error}), 401

            try:
                # Decode token and extract the logged-in user's ID.
                decoded = decode_token(token)
                user_id = decoded.get("user_id")

            except jwt.ExpiredSignatureError:
                return jsonify({
                    "error": "Token expired. Please log in again."
                }), 401

            except jwt.InvalidTokenError:
                return jsonify({
                    "error": "Invalid token"
                }), 401

            # Find the corresponding user in the database.
            current_user = User.query.get(user_id)

            if not current_user:
                return jsonify({
                    "error": "User not found"
                }), 404

            # If the route requires administrator access,
            # verify that the logged-in user is an admin.
            if require_admin and not current_user.is_admin:
                return jsonify({
                    "error": "Admin access required"
                }), 403

            # Continue to the requested route and pass
            # the logged-in user object to it.
            return f(current_user, *args, **kwargs)

        return decorated

    return decorator