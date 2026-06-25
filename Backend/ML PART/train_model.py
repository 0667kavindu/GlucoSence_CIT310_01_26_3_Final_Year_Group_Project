# train_model.py
# GlucoSense — Dual Model Training Pipeline
# We train 6 models per pipeline (Full + Simplified):
# Before  → Logistic Regression, Random Forest, XGBoost
# Now      → K-Nearest Neighbors, Gradient Boosting, Extra Trees
# Every model goes through RandomizedSearchCV to find the best
# hyperparameters before we pick a winner and save it.

import os
import pickle
import warnings
import time

import matplotlib
matplotlib.use('Agg')  # use non-GUI backend so charts save without a screen

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import xgboost as xgb

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    ExtraTreesClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
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
from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
    RandomizedSearchCV,
    StratifiedKFold,
)
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings('ignore')  # keep the terminal output clean


# Basic config — change these if your paths or split size differ

DATASET_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'diabetes_dataset.csv')  # where the CSV lives
MODEL_DIR    = 'ml'       # where .pkl files will be saved
CHART_DIR    = 'charts'   # where all chart images will be saved
RANDOM_STATE = 42         # keeps results reproducible every run
TEST_SIZE    = 0.2        # 80% train / 20% test split

# Tuning settings — N_ITER_TUNING is how many random param combos
# we try per model. More = better results but slower. 20 is a safe
# middle ground for a 100k dataset.
N_ITER_TUNING = 20
CV_FOLDS      = 5   # 5-fold cross validation during tuning

TARGET       = 'diagnosed_diabetes'   # what we're predicting (0 or 1)
STAGE_TARGET = 'diabetes_stage'       # used for stage encoding only


# Feature groups
# We split features into 3 buckets so it's easy to see what each
# model pipeline uses (full = all three, simplified = first two)

# Lab results — things a doctor measures from blood work
BLOOD_AND_MEDICALLY_MEASURABLE_FEATURES = [
    'glucose_fasting',
    'glucose_postprandial',
    'hba1c',
    'insulin_level',
    'cholesterol_total',
    'hdl_cholesterol',
    'ldl_cholesterol',
    'triglycerides',
]

# Day-to-day lifestyle stuff — no blood test needed for these
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

# Yes/No medical background questions
HISTORY_FEATURES = [
    'family_history_diabetes',
    'hypertension_history',
    'cardiovascular_history',
]

# Full model uses everything — best accuracy but needs lab results
FULL_MODEL_FEATURES = LIFESTYLE_FEATURES + HISTORY_FEATURES + BLOOD_AND_MEDICALLY_MEASURABLE_FEATURES

# Simplified model skips blood tests — useful when a patient hasn't
# done lab work yet, still gives a decent risk estimate
SIMPLIFIED_MODEL_FEATURES = LIFESTYLE_FEATURES + HISTORY_FEATURES


