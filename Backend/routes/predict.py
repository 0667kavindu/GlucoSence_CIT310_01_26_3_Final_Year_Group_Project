# GlucoSense - Prediction Routes

# This file handles the diabetes risk prediction process.

from flask import Blueprint, request, jsonify, current_app
import numpy as np
from datetime import datetime
import traceback

from utils.auth_utils import token_required

# SHAP is used to explain how the model made its prediction.
# If SHAP is not installed, the prediction will still work,
# but the explanation part will not be available.
try:
    import shap
except Exception:
    shap = None


# Create a Flask blueprint for prediction-related API routes.
predict_bp = Blueprint("predict", __name__, url_prefix="/api")



# Convert risk score into diabetes risk stage

def get_stage(risk_score, prediction_type="WITH_BLOOD"):
    """
    Convert the predicted risk percentage into a simple
    diabetes risk category.

    The full model and simplified model use slightly different
    thresholds because the full model has more medical data.
    """

    if prediction_type == "WITH_BLOOD":
        if risk_score < 20:
            return "No Diabetes"
        elif risk_score < 40:
            return "Pre-Diabetic Risk"
        elif risk_score < 60:
            return "Type 2 Early Risk"
        elif risk_score < 80:
            return "Type 2 Elevated Risk"
        return "High Risk — Consult Doctor"

    # Risk stages for lifestyle-only prediction
    if risk_score < 25:
        return "No Diabetes"
    elif risk_score < 45:
        return "Pre-Diabetic Risk"
    elif risk_score < 65:
        return "Type 2 Early Risk"
    elif risk_score < 80:
        return "Type 2 Elevated Risk"
    return "High Risk — Consult Doctor"



# Generate health recommendations

def get_recommendations(risk_score, prediction_type="WITH_BLOOD"):
    """
    Return basic health recommendations based on the predicted
    diabetes risk level.

    These recommendations are only for guidance and should not
    replace professional medical advice.
    """

    recommendations_dict = {
        "low": [
            "Your risk is low. Maintain a healthy lifestyle.",
            "Exercise at least 150 minutes per week.",
            "Keep BMI within a healthy range.",
            "Continue routine health check-ups."
        ],
        "moderate": [
            "Slightly elevated risk detected.",
            "Reduce refined sugar and processed foods.",
            "Aim for at least 30 minutes of exercise daily.",
            "Monitor your health regularly."
        ],
        "high": [
            "Moderate to high risk detected.",
            "Consult a doctor for diabetes screening.",
            "Follow a low-glycemic diet.",
            "Avoid smoking and limit alcohol."
        ],
        "very_high": [
            "High risk detected — seek medical consultation immediately.",
            "Schedule fasting glucose and HbA1c tests.",
            "Follow a strict diet and exercise plan under medical guidance."
        ],
    }

    # Select recommendation level for full prediction mode.
    if prediction_type == "WITH_BLOOD":
        if risk_score < 20:
            level = "low"
        elif risk_score < 40:
            level = "moderate"
        elif risk_score < 70:
            level = "high"
        else:
            level = "very_high"

    # Select recommendation level for lifestyle-only mode.
    else:
        if risk_score < 25:
            level = "low"
        elif risk_score < 45:
            level = "moderate"
        elif risk_score < 65:
            level = "high"
        else:
            level = "very_high"

    recommendations = recommendations_dict[level].copy()

    # Lifestyle-only prediction is less accurate than full prediction,
    # so the user is informed clearly.
    if prediction_type == "WITHOUT_BLOOD":
        recommendations.insert(
            0,
            "This result is based on lifestyle data only. Blood tests can improve accuracy."
        )

    return recommendations



# Validate numeric values

def validate_numeric_range(data, field, min_val, max_val):
    """
    Check whether a numeric input exists and stays within
    a realistic range.

    This prevents invalid user input from reaching the ML model.
    """

    if field not in data or data[field] == "" or data[field] is None:
        return False, f"Missing field: {field}"

    try:
        value = float(data[field])
    except (ValueError, TypeError):
        return False, f"{field} must be a number"

    if value < min_val or value > max_val:
        return False, f"{field} must be between {min_val} and {max_val}"

    return True, None



# Safe conversion helper functions

def safe_float(value, default=0.0):
    """
    Safely convert a value to float.

    If the value is missing or invalid, the default value is used
    instead of crashing the backend.
    """

    try:
        if value is None or value == "":
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    """
    Safely convert a value to integer.

    This is useful because values coming from HTML forms usually
    arrive as strings.
    """

    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default



# Prepare input features for the trained model

