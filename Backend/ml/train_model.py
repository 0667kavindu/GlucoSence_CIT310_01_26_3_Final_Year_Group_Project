#train_model.py

#import necessary libraries and modules
import os
import pickle
import warnings

import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import xgboost as xgb

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    auc,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import cross_val_score

warnings.filterwarnings('ignore')


# Configurations and constants
DATASET_PATH = 'data/diabetes_dataset.csv'
MODEL_DIR = 'ml'
CHART_DIR = 'charts'
RANDOM_STATE = 42
TEST_SIZE = 0.2

TARGET = 'diagnosed_diabetes'
STAGE_TARGET = 'diabetes_stage'


# Create feature groups 

# Blood test + measurable medical features
BLOOD_AND_MEDICALLY_MEASURABLE_FEATURES = [
    'glucose_fasting',
    'glucose_postprandial',
    'hba1c',
    'insulin_level',
    # 'systolic_bp',
    # 'diastolic_bp',
    'cholesterol_total',
    'hdl_cholesterol',
    'ldl_cholesterol',
    'triglycerides',
]

# Lifestyle + non-lab measurable features
LIFESTYLE_FEATURES = [
    'age',

    'bmi',
    'waist_to_hip_ratio',
    'heart_rate',
    'physical_activity_minutes_per_week',
    'smoking_status',
    'alcohol_consumption_per_week',
    'diet_score',
    'sleep_hours_per_day',
    'screen_time_hours_per_day',
     'systolic_bp',
    'diastolic_bp',
]

# Medical history
HISTORY_FEATURES = [
    'family_history_diabetes',
    'hypertension_history',
    'cardiovascular_history',
]

# Final feature sets
FULL_MODEL_FEATURES = LIFESTYLE_FEATURES + HISTORY_FEATURES + BLOOD_AND_MEDICALLY_MEASURABLE_FEATURES
SIMPLIFIED_MODEL_FEATURES = LIFESTYLE_FEATURES+ HISTORY_FEATURES


# HELPER FUNCTIONS
def print_section(title):
    print('\n' + '=' * 70)
    print(title)
    print('=' * 70)


# Validate that required features are present in the dataset
def validate_features(data, features, model_name='MODEL'):
    missing = [f for f in features if f not in data.columns]

    if missing:
        raise ValueError(
            f"\n❌ Missing columns for {model_name}:\n{missing}"
        )
    print(f"✓ All required features found for {model_name}")


# Encode categorical features
# Gender uses One-Hot Encoding
# Other categorical columns use LabelEncoder

def encode_categorical_features(X):

    label_encoders = {}

    # One-hot encode gender
    if 'gender' in X.columns:
        gender_dummies = pd.get_dummies(
            X['gender'],
            prefix='gender',
            drop_first=True
        )

        X = pd.concat(
            [X.drop('gender', axis=1), gender_dummies],
            axis=1
        )

        print('✓ One-hot encoded: gender')

    # Label encode other categorical columns
    categorical_cols = X.select_dtypes(include=['object']).columns

    for col in categorical_cols:

        le = LabelEncoder()

        X[col] = le.fit_transform(
            X[col].astype(str)
        )

        label_encoders[col] = le

        print(f'✓ Label encoded: {col}')

    return X, label_encoders

# Evaluate and compare models using multiple metrics and return the best model name based on F1 score
def evaluate_models(results, y_test, model_type='MODEL'):
    print_section(f'{model_type} EVALUATION RESULTS')

    print(
        f"{'Model':<22} {'Accuracy':>10} {'Precision':>10} "
        f"{'Recall':>10} {'F1':>10} {'ROC-AUC':>10}"
    )

    print('-' * 80)

    best_model_name = None
    best_f1 = 0

    for name, r in results.items():
        acc = accuracy_score(y_test, r['pred'])
        pre = precision_score(y_test, r['pred'])
        rec = recall_score(y_test, r['pred'])
        f1 = f1_score(y_test, r['pred'])
        roc = roc_auc_score(y_test, r['proba'])

        print(
            f"{name:<22} {acc:>10.4f} {pre:>10.4f} "
            f"{rec:>10.4f} {f1:>10.4f} {roc:>10.4f}"
        )

        results[name].update({
            'accuracy': acc,
            'precision': pre,
            'recall': rec,
            'f1_score': f1,
            'roc_auc': roc,
        })

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name

    print('\n✓ Best Model:', best_model_name)
    print(f'✓ Best F1 Score: {best_f1:.4f}')

    return best_model_name


