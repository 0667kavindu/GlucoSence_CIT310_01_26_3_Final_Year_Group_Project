# routes/history.py
# Handle prediction history - save and retrieve predictions


from flask import Blueprint, request, jsonify
from functools import wraps
from database import db, Prediction, User
from datetime import datetime
import traceback

history_bp = Blueprint('history', __name__, url_prefix='/api')


# AUTHENTICATION DECORATOR
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
        
        # In production, you would verify the JWT token here
        # For now, we'll extract user_id from the token if possible
        # This is a simplified version - use proper JWT verification
        
        return f(token, *args, **kwargs)
    return decorated


# HELPER FUNCTIONS
def get_user_id_from_token(token):
    """Extract user ID from token (simplified)"""
    # In production, properly verify JWT and extract user_id
    # For now, return a placeholder - modify based on your auth system
    try:
        # This is a simplified version
        # You should properly decode the JWT token here
        return 1  # Placeholder - get actual user_id from token
    except:
        return None


# SAVE PREDICTION ENDPOINT
@history_bp.route('/history', methods=['POST'])
@token_required
def save_prediction(token):
    """
    POST /api/history
    
    Save a prediction to user's history
    """
    
    try:
        print("\n" + "=" * 70)
        print("💾 SAVING PREDICTION TO HISTORY")
        print("=" * 70)
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        print(f"Received fields: {list(data.keys())}")
        
        # Get current user 
        # For now, we'll get the first user or the logged-in user
        user_id = 1  # TODO: Extract from JWT token properly
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            print(f"❌ User not found: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"✓ User found: {user.email}")
        
        # Validate required fields
        required_fields = [
            'risk_score', 'stage', 'prediction_type', 'model_used',
            'age', 'gender', 'bmi', 'waist_to_hip_ratio',
            'physical_activity_minutes_per_week', 'smoking_status',
            'alcohol_consumption_per_week', 'diet_score', 'sleep_hours_per_day',
            'family_history_diabetes', 'hypertension_history', 'cardiovascular_history'
        ]
        
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"❌ Missing fields: {missing}")
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing
            }), 400
        
        print(f"✓ All required fields present")
        
        # Validate numeric fields
        try:
            risk_score = float(data.get('risk_score'))
            age = int(data.get('age'))
            bmi = float(data.get('bmi'))
        except (ValueError, TypeError):
            print("❌ Invalid data types")
            return jsonify({'error': 'Invalid data types'}), 400
        
        print(f"✓ Data types validated")
        
        # Create prediction record
        prediction = Prediction(
            user_id=user_id,
            risk_score=risk_score,
            stage=data.get('stage'),
            prediction_type=data.get('prediction_type').upper(),
            model_used=data.get('model_used'),
            confidence=data.get('confidence', 'Unknown'),
            confidence_percent=data.get('confidence_percent', 0),
            blood_tests_included=data.get('prediction_type').upper() == 'WITH_BLOOD',
            
            # Lifestyle fields
            age=age,
            gender=data.get('gender'),
            bmi=bmi,
            waist_to_hip_ratio=float(data.get('waist_to_hip_ratio')),
            physical_activity_minutes_per_week=int(data.get('physical_activity_minutes_per_week')),
            smoking_status=data.get('smoking_status'),
            alcohol_consumption_per_week=float(data.get('alcohol_consumption_per_week')),
            diet_score=float(data.get('diet_score')),
            sleep_hours_per_day=float(data.get('sleep_hours_per_day')),
            
            # Medical history
            family_history_diabetes=int(data.get('family_history_diabetes', 0)),
            hypertension_history=int(data.get('hypertension_history', 0)),
            cardiovascular_history=int(data.get('cardiovascular_history', 0)),
            
            # Blood tests (optional)
            glucose_fasting=float(data.get('glucose_fasting')) if data.get('glucose_fasting') else None,
            glucose_postprandial=float(data.get('glucose_postprandial')) if data.get('glucose_postprandial') else None,
            hba1c=float(data.get('hba1c')) if data.get('hba1c') else None,
            insulin_level=float(data.get('insulin_level')) if data.get('insulin_level') else None,
            systolic_bp=int(data.get('systolic_bp')) if data.get('systolic_bp') else None,
            diastolic_bp=int(data.get('diastolic_bp')) if data.get('diastolic_bp') else None,
            cholesterol_total=float(data.get('cholesterol_total')) if data.get('cholesterol_total') else None,
            hdl_cholesterol=float(data.get('hdl_cholesterol')) if data.get('hdl_cholesterol') else None,
            ldl_cholesterol=float(data.get('ldl_cholesterol')) if data.get('ldl_cholesterol') else None,
            triglycerides=float(data.get('triglycerides')) if data.get('triglycerides') else None,
        )
        
        print(f"✓ Prediction object created")
        
        # Save to database
        db.session.add(prediction)
        db.session.commit()
        
        print(f"✓ Prediction saved with ID: {prediction.id}")
        print("=" * 70 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Prediction saved successfully',
            'prediction_id': prediction.id
        }), 201
    
    except Exception as e:
        print(f"❌ ERROR in /history (POST): {str(e)}")
        print(traceback.format_exc())
        print("=" * 70 + "\n")
        
        db.session.rollback()
        
        return jsonify({
            'error': 'Failed to save prediction',
            'details': str(e)
        }), 500


