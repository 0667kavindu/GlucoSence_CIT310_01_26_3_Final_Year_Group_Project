// GlucoSense — MedicalPrediction.jsx
// Full Assessment (WITH blood tests) — Mode B

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// FIELD LIMITS — min, max, normal range , unit label
const LIMITS = {
  age:                                { min: 18,  max: 120,  unit: 'years',       },
  bmi:                                { min: 10,  max: 60,   unit: 'kg/m²',     normal: [18.5, 24.9] },
  waist_to_hip_ratio:                 { min: 0.5, max: 2.0,  unit: '',          normal: [0.75, 0.95] },
  physical_activity_minutes_per_week: { min: 0,   max: 10080,unit: 'mins/week', normal: [150, 10080] },
  alcohol_consumption_per_week:       { min: 0,   max: 100,  unit: 'units'                          },
  diet_score:                         { min: 1,   max: 10,   unit: '/10'                             },
  sleep_hours_per_day:                { min: 1,   max: 24,   unit: 'hours/day',   normal: [7, 9]       },
  heart_rate:                         { min: 30,  max: 220,  unit: 'bpm',       normal: [60, 100]    },
  glucose_fasting:                    { min: 30,  max: 500,  unit: 'mg/dL',     normal: [70, 100]    },
  glucose_postprandial:               { min: 30,  max: 600,  unit: 'mg/dL',     normal: [70, 140]    },
  hba1c:                              { min: 0,   max: 20,   unit: '%',         normal: [4, 5.7]     },
  insulin_level:                      { min: 0,   max: 300,  unit: 'μU/mL',     normal: [2, 25]      },
  systolic_bp:                        { min: 70,  max: 250,  unit: 'mmHg',      normal: [90, 120]    },
  diastolic_bp:                       { min: 40,  max: 150,  unit: 'mmHg',      normal: [60, 80]     },
  cholesterol_total:                  { min: 50,  max: 500,  unit: 'mg/dL',     normal: [0, 200]     },
  hdl_cholesterol:                    { min: 10,  max: 150,  unit: 'mg/dL',     normal: [40, 150]    },
  ldl_cholesterol:                    { min: 10,  max: 400,  unit: 'mg/dL',     normal: [0, 100]     },
  triglycerides:                      { min: 20,  max: 1000, unit: 'mg/dL',     normal: [0, 150]     },
}

// Returns '' | 'valid' | 'warn' | 'error'
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
  if (isNaN(n)) return 'Please enter a valid number.'
  if (n < 0) return 'Value cannot be negative.'
  if (n < lim.min) return `Minimum allowed value is ${lim.min}${lim.unit ? ' ' + lim.unit : ''}.`
  if (n > lim.max) return `Maximum allowed value is ${lim.max}${lim.unit ? ' ' + lim.unit : ''}.`
  return null
}

const STATUS_STYLE = {
  valid: { borderColor: '#2EE080', background: 'rgba(46,224,128,0.06)' },
  warn:  { borderColor: '#FFD60A', background: 'rgba(255,214,10,0.06)' },
  error: { borderColor: '#FF5A5A', background: 'rgba(255,90,90,0.06)'  },
  '':    {},
}

// INITIAL FORM STATE
const INITIAL = {
  age: '', gender: '', bmi: '', waist_to_hip_ratio: '',
  physical_activity_minutes_per_week: '', smoking_status: '',
  alcohol_consumption_per_week: '', diet_score: '',
  sleep_hours_per_day: '', heart_rate: '',
  family_history_diabetes: 0, hypertension_history: 0, cardiovascular_history: 0,
  glucose_fasting: '', glucose_postprandial: '', hba1c: '', insulin_level: '',
  systolic_bp: '', diastolic_bp: '',
  cholesterol_total: '', hdl_cholesterol: '', ldl_cholesterol: '', triglycerides: '',
}

