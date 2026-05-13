// GlucoSense — KnowYourNumbers.jsx  
// Clinical reference ranges for HbA1c, Glucose, BMI, Blood Pressure

import BMICalculator from '../components/BMICalculator'

const NUMBERS = [
  {
    title: 'HbA1c (%)',
    icon: '🩸',
    ranges: [
      { label: 'Normal',      range: 'Below 5.7%',   color: '#2EE080', bg: 'rgba(46,224,128,.1)' },
      { label: 'Pre-Diabetic',range: '5.7% – 6.4%',  color: '#FFD60A', bg: 'rgba(255,214,10,.1)' },
      { label: 'Diabetic',    range: '6.5% and above',color: '#FF5A5A', bg: 'rgba(255,90,90,.1)'  },
    ],
    note: 'HbA1c measures average blood sugar over the past 2–3 months. It is the most reliable diabetes diagnostic test.'
  },
  {
    title: 'Fasting Glucose (mg/dL)',
    icon: '💉',
    ranges: [
      { label: 'Normal',      range: '70 – 99 mg/dL',   color: '#2EE080', bg: 'rgba(46,224,128,.1)' },
      { label: 'Pre-Diabetic',range: '100 – 125 mg/dL', color: '#FFD60A', bg: 'rgba(255,214,10,.1)' },
      { label: 'Diabetic',    range: '126 mg/dL or higher',color:'#FF5A5A',bg: 'rgba(255,90,90,.1)' },
    ],
    note: 'Measured after at least 8 hours of fasting. Normal is between 70 and 99 mg/dL.'
  },
  {
    title: 'BMI (Body Mass Index)',
    icon: '⚖️',
    ranges: [
      { label: 'Underweight', range: 'Below 18.5',  color: '#4E9BFF', bg: 'rgba(78,155,255,.1)' },
      { label: 'Normal',      range: '18.5 – 24.9', color: '#2EE080', bg: 'rgba(46,224,128,.1)' },
      { label: 'Overweight',  range: '25.0 – 29.9', color: '#FFD60A', bg: 'rgba(255,214,10,.1)' },
      { label: 'Obese',       range: '30.0 and above',color:'#FF5A5A',bg: 'rgba(255,90,90,.1)'  },
    ],
    note: 'BMI is a measure of body fat based on height and weight. A BMI over 25 significantly increases diabetes risk.'
  },
  {
    title: 'Blood Pressure (mmHg)',
    icon: '💓',
    ranges: [
      { label: 'Normal',      range: 'Below 120/80',  color: '#2EE080', bg: 'rgba(46,224,128,.1)' },
      { label: 'Elevated',    range: '120–129 / <80', color: '#FFD60A', bg: 'rgba(255,214,10,.1)' },
      { label: 'Stage 1 High',range: '130–139 / 80–89',color:'#FF8C42',bg: 'rgba(255,140,66,.1)' },
      { label: 'Stage 2 High',range: '140+ / 90+',    color: '#FF5A5A', bg: 'rgba(255,90,90,.1)'  },
    ],
    note: 'High blood pressure (hypertension) is strongly linked to Type 2 diabetes. Check yours regularly.'
  },
]

export default function KnowYourNumbers() {
  return (
    <div className="page">
      <h1>Know Your Numbers</h1>
      <p style={{ marginBottom: '32px' }}>
        Understanding your clinical values is the first step in managing your diabetes risk.
        Use these reference ranges to interpret your blood test results.
      </p>

      <div className="grid-2" style={{ marginBottom: '40px' }}>
        {NUMBERS.map(n => (
          <div key={n.title} className="card">
            <h3 style={{ marginBottom: '16px' }}>{n.icon} {n.title}</h3>
            {n.ranges.map(r => (
              <div key={r.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px',
                background: r.bg, marginBottom: '8px',
                borderLeft: `3px solid ${r.color}`
              }}>
                <span style={{ fontWeight: 600, color: r.color, fontSize: '13px' }}>{r.label}</span>
                <span style={{ fontSize: '13px', color: '#E8F0FF' }}>{r.range}</span>
              </div>
            ))}
            <p style={{ fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>{n.note}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginBottom: '24px' }}>Calculate Your BMI</h2>
      <BMICalculator />
    </div>
  )
}
