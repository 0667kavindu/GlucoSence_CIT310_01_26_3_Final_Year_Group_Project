# GlucoSense — app.py 
# Complete working backend with all fixes

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import pickle
import os
from datetime import datetime
import traceback

# Import database
from database import db, init_db

print("=" * 70)
print("🚀 GlucoSense Backend Starting Up...")
print("=" * 70)


# CREATE FLASK APP
app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'sqlite:///glucosense_dev.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_EXPIRY_HOURS'] = 24

# Initialize extensions
db.init_app(app)
CORS(app, supports_credentials=True)
bcrypt = Bcrypt(app)


# LOAD ML MODELS
print("\n📊 Loading ML Models...")
print("-" * 70)

app.model_bundle_full = None
app.model_bundle_simp = None

try:
    # Load FULL model
    with open('ML_Part/ml/diabetes_model_full.pkl', 'rb') as f:
        app.model_bundle_full = pickle.load(f)
    print("✓ FULL MODEL loaded successfully")
    print(f"  - Features: {len(app.model_bundle_full['feature_cols'])}")
    print(f"  - Accuracy: {app.model_bundle_full['accuracy']:.2%}")
except Exception as e:
    print(f"✗ ERROR loading FULL model: {str(e)}")
    print("  Fix: Run: python ML_PART/ml/train_model.py")

try:
    # Load SIMPLIFIED model
    with open('ML_Part/ml/diabetes_model_simplified.pkl', 'rb') as f:
        app.model_bundle_simp = pickle.load(f)
    print("✓ SIMPLIFIED MODEL loaded successfully")
    print(f"  - Features: {len(app.model_bundle_simp['feature_cols'])}")
    print(f"  - Accuracy: {app.model_bundle_simp['accuracy']:.2%}")
except Exception as e:
    print(f"✗ ERROR loading SIMPLIFIED model: {str(e)}")
    print("  Fix: Run: python ML_PART/ml/train_model.py")

print("-" * 70)


# IMPORT & REGISTER BLUEPRINTS
print("\n🔗 Registering Routes...")
print("-" * 70)

try:
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    print("✓ Auth routes registered")
except Exception as e:
    print(f"✗ Auth routes error: {str(e)}")

try:
    from routes.predict import predict_bp
    app.register_blueprint(predict_bp)
    print("✓ Predict routes registered")
except Exception as e:
    print(f"✗ Predict routes error: {str(e)}")

try:
    from routes.history import history_bp
    app.register_blueprint(history_bp)
    print("✓ History routes registered")
except Exception as e:
    print(f"✗ History routes error: {str(e)}")

try:
    from routes.admin import admin_bp
    app.register_blueprint(admin_bp)
    print("✓ Admin routes registered")
except Exception as e:
    print(f"✗ Admin routes error: {str(e)}")

print("-" * 70)


# INITIALIZE DATABASE
print("\n💾 Initializing Database...")
print("-" * 70)

with app.app_context():
    init_db(app)
    print("✓ Database initialized")

print("-" * 70)


# HEALTH CHECK ENDPOINT
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat(),
        'app_name': 'GlucoSense API',
        'version': '3.0',
        'models_loaded': {
            'full_model': app.model_bundle_full is not None,
            'simplified_model': app.model_bundle_simp is not None
        }
    }), 200


# INFO ENDPOINT
@app.route('/api/info', methods=['GET'])
def app_info():
    """Get application information"""
    return jsonify({
        'name': 'GlucoSense',
        'version': '3.0',
        'description': 'AI-powered Diabetes Risk Prediction System',
        'features': [
            'User authentication with JWT',
            'Dual prediction modes (with/without blood tests)',
            'Personalized health recommendations',
            'Prediction history tracking',
            'Admin dashboard with analytics'
        ],
        'prediction_modes': {
            'with_blood': {
                'name': 'Full Assessment',
                'fields': 23,
                'accuracy': '95%'
            },
            'without_blood': {
                'name': 'Quick Assessment',
                'fields': 11,
                'accuracy': '70%'
            }
        }
    }), 200


# ERROR HANDLERS
@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized. Please log in.'}), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Access denied.'}), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found.'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error.'}), 500


# CORS PREFLI
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        return response


# RUN APPLICATION
if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("✅ GlucoSense Backend Ready!")
    print("=" * 70)
    print(f"🌐 Running on http://127.0.0.1:5000")
    print(f"📊 Debug Mode: True")
    print("=" * 70 + "\n")
    
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True
    )