// Fields required per step
const STEP_REQUIRED = {
  1: ['age', 'gender', 'bmi', 'waist_to_hip_ratio'],
  2: ['physical_activity_minutes_per_week', 'smoking_status',
      'alcohol_consumption_per_week', 'diet_score', 'sleep_hours_per_day', 'heart_rate'],
  3: [], // checkboxes, always valid
  4: ['glucose_fasting', 'glucose_postprandial', 'hba1c', 'insulin_level'],
  5: ['systolic_bp', 'diastolic_bp', 'cholesterol_total',
      'hdl_cholesterol', 'ldl_cholesterol', 'triglycerides'],
}

// =========================================================
// IMPORTANT FIX: NumericField and SelectField are now defined
// OUTSIDE the MedicalPrediction component (module-level), not
// inside its function body.
//
// Why this matters: previously these were declared with
// `const NumericField = (...) => {...}` INSIDE MedicalPrediction().
// Every time MedicalPrediction re-rendered (i.e. on every keystroke,
// since typing updates `formData` state), JavaScript created a brand
// new function object for NumericField. React treats a new function
// reference as a brand new component TYPE, not the same component
// re-rendering — so it unmounted the old <input> DOM node and mounted
// a fresh one on every keystroke. That's what caused the input to
// blink and lose focus after each digit.
//
// By moving them out here, the component identity stays stable across
// re-renders, so React just updates props on the same DOM node and
// focus is preserved while typing.
// =========================================================

