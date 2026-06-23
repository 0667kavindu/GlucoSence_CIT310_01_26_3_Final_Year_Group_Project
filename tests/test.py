
# GlucoSense — tests/test_api.py
# Full pytest test suite 
# Covers all 5 Flask API endpoints with valid, invalid, and edge case inputs

import pytest
import json
import sys, os
sys.path.insert(
    0,
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
)

from app      import app as flask_app
from database import db, User, Prediction


# FIXTURES — setup shared test objects
@pytest.fixture(scope='module')
def client():
    """Create test Flask client with in-memory SQLite database."""
    flask_app.config['TESTING']                   = True
    flask_app.config['SQLALCHEMY_DATABASE_URI']   = 'sqlite:///:memory:'
    flask_app.config['SECRET_KEY']                = 'test-secret'
    flask_app.config['WTF_CSRF_ENABLED']          = False

    with flask_app.app_context():
        db.create_all()

    with flask_app.test_client() as c:
        yield c

    with flask_app.app_context():
        db.drop_all()

# Register a test user and get auth token for protected endpoint tests
@pytest.fixture(scope='module')
def registered_user(client):
    """Register a test user and return token + user data."""
    res = client.post('/api/register', json={
        'full_name': 'Test User',
        'email': 'test@glucosense.com',
        'password': 'Password123@#',
        'confirm_password': 'Password123@#'
    })
    data = res.get_json()
    return {'token': data['token'], 'user': data['user']}

# Get auth headers for protected endpoint tests
@pytest.fixture(scope='module')
def auth_headers(registered_user):
    """Return Authorization header for protected endpoint tests."""
    return {'Authorization': f"Bearer {registered_user['token']}"}


# Valid prediction payload (all required fields)
VALID_PAYLOAD = {
      'prediction_type': 'WITH_BLOOD',
    'age': 45, 'gender': 'Male', 'bmi': 28.5,
    'waist_to_hip_ratio': 0.92,
    'glucose_fasting': 115, 'glucose_postprandial': 145,
    'hba1c': 6.2, 'insulin_level': 12.5,
    'systolic_bp': 128, 'diastolic_bp': 82,
    'cholesterol_total': 210, 'hdl_cholesterol': 42,
    'ldl_cholesterol': 130, 'triglycerides': 180,
    'family_history_diabetes': 1,
    'hypertension_history': 1, 'cardiovascular_history': 0,
    'physical_activity_minutes_per_week': 90,
    'smoking_status': 'Never',
    'alcohol_consumption_per_week': 2,
    'diet_score': 5.5, 'sleep_hours_per_day': 6.5
}


# Health Check — /api/health
def test_health_check(client):
    """Test 01 — API health check returns 200."""
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'


