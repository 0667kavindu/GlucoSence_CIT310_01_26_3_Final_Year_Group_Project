# GlucoSense — database.py 
# Updated schema to support both prediction modes

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid # For generating unique user IDs

db = SQLAlchemy()


# USER MODEL
class User(db.Model):
    """User account model."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id_uuid = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), unique=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationship to predictions
    predictions = db.relationship('Prediction', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert user to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id_uuid,
            'email': self.email,
            'full_name': self.full_name,
            'age': self.age,
            'gender': self.gender,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }



# PREDICTION MODEL (UPDATED)
class Prediction(db.Model):
    """
    User diabetes risk prediction record.
    
    NEW in v2.0:
    - Supports two prediction modes: WITH_BLOOD and WITHOUT_BLOOD
    - Blood test fields are now nullable (for simplified predictions)
    - Tracks which mode was used and confidence level
    """
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    #  Prediction Results 
    risk_score = db.Column(db.Float, nullable=False)  # 0-100 percentage
    stage = db.Column(db.String(60), nullable=False)  # e.g., 'Pre-Diabetic Risk'
    
    #  Metadata 
    prediction_type = db.Column(
        db.String(20),
        nullable=False,
        default='WITH_BLOOD',
        index=True
    )  # 'WITH_BLOOD' or 'WITHOUT_BLOOD'
    
    model_used = db.Column(db.String(60), default='XGBoost')  # Model name
    model_accuracy = db.Column(db.Float)  # Model's overall accuracy
    confidence = db.Column(db.String(100))  # 'High', 'Moderate', etc.
    confidence_percent = db.Column(db.Integer)  # 0-100
    blood_tests_included = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    #  LIFESTYLE FEATURES (Always present) 
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    bmi = db.Column(db.Float)
    waist_to_hip_ratio = db.Column(db.Float)
    physical_activity_minutes_per_week = db.Column(db.Integer)
    smoking_status = db.Column(db.String(30))
    alcohol_consumption_per_week = db.Column(db.Integer)
    diet_score = db.Column(db.Float)
    sleep_hours_per_day = db.Column(db.Float)
    
    #  MEDICAL HISTORY (Usually present) 
    family_history_diabetes = db.Column(db.Integer)  # 0 or 1
    hypertension_history = db.Column(db.Integer)  # 0 or 1
    cardiovascular_history = db.Column(db.Integer)  # 0 or 1
    
    #  BLOOD TEST FEATURES (Nullable - for WITHOUT_BLOOD mode) 
    glucose_fasting = db.Column(db.Float, nullable=True)
    glucose_postprandial = db.Column(db.Float, nullable=True)
    hba1c = db.Column(db.Float, nullable=True)
    insulin_level = db.Column(db.Float, nullable=True)
    systolic_bp = db.Column(db.Integer, nullable=True)
    diastolic_bp = db.Column(db.Integer, nullable=True)
    cholesterol_total = db.Column(db.Float, nullable=True)
    hdl_cholesterol = db.Column(db.Float, nullable=True)
    ldl_cholesterol = db.Column(db.Float, nullable=True)
    triglycerides = db.Column(db.Float, nullable=True)
    
    def to_dict(self):
        """
        Convert prediction to dictionary.
        Separates blood and non-blood data based on prediction type.
        """
        result = {
            'id': self.id,
            'risk_score': self.risk_score,
            'stage': self.stage,
            'prediction_type': self.prediction_type,
            'model_used': self.model_used,
            'model_accuracy': self.model_accuracy,
            'confidence': self.confidence,
            'confidence_percent': self.confidence_percent,
            'blood_tests_included': self.blood_tests_included,
            'created_at': self.created_at.isoformat(),
            'inputs': {
                'lifestyle': {
                    'age': self.age,
                    'gender': self.gender,
                    'bmi': self.bmi,
                    'waist_to_hip_ratio': self.waist_to_hip_ratio,
                    'physical_activity_minutes_per_week': self.physical_activity_minutes_per_week,
                    'smoking_status': self.smoking_status,
                    'alcohol_consumption_per_week': self.alcohol_consumption_per_week,
                    'diet_score': self.diet_score,
                    'sleep_hours_per_day': self.sleep_hours_per_day,
                },
                'medical_history': {
                    'family_history_diabetes': self.family_history_diabetes,
                    'hypertension_history': self.hypertension_history,
                    'cardiovascular_history': self.cardiovascular_history,
                }
            }
        }
        
        # Include blood test data only if prediction used them
        if self.blood_tests_included:
            result['inputs']['blood_tests'] = {
                'glucose_fasting': self.glucose_fasting,
                'glucose_postprandial': self.glucose_postprandial,
                'hba1c': self.hba1c,
                'insulin_level': self.insulin_level,
                'systolic_bp': self.systolic_bp,
                'diastolic_bp': self.diastolic_bp,
                'cholesterol_total': self.cholesterol_total,
                'hdl_cholesterol': self.hdl_cholesterol,
                'ldl_cholesterol': self.ldl_cholesterol,
                'triglycerides': self.triglycerides,
            }
        else:
            result['inputs']['blood_tests'] = None
        
        return result
    
    def __repr__(self):
        return f'<Prediction {self.id} - Risk: {self.risk_score}% - User: {self.user_id}>'



# DATABASE INITIALIZATION
def init_db(app):
    """
    Initialize database tables.
    
    Args:
        app: Flask application instance
    """
    with app.app_context():
        try:
            db.create_all()
            print("✓ Database tables initialized successfully")
        except Exception as e:
            print(f"✗ Database initialization error: {str(e)}")
            raise



# UTILITY FUNCTIONS
def get_user_prediction_stats(user_id):
    """
    Get statistics about user's predictions.
    
    Args:
        user_id: User ID
    
    Returns:
        Dictionary with prediction statistics
    """
    predictions = Prediction.query.filter_by(user_id=user_id).all()
    
    if not predictions:
        return {
            'total': 0,
            'average_risk': 0,
            'latest_risk': None,
            'prediction_modes': {'WITH_BLOOD': 0, 'WITHOUT_BLOOD': 0}
        }
    
    scores = [p.risk_score for p in predictions]
    modes = {}
    for p in predictions:
        mode = p.prediction_type
        modes[mode] = modes.get(mode, 0) + 1
    
    return {
        'total': len(predictions),
        'average_risk': round(sum(scores) / len(scores), 2),
        'latest_risk': predictions[-1].risk_score,
        'latest_date': predictions[-1].created_at.isoformat(),
        'prediction_modes': modes,
        'highest_risk': max(scores),
        'lowest_risk': min(scores)
    }


def get_all_predictions_summary():
    """
    Get summary statistics for all predictions (admin only).
    
    Returns:
        Dictionary with aggregate statistics
    """
    all_preds = Prediction.query.all()
    
    if not all_preds:
        return {
            'total': 0,
            'average_risk': 0,
            'risk_distribution': {},
            'mode_distribution': {}
        }
    
    scores = [p.risk_score for p in all_preds]
    modes = {}
    stages = {}
    
    for p in all_preds:
        # Count prediction modes
        mode = p.prediction_type
        modes[mode] = modes.get(mode, 0) + 1
        
        # Count stages
        stage = p.stage
        stages[stage] = stages.get(stage, 0) + 1
    
    return {
        'total': len(all_preds),
        'average_risk': round(sum(scores) / len(scores), 2),
        'highest_risk': max(scores),
        'lowest_risk': min(scores),
        'risk_distribution': {
            'low': len([s for s in scores if s < 20]),
            'moderate': len([s for s in scores if 20 <= s < 40]),
            'high': len([s for s in scores if 40 <= s < 70]),
            'very_high': len([s for s in scores if s >= 70])
        },
        'mode_distribution': modes,
        'stage_distribution': stages
    }