# Hyperparameter search spaces — FULL MODEL
# These are the values RandomizedSearchCV will randomly pick from
# when trying to find the best settings for each model
FULL_PARAM_GRIDS = {

    'Logistic Regression': {
        'C':        [0.01, 0.1, 1, 10, 100],   # regularization strength
        'penalty':  ['l1', 'l2'],               # l1 = sparse weights, l2 = smooth weights
        'solver':   ['liblinear', 'saga'],      # solvers that support both l1 and l2
        'max_iter': [500, 1000],
    },

    'Random Forest': {
        'n_estimators':      [100, 200, 300],   # number of trees
        'max_depth':         [4, 6, 8, None],   # None = grow until pure leaves
        'min_samples_split': [2, 5, 10],        # minimum samples to allow a split
        'min_samples_leaf':  [1, 2, 4],         # minimum samples at a leaf node
        'max_features':      ['sqrt', 'log2'],  # how many features each tree sees
    },

    'XGBoost': {
        'n_estimators':     [100, 150, 200],
        'max_depth':        [3, 4, 6],
        'learning_rate':    [0.01, 0.05, 0.1],  # smaller = slower but more precise
        'subsample':        [0.6, 0.7, 0.8],    # fraction of rows used per tree
        'colsample_bytree': [0.6, 0.7, 0.8],    # fraction of columns used per tree
        'gamma':            [0, 0.1, 0.3],       # minimum gain needed to split a node
        'reg_alpha':        [0, 0.5, 1],         # L1 regularization
        'reg_lambda':       [1, 1.5, 2],         # L2 regularization
        'min_child_weight': [3, 5, 7],           # controls overfitting on small groups
    },

    # KNN finds the K nearest patients and votes — needs scaled data
    # because distance calculations break with different feature scales
    'K-Nearest Neighbors': {
        'n_neighbors': [3, 5, 7, 9, 11, 15],
        'weights':     ['uniform', 'distance'],  # distance = closer neighbors vote more
        'metric':      ['euclidean', 'manhattan', 'minkowski'],
        'p':           [1, 2],  # only matters for minkowski: 1=manhattan, 2=euclidean
    },

    # Gradient Boosting builds trees one at a time, each fixing
    # the previous one's mistakes — slower than XGBoost but solid
    'Gradient Boosting': {
        'n_estimators':      [100, 150, 200],
        'max_depth':         [3, 4, 5],
        'learning_rate':     [0.05, 0.1, 0.2],
        'subsample':         [0.7, 0.8, 1.0],
        'min_samples_split': [2, 5],
        'min_samples_leaf':  [1, 2],
        'max_features':      ['sqrt', 'log2'],
    },

    # Extra Trees is like Random Forest but even more random — splits
    # are chosen randomly instead of optimally, making it faster and
    # sometimes more generalizable
    'Extra Trees': {
        'n_estimators':      [100, 200, 300],
        'max_depth':         [5, 8, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf':  [1, 2, 4],
        'max_features':      ['sqrt', 'log2'],
        'class_weight':      ['balanced', None],  # balanced helps with imbalanced classes
    },
}


# Hyperparameter search spaces — SIMPLIFIED MODEL
# Same models, slightly different ranges tuned for the smaller
# feature set (no blood work columns)
SIMP_PARAM_GRIDS = {

    'Logistic Regression': {
        'C':        [0.01, 0.1, 1, 10, 100],
        'penalty':  ['l1', 'l2'],
        'solver':   ['liblinear', 'saga'],
        'max_iter': [500, 1000],
    },

    'Random Forest': {
        'n_estimators':      [150, 250, 350],
        'max_depth':         [4, 5, 6, None],
        'min_samples_split': [5, 10, 15],
        'min_samples_leaf':  [2, 4, 6],
        'max_features':      ['sqrt', 'log2'],
        'class_weight':      ['balanced', None],
    },

    'XGBoost': {
        'n_estimators':     [200, 300, 400],
        'max_depth':        [4, 6, 8],
        'learning_rate':    [0.05, 0.08, 0.1],
        'subsample':        [0.7, 0.8, 0.9],
        'colsample_bytree': [0.7, 0.8, 0.9],
        'scale_pos_weight': [1, 2, 3],  # useful when positive class is minority
    },

    'K-Nearest Neighbors': {
        'n_neighbors': [3, 5, 7, 9, 11, 15],
        'weights':     ['uniform', 'distance'],
        'metric':      ['euclidean', 'manhattan', 'minkowski'],
        'p':           [1, 2],
    },

    'Gradient Boosting': {
        'n_estimators':      [100, 150, 200],
        'max_depth':         [3, 4, 5],
        'learning_rate':     [0.05, 0.1, 0.2],
        'subsample':         [0.7, 0.8, 1.0],
        'min_samples_split': [2, 5],
        'min_samples_leaf':  [1, 2],
    },

    'Extra Trees': {
        'n_estimators':      [150, 250, 350],
        'max_depth':         [5, 8, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf':  [1, 2, 4],
        'max_features':      ['sqrt', 'log2'],
        'class_weight':      ['balanced', None],
    },
}


# Helper / utility functions

def print_section(title):
    """Just prints a clean separator line so the terminal output is easy to read."""
    print('\n' + '=' * 70)
    print(title)
    print('=' * 70)


def validate_features(data, features, model_name='MODEL'):
    """
    Double-checks that every feature we need actually exists in the CSV.
    If something is missing we crash early with a clear message rather
    than getting a confusing error halfway through training.
    """
    missing = [f for f in features if f not in data.columns]
    if missing:
        raise ValueError(f"\n❌ Missing columns for {model_name}:\n{missing}")
    print(f"✓ All required features found for {model_name}")


def encode_categorical_features(X):
    """
    Converts text columns into numbers so the models can understand them.
    - Gender gets one-hot encoded (a new 0/1 column per category) because
      it has no natural order.
    - Everything else (smoking status, etc.) gets label-encoded (0, 1, 2...)
      which is simpler and fine for tree-based models.
    Returns the updated DataFrame and a dict of encoders we'll need later
    during inference to transform new patient data the same way.
    """
    label_encoders = {}

    # One-hot encode gender — avoids giving it a false numeric ordering
    if 'gender' in X.columns:
        gender_dummies = pd.get_dummies(X['gender'], prefix='gender', drop_first=True)
        X = pd.concat([X.drop('gender', axis=1), gender_dummies], axis=1)
        print('✓ One-hot encoded: gender')

    # Label encode remaining text columns
    categorical_cols = X.select_dtypes(include=['object']).columns
    for col in categorical_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        label_encoders[col] = le
        print(f'✓ Label encoded: {col}')

    return X, label_encoders


def build_base_estimator(name, random_state):
    """
    Creates a fresh (untrained) model object by name.
    We use this inside tune_and_train so we always start
    with clean default settings before tuning kicks in.
    """
    estimators = {
        'Logistic Regression': LogisticRegression(random_state=random_state),
        'Random Forest':       RandomForestClassifier(random_state=random_state, n_jobs=-1),
        'XGBoost':             xgb.XGBClassifier(
                                   random_state=random_state,
                                   eval_metric='logloss',
                                   tree_method='hist',  # faster on large datasets
                                   n_jobs=-1,
                               ),
        'K-Nearest Neighbors': KNeighborsClassifier(n_jobs=-1),
        'Gradient Boosting':   GradientBoostingClassifier(random_state=random_state),
        'Extra Trees':         ExtraTreesClassifier(random_state=random_state, n_jobs=-1),
    }
    return estimators[name]


def tune_and_train(
    name,
    param_grid,
    X_train,
    y_train,
    X_test,
    y_test,
    needs_scaling=False,
    scaler=None,
    random_state=RANDOM_STATE,
    n_iter=N_ITER_TUNING,
    cv=CV_FOLDS,
):
    """
    The heart of the training pipeline for a single model.

    What happens here:
    1. We pick N_ITER random combinations from the param_grid
    2. Each combo is evaluated using 5-fold cross-validation (scored by F1)
    3. The best combo is automatically used to refit on the full training set
    4. We run predictions on the test set and return everything we need

    Why RandomizedSearchCV instead of GridSearchCV?
    Grid search tries every single combination — with 100k rows and 9+
    parameters that would take forever. Random search gets 90% of the
    benefit in a fraction of the time.
    """
    print(f'\n  ▶ Tuning {name} (n_iter={n_iter}, cv={cv}) ...')
    t0 = time.time()

    base = build_base_estimator(name, random_state)

    # StratifiedKFold makes sure each fold has the same class ratio
    # as the full dataset — important for imbalanced diabetes data
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=random_state)

    search = RandomizedSearchCV(
        estimator           = base,
        param_distributions = param_grid,
        n_iter              = n_iter,        # how many combos to try
        scoring             = 'f1',          # we care about F1, not just accuracy
        cv                  = skf,
        random_state        = random_state,
        n_jobs              = -1,            # use all CPU cores
        refit               = True,          # auto-fit best params on full train set
        verbose             = 0,
    )

    # Scale data only for models that need it (KNN, Logistic Regression)
    # Tree-based models don't care about scale so we skip it for them
    X_tr = scaler.transform(X_train) if needs_scaling else X_train
    X_te = scaler.transform(X_test)  if needs_scaling else X_test

    search.fit(X_tr, y_train)

    best_model = search.best_estimator_
    elapsed    = time.time() - t0

    print(f'     Best params : {search.best_params_}')
    print(f'     CV F1 (best): {search.best_score_:.4f}   [{elapsed:.1f}s]')

    return {
        'model':       best_model,
        'pred':        best_model.predict(X_te),
        'proba':       best_model.predict_proba(X_te)[:, 1],  # probability of diabetes
        'scaled':      needs_scaling,
        'best_params': search.best_params_,
        'cv_f1':       search.best_score_,
    }


def evaluate_models(results, y_test, model_type='MODEL'):
    """
    Computes all 5 metrics for every model and prints a comparison table.
    We pick the winner based on F1 score — better than accuracy alone
    because it balances false positives and false negatives, which matters
    a lot in medical predictions.
    """
    print_section(f'{model_type} EVALUATION RESULTS')

    print(
        f"{'Model':<25} {'Accuracy':>10} {'Precision':>10} "
        f"{'Recall':>10} {'F1':>10} {'ROC-AUC':>10}"
    )
    print('-' * 80)

    best_model_name = None
    best_f1         = 0

    for name, r in results.items():
        acc = accuracy_score(y_test, r['pred'])
        pre = precision_score(y_test, r['pred'])
        rec = recall_score(y_test, r['pred'])
        f1  = f1_score(y_test, r['pred'])
        roc = roc_auc_score(y_test, r['proba'])

        print(
            f"{name:<25} {acc:>10.4f} {pre:>10.4f} "
            f"{rec:>10.4f} {f1:>10.4f} {roc:>10.4f}"
        )

        # Store metrics back into results so charts can use them later
        results[name].update({
            'accuracy':  acc,
            'precision': pre,
            'recall':    rec,
            'f1_score':  f1,
            'roc_auc':   roc,
        })

        if f1 > best_f1:
            best_f1         = f1
            best_model_name = name

    print(f'\n✓ Best Model : {best_model_name}')
    print(f'✓ Best F1    : {best_f1:.4f}')
    return best_model_name


def generate_feature_importance_chart(model, feature_names, output_path, title, top_n=20):
    """
    Draws a horizontal bar chart showing which features the model
    relied on the most. Only works for tree-based models (RF, XGB, etc.)
    since they expose feature_importances_. We cap at top 20 so the
    chart stays readable.
    """
    if not hasattr(model, 'feature_importances_'):
        return  # logistic regression and KNN don't support this, skip silently

    importance_data = (
        pd.DataFrame({'Feature': feature_names, 'Importance': model.feature_importances_})
        .sort_values(by='Importance', ascending=False)
        .head(top_n)
    )

    plt.figure(figsize=(10, 6))
    sns.barplot(x='Importance', y='Feature', data=importance_data)
    plt.title(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'✓ Saved feature importance chart: {output_path}')


def generate_confusion_matrix_chart(y_true, y_pred, output_path, title):
    """
    Saves a confusion matrix heatmap — shows how many predictions were
    correct vs wrong, broken down by actual class. Good for spotting
    if the model is missing too many real diabetes cases (false negatives).
    """
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False)
    plt.title(title, fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'✓ Saved confusion matrix: {output_path}')