function NumericField({ name, label, hint, fieldStep = 'any', placeholder = '', formData, touched, onChange, onBlur }) {
  const status = touched[name] ? getFieldStatus(name, formData[name]) : ''
  const errMsg = touched[name] ? getFieldError(name, formData[name]) : null
  const lim = LIMITS[name]

  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {hint && <p style={{ fontSize: '12px', color: '#607090', margin: '2px 0 6px' }}>{hint}</p>}
      <input
        type="number"
        name={name}
        value={formData[name]}
        onChange={onChange}
        onBlur={onBlur}
        className="input"
        step={fieldStep}
        placeholder={placeholder || (lim ? `${lim.min} – ${lim.max}` : '')}
        style={{ ...(STATUS_STYLE[status] || {}), transition: 'border-color 0.2s, background 0.2s' }}
      />
      {/* Inline range badge */}
      {lim && (
        <span style={{ fontSize: '11px', color: '#607090', marginTop: '3px' }}>
          {lim.unit ? `Unit: ${lim.unit} · ` : ''}Range: {lim.min} – {lim.max}
          {lim.normal ? ` · Normal: ${lim.normal[0]}–${lim.normal[1]}` : ''}
        </span>
      )}
      {/* Inline error message */}
      {errMsg && (
        <span style={{ fontSize: '12px', color: '#FF5A5A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⚠ {errMsg}
        </span>
      )}
      {/* In-range confirmation */}
      {status === 'valid' && !errMsg && (
        <span style={{ fontSize: '11px', color: '#2EE080', marginTop: '3px' }}>✓ Looks good</span>
      )}
      {status === 'warn' && (
        <span style={{ fontSize: '11px', color: '#FFD60A', marginTop: '3px' }}>⚠ Outside normal range — check your value</span>
      )}
    </div>
  )
}

function SelectField({ name, label, hint, options, formData, onChange }) {
  const hasValue = formData[name] !== ''
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {hint && <p style={{ fontSize: '12px', color: '#607090', margin: '2px 0 6px' }}>{hint}</p>}
      <select
        name={name}
        value={formData[name]}
        onChange={onChange}
        className="input"
        style={hasValue ? STATUS_STYLE.valid : {}}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function CheckField({ name, label, formData, onChange }) {
  return (
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
        onChange={onChange}
        style={{ width: '18px', height: '18px', accentColor: '#2EE080', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '14px', color: formData[name] ? '#2EE080' : '#A8B8D0' }}>{label}</span>
    </label>
  )
}

// COMPONENT
export default function MedicalPrediction() {
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [result,  setResult]    = useState(null)
  const [token,   setToken]     = useState(null)
  const [step,    setStep]      = useState(1)
  const [stepError, setStepError] = useState('')
  const [touched, setTouched]   = useState({}) // tracks which fields were blurred
  const [formData, setFormData] = useState(INITIAL)

  useEffect(() => {
    const t = localStorage.getItem('glucosense_token')
    if (!t) navigate('/login')
    else setToken(t)
  }, [navigate])

  //  Input handler 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setStepError('')

    if (type === 'checkbox') {
      setFormData(p => ({ ...p, [name]: checked ? 1 : 0 }))
      return
    }

    if (type === 'number') {
      // Block typing a minus sign at all
      if (value.startsWith('-')) return

      // Allow empty (user clearing the field)
      if (value === '') {
        setFormData(p => ({ ...p, [name]: '' }))
        return
      }

      const lim = LIMITS[name]
      if (lim) {
        const n = parseFloat(value)
        // If the number exceeds the maximum, clamp silently
        if (!isNaN(n) && n > lim.max) {
          setFormData(p => ({ ...p, [name]: String(lim.max) }))
          return
        }
      }

      setFormData(p => ({ ...p, [name]: value }))
      return
    }

    setFormData(p => ({ ...p, [name]: value }))
  }

  const handleBlur = (e) => {
    setTouched(t => ({ ...t, [e.target.name]: true }))
  }

  //  Step validation 
  const validateStep = (s) => {
    const required = STEP_REQUIRED[s] || []

    for (const field of required) {
      const val = formData[field]

      // Empty check
      if (val === '' || val === null || val === undefined) {
        setStepError(`Please fill in "${field.replace(/_/g, ' ')}".`)
        setTouched(t => ({ ...t, [field]: true }))
        return false
      }

      // Text selects (gender, smoking_status) — just need a value
      if (field === 'gender' || field === 'smoking_status') continue

      // Numeric range check
      const lim = LIMITS[field]
      if (lim) {
        const n = parseFloat(val)
        if (isNaN(n)) {
          setStepError(`"${field.replace(/_/g, ' ')}" must be a valid number.`)
          setTouched(t => ({ ...t, [field]: true }))
          return false
        }
        if (n < 0) {
          setStepError(`"${field.replace(/_/g, ' ')}" cannot be negative.`)
          setTouched(t => ({ ...t, [field]: true }))
          return false
        }
        if (n < lim.min || n > lim.max) {
          setStepError(
            `"${field.replace(/_/g, ' ')}" must be between ${lim.min} and ${lim.max}${lim.unit ? ' ' + lim.unit : ''}.`
          )
          setTouched(t => ({ ...t, [field]: true }))
          return false
        }
      }
    }

    setStepError('')
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setStepError('')
    setStep(s => s - 1)
    window.scrollTo(0, 0)
  }

  //  Submit ─
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(5)) return

    setLoading(true)
    try {
      const payload = {}
      for (const [k, v] of Object.entries(formData)) {
        if (k === 'gender' || k === 'smoking_status') {
          payload[k] = v
        } else if (v === '' || v === null) {
          payload[k] = 0
        } else {
          payload[k] = parseFloat(v)
        }
      }

      const res = await axios.post(
        `${API}/api/predict`,
        { prediction_type: 'WITH_BLOOD', ...payload },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )

      if (res.data.success) {
        localStorage.setItem('glucosense_result', JSON.stringify({ ...res.data, inputs: payload }))
        setResult(res.data)
        window.scrollTo(0, 0)
      }
    } catch (err) {
      setStepError(err.response?.data?.error || err.message || 'Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  //  Helpers 
  const riskColor = (s) => s < 20 ? '#2EE080' : s < 40 ? '#FFD60A' : s < 70 ? '#FF8C42' : '#FF5A5A'

  //  Loading / not-authed 
  if (!token) return <div className="page"><div className="spinner" /></div>

  //  Result page 
  if (result) {
    const color = riskColor(result.risk_score)
    return (
      <div className="page">
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="card" style={{ borderColor: color, borderWidth: '2px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#607090', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🩸 Full Clinical Assessment
            </div>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color, lineHeight: 1 }}>
              {result.risk_score}%
            </div>
            <h2 style={{ color, marginTop: '10px', marginBottom: '24px' }}>{result.stage}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {result.recommendations?.map((rec, i) => (
                <div key={i} style={{
                  padding: '10px 14px', background: 'rgba(78,155,255,0.06)',
                  borderRadius: '8px', borderLeft: '3px solid #4E9BFF', fontSize: '13px'
                }}>
                  {rec}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => navigate('/results')}>
                📊 Full Results
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }}
                onClick={() => { setResult(null); setStep(1); setFormData(INITIAL); setTouched({}) }}>
                🔄 New Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  //  Form page 
  const STEP_TITLES = ['Basic Info', 'Lifestyle', 'Medical History', 'Blood Tests', 'Vitals & Lipids']

  return (
    <div className="page">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>🩸 Full Assessment</h1>
        <p style={{ color: '#A8B8D0', marginBottom: '24px' }}>
          Complete clinical evaluation including blood test results.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {STEP_TITLES.map((title, i) => {
            const n = i + 1
            const done    = step > n
            const active  = step === n
            return (
              <div key={n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: '4px', borderRadius: '2px', marginBottom: '6px',
                  background: done ? '#2EE080' : active ? '#4E9BFF' : 'rgba(78,155,255,0.2)',
                  transition: 'background 0.3s',
                }} />
                <span style={{
                  fontSize: '11px',
                  color: done ? '#2EE080' : active ? '#4E9BFF' : '#607090',
                  fontWeight: active ? 700 : 400,
                }}>
                  {done ? '✓' : n} {title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step-level error banner */}
        {stepError && (
          <div style={{
            background: 'rgba(255,90,90,0.1)', border: '1px solid #FF5A5A',
            padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
            color: '#FF5A5A', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            ⚠ {stepError}
          </div>
        )}

        <div className="card">

          {/*  STEP 1: Basic Info  */}
          {step === 1 && (
            <>
              <h3 style={{ marginBottom: '20px' }}>📋 Basic Information</h3>
              <div className="grid-2">
                <NumericField name="age" label="Age *"
                  hint="Your current age. Must be 18 or older." placeholder="e.g. 35"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <SelectField name="gender" label="Gender *"
                  hint="Your biological gender."
                  options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                  formData={formData} onChange={handleChange} />
                <NumericField name="bmi" label="BMI *"
                  hint="Body Mass Index. Use the BMI Calculator on the Home page if unsure."
                  fieldStep="0.1" placeholder="e.g. 23.5"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="waist_to_hip_ratio" label="Waist-to-Hip Ratio *"
                  hint="Waist circumference ÷ hip circumference."
                  fieldStep="0.01" placeholder="e.g. 0.85"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
              </div>
            </>
          )}

          {/*  STEP 2: Lifestyle  */}
          {step === 2 && (
            <>
              <h3 style={{ marginBottom: '20px' }}>🏃 Lifestyle Factors</h3>
              <div className="grid-2">
                <NumericField name="physical_activity_minutes_per_week" label="Exercise (mins/week) *"
                  hint="Total weekly exercise time. WHO recommends 150+ minutes." placeholder="e.g. 150"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <SelectField name="smoking_status" label="Smoking Status *"
                  hint="Your current smoking condition."
                  options={[{ value: 'Never', label: 'Never Smoked' }, { value: 'Former', label: 'Former Smoker' }, { value: 'Current', label: 'Current Smoker' }]}
                  formData={formData} onChange={handleChange} />
                <NumericField name="alcohol_consumption_per_week" label="Alcohol (units/week) *"
                  hint="Enter 0 if you don't drink." placeholder="e.g. 2"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="heart_rate" label="Resting Heart Rate *"
                  hint="Your resting heart rate in beats per minute." placeholder="e.g. 72"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="diet_score" label="Diet Score (1–10) *"
                  hint="1 = very unhealthy diet, 10 = excellent diet." placeholder="e.g. 7"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="sleep_hours_per_day" label="Sleep (hours/day) *"
                  hint="Average daily sleep. Normal range is 7–9 hours."
                  fieldStep="0.5" placeholder="e.g. 7.5"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
              </div>
            </>
          )}

          {/*  STEP 3: Medical History  */}
          {step === 3 && (
            <>
              <h3 style={{ marginBottom: '8px' }}>🏥 Medical History</h3>
              <p style={{ fontSize: '13px', color: '#A8B8D0', marginBottom: '24px' }}>
                Tick all conditions that apply to you or your immediate family. These significantly affect your risk score.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <CheckField name="family_history_diabetes"  label="Family history of diabetes (parent or sibling)" formData={formData} onChange={handleChange} />
                <CheckField name="hypertension_history"     label="Personal history of high blood pressure (hypertension)" formData={formData} onChange={handleChange} />
                <CheckField name="cardiovascular_history"   label="Personal history of cardiovascular disease" formData={formData} onChange={handleChange} />
              </div>
            </>
          )}

          {/*  STEP 4: Blood Tests  */}
          {step === 4 && (
            <>
              <h3 style={{ marginBottom: '8px' }}>🩸 Blood Test Results</h3>
              <p style={{ fontSize: '13px', color: '#A8B8D0', marginBottom: '20px' }}>
                Enter your latest lab values. These are the most predictive features in the model.
              </p>
              <div className="grid-2">
                <NumericField name="glucose_fasting" label="Fasting Glucose *"
                  hint="Blood sugar after 8+ hours fasting. Normal: 70–100 mg/dL." placeholder="e.g. 95"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="glucose_postprandial" label="Postprandial Glucose *"
                  hint="Blood sugar 2 hours after a meal. Normal: &lt;140 mg/dL." placeholder="e.g. 120"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="hba1c" label="HbA1c *"
                  hint="Average blood sugar over 3 months. Normal: &lt;5.7%."
                  fieldStep="0.1" placeholder="e.g. 5.4"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="insulin_level" label="Insulin Level *"
                  hint="Fasting insulin level. Normal: 2–25 μU/mL." placeholder="e.g. 12"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
              </div>
            </>
          )}

          {/*  STEP 5: Vitals & Lipids  */}
          {step === 5 && (
            <>
              <h3 style={{ marginBottom: '8px' }}>❤️ Blood Pressure & Lipids</h3>
              <p style={{ fontSize: '13px', color: '#A8B8D0', marginBottom: '20px' }}>
                Enter your most recent blood pressure reading and lipid panel results.
              </p>
              <div className="grid-2">
                <NumericField name="systolic_bp"       label="Systolic BP *"       hint="Top number in your BP reading. Normal: 90–120 mmHg."  placeholder="e.g. 115"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="diastolic_bp"      label="Diastolic BP *"      hint="Bottom number in your BP reading. Normal: 60–80 mmHg." placeholder="e.g. 75"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="cholesterol_total" label="Total Cholesterol *" hint="Overall cholesterol level. Normal: &lt;200 mg/dL."      placeholder="e.g. 180"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="hdl_cholesterol"   label="HDL Cholesterol *"   hint="Good cholesterol. Higher is better. Normal: &gt;40 mg/dL." placeholder="e.g. 55"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="ldl_cholesterol"   label="LDL Cholesterol *"   hint="Bad cholesterol. Normal: &lt;100 mg/dL."                placeholder="e.g. 90"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
                <NumericField name="triglycerides"     label="Triglycerides *"     hint="Blood fat level. Normal: &lt;150 mg/dL."                placeholder="e.g. 120"
                  formData={formData} touched={touched} onChange={handleChange} onBlur={handleBlur} />
              </div>
            </>
          )}

          {/*  Navigation buttons ─ */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            {step > 1 && (
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={handleBack}>
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleNext}>
                Next: {STEP_TITLES[step]} →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success"
                style={{ flex: 1, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '⏳ Analysing...' : '🔍 Get My Risk Score'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}