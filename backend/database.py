
# database.py
# Tables: users, predictions, risk_history (view)

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()# Initialize SQLAlchemy instance

def init_db(app):
    """Initialise database with Flask app and create all tables."""
    db.init_app(app)
    with app.app_context():# Create tables if they don't exist
        db.create_all()
        print("Database tables created/verified.")

# User Model
class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)# Unique user ID
    full_name     = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin      = db.Column(db.Boolean, default=False)# Flag to indicate if user has admin privileges
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)# Timestamp of when the user was created

    # Relationship: one user has many predictions / one to many relationship
    predictions = db.relationship('Prediction', backref='user', lazy=True)

    def to_dict(self):# Convert user object to dictionary for JSON serialization
        return {
            'id'         : self.id,
            'full_name'  : self.full_name,
            'email'      : self.email,
            'is_admin'   : self.is_admin,
            'created_at' : self.created_at.isoformat(),
            'total_assessments': len(self.predictions)
        }

# Prediction Model
# Stores every risk assessment a user completes
class Prediction(db.Model):
    __tablename__ = 'predictions'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)# Unique prediction ID
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    risk_score  = db.Column(db.Float,   nullable=False)
    stage       = db.Column(db.String(60), nullable=False)
    model_used  = db.Column(db.String(60), default='XGBoost')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # Input features stored as individual columns
    age                              = db.Column(db.Integer)
    gender                           = db.Column(db.String(20))
    bmi                              = db.Column(db.Float)
    waist_to_hip_ratio               = db.Column(db.Float)
    glucose_fasting                  = db.Column(db.Float)
    glucose_postprandial             = db.Column(db.Float)
    hba1c                            = db.Column(db.Float)
    insulin_level                    = db.Column(db.Float)
    systolic_bp                      = db.Column(db.Integer)
    diastolic_bp                     = db.Column(db.Integer)
    cholesterol_total                = db.Column(db.Float)
    hdl_cholesterol                  = db.Column(db.Float)
    ldl_cholesterol                  = db.Column(db.Float)
    triglycerides                    = db.Column(db.Float)
    family_history_diabetes          = db.Column(db.Integer)
    hypertension_history             = db.Column(db.Integer)
    cardiovascular_history           = db.Column(db.Integer)
    physical_activity_minutes_per_week = db.Column(db.Integer)
    smoking_status                   = db.Column(db.String(30))
    alcohol_consumption_per_week     = db.Column(db.Integer)
    diet_score                       = db.Column(db.Float)
    sleep_hours_per_day              = db.Column(db.Float)

    def to_dict(self):# Convert prediction object to dictionary for JSON serialization
        return {
            'id'         : self.id,
            'risk_score' : self.risk_score,
            'stage'      : self.stage,
            'model_used' : self.model_used,
            'created_at' : self.created_at.isoformat(),
            'inputs': {
                'age'              : self.age,
                'gender'           : self.gender,
                'bmi'              : self.bmi,
                'glucose_fasting'  : self.glucose_fasting,
                'hba1c'            : self.hba1c,
                'systolic_bp'      : self.systolic_bp,
            }
        }