def generate_roc_curve_chart(y_true, y_proba, output_path, title):
    """
    Saves an ROC curve for a single model. The closer the curve hugs
    the top-left corner and the higher the AUC, the better the model
    is at separating diabetic vs non-diabetic patients.
    """
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(7, 6))
    plt.plot(fpr, tpr, linewidth=2, label=f'AUC = {roc_auc:.4f}')
    plt.plot([0, 1], [0, 1], linestyle='--')  # diagonal = random guessing baseline
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(title, fontsize=14, fontweight='bold')
    plt.legend(loc='lower right')
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'✓ Saved ROC curve: {output_path}')


def generate_roc_all_models_chart(results, y_test, output_path, title):
    """
    Overlays the ROC curves of all 6 models on a single chart.
    Great for your report — lets the supervisor compare models visually
    at a glance without flipping through 6 separate charts.
    """
    plt.figure(figsize=(9, 7))
    for name, r in results.items():
        fpr, tpr, _ = roc_curve(y_test, r['proba'])
        plt.plot(fpr, tpr, linewidth=1.8, label=f"{name} (AUC={r['roc_auc']:.3f})")
    plt.plot([0, 1], [0, 1], 'k--', linewidth=1)  # random baseline
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(title, fontsize=13, fontweight='bold')
    plt.legend(loc='lower right', fontsize=9)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f'✓ Saved all-models ROC chart: {output_path}')