# Generate feature importance chart for models that support it
def generate_feature_importance_chart(model, feature_names, output_path, title):
    if not hasattr(model, 'feature_importances_'):
        return

    importance_data = pd.DataFrame({
        'Feature': feature_names,
        'Importance': model.feature_importances_
    }).sort_values(by='Importance', ascending=False)

    plt.figure(figsize=(10, 6))

    sns.barplot(
        x='Importance',
        y='Feature',
        data=importance_data,
    )

    plt.title(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

    print(f'✓ Saved feature importance chart: {output_path}')

# Generate confusion matrix chart
def generate_confusion_matrix_chart(y_true, y_pred, output_path, title):

    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(6, 5))

    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        cbar=False,
    )

    plt.title(title, fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

    print(f'✓ Saved confusion matrix chart: {output_path}')


# Generate ROC curve chart
def generate_roc_curve_chart(y_true, y_proba, output_path, title):

    fpr, tpr, _ = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(7, 6))

    plt.plot(
        fpr,
        tpr,
        linewidth=2,
        label=f'AUC = {roc_auc:.4f}',
    )

    plt.plot(
        [0, 1],
        [0, 1],
        linestyle='--',
    )

    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')

    plt.title(title, fontsize=14, fontweight='bold')

    plt.legend(loc='lower right')

    plt.grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

    print(f'✓ Saved ROC curve chart: {output_path}')


# Save model bundle with all necessary components for future inference
def save_model_bundle(path, bundle):
  
    with open(path, 'wb') as f:
        pickle.dump(bundle, f)

    print(f'✓ Saved model: {path}')


# Start of the training pipeline
print_section('GLUCOSENSE — DUAL MODEL TRAINING PIPELINE')


# STEP 1 — Load the dataset
print_section('STEP 1 — LOADING........... DATASET')

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(
        f"❌ Dataset not found: {DATASET_PATH}"
    )

data = pd.read_csv(DATASET_PATH)

print(f'✓ Dataset loaded successfully')
print(f'✓ Dataset shape: {data.shape}')#check the shape of the dataset

print('\nDataset Columns:')
for col in data.columns:
    print(f'  • {col}')

print('\nMissing Values:')
print(data.isnull().sum())


# STEP 2 — Clean the data 
print_section('STEP 2 — CLEANING DATA')

# Remove leakage column
if 'diabetes_risk_score' in data.columns:
    data.drop('diabetes_risk_score', axis=1, inplace=True)
    print('✓ Removed: diabetes_risk_score (data leakage prevention)')

# Remove sensitive bias column
if 'ethnicity' in data.columns:
    data.drop('ethnicity', axis=1, inplace=True)
    print('✓ Removed: ethnicity (bias reduction)')

# Drop rows with missing target
before_rows = len(data)

data.dropna(subset=[TARGET], inplace=True)

removed_rows = before_rows - len(data)

if removed_rows > 0:
    print(f'✓ Removed {removed_rows} rows with missing target values')

# Fill numeric missing values
numeric_cols = data.select_dtypes(include=np.number).columns

for col in numeric_cols:
    if data[col].isnull().sum() > 0:
        median_val = data[col].median()
        data[col].fillna(median_val, inplace=True)
        print(f'✓ Filled missing numeric values in {col}')

# Fill categorical missing values
categorical_cols = data.select_dtypes(include=['object']).columns

for col in categorical_cols:
    if data[col].isnull().sum() > 0:
        mode_val = data[col].mode()[0]
        data[col].fillna(mode_val, inplace=True)
        print(f'✓ Filled missing categorical values in {col}')


# STEP 3 — Prepare features 
print_section('STEP 3 — PREPARING FEATURES')

