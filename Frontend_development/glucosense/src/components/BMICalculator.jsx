// GlucoSense — BMICalculator.jsx 
// Reusable BMI calculator component — used on Home and KnowYourNumbers pages

import { useState } from 'react'

export default function BMICalculator() {
  const [unit,   setUnit]   = useState('metric')  // 'metric' or 'imperial'
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [feet,   setFeet]   = useState('')
  const [inches, setInches] = useState('')
  const [lbs,    setLbs]    = useState('')
  const [result, setResult] = useState(null)

  function calculate() {
    let bmi
    if (unit === 'metric') {
      const h = parseFloat(height) / 100  // cm to m
      const w = parseFloat(weight)
      if (!h || !w || h <= 0 || w <= 0) return
      bmi = w / (h * h)
    } else {
      const totalInches = parseFloat(feet) * 12 + parseFloat(inches || 0)
      const w           = parseFloat(lbs)
      if (!totalInches || !w) return
      bmi = (w / (totalInches * totalInches)) * 703
    }
    bmi = Math.round(bmi * 10) / 10

    let category, color, advice
    if      (bmi < 18.5) { category='Underweight'; color='#4E9BFF'; advice='Consider increasing caloric intake with nutritious foods.' }
    else if (bmi < 25)   { category='Normal weight'; color='#2EE080'; advice='Excellent! Maintain your healthy weight.' }
    else if (bmi < 30)   { category='Overweight'; color='#FFD60A'; advice='Losing 5–10% of body weight can significantly reduce diabetes risk.' }
    else if (bmi < 35)   { category='Obese Class I'; color='#FF8C42'; advice='Weight management and regular exercise are strongly recommended.' }
    else                 { category='Obese Class II+'; color='#FF5A5A'; advice='Please consult a healthcare professional for a personalised plan.' }

    setResult({ bmi, category, color, advice })
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '16px' }}>BMI Calculator</h3>

      {/* Unit toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['metric', 'imperial'].map(u => (
          <button key={u} onClick={() => { setUnit(u); setResult(null) }}
            className={`btn ${unit === u ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, textTransform: 'capitalize' }}>
            {u}
          </button>
        ))}
      </div>

      {unit === 'metric' ? (
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Height (cm)</label>
            <input type="number" value={height}
              onChange={e => setHeight(e.target.value)}
              className="input" placeholder="e.g. 170" />
          </div>
          <div className="input-group">
            <label className="input-label">Weight (kg)</label>
            <input type="number" value={weight}
              onChange={e => setWeight(e.target.value)}
              className="input" placeholder="e.g. 70" />
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Feet</label>
              <input type="number" value={feet}
                onChange={e => setFeet(e.target.value)}
                className="input" placeholder="5" />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Inches</label>
              <input type="number" value={inches}
                onChange={e => setInches(e.target.value)}
                className="input" placeholder="7" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Weight (lbs)</label>
            <input type="number" value={lbs}
              onChange={e => setLbs(e.target.value)}
              className="input" placeholder="e.g. 154" />
          </div>
        </div>
      )}

      <button className="btn btn-success" onClick={calculate}
        style={{ width: '100%', marginTop: '8px' }}>
        Calculate BMI
      </button>

      {result && (
        <div style={{
          marginTop: '20px', padding: '16px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
          borderLeft: `4px solid ${result.color}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: result.color }}>
              {result.bmi}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: result.color }}>
              {result.category}
            </span>
          </div>

          {/* BMI scale bar */}
          <div style={{ margin: '12px 0', height: '8px', borderRadius: '4px',
            background: 'linear-gradient(to right, #4E9BFF 0%, #2EE080 30%, #FFD60A 50%, #FF8C42 70%, #FF5A5A 100%)' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: 'white', border: `2px solid ${result.color}`,
              position: 'relative',
              left: `${Math.min(((result.bmi - 15) / 25) * 100, 100)}%`,
              top: '-2px'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: '10px', color: '#607090', marginBottom: '10px' }}>
            <span>15</span><span>Underweight 18.5</span>
            <span>Normal 25</span><span>Overweight 30</span><span>Obese 40</span>
          </div>

          <p style={{ fontSize: '13px', color: '#A8B8D0' }}>{result.advice}</p>
        </div>
      )}
    </div>
  )
}
