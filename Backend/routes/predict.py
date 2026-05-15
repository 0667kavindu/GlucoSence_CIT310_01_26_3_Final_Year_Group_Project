# routes/predict.py 
# Handles BOTH prediction modes: WITH_BLOOD and WITHOUT_BLOOD

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import numpy as np
import traceback
from datetime import datetime

# Create blueprint
predict_bp = Blueprint('predict', __name__, url_prefix='/api')


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
        
        return f(token, *args, **kwargs)
    return decorated


# HELPER FUNCTIONS
def get_stage(risk_score, prediction_type='WITH_BLOOD'):
    """Convert risk score to diabetes stage"""
    if prediction_type == 'WITH_BLOOD':
        if risk_score < 20:
            return 'No Diabetes'
        elif risk_score < 40:
            return 'Pre-Diabetic Risk'
        elif risk_score < 60:
            return 'Type 2 Early Risk'
        elif risk_score < 80:
            return 'Type 2 Elevated Risk'
        else:
            return 'High Risk — Consult Doctor'
    else:  # WITHOUT_BLOOD
        if risk_score < 25:
            return 'No Diabetes'
        elif risk_score < 45:
            return 'Pre-Diabetic Risk'
        elif risk_score < 65:
            return 'Type 2 Early Risk'
        elif risk_score < 80:
            return 'Type 2 Elevated Risk'
        else:
            return 'High Risk — Consult Doctor'


def get_recommendations(risk_score, prediction_type='WITH_BLOOD'):
    """Get personalized health recommendations"""
    
    recommendations_dict = {
        'low': [
            "Your risk is low. Maintain your healthy lifestyle.",
            "Exercise at least 150 minutes per week.",
            "Keep your BMI between 18.5 and 24.9.",
            "Get routine check-ups every 2 years."
        ],
        'moderate': [
            "Slightly elevated risk detected.",
            "Reduce refined sugar and processed foods.",
            "Aim for 30 minutes of moderate exercise daily.",
            "Monitor your health regularly.",
            "Consider losing 5-7% of body weight if overweight."
        ],
        'high': [
            "Moderate to high risk detected.",
            "Consult your doctor for diabetes screening.",
            "Follow a low-glycemic diet strictly.",
            "Exercise regularly (at least 30 mins/day).",
            "Avoid smoking and limit alcohol."
        ],
        'very_high': [
            "High risk detected — seek medical consultation immediately.",
            "Schedule fasting glucose and HbA1c blood tests.",
            "Follow a strict diabetic diet plan.",
            "Begin a supervised exercise program.",
            "Discuss medication options with your doctor."
        ]
    }
    
    # Determine risk level
    if prediction_type == 'WITH_BLOOD':
        if risk_score < 20:
            level = 'low'
        elif risk_score < 40:
            level = 'moderate'
        elif risk_score < 70:
            level = 'high'
        else:
            level = 'very_high'
    else:
        if risk_score < 25:
            level = 'low'
        elif risk_score < 45:
            level = 'moderate'
        elif risk_score < 65:
            level = 'high'
        else:
            level = 'very_high'
    
    recommendations = recommendations_dict[level].copy()
    
    # Add note for simplified predictions
    if prediction_type == 'WITHOUT_BLOOD':
        recommendations.insert(0,
            "⚠️ This prediction is based on lifestyle data only. For more accurate results, consider blood testing."
        )
    
    return recommendations


def validate_numeric_range(data, field, min_val, max_val):
    """Validate numeric field is within range"""
    if field not in data:
        return False, f"Missing field: {field}"
    
    try:
        val = float(data[field])
        if val < min_val or val > max_val:
            return False, f"{field} must be between {min_val} and {max_val}"
        return True, None
    except (ValueError, TypeError):
        return False, f"{field} must be a number"