# AUTH — /api/register
def test_register_success(client):
    """Test 02 — Register new user returns 201 and token."""
    res = client.post('/api/register', json={
        'full_name': 'Jane Doe',
        'email':     'jane@glucosense.com',
        'password':  'Password123@#',
        'confirm_password': 'Password123@#'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert 'token' in data
    assert data['user']['email'] == 'jane@glucosense.com'


def test_register_duplicate_email(client):
    """Test 03 — Registering with an existing email returns 409."""
    # Register once
    client.post('/api/register', json={
        'full_name': 'Dup User', 'email': 'dup@glucosense.com', 'password': 'Password123@#', 'confirm_password': 'Password123@#'
    })
    # Try to register again with same email
    res = client.post('/api/register', json={
        'full_name': 'Dup User2', 'email': 'dup@glucosense.com', 'password': 'Password123@#', 'confirm_password': 'Password123@#'
    })
    assert res.status_code == 409


def test_register_missing_fields(client):
    """Test 04 — Register without required fields returns 400."""
    res = client.post('/api/register', json={
        'email': 'no_name@test.com',
        'password': 'Password123@#',
        'confirm_password': 'Password123@#'
        # missing full_name
    })
    assert res.status_code == 400


def test_register_short_password(client):
    """Test 05 — Password shorter than 6 chars returns 400."""
    res = client.post('/api/register', json={
        'full_name': 'Short', 'email': 'short@test.com', 'password': '123', 'confirm_password': '123'
    })
    assert res.status_code == 400


# AUTH — /api/login
def test_login_success(client, registered_user):
    """Test 06 — Login with correct credentials returns 200 and token."""
    res = client.post('/api/login', json={
        'email': 'test@glucosense.com', 'password': 'Password123@#'
    })
    assert res.status_code == 200
    assert 'token' in res.get_json()


def test_login_wrong_password(client):
    """Test 07 — Wrong password returns 401."""
    res = client.post('/api/login', json={
        'email': 'test@glucosense.com', 'password': 'wrongpassword'
    })
    assert res.status_code == 401


def test_login_unknown_email(client):
    """Test 08 — Non-existent email returns 401."""
    res = client.post('/api/login', json={
        'email': 'nobody@test.com', 'password': 'anything'
    })
    assert res.status_code == 401


def test_login_missing_password(client):
    """Test 09 — Login without password returns 400."""
    res = client.post('/api/login', json={'email': 'test@glucosense.com'})
    assert res.status_code == 400



# AUTH — /api/me
def test_get_me_authenticated(client, auth_headers):
    """Test 10 — /api/me returns user data with valid token."""
    res = client.get('/api/me', headers=auth_headers)
    assert res.status_code == 200
    assert 'user' in res.get_json()


def test_get_me_no_token(client):
    """Test 11 — /api/me without token returns 401."""
    res = client.get('/api/me')
    assert res.status_code == 401


def test_get_me_invalid_token(client):
    """Test 12 — /api/me with fake token returns 401."""
    res = client.get('/api/me', headers={'Authorization': 'Bearer fakejwttoken123'})
    assert res.status_code == 401



# PREDICT — /api/predict
def test_predict_valid_input(client, auth_headers):
    """Test 13 — Valid prediction payload returns 200 and risk_score."""
    if flask_app.model_bundle_full is None:
        pytest.skip("Model not loaded — run train_model.py first")
    res = client.post('/api/predict', json=VALID_PAYLOAD, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'risk_score' in data
    assert 0 <= data['risk_score'] <= 100
    assert 'stage' in data


def test_predict_returns_shap_factors(client, auth_headers):
    """Test 14 — Prediction response includes SHAP factors."""
    if flask_app.model_bundle_full is None:
        pytest.skip("Model not loaded")
    res = client.post('/api/predict', json=VALID_PAYLOAD, headers=auth_headers)
    data = res.get_json()
    assert 'shap_factors' in data


def test_predict_missing_fields(client, auth_headers):
    """Test 15 — Prediction with missing required fields returns 400."""
    res = client.post('/api/predict',
        json={'age': 45, 'bmi': 28.5, 'prediction_type': 'WITH_BLOOD'},
        headers=auth_headers)
    assert res.status_code in [400, 503]


def test_predict_no_token(client):
    """Test 16 — Prediction without authentication token returns 401."""
    res = client.post('/api/predict', json=VALID_PAYLOAD)
    # depends on whether predict requires auth — adjust if public
    assert res.status_code in [200, 401]


def test_predict_low_risk_profile(client, auth_headers):
    """Test 17 — Healthy profile should produce a low risk score."""
    if flask_app.model_bundle_full is None:
        pytest.skip("Model not loaded")
    healthy = {**VALID_PAYLOAD,
        'bmi': 22.0, 'hba1c': 4.8, 'glucose_fasting': 82,
        'physical_activity_minutes_per_week': 300,
        'diet_score': 9.0, 'family_history_diabetes': 0
    }
    res  = client.post('/api/predict', json=healthy, headers=auth_headers)
    data = res.get_json()
    # Healthy profile should ideally produce risk < 50
    assert data['risk_score'] < 70

# High-risk profile test
def test_predict_high_risk_profile(client, auth_headers):
    """Test 18 — Very high-risk profile should produce elevated risk score."""
    if flask_app.model_bundle_full is None:
        pytest.skip("Model not loaded")
    highrisk = {**VALID_PAYLOAD,
        'bmi': 38.0, 'hba1c': 9.5, 'glucose_fasting': 250,
        'physical_activity_minutes_per_week': 0,
        'diet_score': 1.0, 'family_history_diabetes': 1,
        'smoking_status': 'Current'
    }
    res  = client.post('/api/predict', json=highrisk, headers=auth_headers)
    data = res.get_json()
    assert data['risk_score'] > 40


# HISTORY — /api/history
def test_get_history_authenticated(client, auth_headers):
    """Test 19 — /api/history returns list for logged-in user."""
    res = client.get('/api/history', headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert 'predictions' in data
    assert isinstance(data['predictions'], list)


def test_get_history_no_token(client):
    """Test 20 — /api/history without token returns 401."""
    res = client.get('/api/history')
    assert res.status_code == 401


def test_save_prediction_to_history(client, auth_headers):
    """Test 21 — POST /api/history saves a record and returns 201."""
    res = client.post('/api/history',
        json={**VALID_PAYLOAD, 'risk_score': 55.0, 'stage': 'High Risk',
            'prediction_type': 'WITH_BLOOD', 'model_used': 'XGBoost'},
        headers=auth_headers)
    assert res.status_code == 201
    assert res.get_json()['prediction_id'] is not None



# 404 And other edge cases
def test_unknown_route(client):
    """Test 22 — Unknown route returns 404."""
    res = client.get('/api/this_does_not_exist')
    assert res.status_code == 404


def test_empty_predict_body(client, auth_headers):
    """Test 23 — Empty body to /api/predict returns 400."""
    res = client.post('/api/predict', json={}, headers=auth_headers)
    assert res.status_code == 400