validate_features(data, FULL_MODEL_FEATURES, 'FULL MODEL')
validate_features(data, SIMPLIFIED_MODEL_FEATURES, 'SIMPLIFIED MODEL')

# Separate targets
X = data.drop(columns=[TARGET, STAGE_TARGET])
y = data[TARGET]

# Encode stage labels 
stage_encoder = LabelEncoder()
stage_encoder.fit(data[STAGE_TARGET])

# Encode categorical columns
X, label_encoders = encode_categorical_features(X)

# Add one-hot encoded gender columns dynamically
gender_columns = [
    col for col in X.columns
    if col.startswith('gender_')
]

FULL_MODEL_FEATURES = (
    FULL_MODEL_FEATURES + gender_columns
)

SIMPLIFIED_MODEL_FEATURES = (
    SIMPLIFIED_MODEL_FEATURES + gender_columns
)

print(f'\n✓ Total feature columns: {len(X.columns)}')

# STEP 4 — Full model data
print_section('STEP 4 — PREPARING FULL MODEL DATA')

X_full = X[FULL_MODEL_FEATURES].copy()

X_train_full, X_test_full, y_train_full, y_test_full = train_test_split(
    X_full,
    y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y,
)

print(f'✓ Full model training rows: {X_train_full.shape[0]}')
print(f'✓ Full model testing rows:  {X_test_full.shape[0]}')

scaler_full = StandardScaler()

X_train_full_scaled = scaler_full.fit_transform(X_train_full)
X_test_full_scaled = scaler_full.transform(X_test_full)


# STEP 5 — Simplified model data
print_section('STEP 5 — PREPARING SIMPLIFIED MODEL DATA')

X_simp = X[SIMPLIFIED_MODEL_FEATURES].copy()

X_train_simp, X_test_simp, y_train_simp, y_test_simp = train_test_split(
    X_simp,
    y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y,
)

print(f'✓ Simplified model training rows: {X_train_simp.shape[0]}')
print(f'✓ Simplified model testing rows:  {X_test_simp.shape[0]}')

scaler_simp = StandardScaler()

X_train_simp_scaled = scaler_simp.fit_transform(X_train_simp)
X_test_simp_scaled = scaler_simp.transform(X_test_simp)


# STEP 6 — Train full models
print_section('STEP 6 — TRAINING FULL MODELS')

results_full = {}

# Logistic Regression
print('\n▶ Training Logistic Regression....')

lr_full = LogisticRegression(
    max_iter=1000,
    random_state=RANDOM_STATE,
)

lr_full.fit(X_train_full_scaled, y_train_full)

results_full['Logistic Regression'] = {
    'model': lr_full,
    'pred': lr_full.predict(X_test_full_scaled),
    'proba': lr_full.predict_proba(X_test_full_scaled)[:, 1],
    'scaled': False,
}

# Random Forest
print('▶ Training Random Forest....')

rf_full = RandomForestClassifier(
   
    n_estimators=200,
    max_depth=6,
    min_samples_split=5,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=RANDOM_STATE,
  

)

rf_full.fit(X_train_full, y_train_full)
cv_scores = cross_val_score(
    rf_full,
    X_full,
    y,
    cv=5,
    scoring='f1'
)


results_full['Random Forest'] = {
    'model': rf_full,
    'pred': rf_full.predict(X_test_full),
    'proba': rf_full.predict_proba(X_test_full)[:, 1],
    'scaled': False,
}

# XGBoost
print('▶ Training XGBoost....')

xgb_full = xgb.XGBClassifier(
    n_estimators=120,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.7,
    colsample_bytree=0.7,
    min_child_weight=5,
    random_state=RANDOM_STATE,
    eval_metric='logloss',
    gamma=0.3,
    reg_alpha=1,
    reg_lambda=2,
    tree_method='hist',
    n_jobs=-1,
)


xgb_full.fit(X_train_full,
               y_train_full,
    eval_set=[(X_test_full, y_test_full)],
    verbose=False,
)

