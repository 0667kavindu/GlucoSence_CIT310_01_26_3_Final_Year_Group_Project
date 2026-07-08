from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from database import db, Prediction, User
import traceback
import jwt

history_bp = Blueprint('history', __name__, url_prefix='/api')

# FIX (root cause of "Get Risk Score redirects to login"):
# Removed the local hardcoded SECRET_KEY constant. This file's own
# token_required decorator now verifies tokens using
# current_app.config["SECRET_KEY"] -- the exact same source of truth used by
# utils/auth_utils.py (which protects /api/predict) and auth.py (which
# issues the token at login). Before this fix, if app.config['SECRET_KEY']
# didn't exactly equal the string 'your-secret-key-change-this', tokens
# signed by the old auth.py would fail verification here with a 401.


# AUTH DECORATOR (FIXED)
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

        try:
            # FIX: use current_app.config["SECRET_KEY"], not a local hardcoded key
            decoded = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = decoded['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(user_id, *args, **kwargs)

    return decorated


# SAVE PREDICTION
@history_bp.route('/history', methods=['POST'])
@token_required
def save_prediction(user_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # FIX SQLAlchemy 2.0 WARNING
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Required fields check (unchanged logic)
        required_fields = [
            'risk_score', 'stage', 'prediction_type', 'model_used',
            'age', 'gender', 'bmi', 'waist_to_hip_ratio',
            'physical_activity_minutes_per_week', 'smoking_status',
            'alcohol_consumption_per_week', 'diet_score', 'sleep_hours_per_day',
            'family_history_diabetes', 'hypertension_history', 'cardiovascular_history'
        ]

        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing
            }), 400

        try:
            risk_score = float(data['risk_score'])
            age = int(data['age'])
            bmi = float(data['bmi'])
        except:
            return jsonify({'error': 'Invalid data types'}), 400

        prediction = Prediction(
            user_id=user_id,
            risk_score=risk_score,
            stage=data.get('stage'),
            prediction_type=data.get('prediction_type').upper(),
            model_used=data.get('model_used'),
            confidence=data.get('confidence', 'Unknown'),
            confidence_percent=data.get('confidence_percent', 0),
            blood_tests_included=data.get('prediction_type').upper() == 'WITH_BLOOD',

            age=age,
            gender=data.get('gender'),
            bmi=bmi,
            waist_to_hip_ratio=float(data.get('waist_to_hip_ratio')),
            physical_activity_minutes_per_week=int(data.get('physical_activity_minutes_per_week')),
            smoking_status=data.get('smoking_status'),
            alcohol_consumption_per_week=float(data.get('alcohol_consumption_per_week')),
            diet_score=float(data.get('diet_score')),
            sleep_hours_per_day=float(data.get('sleep_hours_per_day')),

            family_history_diabetes=int(data.get('family_history_diabetes', 0)),
            hypertension_history=int(data.get('hypertension_history', 0)),
            cardiovascular_history=int(data.get('cardiovascular_history', 0)),
        )

        db.session.add(prediction)
        db.session.commit()

        return jsonify({
            'success': True,
            'prediction_id': prediction.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# GET HISTORY
@history_bp.route('/history', methods=['GET'])
@token_required
def get_history(user_id):
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        predictions = Prediction.query.filter_by(user_id=user_id).order_by(
            Prediction.created_at.desc()
        ).all()

        return jsonify({
            'success': True,
            'total': len(predictions),
            'predictions': [p.to_dict() for p in predictions]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET SINGLE PREDICTION
@history_bp.route('/history/<int:prediction_id>', methods=['GET'])
@token_required
def get_prediction(user_id, prediction_id):
    try:
        prediction = db.session.get(Prediction, prediction_id)

        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404

        return jsonify({
            'success': True,
            'prediction': prediction.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# DELETE PREDICTION
@history_bp.route('/history/<int:prediction_id>', methods=['DELETE'])
@token_required
def delete_prediction(user_id, prediction_id):
    try:
        prediction = db.session.get(Prediction, prediction_id)

        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404

        db.session.delete(prediction)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# STATS
@history_bp.route('/history/stats', methods=['GET'])
@token_required
def get_stats(user_id):
    try:
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
            'lowest_risk': min(scores)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500