def save_model_bundle(path, bundle):
    """
    Serializes the model + all the things needed to use it later
    (scaler, encoders, feature list, metrics) into a single .pkl file.
    When app.py loads this file it has everything it needs to make
    predictions on new patients without re-training.
    """
    with open(path, 'wb') as f:
        pickle.dump(bundle, f)
    print(f'✓ Saved model: {path}')


# Model registry — defines which models to train and whether
# each one needs scaled input data before training / prediction
# KNN and Logistic Regression rely on distance/magnitude so they
# need StandardScaler. Tree models split on thresholds so they
# don't care about scale — we skip scaling for them.
MODEL_CONFIG = {
    'Logistic Regression': {'needs_scaling': True},
    'Random Forest':       {'needs_scaling': False},
    'XGBoost':             {'needs_scaling': False},
    'K-Nearest Neighbors': {'needs_scaling': True},   # distance-based, must scale
    'Gradient Boosting':   {'needs_scaling': False},  # tree-based, no scaling needed
    'Extra Trees':         {'needs_scaling': False},  # tree-based, no scaling needed
}


# TRAINING PIPELINE — starts here
print_section('GLUCOSENSE — DUAL MODEL TRAINING PIPELINE  (6 Models + HPT)')


#  STEP 1 — Load the dataset 
print_section('STEP 1 — LOADING DATASET')

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"❌ Dataset not found: {DATASET_PATH}")