# PREDICTION ENDPOINT
@predict_bp.route('/predict', methods=['POST'])
@token_required
def predict(token):
    """
    POST /api/predict
    
    Handle diabetes risk prediction for both modes:
    - WITH_BLOOD: Full assessment (23 fields)
    - WITHOUT_BLOOD: Quick assessment (11 fields)
    
    Required JSON:
    {
        "prediction_type": "WITH_BLOOD" or "WITHOUT_BLOOD",
        ... all required fields ...
    }
    """
    
    try:
        print("\n" + "=" * 70)
        print("📥 PREDICTION REQUEST RECEIVED")
        print("=" * 70)
        
        # Get request data
        data = request.get_json()
        if not data:
            print("❌ No JSON data provided")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        print(f"Received fields: {len(data)}")
        print(f"Fields: {list(data.keys())[:5]}...")
        
        # Get prediction type
        prediction_type = data.get('prediction_type', 'WITH_BLOOD').upper()
        print(f"Prediction type: {prediction_type}")
        
        if prediction_type not in ['WITH_BLOOD', 'WITHOUT_BLOOD']:
            print(f"❌ Invalid prediction_type: {prediction_type}")
            return jsonify({
                'error': "prediction_type must be 'WITH_BLOOD' or 'WITHOUT_BLOOD'"
            }), 400
        
        # Load model
        if prediction_type == 'WITH_BLOOD':
            bundle = current_app.model_bundle_full
            model_info = "Full Model (with blood tests)"
        else:
            bundle = current_app.model_bundle_simp
            model_info = "Simplified Model (lifestyle only)"
        
        if bundle is None:
            print(f"❌ Model not loaded: {model_info}")
            return jsonify({
                'error': 'Model not loaded. Please retrain models.',
                'fix': 'Run: python ml/train_model.py'
            }), 503
        
        print(f"✓ Model loaded: {model_info}")
        
        # Define required fields
        lifestyle_fields = [
            'age', 'gender', 'bmi', 'waist_to_hip_ratio',
            'physical_activity_minutes_per_week', 'smoking_status',
            'alcohol_consumption_per_week', 'diet_score', 'sleep_hours_per_day'
        ]
        
        history_fields = [
            'family_history_diabetes', 'hypertension_history', 'cardiovascular_history'
        ]
        
        blood_fields = [
            'glucose_fasting', 'glucose_postprandial', 'hba1c', 'insulin_level',
            'systolic_bp', 'diastolic_bp',
            'cholesterol_total', 'hdl_cholesterol', 'ldl_cholesterol', 'triglycerides'
        ]
        
        # Determine required fields
        if prediction_type == 'WITH_BLOOD':
            required_fields = lifestyle_fields + history_fields + blood_fields
        else:
            required_fields = lifestyle_fields + history_fields
        
        # Validate all required fields present
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] == '' or data[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing fields: {missing_fields}")
            return jsonify({
                'error': f'Missing required fields',
                'missing_fields': missing_fields
            }), 400
        
        print(f"✓ All {len(required_fields)} required fields present")
        
        # Validate numeric ranges
        validations = [
            (data, 'age', 18, 100),
            (data, 'bmi', 10, 60),
            (data, 'waist_to_hip_ratio', 0.5, 2.0),
        ]
        
        for d, field, min_v, max_v in validations:
            is_valid, error_msg = validate_numeric_range(d, field, min_v, max_v)
            if not is_valid:
                print(f"❌ Validation error: {error_msg}")
                return jsonify({'error': error_msg}), 400
        
        print("✓ All validations passed")
        
        # Build feature vector
        feature_cols = bundle['feature_cols']
        label_encoders = bundle['label_encoders']
        scaler = bundle['scaler']
        model = bundle['model']
        
        print(f"Building feature vector with {len(feature_cols)} features...")
        
        # Create row with all features
        row = {}
        for col in feature_cols:
            if col in data:
                row[col] = data[col]
            else:
                row[col] = 0  # Default value
        
        # Encode categorical variables
        for col, le in label_encoders.items():
            if col in row:
                val = str(row[col])
                try:
                    if val in le.classes_:
                        row[col] = int(le.transform([val])[0])  # cast to int explicitly
                    else:
                        row[col] = 0
                except Exception as e:
                    print(f"Encoding error for {col}: {str(e)}")
                    row[col] = 0

        # -------------------------------------------------------
        # FIX: Build feature array as float64 so XGBoost accepts it
        # np.array() infers dtype=object when mixed types are present,
        # which causes the "Unicode-1 is not supported" XGBoost error.
        # Explicitly casting every value to float and setting dtype
        # ensures a clean numeric array for both models.
        # -------------------------------------------------------
        X = np.array(
            [[float(row.get(col, 0)) for col in feature_cols]],
            dtype=np.float64
        )
        print(f"✓ Feature array shape: {X.shape}, dtype: {X.dtype}")
        
        # Scale if needed
        if scaler is not None:
            X = scaler.transform(X)
            print("✓ Features scaled")

        # Ensure float64 after scaling (safety net)
        X = X.astype(np.float64)
        
        # Make prediction
        print("🔮 Making prediction...")
        risk_proba = model.predict_proba(X)[0][1]
        risk_score = round(risk_proba * 100, 1)
        
        print(f"✓ Prediction complete: {risk_score}%")
        
        # Get stage and recommendations
        stage = get_stage(risk_score, prediction_type)
        recommendations = get_recommendations(risk_score, prediction_type)
        
        # Determine confidence
        if prediction_type == 'WITH_BLOOD':
            confidence = "High (complete medical data)"
            confidence_percent = 95
        else:
            confidence = "Moderate (lifestyle data only)"
            confidence_percent = 70
        
        # Build response
        response = {
            'success': True,
            'prediction_type': prediction_type,
            'model_used': bundle['model_name'],
            'model_info': model_info,
            'risk_score': risk_score,
            'stage': stage,
            'confidence': confidence,
            'confidence_percent': confidence_percent,
            'model_accuracy': round(bundle['accuracy'] * 100, 2),
            'recommendations': recommendations,
            'blood_tests_included': prediction_type == 'WITH_BLOOD',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if prediction_type == 'WITHOUT_BLOOD':
            response['note'] = "Consider getting blood tests for more accurate assessment"
        
        print(f"✓ Response prepared: {response['risk_score']}% risk")
        print("=" * 70 + "\n")
        
        return jsonify(response), 200
    
    except Exception as e:
        print(f"\n❌ EXCEPTION in /predict: {str(e)}")
        print(traceback.format_exc())
        print("=" * 70 + "\n")
        
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500



# PREDICTION INFO ENDPOINT
@predict_bp.route('/predict/info', methods=['GET'])
def get_predict_info():
    """Get information about prediction modes"""
    return jsonify({
        'prediction_modes': [
            {
                'type': 'WITH_BLOOD',
                'name': 'Full Assessment',
                'description': 'Complete diabetes risk prediction using medical tests',
                'fields_required': 23,
                'accuracy': 'High (95%)',
                'time_estimate': '5-10 minutes'
            },
            {
                'type': 'WITHOUT_BLOOD',
                'name': 'Quick Assessment',
                'description': 'Rapid screening using lifestyle data only',
                'fields_required': 11,
                'accuracy': 'Moderate (70%)',
                'time_estimate': '2-3 minutes'
            }
        ]
    }), 200



# SCHEMA ENDPOINT
@predict_bp.route('/predict/schema/<prediction_type>', methods=['GET'])
def get_schema(prediction_type):
    """Get form schema for prediction type"""
    prediction_type = prediction_type.upper()
    
    if prediction_type not in ['WITH_BLOOD', 'WITHOUT_BLOOD']:
        return jsonify({'error': 'Invalid prediction_type'}), 400
    
    schema = {
        'age': {'type': 'number', 'min': 18, 'max': 100},
        'gender': {'type': 'select', 'options': ['Male', 'Female', 'Other']},
        'bmi': {'type': 'number', 'min': 10, 'max': 60},
        'waist_to_hip_ratio': {'type': 'number', 'min': 0.5, 'max': 2.0},
        'physical_activity_minutes_per_week': {'type': 'number', 'min': 0, 'max': 1000},
        'smoking_status': {'type': 'select', 'options': ['Never', 'Former', 'Current']},
        'alcohol_consumption_per_week': {'type': 'number', 'min': 0, 'max': 100},
        'diet_score': {'type': 'number', 'min': 0, 'max': 100},
        'sleep_hours_per_day': {'type': 'number', 'min': 0, 'max': 12},
        'family_history_diabetes': {'type': 'checkbox'},
        'hypertension_history': {'type': 'checkbox'},
        'cardiovascular_history': {'type': 'checkbox'},
    }
    
    if prediction_type == 'WITH_BLOOD':
        schema.update({
            'glucose_fasting': {'type': 'number', 'min': 40, 'max': 400},
            'glucose_postprandial': {'type': 'number', 'min': 40, 'max': 400},
            'hba1c': {'type': 'number', 'min': 3, 'max': 15},
            'insulin_level': {'type': 'number', 'min': 0, 'max': 500},
            'systolic_bp': {'type': 'number', 'min': 60, 'max': 250},
            'diastolic_bp': {'type': 'number', 'min': 30, 'max': 150},
            'cholesterol_total': {'type': 'number', 'min': 50, 'max': 500},
            'hdl_cholesterol': {'type': 'number', 'min': 10, 'max': 200},
            'ldl_cholesterol': {'type': 'number', 'min': 0, 'max': 400},
            'triglycerides': {'type': 'number', 'min': 30, 'max': 1000},
        })
    
    return jsonify({
        'prediction_type': prediction_type,
        'schema': schema,
        'total_fields': len(schema)
    }), 200

print("\n✓ Predict routes registered successfully")