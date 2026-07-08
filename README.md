# GlucoSence_CIT310_01_26_3_Final_Year_Group_Project

# 🩺 GlucoSense

An AI-Powered Diabetes Risk Prediction and Health Management Web Application

GlucoSense is a full-stack web application developed as our Final Year Project for the Bachelor of Information Technology degree. The system uses Machine Learning to predict diabetes risk and provides users with personalized health recommendations, SHAP-based explainable AI insights, and educational resources to promote early diabetes awareness and prevention.

The application combines Artificial Intelligence, modern web technologies, and secure authentication to provide an accessible platform for diabetes risk assessment.

---

## 📌 Project Overview

Diabetes is one of the fastest-growing chronic diseases worldwide, and many people remain undiagnosed until serious complications appear.

GlucoSense was developed to help users assess their diabetes risk at an early stage by analyzing personal health information. Instead of simply displaying a prediction, the system also explains the factors that influenced the prediction using SHAP (SHapley Additive Explanations), making the results easier to understand.

The application is designed as an awareness and decision-support tool and is **not intended to replace professional medical diagnosis.**

---

# ✨ Key Features

### 🔐 User Authentication

- User Registration
- Secure Login
- JWT Authentication
- Bcrypt Password Hashing
- Protected API Routes

---

### 🤖 AI Diabetes Prediction

Supports two prediction methods:

### Full Prediction

Uses:

- Age
- BMI
- Blood Pressure
- Blood Glucose
- HbA1c
- Cholesterol Levels
- Insulin Level
- Lifestyle Factors
- Medical History

Provides a highly accurate diabetes risk prediction.

---

### Quick Prediction

Allows users to predict diabetes risk without blood test results.

Uses:

- Lifestyle Information
- Medical History
- Physical Measurements

Suitable for users who do not have laboratory reports.

---

### 🧠 Explainable AI (SHAP)

Instead of displaying only a risk score, the application explains:

- Which health factors increased the user's diabetes risk
- Which factors reduced the user's diabetes risk
- Top contributing features ranked by importance

This improves prediction transparency and user understanding.

---

### 📈 Prediction Results

Each prediction includes:

- Diabetes Risk Score
- Diabetes Risk Stage
- Prediction Confidence
- Personalized Health Recommendations
- SHAP Explanation
- Prediction Date & Time

---

### 📊 Prediction History

Authenticated users can:

- View previous predictions
- Track diabetes risk over time
- Review historical assessments

---

### 📚 Health Education

The system also includes:

- Prevention Guide
- Diet & Nutrition
- Exercise Guide
- Frequently Asked Questions
- Know Your Numbers
- BMI Calculator

---

### 🌍 Multi-language Support

Google Translate integration allows users to translate the application into multiple languages.

---

### 👨‍💼 Admin Dashboard

Administrators can monitor overall system statistics including:

- Total Users
- Total Assessments
- Average Risk Score
- Risk Distribution
- Diabetes Stage Distribution

---

# 🛠 Technologies Used

## Frontend

- React.js
- Vite
- React Router
- Axios
- CSS
- Recharts

---

## Backend

- Flask
- Flask-CORS
- SQLAlchemy
- PyJWT
- Bcrypt

---

## Machine Learning

- Scikit-learn
- XGBoost
- SHAP
- Pandas
- NumPy
- Matplotlib
- Joblib

---

## Database

- MySQL

---

## Testing

- Pytest
- Postman

---

## Deployment

- AWS EC2
- Nginx
- Gunicorn
- Vercel

---

# 🧠 Machine Learning Models

Several machine learning algorithms were trained and compared during development, including:

- Logistic Regression
- Random Forest
- XGBoost
- K-Nearest Neighbors (KNN)
- Gradient Boosting
- Extra Trees Classifier

The best-performing models were selected based on:

- Accuracy
- Precision
- Recall
- F1 Score
- ROC-AUC Score

Two trained models are included:

- Full Prediction Model
- Simplified Prediction Model

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing using Bcrypt
- Protected API Endpoints
- Role-based Authorization
- Input Validation
- Secure Database Access

---

# 📂 Project Structure

```
GlucoSense/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── ML_PART/
│   ├── ml/
│   ├── utils/
│   ├── tests/
│   ├── app.py
│   └── requirements.txt
│
└── README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/your-username/GlucoSense.git
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Backend

Create virtual environment

```bash
python -m venv venv
```

Activate

Windows

```bash
venv\Scripts\activate
```

Install packages

```bash
pip install -r requirements.txt
```

Run Flask

```bash
python app.py
```

---

## Train Machine Learning Models

```bash
cd backend/ML_PART

python train_model.py
```

This generates:

- Full Prediction Model
- Simplified Prediction Model

saved as `.pkl` files inside the `ml` folder.

---

# 🧪 Testing

Backend API testing was performed using:

- Pytest
- Postman

The test suite covers:

- Authentication
- User Registration
- Login
- Prediction APIs
- Protected Routes
- Validation
- Edge Cases

---

# 📸 Main Modules

- Home
- User Registration
- Login
- Full Diabetes Prediction
- Simplified Diabetes Prediction
- SHAP Explanation
- Prediction History
- BMI Calculator
- Prevention Guide
- Diet & Nutrition
- Exercise Guide
- FAQ
- Know Your Numbers
- Admin Dashboard

---

# 🎯 Future Improvements

Possible future enhancements include:

- Scientifically proven accurate real life data for model training
- Mobile Application
- Real-time Wearable Device Integration
- Doctor Dashboard
- Multi-Disease Prediction
- Email Notifications
- Cloud Database
- Advanced Analytics Dashboard

---

# 👨‍💻 Team Members

- Y.K.M. Malmi Madhubhashini - 22UG3-0167 - ML Engineer
- D.M. Samith Roshan - 22UG3-0690 - Frontend Developer
- E.J.M. Nadun Ekanayaka - 22UG3-0859 - Backend Developer
- M.D.K. Kavindu Vidumina - 22Ug3-0667 - DevOps + QA Engineer

---

# 🎓 Academic Information

Final Year Group Project

Bachelor of Applied Information Technology

Faculty of IT

SLTC Research University

---

# ⚠ Disclaimer

GlucoSense is developed for educational and research purposes.

The prediction results should not be considered a medical diagnosis they are just for get idea about diabetics risk and get mortivation for visit doctor. Users are advised to consult qualified healthcare professionals for proper medical advice and treatment.

---

## ⭐ Acknowledgements

We would like to express our sincere gratitude to our project supervisor (M.S. Suhail Razeeth), lecturers, and the Department of IT for their guidance and support throughout the development of this project.

Special thanks to the open-source community for providing the libraries and tools that made this project possible.