data = pd.read_csv(DATASET_PATH)
print(f'✓ Dataset loaded: {data.shape}')

# Quick sanity check — see if anything is missing before we go further
print('\nMissing Values:')
print(data.isnull().sum())


#  STEP 2 — Clean the data 
print_section('STEP 2 — CLEANING DATA')

# diabetes_risk_score is calculated from the target — if we include
# it the model basically cheats, so we drop it immediately
if 'diabetes_risk_score' in data.columns:
    data.drop('diabetes_risk_score', axis=1, inplace=True)
    print('✓ Removed: diabetes_risk_score (data leakage prevention)')

# Ethnicity can introduce bias in predictions, removing it keeps
# the model fair and generalizable across all patients
if 'ethnicity' in data.columns:
    data.drop('ethnicity', axis=1, inplace=True)
    print('✓ Removed: ethnicity (bias reduction)')

# Rows where we don't know the diagnosis are useless for training
before_rows = len(data)
data.dropna(subset=[TARGET], inplace=True)
removed = before_rows - len(data)
if removed:
    print(f'✓ Dropped {removed} rows with missing target')

# Fill missing numbers with the median (robust to outliers)
for col in data.select_dtypes(include=np.number).columns:
    if data[col].isnull().sum():
        data[col].fillna(data[col].median(), inplace=True)

# Fill missing text values with whatever appears most often
for col in data.select_dtypes(include=['object']).columns:
    if data[col].isnull().sum():
        data[col].fillna(data[col].mode()[0], inplace=True)

