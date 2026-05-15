# routes/auth.py 
# User authentication with STRONG password validation

from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
import re
from datetime import datetime, timedelta
import jwt
from database import db, User
import traceback

auth_bp = Blueprint('auth', __name__, url_prefix='/api')
bcrypt = Bcrypt()


# PASSWORD VALIDATION
def validate_password(password):
    """
    Validate password strength
    
    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one number (0-9)
    - At least one special character (!@#$%^&*)
    """
    
    errors = []
    
    # Check length
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    # Check uppercase
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter (A-Z)")
    
    # Check lowercase
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter (a-z)")
    
    # Check numbers
    if not re.search(r'[0-9]', password):
        errors.append("Password must contain at least one number (0-9)")
    
    # Check special characters
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:,.<>?]', password):
        errors.append("Password must contain at least one special character (!@#$%^&*)")
    
    return len(errors) == 0, errors



# EMAIL VALIDATION
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None



# REGISTER ENDPOINT
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST /api/register
    
    Register a new user with strong password validation
    
    Required fields:
    {
        "email": "user@example.com",
        "password": "SecurePass123!",
        "password_confirm": "SecurePass123!",
        "full_name": "John Doe"
    }
    """
    
    try:
        print("\n" + "=" * 70)
        print("👤 REGISTRATION REQUEST")
        print("=" * 70)
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get fields
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        password_confirm = data.get('password_confirm', '')
        full_name = data.get('full_name', '').strip()
        
        print(f"Email: {email}")
        print(f"Full Name: {full_name}")
        
        # Validate required fields
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        if not full_name:
            return jsonify({'error': 'Full name is required'}), 400
        
        # Validate email format
        if not validate_email(email):
            print("❌ Invalid email format")
            return jsonify({'error': 'Invalid email format'}), 400
        
        print("✓ Email format valid")
        
        # Check passwords match
        if password != password_confirm:
            print("❌ Passwords don't match")
            return jsonify({'error': 'Passwords do not match'}), 400
        
        print("✓ Passwords match")
        
        # Validate password strength
        is_valid, errors = validate_password(password)
        if not is_valid:
            print(f"❌ Weak password: {errors}")
            return jsonify({
                'error': 'Password is not strong enough',
                'password_errors': errors
            }), 400
        
        print("✓ Password meets all requirements")
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"❌ User already exists: {email}")
            return jsonify({'error': 'Email already registered'}), 400
        
        print("✓ Email not registered yet")
        
        # Hash password
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            created_at=datetime.utcnow()
        )
        
        db.session.add(user)
        db.session.commit()
        
        print(f"✓ User created: ID {user.id}")
        print("=" * 70 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful. Please log in.',
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name
            }
        }), 201
    
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        
        return jsonify({
            'error': 'Registration failed',
            'details': str(e)
        }), 500



# LOGIN ENDPOINT
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/login
    
    Login user and return JWT token
    
    Required fields:
    {
        "email": "user@example.com",
        "password": "SecurePass123!"
    }
    """
    
    try:
        print("\n" + "=" * 70)
        print("🔑 LOGIN REQUEST")
        print("=" * 70)
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        print(f"Email: {email}")
        
        # Validate inputs
        if not email or not password:
            print("❌ Missing email or password")
            return jsonify({'error': 'Email and password required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401
        
        print(f"✓ User found: {user.full_name}")
        
        # Check password
        if not bcrypt.check_password_hash(user.password_hash, password):
            print("❌ Password incorrect")
            return jsonify({'error': 'Invalid email or password'}), 401
        
        print("✓ Password correct")
        
        # Create JWT token
        token = jwt.encode(
            {
                'user_id': user.id,
                'email': user.email,
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            'your-secret-key-change-this',  # TODO: Use app.config['SECRET_KEY']
            algorithm='HS256'
        )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        print(f"✓ Token generated")
        print("=" * 70 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name
            }
        }), 200
    
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        
        return jsonify({
            'error': 'Login failed',
            'details': str(e)
        }), 500



# VALIDATE PASSWORD ENDPOINT (For Frontend)
@auth_bp.route('/validate-password', methods=['POST'])
def validate_pwd():
    """
    POST /api/validate-password
    
    Validate password strength in real-time
    
    Request:
    {
        "password": "SecurePass123!"
    }
    
    Response:
    {
        "valid": true,
        "errors": [],
        "strength": "Strong"
    }
    """
    
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if not password:
            return jsonify({
                'valid': False,
                'errors': ['Password is required'],
                'strength': 'None'
            }), 200
        
        is_valid, errors = validate_password(password)
        
        # Determine strength
        if not is_valid:
            strength = 'Weak'
        elif len(password) >= 12 and len(errors) == 0:
            strength = 'Very Strong'
        else:
            strength = 'Strong'
        
        return jsonify({
            'valid': is_valid,
            'errors': errors,
            'strength': strength
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# GET CURRENT USER ENDPOINT
@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """
    GET /api/me
    
    Get current logged-in user info
    """
    
    try:
        # Get token from header
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        # Decode token
        try:
            decoded = jwt.decode(
                token,
                'your-secret-key-change-this',
                algorithms=['HS256']
            )
            user_id = decoded['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# LOGOUT ENDPOINT
@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/logout
    
    Logout user (invalidate token on frontend)
    """
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200

print("\n✓ Auth routes registered successfully")