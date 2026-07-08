from flask import Blueprint, request, jsonify, current_app
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
    errors = []

    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")

    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter (A-Z)")

    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter (a-z)")

    if not re.search(r'[0-9]', password):
        errors.append("Password must contain at least one number (0-9)")

    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:,.<>?]', password):
        errors.append("Password must contain at least one special character")

    return len(errors) == 0, errors


# EMAIL VALIDATION
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


# REGISTER
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # FIX: the frontend (Register.jsx) sends this field as
        # "password_confirm", but tests / other clients may send
        # "confirm_password". Accept either key so both work.
        password_confirm = data.get('password_confirm') or data.get('confirm_password', '')

        full_name = data.get('full_name', '').strip()

        # Required fields
        if not email or not password or not full_name:
            return jsonify({'error': 'Missing required fields'}), 400

        # Email validation
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Password match check
        if password != password_confirm:
            return jsonify({'error': 'Passwords do not match'}), 400

        # Password strength
        is_valid, errors = validate_password(password)
        if not is_valid:
            return jsonify({
                'error': 'Weak password',
                'password_errors': errors
            }), 400

        # Check duplicate user
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409

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

        token = jwt.encode(
            {
                'user_id': user.id,
                'email': user.email,
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Registration failed',
            'details': str(e)
        }), 500


# LOGIN
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        token = jwt.encode(
            {
                'user_id': user.id,
                'email': user.email,
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# VALIDATE PASSWORD
@auth_bp.route('/validate-password', methods=['POST'])
def validate_pwd():
    data = request.get_json()
    password = data.get('password', '')

    if not password:
        return jsonify({
            'valid': False,
            'errors': ['Password required'],
            'strength': 'None'
        }), 200

    is_valid, errors = validate_password(password)

    strength = 'Weak'
    if is_valid and len(password) >= 12:
        strength = 'Very Strong'
    elif is_valid:
        strength = 'Strong'

    return jsonify({
        'valid': is_valid,
        'errors': errors,
        'strength': strength
    }), 200


# GET CURRENT USER
@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    token = None

    if 'Authorization' in request.headers:
        try:
            token = request.headers['Authorization'].split(" ")[1]
        except:
            return jsonify({'error': 'Invalid token format'}), 401

    if not token:
        return jsonify({'error': 'Token missing'}), 401

    try:
        decoded = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])

        user = db.session.get(User, decoded['user_id'])

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401


# LOGOUT
@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200