print('✓ Missing values handled')


#  STEP 3 — Prepare features and encode text columns 
print_section('STEP 3 — PREPARING FEATURES')

# Make sure all the columns we need actually exist
validate_features(data, FULL_MODEL_FEATURES,       'FULL MODEL')
validate_features(data, SIMPLIFIED_MODEL_FEATURES, 'SIMPLIFIED MODEL')

X = data.drop(columns=[TARGET, STAGE_TARGET])  # features
y = data[TARGET]                                # labels (0 = no diabetes, 1 = diabetes)

# Fit the stage encoder now so we can include it in the saved bundle
# for use in the app's stage prediction feature
stage_encoder = LabelEncoder()
stage_encoder.fit(data[STAGE_TARGET])

# Turn text columns into numbers
X, label_encoders = encode_categorical_features(X)

# After one-hot encoding gender, new columns like gender_Male appear
# — we need to add them to our feature lists or they'll be excluded
gender_columns = [c for c in X.columns if c.startswith('gender_')]
FULL_MODEL_FEATURES       += gender_columns
SIMPLIFIED_MODEL_FEATURES += gender_columns

print(f'\n✓ Total feature columns after encoding: {len(X.columns)}')


#  STEP 4 — Split and scale data for the FULL model ─
print_section('STEP 4 — PREPARING FULL MODEL DATA')

X_full = X[FULL_MODEL_FEATURES].copy()

# stratify=y makes sure both train and test sets have the same
# proportion of diabetic vs non-diabetic patients
X_train_full, X_test_full, y_train_full, y_test_full = train_test_split(
    X_full, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
)

# Fit scaler on train only — never fit on test data, that would be cheating
scaler_full = StandardScaler()
scaler_full.fit(X_train_full)

print(f'✓ Full model  | train: {X_train_full.shape[0]}  test: {X_test_full.shape[0]}')


#  STEP 5 — Split and scale data for the SIMPLIFIED model ─
print_section('STEP 5 — PREPARING SIMPLIFIED MODEL DATA')

X_simp = X[SIMPLIFIED_MODEL_FEATURES].copy()

X_train_simp, X_test_simp, y_train_simp, y_test_simp = train_test_split(
    X_simp, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
)

scaler_simp = StandardScaler()
scaler_simp.fit(X_train_simp)

print(f'✓ Simp model  | train: {X_train_simp.shape[0]}  test: {X_test_simp.shape[0]}')


#  STEP 6 — Tune and train all 6 FULL models 
print_section('STEP 6 — TRAINING & TUNING FULL MODELS  (6 models)')

results_full = {}

# Loop through every model, tune it, train it, get predictions
for model_name, cfg in MODEL_CONFIG.items():
    results_full[model_name] = tune_and_train(
        name          = model_name,
        param_grid    = FULL_PARAM_GRIDS[model_name],
        X_train       = X_train_full,
        y_train       = y_train_full,
        X_test        = X_test_full,
        y_test        = y_test_full,
        needs_scaling = cfg['needs_scaling'],
        scaler        = scaler_full,
        random_state  = RANDOM_STATE,
    )

print('\n✓ All full models trained.')


#  STEP 7 — Tune and train all 6 SIMPLIFIED models 
print_section('STEP 7 — TRAINING & TUNING SIMPLIFIED MODELS  (6 models)')

results_simp = {}

for model_name, cfg in MODEL_CONFIG.items():
    results_simp[model_name] = tune_and_train(
        name          = model_name,
        param_grid    = SIMP_PARAM_GRIDS[model_name],
        X_train       = X_train_simp,
        y_train       = y_train_simp,
        X_test        = X_test_simp,
        y_test        = y_test_simp,
        needs_scaling = cfg['needs_scaling'],
        scaler        = scaler_simp,
        random_state  = RANDOM_STATE,
    )

print('\n✓ All simplified models trained.')