# GET HISTORY ENDPOINT
@history_bp.route('/history', methods=['GET'])
@token_required
def get_history(token):
    """
    GET /api/history
    
    Get user's prediction history
    """
    
    try:
        print("\n" + "=" * 70)
        print("📋 FETCHING PREDICTION HISTORY")
        print("=" * 70)
        
        # Get current user (simplified)
        user_id = 1  # TODO: Extract from JWT token
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get predictions
        predictions = Prediction.query.filter_by(user_id=user_id).order_by(
            Prediction.created_at.desc()
        ).all()
        
        print(f"✓ Found {len(predictions)} predictions")
        
        return jsonify({
            'success': True,
            'total': len(predictions),
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    
    except Exception as e:
        print(f"❌ ERROR in /history (GET): {str(e)}")
        return jsonify({
            'error': 'Failed to fetch history',
            'details': str(e)
        }), 500



# GET SINGLE PREDICTION ENDPOINT
@history_bp.route('/history/<int:prediction_id>', methods=['GET'])
@token_required
def get_prediction(token, prediction_id):
    """
    GET /api/history/{prediction_id}
    
    Get a specific prediction
    """
    
    try:
        prediction = Prediction.query.get(prediction_id)
        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404
        
        return jsonify({
            'success': True,
            'prediction': prediction.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch prediction',
            'details': str(e)
        }), 500



# DELETE PREDICTION ENDPOINT
@history_bp.route('/history/<int:prediction_id>', methods=['DELETE'])
@token_required
def delete_prediction(token, prediction_id):
    """
    DELETE /api/history/{prediction_id}
    
    Delete a prediction from history
    """
    
    try:
        print("\n" + "=" * 70)
        print(f"🗑️  DELETING PREDICTION {prediction_id}")
        print("=" * 70)
        
        prediction = Prediction.query.get(prediction_id)
        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404
        
        db.session.delete(prediction)
        db.session.commit()
        
        print(f"✓ Prediction deleted")
        print("=" * 70 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Prediction deleted'
        }), 200
    
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        db.session.rollback()
        
        return jsonify({
            'error': 'Failed to delete prediction',
            'details': str(e)
        }), 500



# GET STATISTICS ENDPOINT
@history_bp.route('/history/stats', methods=['GET'])
@token_required
def get_stats(token):
    """
    GET /api/history/stats
    
    Get user's prediction statistics
    """
    
    try:
        # Get current user (simplified)
        user_id = 1
        
        predictions = Prediction.query.filter_by(user_id=user_id).all()
        
        if not predictions:
            return jsonify({
                'total': 0,
                'average_risk': 0,
                'highest_risk': 0,
                'lowest_risk': 0
            }), 200
        
        scores = [p.risk_score for p in predictions]
        
        return jsonify({
            'success': True,
            'total': len(predictions),
            'average_risk': round(sum(scores) / len(scores), 2),
            'highest_risk': max(scores),
            'lowest_risk': min(scores),
            'latest_date': predictions[0].created_at.isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch statistics',
            'details': str(e)
        }), 500

print("\n✓ History routes registered successfully")