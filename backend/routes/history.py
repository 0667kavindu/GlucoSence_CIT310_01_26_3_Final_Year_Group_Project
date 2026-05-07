#history.py

# GET /api/history — To return all past assessments for logged-in user
# POST /api/history — To save a new assessment result

from flask import Blueprint, request, jsonify
from database import db, Prediction
from routes.auth import login_required

history_bp = Blueprint('history', __name__)# Blueprint for history routes


@history_bp.route('/history', methods=['GET'])# Get all past predictions for the logged-in user
@login_required
def get_history(current_user):# Get all past predictions for the logged-in user
    """
    GET /api/history
    Returns all past predictions for the logged-in user, newest first.
    """
    predictions = Prediction.query.filter_by(user_id=current_user.id)\
                                  .order_by(Prediction.created_at.desc())\
                                  .all()   # Query the database for all predictions made by the current user, ordered by creation date

    return jsonify({    # Return the predictions as a JSON response by including a count and a list of prediction details
        'count'       : len(predictions),
        'predictions' : [p.to_dict() for p in predictions]
    }), 200             # Return a 200 OK status code to indicate the request was successful


@history_bp.route('/history', methods=['POST'])   # Save a new prediction result for the logged-in user
@login_required
def save_prediction(current_user):  
    """
    POST /api/history
    Saves a prediction result after the user completes an assessment.
    Called automatically by the Results page after a successful prediction.
    Body: { risk_score, stage, model_used, ...all input fields }
    """
    data = request.get_json()           # Get the JSON data from the request body
    if not data:
        return jsonify({'error': 'No data provided.'}), 400  # Return a 400 Bad Request error if no data is provided in the request body

    # Create new prediction record
    pred = Prediction(
        user_id    = current_user.id,
        risk_score = data.get('risk_score', 0),
        stage      = data.get('stage', 'Unknown'),
        model_used = data.get('model_used', 'XGBoost'),
        #To Save all input fields
        age                                = data.get('age'),
        gender                             = data.get('gender'),
        bmi                                = data.get('bmi'),
        waist_to_hip_ratio                 = data.get('waist_to_hip_ratio'),
        glucose_fasting                    = data.get('glucose_fasting'),
        glucose_postprandial               = data.get('glucose_postprandial'),
        hba1c                              = data.get('hba1c'),
        insulin_level                      = data.get('insulin_level'),
        systolic_bp                        = data.get('systolic_bp'),
        diastolic_bp                       = data.get('diastolic_bp'),
        cholesterol_total                  = data.get('cholesterol_total'),
        hdl_cholesterol                    = data.get('hdl_cholesterol'),
        ldl_cholesterol                    = data.get('ldl_cholesterol'),
        triglycerides                      = data.get('triglycerides'),
        family_history_diabetes            = data.get('family_history_diabetes'),
        hypertension_history               = data.get('hypertension_history'),
        cardiovascular_history             = data.get('cardiovascular_history'),
        physical_activity_minutes_per_week = data.get('physical_activity_minutes_per_week'),
        smoking_status                     = data.get('smoking_status'),
        alcohol_consumption_per_week       = data.get('alcohol_consumption_per_week'),
        diet_score                         = data.get('diet_score'),
        sleep_hours_per_day                = data.get('sleep_hours_per_day'),
    )
    db.session.add(pred)  #Add the new prediction record to the database session
    db.session.commit()   #Commit the session to save the new prediction record to the database

    return jsonify({            #Return a JSON response confirming the assessment was saved and include the details of the saved prediction
        'message'    : 'Assessment saved to your history.',
        'prediction' : pred.to_dict()
    }), 201


@history_bp.route('/history/<int:pred_id>', methods=['DELETE'])  # Delete a specific prediction from the user's history
@login_required
def delete_prediction(current_user, pred_id):       
    """Delete a specific prediction from the user's history."""
    pred = Prediction.query.filter_by(id=pred_id, user_id=current_user.id).first() #Query the database for the prediction with the specified ID that belongs to the current user
    if not pred:
        return jsonify({'error': 'Record not found.'}), 404  #Return a 404 Not Found error if the prediction record does not exist or does not belong to the user
    db.session.delete(pred)
    db.session.commit()
    return jsonify({'message': 'Record deleted.'}), 200 #Return a JSON response confirming the record was deleted and a 200 OK status code to indicate the request was successful