results_full['XGBoost'] = {
    'model': xgb_full,
    'pred': xgb_full.predict(X_test_full),
    'proba': xgb_full.predict_proba(X_test_full)[:, 1],
    'scaled': False,
}

# STEP 7 — Train simplified models
print_section('STEP 7 — TRAINING SIMPLIFIED MODELS')

results_simp = {}

# Logistic Regression
print('\n▶ Training Logistic Regression....')

lr_simp = LogisticRegression(
    max_iter=1000,
    random_state=RANDOM_STATE,

)

lr_simp.fit(X_train_simp_scaled, y_train_simp)

results_simp['Logistic Regression'] = {
    'model': lr_simp,
    'pred': lr_simp.predict(X_test_simp_scaled),
    'proba': lr_simp.predict_proba(X_test_simp_scaled)[:, 1],
    'scaled': True,
}

# Random Forest
print('▶ Training Random Forest....')

rf_simp = RandomForestClassifier(
    n_estimators=250,
    max_depth=5,
    min_samples_split=10,
    min_samples_leaf=4,
    max_features='sqrt',
    class_weight='balanced',
    bootstrap=True,
    n_jobs=-1,
    random_state=RANDOM_STATE,
)

rf_simp.fit(X_train_simp, y_train_simp)

results_simp['Random Forest'] = {
    'model': rf_simp,
    'pred': rf_simp.predict(X_test_simp),
    'proba': rf_simp.predict_proba(X_test_simp)[:, 1],
    'scaled': False,
}

# XGBoost
print('▶ Training XGBoost....')

xgb_simp = xgb.XGBClassifier(
    n_estimators=400,
    max_depth=8,
    learning_rate=0.08,
    subsample=0.9,
    scale_pos_weight=3,
    colsample_bytree=0.9,
    eval_metric='logloss',
    random_state=RANDOM_STATE,
   
    n_jobs=-1,
)

xgb_simp.fit(X_train_simp, y_train_simp)



results_simp['XGBoost'] = {
    'model': xgb_simp,
    'pred': xgb_simp.predict(X_test_simp),
    'proba': xgb_simp.predict_proba(X_test_simp)[:, 1],
    'scaled': False,
}

# STEP 8 — Evalution
best_full_name = evaluate_models(
    results_full,
    y_test_full,
    'FULL MODEL'
)

best_simp_name = evaluate_models(
    results_simp,
    y_test_simp,
    'SIMPLIFIED MODEL'
)


# STEP 9 — Save the best models and all necessary components for future inference
print_section('STEP 9 — SAVING MODELS')

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(CHART_DIR, exist_ok=True)

# Full model bundle
best_full = results_full[best_full_name]

full_bundle = {
    'model': best_full['model'],
    'model_name': best_full_name,
    'model_type': 'FULL',
    'feature_cols': FULL_MODEL_FEATURES,
    'scaler': scaler_full if best_full['scaled'] else None,
    'label_encoders': label_encoders,
    'stage_encoder': stage_encoder,
    'accuracy': best_full['accuracy'],
    'f1_score': best_full['f1_score'],
    'roc_auc': best_full['roc_auc'],
}

save_model_bundle(
    os.path.join(MODEL_DIR, 'diabetes_model_full.pkl'),
    full_bundle,
)

# Simplified model bundle
best_simp = results_simp[best_simp_name]

simp_bundle = {
    'model': best_simp['model'],
    'model_name': best_simp_name,
    'model_type': 'SIMPLIFIED',
    'feature_cols': SIMPLIFIED_MODEL_FEATURES,
    'scaler': scaler_simp if best_simp['scaled'] else None,
    'label_encoders': label_encoders,
    'stage_encoder': stage_encoder,
    'accuracy': best_simp['accuracy'],
    'f1_score': best_simp['f1_score'],
    'roc_auc': best_simp['roc_auc'],
}

save_model_bundle(
    os.path.join(MODEL_DIR, 'diabetes_model_simplified.pkl'),
    simp_bundle,
)


# STEP 10 — Feature importance charts for models that support it
print_section('STEP 10 — GENERATING FEATURE IMPORTANCE CHARTS')

