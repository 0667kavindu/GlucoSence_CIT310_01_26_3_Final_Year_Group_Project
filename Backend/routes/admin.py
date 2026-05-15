# routes/admin.py
# Admin dashboard routes

from flask import Blueprint, request, jsonify
from functools import wraps
from database import db, User, Prediction
from datetime import datetime
import traceback

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# AUTHENTICATION DECORATOR (defined here, not imported)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        return f(token, *args, **kwargs)
    return decorated

# STATS ENDPOINT
@admin_bp.route('/stats', methods=['GET'])
@token_required
def get_stats(token):
    """Get admin statistics"""
    
    try:
        users = User.query.count()
        predictions = Prediction.query.count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': users,
                'total_predictions': predictions,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# USERS ENDPOINT
@admin_bp.route('/users', methods=['GET'])
@token_required
def get_users(token):
    """Get all users (admin only)"""
    
    try:
        users = User.query.all()
        
        return jsonify({
            'success': True,
            'total': len(users),
            'users': [u.to_dict() for u in users]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# PREDICTIONS ENDPOINT
@admin_bp.route('/predictions', methods=['GET'])
@token_required
def get_predictions(token):
    """Get all predictions (admin only)"""
    
    try:
        predictions = Prediction.query.all()
        
        return jsonify({
            'success': True,
            'total': len(predictions),
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

print("\n✓ Admin routes registered successfully")