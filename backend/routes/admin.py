#admin.py
#Admin dashboard endpoint
# GET /api/admin/stats — aggregate statistics for admin dashboard 

from flask import Blueprint, jsonify  
from sqlalchemy import func
from database import db, User, Prediction # Import the User and Prediction models to query the database for statistics
from routes.auth import admin_required  # Import the admin_required decorator to protect this route so that only admin users can access it

admin_bp = Blueprint('admin', __name__)  #Blueprint for admin routes


@admin_bp.route('/admin/stats', methods=['GET']) #Admin only endpoint to get aggregate statistics for the dashboard
@admin_required  #Protect this route so that only admin users can access it
def get_stats(current_user):  #Get aggregate statistics for the admin dashboard
    """
    GET /api/admin/stats (admin only)
    Returns aggregate statistics for the admin dashboard.
    """
    total_users       = User.query.count()   #Total number of registered users in the system
    total_predictions = Prediction.query.count() #Total number of risk assessments completed by all users in the system

    # Risk level distribution
    all_preds = Prediction.query.with_entities(Prediction.risk_score).all() 
    risk_levels = {'Low (0-20%)':0,'Moderate (20-40%)':0,'High (40-70%)':0,'Very High (70-100%)':0} 
    for (score,) in all_preds:
        if score < 20:   risk_levels['Low (0-20%)']      += 1
        elif score < 40: risk_levels['Moderate (20-40%)'] += 1
        elif score < 70: risk_levels['High (40-70%)']     += 1
        else:            risk_levels['Very High (70-100%)'] += 1

    # Average risk score
    avg = db.session.query(func.avg(Prediction.risk_score)).scalar()

    # Stage distribution
    stage_dist = db.session.query(
        Prediction.stage, func.count(Prediction.id)
    ).group_by(Prediction.stage).all()

    return jsonify({    #Return the aggregated statistics as a JSON response to be displayed on the admin dashboard
        'total_users'       : total_users,
        'total_assessments' : total_predictions,
        'average_risk_score': round(float(avg or 0), 2),
        'risk_distribution' : risk_levels,
        'stage_distribution': {s: c for s, c in stage_dist},
    }), 200