def build_feature_row(data, feature_cols, label_encoders):
    """
    Create one input row that matches the same feature format
    used when the model was trained.

    This is important because the ML model expects:
      - the same feature names,
      - the same feature order,
      - and the same encoding method.
    """

    row = {}

    # Gender may have been converted into one-hot columns during training.
    # Example: gender_Male, gender_Other
    gender_value = str(data.get("gender", "")).strip()

    for col in feature_cols:

        # Convert gender into the same one-hot encoded format
        # used during training.
        if col.startswith("gender_"):
            category = col.replace("gender_", "", 1)
            row[col] = 1.0 if gender_value == category else 0.0
            continue

        # Convert categorical values such as smoking_status
        # into numeric values using the saved LabelEncoder.
        if col in label_encoders:
            raw_value = str(data.get(col, "")).strip()
            encoder = label_encoders[col]

            if raw_value in encoder.classes_:
                row[col] = float(encoder.transform([raw_value])[0])
            else:
                # If an unknown category is received, use 0 as a safe fallback.
                row[col] = 0.0
            continue

        # Convert normal numeric fields into float values.
        default = OPTIONAL_FIELD_DEFAULTS.get(col, 0.0)
        row[col] = safe_float(data.get(col, default), default)

    return row


OPTIONAL_FIELD_DEFAULTS = {
   
    "systolic_bp": 120.0,
    "diastolic_bp": 80.0,
}



# Extract SHAP values for diabetes-risk class

def extract_positive_class_shap_values(shap_values):
    """
    SHAP can return values in different formats depending on
    the model type and SHAP version.

    Since GlucoSense predicts diabetes risk as a binary problem,
    we only need SHAP values for the positive class, which means
    the diabetes-risk class.
    """

    values = shap_values

    # Some SHAP explainers return an object where the real values
    # are stored inside the .values attribute.
    if hasattr(values, "values"):
        values = values.values

    values = np.array(values)

    # Some binary classifiers return SHAP values as:
    # [class_0_values, class_1_values]
    # Class 1 is the diabetes-risk class.
    if isinstance(shap_values, list) and len(shap_values) > 1:
        return np.array(shap_values[1])[0]

    # Some SHAP outputs have the format:
    # samples × features × classes
    if values.ndim == 3:
        return values[0, :, 1]

    # Standard format:
    # samples × features
    if values.ndim == 2:
        return values[0]

    # Already in the correct format:
    # features
    if values.ndim == 1:
        return values

    return None



# Generate SHAP explanation

def generate_shap_explanation(model, X_model_input, feature_cols, row):
    """
    Generate a SHAP explanation for one prediction.

    SHAP helps show which input features increased or decreased
    the predicted diabetes risk.

    Positive SHAP value  = increases predicted risk
    Negative SHAP value  = decreases predicted risk
    """

    # If SHAP is missing, return a clear message instead of
    # breaking the whole prediction endpoint.
    if shap is None:
        return {
            "available": False,
            "reason": "SHAP package is not installed. Run: pip install shap",
            "top_features": []
        }

    try:
        # TreeExplainer is suitable for tree-based models such as
        # XGBoost, Random Forest, Extra Trees, and Gradient Boosting.
        if hasattr(model, "feature_importances_"):
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_model_input)

        # For non-tree models, use SHAP's general explainer.
        else:
            masker = shap.maskers.Independent(X_model_input)
            explainer = shap.Explainer(model.predict_proba, masker)
            shap_values = explainer(X_model_input)

        # Get SHAP values for the diabetes-risk class.
        positive_values = extract_positive_class_shap_values(shap_values)

        if positive_values is None:
            return {
                "available": False,
                "reason": "Unable to parse SHAP output for this model.",
                "top_features": []
            }

        explanation = []

        # Attach each SHAP value to its feature name and input value.
        for feature, value in zip(feature_cols, positive_values):
            shap_value = float(value)

            explanation.append({
                "feature": feature,
                "input_value": float(row.get(feature, 0)),
                "shap_value": round(shap_value, 6),
                "impact": "increases_risk" if shap_value > 0 else "decreases_risk"
            })

        # Sort by strongest influence first.
        explanation = sorted(
            explanation,
            key=lambda item: abs(item["shap_value"]),
            reverse=True
        )

        # Return only the top 10 features so the frontend remains clean.
        return {
            "available": True,
            "method": "SHAP",
            "top_features": explanation[:10],
            "message": "Positive SHAP values increase predicted diabetes risk; negative values decrease it."
        }

    except Exception as e:
        return {
            "available": False,
            "reason": f"SHAP explanation failed: {str(e)}",
            "top_features": []
        }



# Main prediction endpoint

