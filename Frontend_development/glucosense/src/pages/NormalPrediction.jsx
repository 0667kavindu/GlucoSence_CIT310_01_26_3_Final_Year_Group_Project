// GlucoSense — NormalPrediction.jsx
// Quick Assessment with 12 fields (NO blood tests)
// FIXES:
//   1. heart_rate field now rendered in Step 2 (was in LIMITS but never shown)
//   2. Removed duplicate `normal` key in heart_rate LIMITS entry
//   3. getFieldStatus now returns 'warn' when value is outside normal range
//   4. heart_rate added to Step 2 required validation
//   5. heart_rate added to Step 2 form data initial state (was missing)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── FIELD LIMITS & VALIDATION ────────────────────────────────────────────────
const LIMITS = {
  age:                                { min: 18,   max: 120,   unit: 'years',       normal: null          },
  bmi:                                { min: 10,   max: 60,    unit: 'kg/m²',       normal: [18.5, 24.9]  },
  waist_to_hip_ratio:                 { min: 0.5,  max: 2.0,   unit: '',            normal: [0.75, 0.95]  },
  physical_activity_minutes_per_week: { min: 0,    max: 10080, unit: 'mins/week',   normal: [150, 10080]  },
  alcohol_consumption_per_week:       { min: 0,    max: 100,   unit: 'units/week',  normal: null          },
  diet_score:                         { min: 1,    max: 10,    unit: '/10',         normal: null          },
  sleep_hours_per_day:                { min: 1,    max: 24,    unit: 'hours/day',   normal: [7, 9]        },
  // FIX: removed duplicate `normal` key (only one is kept by JS — the last one wins, which was correct
  //      but confusing). Now written cleanly once.
  heart_rate:                         { min: 30,   max: 220,   unit: 'bpm',         normal: [60, 100]     },
}

// ─── STATUS STYLES ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  valid: { borderColor: '#2EE080', background: 'rgba(46,224,128,0.06)' },
  warn:  { borderColor: '#FFD60A', background: 'rgba(255,214,10,0.06)' },
  error: { borderColor: '#FF5A5A', background: 'rgba(255,90,90,0.06)'  },
  '':    {},
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
// FIX: getFieldStatus now correctly returns 'warn' when value is outside normal range
function getFieldStatus(name, value) {
  if (value === '' || value === null) return ''
  const lim = LIMITS[name]
  if (!lim) return 'valid'
  const n = parseFloat(value)
  if (isNaN(n) || n < lim.min || n > lim.max) return 'error'
  if (lim.normal && (n < lim.normal[0] || n > lim.normal[1])) return 'warn'
  return 'valid'
}

function getFieldError(name, value) {
  if (value === '' || value === null) return null
  const lim = LIMITS[name]
  if (!lim) return null
  const n = parseFloat(value)
  if (isNaN(n))    return 'Please enter a valid number.'
  if (n < 0)       return 'Value cannot be negative.'
  if (n < lim.min) return `Minimum allowed value is ${lim.min}${lim.unit ? ' ' + lim.unit : ''}.`
  if (n > lim.max) return `Maximum allowed value is ${lim.max}${lim.unit ? ' ' + lim.unit : ''}.`
  return null
}

// ─── INITIAL STATE ─────────────────────────────────────────────────────────────
const INITIAL = {
  age:                                '',
  gender:                             '',
  bmi:                                '',
  waist_to_hip_ratio:                 '',
  physical_activity_minutes_per_week: '',
  smoking_status:                     '',
  alcohol_consumption_per_week:       '',
  diet_score:                         '',
  sleep_hours_per_day:                '',
  heart_rate:                         '', // FIX: was missing from initial state
  family_history_diabetes:            0,
  hypertension_history:               0,
  cardiovascular_history:             0,
}

