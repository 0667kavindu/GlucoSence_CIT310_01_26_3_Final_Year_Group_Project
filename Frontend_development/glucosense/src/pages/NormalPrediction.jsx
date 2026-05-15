// NormalPrediction.jsx 
// Quick Assessment with 11 fields (NO blood tests)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// FIELD LIMITS & VALIDATION
const LIMITS = {
  age: { min: 18, max: 120, unit: 'years' },
  bmi: { min: 10, max: 60, unit: 'kg/m²',normal: [18.5, 24.9] },
  waist_to_hip_ratio: { min: 0.5, max: 2.0,normal: [0.75, 0.95] },
  physical_activity_minutes_per_week: {min: 0, max: 10080,unit: 'mins/week',},
  alcohol_consumption_per_week: {min: 0,max: 100,unit: 'units/week',},
  diet_score: { min: 1, max: 10, unit: '/10' },
  sleep_hours_per_day: { min: 1, max: 24, unit: 'hours/day',normal: [7, 9] },
   heart_rate:{ min: 30,  max: 220,  unit: 'bpm',normal: [60, 100] ,normal: [60, 100]  },
}

// EXERCISE RECOMMENDATIONS
const STATUS_STYLE = {
  valid: {
    borderColor: '#2EE080',
    background: 'rgba(46,224,128,0.06)',
  },
  warn: {
    borderColor: '#FFD60A',
    background: 'rgba(255,214,10,0.06)',
  },
  error: {
    borderColor: '#FF5A5A',
    background: 'rgba(255,90,90,0.06)',
  },
  '': {},
}

// Helper to determine field status based on value and limits
function getFieldStatus(name, value) {
  if (value === '' || value === null) return ''

  const lim = LIMITS[name]
  if (!lim) return 'valid'

  const n = parseFloat(value)

  if (isNaN(n) || n < lim.min || n > lim.max) {
    return 'error'
  }

  return 'valid'
}

function getFieldError(name, value) {
  if (value === '' || value === null) return null

  const lim = LIMITS[name]
  if (!lim) return null

  const n = parseFloat(value)

  if (isNaN(n)) return 'Please enter a valid number.'
  if (n < 0) return 'Value cannot be negative.'

  if (n < lim.min) {
    return `Minimum allowed value is ${lim.min}${
      lim.unit ? ' ' + lim.unit : ''
    }.`
  }

  if (n > lim.max) {
    return `Maximum allowed value is ${lim.max}${
      lim.unit ? ' ' + lim.unit : ''
    }.`
  }

  return null
}