@predict_bp.route("/predict", methods=["POST"])
@token_required()
def predict(current_user):
    """
    Main API endpoint for diabetes prediction.

    This endpoint receives user input, validates it, prepares it
    for the model, predicts the risk, generates SHAP explanation,
    and returns the final result.

    NOTE ON VALIDATION ORDER:
    Input validation (missing/invalid fields -> 400) always runs
    BEFORE the "is the model loaded" check (-> 503). This way a
    bad/empty request always reports 400, regardless of whether a
    trained model is currently available on the server.
    """

    try:
        data = request.get_json() or {}

        # The frontend should send either WITH_BLOOD or WITHOUT_BLOOD.
        # If not sent, the full model is used by default.
        prediction_type = data.get("prediction_type", "WITH_BLOOD").upper()

        if prediction_type not in ["WITH_BLOOD", "WITHOUT_BLOOD"]:
            return jsonify({
                "error": "prediction_type must be 'WITH_BLOOD' or 'WITHOUT_BLOOD'"
            }), 400

        lifestyle_fields_common = [
            "age", "gender", "bmi", "waist_to_hip_ratio",
            "heart_rate",
            "physical_activity_minutes_per_week",
            "smoking_status",
            "alcohol_consumption_per_week",
            "diet_score",
            "sleep_hours_per_day",
        ]

        # Only required for the Full Assessment, where the extra vitals
        # form fields are expected to be collected.
        lifestyle_fields_full_only = [
            "systolic_bp",
            "diastolic_bp",
        ]

        # Medical history fields required for both prediction modes.
        history_fields = [
            "family_history_diabetes",
            "hypertension_history",
            "cardiovascular_history",
        ]

        # Blood test fields required only for full assessment.
        blood_fields = [
            "glucose_fasting",
            "glucose_postprandial",
            "hba1c",
            "insulin_level",
            "cholesterol_total",
            "hdl_cholesterol",
            "ldl_cholesterol",
            "triglycerides",
        ]

        # Build required field list based on selected prediction mode.
        required_fields = lifestyle_fields_common + history_fields

        if prediction_type == "WITH_BLOOD":
            required_fields += lifestyle_fields_full_only + blood_fields

        # Check for missing input fields before prediction.
        # (This runs BEFORE the model-loaded check further down.)
        missing_fields = [
            field for field in required_fields
            if field not in data or data[field] == "" or data[field] is None
        ]

        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing_fields": missing_fields
            }), 400

        # Validate important numeric fields with realistic ranges.
        validations = [
            (data, "age", 18, 100),
            (data, "bmi", 10, 60),
            (data, "waist_to_hip_ratio", 0.5, 2.0),
            (data, "physical_activity_minutes_per_week", 0, 1000),
            (data, "diet_score", 0, 100),
            (data, "sleep_hours_per_day", 0, 12),
        ]

        for d, field, min_v, max_v in validations:
            valid, error_msg = validate_numeric_range(d, field, min_v, max_v)
            if not valid:
                return jsonify({"error": error_msg}), 400

        # Select the correct trained model depending on prediction mode.
        # This check happens AFTER input validation, so a malformed
        # or empty request never masquerades as a "model unavailable"
        # (503) response.
        if prediction_type == "WITH_BLOOD":
            bundle = current_app.model_bundle_full
            model_info = "Full Model (with blood tests)"
        else:
            bundle = current_app.model_bundle_simp
            model_info = "Simplified Model (lifestyle only)"

        # If the model was not loaded in app.py, prediction cannot continue.
        if bundle is None:
            return jsonify({
                "error": "Model not loaded. Please retrain models.",
                "fix": "Run: python ml/train_model.py"
            }), 503

        # Load preprocessing objects and trained model from the model bundle.
        feature_cols = bundle["feature_cols"]
        label_encoders = bundle.get("label_encoders", {})
        scaler = bundle.get("scaler")
        model = bundle["model"]

        # Prepare input in the exact same format used during training.
        row = build_feature_row(data, feature_cols, label_encoders)

        # Convert input row into NumPy array for the ML model.
        X = np.array(
            [[float(row.get(col, 0.0)) for col in feature_cols]],
            dtype=np.float64
        )

        # Apply scaling only if the trained model has a scaler.
        X_model_input = scaler.transform(X) if scaler is not None else X
        X_model_input = X_model_input.astype(np.float64)

        # Predict probability for class 1, which represents diabetes risk.
        risk_proba = model.predict_proba(X_model_input)[0][1]

        # Convert probability into percentage.
        risk_score = round(float(risk_proba) * 100, 1)

        # Get readable stage and recommendations.
        stage = get_stage(risk_score, prediction_type)
        recommendations = get_recommendations(risk_score, prediction_type)

        # Generate SHAP explanation for this prediction.
        shap_explanation = generate_shap_explanation(
            model=model,
            X_model_input=X_model_input,
            feature_cols=feature_cols,
            row=row
        )

        # Confidence level is based on the amount of data used.
        confidence = (
            "High (complete medical data)"
            if prediction_type == "WITH_BLOOD"
            else "Moderate (lifestyle data only)"
        )

        confidence_percent = 95 if prediction_type == "WITH_BLOOD" else 70

        # Final response sent to the frontend.
        response = {
            "success": True,
            "user_id": current_user.id,
            "prediction_type": prediction_type,
            "model_used": bundle.get("model_name", "Unknown"),
            "model_info": model_info,
            "risk_score": risk_score,
            "stage": stage,
            "confidence": confidence,
            "confidence_percent": confidence_percent,
            "model_accuracy": round(float(bundle.get("accuracy", 0)) * 100, 2),
            "model_f1_score": round(float(bundle.get("f1_score", 0)) * 100, 2),
            "model_roc_auc": round(float(bundle.get("roc_auc", 0)) * 100, 2),
            "recommendations": recommendations,
            "blood_tests_included": prediction_type == "WITH_BLOOD",
            "shap_explanation": shap_explanation,
            # Alias kept for any client/test expecting this exact key name.
            "shap_factors": shap_explanation,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Add an extra note for lifestyle-only prediction.
        if prediction_type == "WITHOUT_BLOOD":
            response["note"] = "Consider blood tests for more accurate assessment."

        return jsonify(response), 200

    except Exception as e:
        # Print the full error in the backend terminal for debugging.
        print(traceback.format_exc())

        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500



# Prediction information endpoint

@predict_bp.route("/predict/info", methods=["GET"])
def get_predict_info():
    """
    Return information about available prediction modes.

    The frontend can use this endpoint to explain the difference
    between full assessment and quick assessment.
    """

    return jsonify({
        "prediction_modes": [
            {
                "type": "WITH_BLOOD",
                "name": "Full Assessment",
                "description": "Complete diabetes risk prediction using lifestyle, history, and blood test data.",
            },
            {
                "type": "WITHOUT_BLOOD",
                "name": "Quick Assessment",
                "description": "Diabetes risk screening using lifestyle and medical history data only.",
            },
        ]
    }), 200



# Prediction form schema endpoint

@predict_bp.route("/predict/schema/<prediction_type>", methods=["GET"])
def get_schema(prediction_type):
    """
    Return the required input fields for the selected prediction type.

    This can help the frontend dynamically build the correct form
    for WITH_BLOOD or WITHOUT_BLOOD prediction.
    """

    prediction_type = prediction_type.upper()

    if prediction_type not in ["WITH_BLOOD", "WITHOUT_BLOOD"]:
        return jsonify({"error": "Invalid prediction_type"}), 400

    # Common input fields for both prediction modes.
    schema = {
        "age": {"type": "number", "min": 18, "max": 100},
        "gender": {"type": "select", "options": ["Female", "Male", "Other"]},
        "bmi": {"type": "number", "min": 10, "max": 60},
        "waist_to_hip_ratio": {"type": "number", "min": 0.5, "max": 2.0},
        "heart_rate": {"type": "number", "min": 30, "max": 220},
        "physical_activity_minutes_per_week": {"type": "number", "min": 0, "max": 1000},
        "smoking_status": {"type": "select", "options": ["Never", "Former", "Current"]},
        "alcohol_consumption_per_week": {"type": "number", "min": 0, "max": 100},
        "diet_score": {"type": "number", "min": 0, "max": 100},
        "sleep_hours_per_day": {"type": "number", "min": 0, "max": 12},
        "family_history_diabetes": {"type": "checkbox"},
        "hypertension_history": {"type": "checkbox"},
        "cardiovascular_history": {"type": "checkbox"},
    }

    # Extra vitals + blood test fields are added only for full assessment.
    if prediction_type == "WITH_BLOOD":
        schema.update({
            
            "systolic_bp": {"type": "number", "min": 60, "max": 250},
            "diastolic_bp": {"type": "number", "min": 30, "max": 150},
            "glucose_fasting": {"type": "number", "min": 40, "max": 400},
            "glucose_postprandial": {"type": "number", "min": 40, "max": 400},
            "hba1c": {"type": "number", "min": 3, "max": 15},
            "insulin_level": {"type": "number", "min": 0, "max": 500},
            "cholesterol_total": {"type": "number", "min": 50, "max": 500},
            "hdl_cholesterol": {"type": "number", "min": 10, "max": 200},
            "ldl_cholesterol": {"type": "number", "min": 0, "max": 400},
            "triglycerides": {"type": "number", "min": 30, "max": 1000},
        })

    return jsonify({
        "prediction_type": prediction_type,
        "schema": schema,
        "total_fields": len(schema),
    }), 200