#  STEP 8 — Compare all models and pick the best one 
# F1 is the deciding metric — the model with the highest F1 wins
best_full_name = evaluate_models(results_full, y_test_full, 'FULL MODEL')
best_simp_name = evaluate_models(results_simp, y_test_simp, 'SIMPLIFIED MODEL')


#  STEP 9 — Save the winning models to disk ─
print_section('STEP 9 — SAVING MODELS')

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(CHART_DIR, exist_ok=True)

# Save the full model bundle — includes the model itself plus
# everything app.py needs to process new patient inputs correctly
best_full = results_full[best_full_name]

save_model_bundle(
    os.path.join(MODEL_DIR, 'diabetes_model_full.pkl'),
    {
        'model':          best_full['model'],
        'model_name':     best_full_name,
        'model_type':     'FULL',
        'feature_cols':   FULL_MODEL_FEATURES,
        'scaler':         scaler_full if best_full['scaled'] else None,
        'label_encoders': label_encoders,
        'stage_encoder':  stage_encoder,
        'accuracy':       best_full['accuracy'],
        'f1_score':       best_full['f1_score'],
        'roc_auc':        best_full['roc_auc'],
        'best_params':    best_full['best_params'],
        'cv_f1':          best_full['cv_f1'],
    },
)

# Same for the simplified model
best_simp = results_simp[best_simp_name]

save_model_bundle(
    os.path.join(MODEL_DIR, 'diabetes_model_simplified.pkl'),
    {
        'model':          best_simp['model'],
        'model_name':     best_simp_name,
        'model_type':     'SIMPLIFIED',
        'feature_cols':   SIMPLIFIED_MODEL_FEATURES,
        'scaler':         scaler_simp if best_simp['scaled'] else None,
        'label_encoders': label_encoders,
        'stage_encoder':  stage_encoder,
        'accuracy':       best_simp['accuracy'],
        'f1_score':       best_simp['f1_score'],
        'roc_auc':        best_simp['roc_auc'],
        'best_params':    best_simp['best_params'],
        'cv_f1':          best_simp['cv_f1'],
    },
)


#  STEP 10 — Feature importance charts (tree models only) ─
print_section('STEP 10 — FEATURE IMPORTANCE CHARTS')

# This tells us which features drove the winning model's decisions most —
# useful for the report and for explaining predictions to clinicians
if hasattr(best_full['model'], 'feature_importances_'):
    generate_feature_importance_chart(
        best_full['model'], FULL_MODEL_FEATURES,
        os.path.join(CHART_DIR, 'full_model_feature_importance.png'),
        f'Full Model Feature Importance ({best_full_name})',
    )

if hasattr(best_simp['model'], 'feature_importances_'):
    generate_feature_importance_chart(
        best_simp['model'], SIMPLIFIED_MODEL_FEATURES,
        os.path.join(CHART_DIR, 'simplified_model_feature_importance.png'),
        f'Simplified Model Feature Importance ({best_simp_name})',
    )


#  STEP 10.5 — Confusion matrices and ROC curves 
print_section('STEP 10.5 — CONFUSION MATRIX & ROC CURVES (Best Models)')

# Confusion matrix for the best full model
generate_confusion_matrix_chart(
    y_test_full, best_full['pred'],
    os.path.join(CHART_DIR, 'full_model_confusion_matrix.png'),
    f'Full Model Confusion Matrix ({best_full_name})',
)

# Confusion matrix for the best simplified model
generate_confusion_matrix_chart(
    y_test_simp, best_simp['pred'],
    os.path.join(CHART_DIR, 'simplified_model_confusion_matrix.png'),
    f'Simplified Model Confusion Matrix ({best_simp_name})',
)

# ROC curves for both best models individually
generate_roc_curve_chart(
    y_test_full, best_full['proba'],
    os.path.join(CHART_DIR, 'full_model_roc_curve.png'),
    f'Full Model ROC Curve ({best_full_name})',
)