export default function NormalPrediction() {
  const navigate = useNavigate()


  // STATE
 const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(null)
  const [step, setStep] = useState(1)
  const [touched, setTouched] = useState({})


  // FORM DATA
 const [formData, setFormData] = useState({
    age: '',
    gender: '',
    bmi: '',
    waist_to_hip_ratio: '',
    physical_activity_minutes_per_week: '',
    smoking_status: '',
    alcohol_consumption_per_week: '',
    diet_score: '',
    sleep_hours_per_day: '',
    family_history_diabetes: 0,
    hypertension_history: 0,
    cardiovascular_history: 0,
  })


  // AUTH CHECK
useEffect(() => {
    const storedToken = localStorage.getItem('glucosense_token')

    if (!storedToken) {
      navigate('/login')
    } else {
      setToken(storedToken)
    }
  }, [navigate])


  // INPUT HANDLER
const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked ? 1 : 0,
      }))
      return
    }

    if (type === 'number') {
      if (value.startsWith('-')) return

      if (value === '') {
        setFormData((prev) => ({
          ...prev,
          [name]: '',
        }))
        return
      }

      const lim = LIMITS[name]

      if (lim) {
        const n = parseFloat(value)

        if (!isNaN(n) && n > lim.max) {
          setFormData((prev) => ({
            ...prev,
            [name]: String(lim.max),
          }))
          return
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }


  // BLUR HANDLER
const handleBlur = (e) => {
    setTouched((prev) => ({
      ...prev,
      [e.target.name]: true,
    }))
  }


  // VALIDATION
const validateStep = () => {
    if (step === 1) {
      const required = ['age', 'gender', 'bmi', 'waist_to_hip_ratio']

      for (let field of required) {
        if (formData[field] === '' || formData[field] === null) {
          setError(`❌ Please fill: ${field.replace(/_/g, ' ')}`)
          return false
        }
      }
    }

    if (step === 2) {
      const required = [
        'physical_activity_minutes_per_week',
        'smoking_status',
        'alcohol_consumption_per_week',
        'diet_score',
        'sleep_hours_per_day',
      ]

      for (let field of required) {
        if (formData[field] === '' || formData[field] === null) {
          setError(`❌ Please fill: ${field.replace(/_/g, ' ')}`)
          return false
        }
      }
    }

    setError(null)
    return true
  }


  // NEXT STEP
const handleNextStep = (e) => {
    e.preventDefault()

    if (validateStep()) {
      setStep(2)
      window.scrollTo(0, 0)
    }
  }


  // SUBMIT
const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!validateStep()) return

    if (!token) {
      setError('❌ Not authenticated. Please log in.')
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      const payload = {
        prediction_type: 'WITHOUT_BLOOD',
        ...formData,
      }

      const response = await axios.post(`${API}/api/predict`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.data.success) {
        setResult(response.data)
        window.scrollTo(0, 0)
      } else {
        setError(response.data.error || '❌ Prediction failed')
      }
    } catch (err) {
      console.error(err)

      if (err.response?.status === 401) {
        navigate('/login')
      } else {
        const errorMsg =
          err.response?.data?.error || err.message || 'An error occurred'

        setError(`❌ ${errorMsg}`)
      }
    } finally {
      setLoading(false)
    }
  }


  // SAVE PREDICTION