# Full model importance
if hasattr(best_full['model'], 'feature_importances_'):
    generate_feature_importance_chart(
        best_full['model'],
        FULL_MODEL_FEATURES,
        os.path.join(CHART_DIR, 'full_model_feature_importance.png'),
        'Full Model Feature Importance'
    )

# Simplified model importance
if hasattr(best_simp['model'], 'feature_importances_'):
    generate_feature_importance_chart(
        best_simp['model'],
        SIMPLIFIED_MODEL_FEATURES,
        os.path.join(CHART_DIR, 'simplified_model_feature_importance.png'),
        'Simplified Model Feature Importance'
    )

# STEP 10.5 — Generate Confusion Matrix and ROC Curve Charts
print_section('STEP 10.5 — GENERATING ROC & CONFUSION MATRIX CHARTS')

# Full model confusion matrix
generate_confusion_matrix_chart(
    y_test_full,
    best_full['pred'],
    os.path.join(CHART_DIR, 'full_model_confusion_matrix.png'),
    'Full Model Confusion Matrix'
)

# Simplified model confusion matrix
generate_confusion_matrix_chart(
    y_test_simp,
    best_simp['pred'],
    os.path.join(CHART_DIR, 'simplified_model_confusion_matrix.png'),
    'Simplified Model Confusion Matrix'
)

# Full model ROC curve
generate_roc_curve_chart(
    y_test_full,
    best_full['proba'],
    os.path.join(CHART_DIR, 'full_model_roc_curve.png'),
    'Full Model ROC Curve'
)

# Simplified model ROC curve
generate_roc_curve_chart(
    y_test_simp,
    best_simp['proba'],
    os.path.join(CHART_DIR, 'simplified_model_roc_curve.png'),
    'Simplified Model ROC Curve'
)


# STEP 11 — Comparison charts for all models and metrics
print_section('STEP 11 — GENERATING COMPARISON CHARTS')

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']
metric_labels = ['Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC']
colors = ['#4E9BFF', '#2EE080', '#FF8C42']

# FULL MODEL CHART
x = np.arange(len(metrics))
width = 0.25

for i, (name, color) in enumerate(zip(results_full.keys(), colors)):
    vals = [results_full[name][m] for m in metrics]

    axes[0].bar(
        x + i * width,
        vals,
        width,
        label=name,
        color=color,
        alpha=0.85,
    )

axes[0].set_title('FULL MODEL PERFORMANCE', fontweight='bold')
axes[0].set_xticks(x + width)
axes[0].set_xticklabels(metric_labels)
axes[0].set_ylim(0, 1.1)
axes[0].legend()
axes[0].grid(axis='y', alpha=0.3)

# Simplified model chart
for i, (name, color) in enumerate(zip(results_simp.keys(), colors)):
    vals = [results_simp[name][m] for m in metrics]

    axes[1].bar(
        x + i * width,
        vals,
        width,
        label=name,
        color=color,
        alpha=0.85,
    )

axes[1].set_title('SIMPLIFIED MODEL PERFORMANCE', fontweight='bold')
axes[1].set_xticks(x + width)
axes[1].set_xticklabels(metric_labels)
axes[1].set_ylim(0, 1.1)
axes[1].legend()
axes[1].grid(axis='y', alpha=0.3)

plt.tight_layout()

comparison_path = os.path.join(
    CHART_DIR,
    'model_comparison_dual.png'
)

plt.savefig(comparison_path, dpi=150, bbox_inches='tight')
plt.close()

print(f'✓ Saved comparison chart: {comparison_path}')


#Completion
print_section('✅ TRAINING COMPLETE')

print('Generated Files:')
print('\nMODELS:')
print('  • ml/diabetes_model_full.pkl')
print('  • ml/diabetes_model_simplified.pkl')

print('\nCHARTS:')
print('  • charts/model_comparison_dual.png')
print('  • charts/full_model_feature_importance.png')
print('  • charts/simplified_model_feature_importance.png')

print('\nNEXT STEP:')
print('  Update app.py to load both trained models.')

print('\n' + '=' * 70)