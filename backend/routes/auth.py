# auth.py

# POST /api/register — create account
# POST /api/login    — get JWT token
# GET  /api/logout   — clear token (client-side)
# GET  /api/me       — get current user info

from flask import Blueprint, request, jsonify, current_app
from flask_bcrypt import Bcrypt
import jwt
import datetime
import functools

from database import db, User

auth_bp = Blueprint('auth', __name__)# Blueprint for authentication routes
bcrypt  = Bcrypt()# Initialize Bcrypt instance for password hashing

# JWT helper: create token 
def create_token(user_id, is_admin=False):
    """Create a JWT token that expires in 24 hours."""
    payload = {                     # Payload contains user ID, admin status, and token metadata
        'user_id'  : user_id,
        'is_admin' : is_admin,
        'exp'      : datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat'      : datetime.datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')# Encode the payload into a JWT token using the app's secret key

# JWT helper: decode and verify token 
def decode_token(token):  
    """Decode JWT token. Returns payload or raises exception."""
    return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])# Decode the token using the app's secret key. If the token is invalid or expired, this will raise an exception.

# Decorator: protect routes that require login
def login_required(f): 
    """Decorator — adds current_user to route if valid JWT token is present."""
    @functools.wraps(f)         # Preserve original function's metadata 
    def decorated(*args, **kwargs): # Check for token in Authorization header
        token = None  

        # Token comes in Authorization header: "Bearer <token>"
        auth_header = request.headers.get('Authorization', '')   # Get the Authorization header from the request
        if auth_header.startswith('Bearer '):   
            token = auth_header.split(' ')[1]  # Extract the token part

        if not token:
            return jsonify({'error': 'Authentication required. Please log in.'}), 401  # If no token is provided, return an error response

        try:
            payload      = decode_token(token)   # Decode the token to get the payload
            current_user = User.query.get(payload['user_id']) # Look up the user in the database using the user ID from the token payload
            if not current_user: 
                return jsonify({'error': 'User not found.'}), 401 # If the user ID from the token does not correspond to a valid user, return an error response
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Session expired. Please log in again.'}), 401  # If the token has expired, return an error response
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token. Please log in again.'}), 401 # If the token is invalid for any other reason, return an error response

        return f(current_user, *args, **kwargs) 
    return decorated

# Decorator: admin-only routes 
def admin_required(f):
    """Decorator — only allows admin users."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Authentication required.'}), 401
        try:
            payload = decode_token(token)
            if not payload.get('is_admin'):
                return jsonify({'error': 'Admin access required.'}), 403
            current_user = User.query.get(payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({'error': 'Invalid or expired token.'}), 401
        return f(current_user, *args, **kwargs)
    return decorated



# POST /api/register
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user.
    Body: { full_name, email, password }
    Returns: { message, token, user }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided.'}), 400

    # Validate required fields
    required = ['full_name', 'email', 'password']
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    full_name = data['full_name'].strip()
    email     = data['email'].strip().lower()
    password  = data['password']

    # Validate email format (basic check)
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email address.'}), 400

    # Validate password length
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    # Check if email already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    # Hash the password — NEVER store plain text
    hashed = bcrypt.generate_password_hash(password).decode('utf-8')

    # Create and save user
    new_user = User(
        full_name     = full_name,
        email         = email,
        password_hash = hashed
    )
    db.session.add(new_user)
    db.session.commit()

    # Generate JWT token so user is logged in immediately after registration
    token = create_token(new_user.id, is_admin=new_user.is_admin)

    return jsonify({
        'message' : 'Account created successfully.',
        'token'   : token,
        'user'    : new_user.to_dict()
    }), 201



# POST /api/login
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Log in an existing user.
    Body: { email, password }
    Returns: { token, user }
    """
    data = request.get_json() # Get the JSON data from the request body. This should contain the email and password for login.
    if not data:
        return jsonify({'error': 'No data provided.'}), 400

    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    # Find user by email
    user = User.query.filter_by(email=email).first()

    # Check password against stored hash
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    # Generate JWT token
    token = create_token(user.id, is_admin=user.is_admin)

    return jsonify({
        'message' : 'Logged in successfully.',
        'token'   : token,
        'user'    : user.to_dict()
    }), 200



# GET /api/me 
@auth_bp.route('/me', methods=['GET'])# Get current logged-in user's profile
@login_required 
def get_me(current_user): 
    """Return current logged-in user's profile."""  
    return jsonify({'user': current_user.to_dict()}), 200 # Return the user's information as a JSON response with a 200 OK status code



# POST /api/logout
# Logout is handled by client side 
# This endpoint is optional its just for confirming the action
@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out. Please delete your token client-side.'}), 200