const handleSavePrediction = async () => {
    try {
      const payload = {
        risk_score: result.risk_score,
        stage: result.stage,
        prediction_type: result.prediction_type,
        model_used: result.model_used,
        ...formData,
      }

      await axios.post(`${API}/api/history`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      alert('✅ Prediction saved!')
      navigate('/history')
    } catch (err) {
      alert('❌ Error saving: ' + (err.response?.data?.error || err.message))
    }
  }


  // HELPERS
const getRiskColor = (score) => {
    if (score < 20) return '#2EE080'
    if (score < 40) return '#FFD60A'
    if (score < 70) return '#FF8C42'
    return '#FF5A5A'
  }


  // LOADING
if (!token) {
    return (
      <div className="page">
        <div className="spinner"></div>
      </div>
    )
  }


  // RESULT PAGE
if (result) {
    return (
      <div className="page">
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button
            onClick={() => setResult(null)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#4E9BFF',
              border: '1px solid #4E9BFF',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            ← Back to Form
          </button>

          <div
            className="card"
            style={{
              border: `2px solid ${getRiskColor(result.risk_score)}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#607090',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              ⚡ Lifestyle-Based Assessment
            </div>

            <h2>Quick Assessment Results</h2>

            <div
              style={{
                fontSize: '4rem',
                fontWeight: 900,
                color: getRiskColor(result.risk_score),
                margin: '20px 0',
                lineHeight: 1,
              }}
            >
              {result.risk_score}%
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: getRiskColor(result.risk_score),
              }}
            >
              {result.stage}
            </div>

            <div
              style={{
                background: 'rgba(255,214,10,0.12)',
                padding: '14px',
                borderRadius: '10px',
                marginTop: '24px',
                color: '#FFD60A',
                fontSize: '14px',
              }}
            >
              ⚠️ This result is based on lifestyle data only. Clinical blood
              tests provide higher accuracy.
            </div>

            <h3 style={{ marginTop: '28px', color: '#4E9BFF' }}>
              💡 Recommendations
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '16px',
                textAlign: 'left',
              }}
            >
              {result.recommendations?.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(78,155,255,0.06)',
                    borderLeft: '3px solid #4E9BFF',
                    borderRadius: '8px',
                  }}
                >
                  ✓ {rec}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '28px',
              }}
            >
              <button
                onClick={handleSavePrediction}
                style={{
                  padding: '12px',
                  background: '#2EE080',
                  color: '#1A2E4A',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                💾 Save to History
              </button>

              <button
                onClick={() => navigate('/predict')}
                style={{
                  padding: '12px',
                  background: 'transparent',
                  color: '#4E9BFF',
                  border: '1px solid #4E9BFF',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ← Back to Options
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // FORM PAGE
return (
    <div className="page">
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/predict')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: '#4E9BFF',
            border: '1px solid #4E9BFF',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          ← Back
        </button>

        <h1>⚡ Quick Assessment</h1>

        <p style={{ color: '#A8B8D0', marginBottom: '24px' }}>
          Fast diabetes screening based on lifestyle and health habits.
        </p>

        {/* STEP INDICATOR */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '28px',
          }}
        >
          {[1, 2].map((s) => {
            const active = step === s
            const done = step > s

            return (
              <div key={s} style={{ flex: 1 }}>
                <div
                  style={{
                    height: '5px',
                    borderRadius: '999px',
                    background: done
                      ? '#2EE080'
                      : active
                      ? '#4E9BFF'
                      : 'rgba(78,155,255,0.2)',
                    transition: '0.3s',
                  }}
                />

                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: active
                      ? '#4E9BFF'
                      : done
                      ? '#2EE080'
                      : '#607090',
                  }}
                >
                  {done ? '✓' : s}{' '}
                  {s === 1 ? 'Basic Information' : 'Lifestyle'}
                </div>
              </div>
            )
          })}
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255,90,90,0.1)',
              border: '1px solid #FF5A5A',
              borderRadius: '8px',
              color: '#FF5A5A',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form className="card">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h2 style={{ marginBottom: '20px', color: '#4E9BFF' }}>
                📋 Basic Information
              </h2>

              <div className="grid-2">
                {/* AGE */}
                <div className="input-group">
                  <label className="input-label">Age*</label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Your current age.
                  </p>

                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 35"
                    className="input"
                    style={STATUS_STYLE[getFieldStatus('age', formData.age)]}
                  />

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#607090',
                    }}
                  >
                    Allowed range: 18–100 years
                  </span>

                  {touched.age && getFieldError('age', formData.age) && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#FF5A5A',
                        marginTop: '4px',
                      }}
                    >
                      ⚠ {getFieldError('age', formData.age)}
                    </span>
                  )}
                </div>

                {/* GENDER */}
                <div className="input-group">
                  <label className="input-label">Gender*</label>

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* BMI */}
                <div className="input-group">
                  <label className="input-label">BMI*</label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Body Mass Index based on height and weight.
                  </p>

                  <input
                    type="number"
                    step="0.1"
                    name="bmi"
                    value={formData.bmi}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 23.5"
                    className="input"
                    style={STATUS_STYLE[getFieldStatus('bmi', formData.bmi)]}
                  />

                  {touched.bmi && getFieldError('bmi', formData.bmi) && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#FF5A5A',
                        marginTop: '4px',
                      }}
                    >
                      ⚠ {getFieldError('bmi', formData.bmi)}
                    </span>
                  )}
                </div>

                {/* WAIST RATIO */}
                <div className="input-group">
                  <label className="input-label">
                    Waist-to-Hip Ratio*
                  </label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Waist circumference ÷ hip circumference.
                  </p>

                  <input
                    type="number"
                    step="0.01"
                    name="waist_to_hip_ratio"
                    value={formData.waist_to_hip_ratio}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 0.85"
                    className="input"
                    style={
                      STATUS_STYLE[
                        getFieldStatus(
                          'waist_to_hip_ratio',
                          formData.waist_to_hip_ratio
                        )
                      ]
                    }
                  />

                  {touched.waist_to_hip_ratio &&
                    getFieldError(
                      'waist_to_hip_ratio',
                      formData.waist_to_hip_ratio
                    ) && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#FF5A5A',
                          marginTop: '4px',
                        }}
                      >
                        ⚠{' '}
                        {getFieldError(
                          'waist_to_hip_ratio',
                          formData.waist_to_hip_ratio
                        )}
                      </span>
                    )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '12px',
                  background: '#FFD60A',
                  color: '#1A2E4A',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h2 style={{ marginBottom: '20px', color: '#2EE080' }}>
                🏥 Lifestyle & Medical History
              </h2>

              <div className="grid-2">
                {/* EXERCISE */}
                <div className="input-group">
                  <label className="input-label">
                    Exercise (mins/week)*
                  </label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Total weekly exercise duration.
                  </p>

                  <input
                    type="number"
                    name="physical_activity_minutes_per_week"
                    value={formData.physical_activity_minutes_per_week}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 150"
                    className="input"
                    style={
                      STATUS_STYLE[
                        getFieldStatus(
                          'physical_activity_minutes_per_week',
                          formData.physical_activity_minutes_per_week
                        )
                      ]
                    }
                  />
                </div>

                {/* SMOKING */}
                <div className="input-group">
                  <label className="input-label">Smoking Status*</label>

                  <select
                    name="smoking_status"
                    value={formData.smoking_status}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">Select</option>
                    <option value="Never">Never</option>
                    <option value="Former">Former</option>
                    <option value="Current">Current</option>
                  </select>
                </div>

                {/* ALCOHOL */}
                <div className="input-group">
                  <label className="input-label">
                    Alcohol (units/week)*
                  </label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Enter 0 if you don't drink alcohol.
                  </p>

                  <input
                    type="number"
                    name="alcohol_consumption_per_week"
                    value={formData.alcohol_consumption_per_week}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 2"
                    className="input"
                    style={
                      STATUS_STYLE[
                        getFieldStatus(
                          'alcohol_consumption_per_week',
                          formData.alcohol_consumption_per_week
                        )
                      ]
                    }
                  />
                </div>

                {/* DIET */}
                <div className="input-group">
                  <label className="input-label">Diet Score*</label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    1 = unhealthy diet, 10 = excellent diet.
                  </p>

                  <input
                    type="number"
                    name="diet_score"
                    value={formData.diet_score}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 7"
                    className="input"
                    style={
                      STATUS_STYLE[
                        getFieldStatus(
                          'diet_score',
                          formData.diet_score
                        )
                      ]
                    }
                  />
                </div>

                {/* SLEEP */}
                <div className="input-group">
                  <label className="input-label">Sleep Hours*</label>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#607090',
                      marginBottom: '6px',
                    }}
                  >
                    Average hours of sleep per day.
                  </p>

                  <input
                    type="number"
                    step="0.5"
                    name="sleep_hours_per_day"
                    value={formData.sleep_hours_per_day}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 7.5"
                    className="input"
                    style={
                      STATUS_STYLE[
                        getFieldStatus(
                          'sleep_hours_per_day',
                          formData.sleep_hours_per_day
                        )
                      ]
                    }
                  />
                </div>
              </div>

              {/* CHECKBOXES */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '24px',
                  marginBottom: '28px',
                }}
              >
                {[
                  {
                    name: 'family_history_diabetes',
                    label: 'Family history of diabetes',
                  },
                  {
                    name: 'hypertension_history',
                    label: 'History of hypertension',
                  },
                  {
                    name: 'cardiovascular_history',
                    label: 'Cardiovascular disease history',
                  },
                ].map((item) => (
                  <label
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background:
                        formData[item.name] === 1
                          ? 'rgba(46,224,128,0.08)'
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${
                        formData[item.name] === 1
                          ? '#2EE080'
                          : 'rgba(78,155,255,0.2)'
                      }`,
                      transition: '0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={formData[item.name] === 1}
                      onChange={handleInputChange}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#2EE080',
                        cursor: 'pointer',
                      }}
                    />

                    <span
                      style={{
                        color:
                          formData[item.name] === 1
                            ? '#2EE080'
                            : '#A8B8D0',
                      }}
                    >
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    color: '#4E9BFF',
                    border: '1px solid #4E9BFF',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  onClick={handleSubmit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#2EE080',
                    color: '#1A2E4A',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? '⏳ Analysing...' : '🔍 Get Risk Score'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}