// ─── STEP REQUIRED FIELDS ──────────────────────────────────────────────────────
// FIX: heart_rate added to Step 2 required list
const STEP_REQUIRED = {
  1: ['age', 'gender', 'bmi', 'waist_to_hip_ratio'],
  2: [
    'physical_activity_minutes_per_week',
    'smoking_status',
    'alcohol_consumption_per_week',
    'diet_score',
    'sleep_hours_per_day',
    'heart_rate',   // ← was missing
  ],
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function NormalPrediction() {
  const navigate = useNavigate()

  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)
  const [token,     setToken]     = useState(null)
  const [step,      setStep]      = useState(1)
  const [touched,   setTouched]   = useState({})
  const [formData,  setFormData]  = useState(INITIAL)

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('glucosense_token')
    if (!storedToken) navigate('/login')
    else setToken(storedToken)
  }, [navigate])

  // ── Input handler ───────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked ? 1 : 0 }))
      return
    }

    if (type === 'number') {
      if (value.startsWith('-')) return
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }))
        return
      }
      const lim = LIMITS[name]
      if (lim) {
        const n = parseFloat(value)
        if (!isNaN(n) && n > lim.max) {
          setFormData(prev => ({ ...prev, [name]: String(lim.max) }))
          return
        }
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ── Blur handler ────────────────────────────────────────────────────────────
  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep = (s) => {
    const required = STEP_REQUIRED[s] || []

    for (const field of required) {
      const val = formData[field]
      if (val === '' || val === null || val === undefined) {
        setError(`Please fill in: ${field.replace(/_/g, ' ')}`)
        setTouched(prev => ({ ...prev, [field]: true }))
        return false
      }
      if (field === 'gender' || field === 'smoking_status') continue
      const lim = LIMITS[field]
      if (lim) {
        const n = parseFloat(val)
        if (isNaN(n)) {
          setError(`"${field.replace(/_/g, ' ')}" must be a valid number.`)
          setTouched(prev => ({ ...prev, [field]: true }))
          return false
        }
        if (n < lim.min || n > lim.max) {
          setError(
            `"${field.replace(/_/g, ' ')}" must be between ${lim.min} and ${lim.max}${lim.unit ? ' ' + lim.unit : ''}.`
          )
          setTouched(prev => ({ ...prev, [field]: true }))
          return false
        }
      }
    }

    setError(null)
    return true
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNextStep = (e) => {
    e.preventDefault()
    if (validateStep(1)) {
      setStep(2)
      window.scrollTo(0, 0)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validateStep(2)) return
    if (!token) { navigate('/login'); return }

    setLoading(true)
    try {
      const payload = { prediction_type: 'WITHOUT_BLOOD' }
      for (const [k, v] of Object.entries(formData)) {
        if (k === 'gender' || k === 'smoking_status') {
          payload[k] = v
        } else if (v === '' || v === null) {
          payload[k] = 0
        } else {
          payload[k] = parseFloat(v)
        }
      }

      const response = await axios.post(`${API}/api/predict`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (response.data.success) {
        setResult(response.data)
        window.scrollTo(0, 0)
      } else {
        setError(response.data.error || 'Prediction failed.')
      }
    } catch (err) {
      if (err.response?.status === 401) navigate('/login')
      else setError(err.response?.data?.error || err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // ── Save prediction ─────────────────────────────────────────────────────────
  const handleSavePrediction = async () => {
    try {
      const payload = {
        risk_score:      result.risk_score,
        stage:           result.stage,
        prediction_type: result.prediction_type,
        model_used:      result.model_used,
        ...formData,
      }
      await axios.post(`${API}/api/history`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      alert('✅ Prediction saved!')
      navigate('/history')
    } catch (err) {
      alert('❌ Error saving: ' + (err.response?.data?.error || err.message))
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getRiskColor = (score) => {
    if (score < 20) return '#2EE080'
    if (score < 40) return '#FFD60A'
    if (score < 70) return '#FF8C42'
    return '#FF5A5A'
  }

  // ── Sub-components ──────────────────────────────────────────────────────────
  const NumericField = ({ name, label, hint, fieldStep = 'any', placeholder = '' }) => {
    const status = touched[name] ? getFieldStatus(name, formData[name]) : ''
    const errMsg = touched[name] ? getFieldError(name, formData[name]) : null
    const lim    = LIMITS[name]

    return (
      <div className="input-group">
        <label className="input-label">{label}</label>
        {hint && (
          <p style={{ fontSize: '12px', color: '#607090', margin: '2px 0 6px' }}>{hint}</p>
        )}
        <input
          type="number"
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="input"
          step={fieldStep}
          placeholder={placeholder || (lim ? `${lim.min} – ${lim.max}` : '')}
          style={{ ...(STATUS_STYLE[status] || {}), transition: 'border-color 0.2s, background 0.2s' }}
        />
        {lim && (
          <span style={{ fontSize: '11px', color: '#607090', marginTop: '3px' }}>
            {lim.unit ? `Unit: ${lim.unit} · ` : ''}Range: {lim.min} – {lim.max}
            {lim.normal ? ` · Normal: ${lim.normal[0]}–${lim.normal[1]}` : ''}
          </span>
        )}
        {errMsg && (
          <span style={{ fontSize: '12px', color: '#FF5A5A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚠ {errMsg}
          </span>
        )}
        {status === 'valid' && !errMsg && (
          <span style={{ fontSize: '11px', color: '#2EE080', marginTop: '3px' }}>✓ Looks good</span>
        )}
        {status === 'warn' && (
          <span style={{ fontSize: '11px', color: '#FFD60A', marginTop: '3px' }}>⚠ Outside normal range — double-check your value</span>
        )}
      </div>
    )
  }

  const SelectField = ({ name, label, hint, options }) => {
    const hasValue = formData[name] !== ''
    return (
      <div className="input-group">
        <label className="input-label">{label}</label>
        {hint && (
          <p style={{ fontSize: '12px', color: '#607090', margin: '2px 0 6px' }}>{hint}</p>
        )}
        <select
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          className="input"
          style={hasValue ? STATUS_STYLE.valid : {}}
        >
          <option value="">Select…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }

  const CheckField = ({ name, label }) => (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
      background: formData[name] ? 'rgba(46,224,128,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${formData[name] ? '#2EE080' : 'rgba(78,155,255,0.2)'}`,
      transition: 'all 0.2s',
    }}>
      <input
        type="checkbox"
        name={name}
        checked={formData[name] === 1}
        onChange={handleInputChange}
        style={{ width: '18px', height: '18px', accentColor: '#2EE080', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '14px', color: formData[name] ? '#2EE080' : '#A8B8D0' }}>{label}</span>
    </label>
  )

  // ── Loading / not-authed ────────────────────────────────────────────────────
  if (!token) return <div className="page"><div className="spinner" /></div>

  // ── Result page ─────────────────────────────────────────────────────────────
  if (result) {
    const color = getRiskColor(result.risk_score)
    return (
      <div className="page">
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button
            onClick={() => setResult(null)}
            style={{
              padding: '8px 16px', background: 'transparent',
              color: '#4E9BFF', border: '1px solid #4E9BFF',
              borderRadius: '6px', cursor: 'pointer', marginBottom: '20px',
            }}
          >
            ← Back to Form
          </button>

          <div className="card" style={{ border: `2px solid ${color}`, textAlign: 'center' }}>
            <div style={{
              fontSize: '13px', color: '#607090', textTransform: 'uppercase',
              letterSpacing: '1px', marginBottom: '8px',
            }}>
              ⚡ Lifestyle-Based Assessment
            </div>

            <h2>Quick Assessment Results</h2>

            <div style={{ fontSize: '4rem', fontWeight: 900, color, margin: '20px 0', lineHeight: 1 }}>
              {result.risk_score}%
            </div>

            <div style={{ fontSize: '20px', fontWeight: 700, color }}>{result.stage}</div>

            <div style={{
              background: 'rgba(255,214,10,0.12)', padding: '14px',
              borderRadius: '10px', marginTop: '24px', color: '#FFD60A', fontSize: '14px',
            }}>
              ⚠️ This result is based on lifestyle data only. Clinical blood tests provide higher accuracy.
            </div>

            <h3 style={{ marginTop: '28px', color: '#4E9BFF' }}>💡 Recommendations</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', textAlign: 'left' }}>
              {result.recommendations?.map((rec, i) => (
                <div key={i} style={{
                  padding: '12px 14px', background: 'rgba(78,155,255,0.06)',
                  borderLeft: '3px solid #4E9BFF', borderRadius: '8px',
                }}>
                  ✓ {rec}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '28px' }}>
              <button
                onClick={handleSavePrediction}
                style={{
                  padding: '12px', background: '#2EE080', color: '#1A2E4A',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                }}
              >
                💾 Save to History
              </button>
              <button
                onClick={() => navigate('/predict')}
                style={{
                  padding: '12px', background: 'transparent', color: '#4E9BFF',
                  border: '1px solid #4E9BFF', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
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

  // ── Form page ───────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/predict')}
          style={{
            padding: '8px 16px', background: 'transparent', color: '#4E9BFF',
            border: '1px solid #4E9BFF', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px',
          }}
        >
          ← Back
        </button>

        <h1>⚡ Quick Assessment</h1>
        <p style={{ color: '#A8B8D0', marginBottom: '24px' }}>
          Fast diabetes screening based on lifestyle and health habits.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[
            { n: 1, label: 'Basic Information' },
            { n: 2, label: 'Lifestyle & History' },
          ].map(({ n, label }) => {
            const active = step === n
            const done   = step > n
            return (
              <div key={n} style={{ flex: 1 }}>
                <div style={{
                  height: '5px', borderRadius: '999px',
                  background: done ? '#2EE080' : active ? '#4E9BFF' : 'rgba(78,155,255,0.2)',
                  transition: '0.3s',
                }} />
                <div style={{
                  marginTop: '6px', fontSize: '12px',
                  color: active ? '#4E9BFF' : done ? '#2EE080' : '#607090',
                }}>
                  {done ? '✓' : n} {label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '12px 16px', background: 'rgba(255,90,90,0.1)',
            border: '1px solid #FF5A5A', borderRadius: '8px',
            color: '#FF5A5A', marginBottom: '20px', fontSize: '13px',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            ⚠ {error}
          </div>
        )}

        <div className="card">

          {/* ── STEP 1: Basic Info ────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h3 style={{ marginBottom: '20px' }}>📋 Basic Information</h3>
              <div className="grid-2">
                <NumericField
                  name="age" label="Age *"
                  hint="Your current age. Must be 18 or older."
                  placeholder="e.g. 35"
                />
                <SelectField
                  name="gender" label="Gender *"
                  hint="Your biological gender."
                  options={[
                    { value: 'Male',   label: 'Male'   },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other',  label: 'Other'  },
                  ]}
                />
                <NumericField
                  name="bmi" label="BMI *"
                  hint="Body Mass Index. Use the BMI Calculator on the Home page if unsure."
                  fieldStep="0.1" placeholder="e.g. 23.5"
                />
                <NumericField
                  name="waist_to_hip_ratio" label="Waist-to-Hip Ratio *"
                  hint="Waist circumference ÷ hip circumference."
                  fieldStep="0.01" placeholder="e.g. 0.85"
                />
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  width: '100%', marginTop: '24px', padding: '12px',
                  background: '#4E9BFF', color: '#fff', border: 'none',
                  borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Next: Lifestyle & History →
              </button>
            </>
          )}

          {/* ── STEP 2: Lifestyle & History ───────────────────────────────── */}
          {step === 2 && (
            <>
              <h3 style={{ marginBottom: '20px' }}>🏃 Lifestyle & Medical History</h3>
              <div className="grid-2">
                <NumericField
                  name="physical_activity_minutes_per_week" label="Exercise (mins/week) *"
                  hint="Total weekly exercise time. WHO recommends 150+ mins."
                  placeholder="e.g. 150"
                />
                <SelectField
                  name="smoking_status" label="Smoking Status *"
                  hint="Your current smoking condition."
                  options={[
                    { value: 'Never',   label: 'Never Smoked'    },
                    { value: 'Former',  label: 'Former Smoker'   },
                    { value: 'Current', label: 'Current Smoker'  },
                  ]}
                />
                <NumericField
                  name="alcohol_consumption_per_week" label="Alcohol (units/week) *"
                  hint="Enter 0 if you don't drink."
                  placeholder="e.g. 2"
                />
                <NumericField
                  name="diet_score" label="Diet Score (1–10) *"
                  hint="1 = very unhealthy diet, 10 = excellent diet."
                  placeholder="e.g. 7"
                />
                <NumericField
                  name="sleep_hours_per_day" label="Sleep (hours/day) *"
                  hint="Average daily sleep. Normal range is 7–9 hours."
                  fieldStep="0.5" placeholder="e.g. 7.5"
                />
                {/* FIX: heart_rate field was in LIMITS but never rendered — added here */}
                <NumericField
                  name="heart_rate" label="Resting Heart Rate *"
                  hint="Your resting heart rate in beats per minute. Normal: 60–100 bpm."
                  placeholder="e.g. 72"
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', marginBottom: '28px' }}>
                <CheckField name="family_history_diabetes" label="Family history of diabetes (parent or sibling)" />
                <CheckField name="hypertension_history"    label="Personal history of high blood pressure (hypertension)" />
                <CheckField name="cardiovascular_history"  label="Personal history of cardiovascular disease" />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setError(null); setStep(1); window.scrollTo(0, 0) }}
                  style={{
                    flex: 1, padding: '12px', background: 'transparent', color: '#4E9BFF',
                    border: '1px solid #4E9BFF', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '12px', background: '#2EE080', color: '#1A2E4A',
                    border: 'none', borderRadius: '8px', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? '⏳ Analysing...' : '🔍 Get Risk Score'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}