generate_roc_curve_chart(
    y_test_simp, best_simp['proba'],
    os.path.join(CHART_DIR, 'simplified_model_roc_curve.png'),
    f'Simplified Model ROC Curve ({best_simp_name})',
)

# All 6 models on one ROC chart — great for the report's comparison section
generate_roc_all_models_chart(
    results_full, y_test_full,
    os.path.join(CHART_DIR, 'full_model_all_roc_curves.png'),
    'Full Model — All Models ROC Curves',
)

generate_roc_all_models_chart(
    results_simp, y_test_simp,
    os.path.join(CHART_DIR, 'simplified_model_all_roc_curves.png'),
    'Simplified Model — All Models ROC Curves',
)


#  STEP 11 — Side-by-side bar chart comparing all 6 models 
print_section('STEP 11 — MODEL COMPARISON CHARTS')

metrics       = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']
metric_labels = ['Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC']
colors        = ['#4E9BFF', '#2EE080', '#FF8C42', '#D76BFF', '#FF4D6D', '#00C9A7']

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

x     = np.arange(len(metrics))
n_mdl = len(results_full)
width = 0.13  # narrow bars so all 6 fit side by side without overlapping

# Left chart — full model
for i, (name, color) in enumerate(zip(results_full.keys(), colors)):
    vals = [results_full[name][m] for m in metrics]
    axes[0].bar(x + i * width, vals, width, label=name, color=color, alpha=0.88)

axes[0].set_title('FULL MODEL PERFORMANCE  (6 Models)', fontweight='bold')
axes[0].set_xticks(x + width * (n_mdl - 1) / 2)
axes[0].set_xticklabels(metric_labels)
axes[0].set_ylim(0, 1.15)
axes[0].legend(fontsize=8)
axes[0].grid(axis='y', alpha=0.3)

# Right chart — simplified model
for i, (name, color) in enumerate(zip(results_simp.keys(), colors)):
    vals = [results_simp[name][m] for m in metrics]
    axes[1].bar(x + i * width, vals, width, label=name, color=color, alpha=0.88)

axes[1].set_title('SIMPLIFIED MODEL PERFORMANCE  (6 Models)', fontweight='bold')
axes[1].set_xticks(x + width * (n_mdl - 1) / 2)
axes[1].set_xticklabels(metric_labels)
axes[1].set_ylim(0, 1.15)
axes[1].legend(fontsize=8)
axes[1].grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(CHART_DIR, 'model_comparison_dual.png'), dpi=150, bbox_inches='tight')
plt.close()
print('✓ Saved comparison chart: charts/model_comparison_dual.png')


#  STEP 12 — Print the winning hyperparameters for the report ─
print_section('STEP 12 — BEST HYPERPARAMETERS SUMMARY')

# This is handy to copy into your dissertation methodology section
print('\n FULL MODEL ')
for name, r in results_full.items():
    print(f"\n  {name}")
    print(f"    CV F1  : {r['cv_f1']:.4f}")
    print(f"    Params : {r['best_params']}")

print('\n SIMPLIFIED MODEL ')
for name, r in results_simp.items():
    print(f"\n  {name}")
    print(f"    CV F1  : {r['cv_f1']:.4f}")
    print(f"    Params : {r['best_params']}")


#  All done ─
print_section('✅ TRAINING COMPLETE')

print('Generated Models:')
print('  • ml/diabetes_model_full.pkl')
print('  • ml/diabetes_model_simplified.pkl')

print('\nGenerated Charts:')
for chart in [
    'model_comparison_dual.png',
    'full_model_feature_importance.png',
    'simplified_model_feature_importance.png',
    'full_model_confusion_matrix.png',
    'simplified_model_confusion_matrix.png',
    'full_model_roc_curve.png',
    'simplified_model_roc_curve.png',
    'full_model_all_roc_curves.png',
    'simplified_model_all_roc_curves.png',
]:
    print(f'  • charts/{chart}')

print('\nNEXT STEP:')
print('  Update app.py to load both trained models.')
print('=' * 70)