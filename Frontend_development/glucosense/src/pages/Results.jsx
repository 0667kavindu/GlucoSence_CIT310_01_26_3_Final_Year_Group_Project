// GlucoSense — Results.jsx
// Shows risk score gauge, SHAP explanation bars, recommendations, PDF button

import { useEffect, useState } from 'react'
import { useNavigate }          from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import jsPDF from 'jspdf'

export default function Results() {
  const [result, setResult] = useState(null)
  const navigate            = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('glucosense_result')
    if (!stored) { navigate('/predict'); return }
    setResult(JSON.parse(stored))
  }, [])

  if (!result) return <div className="page"><div className="spinner" /></div>

  const { risk_score, stage, recommendations, shap_factors, inputs } = result

  //  Gauge colour based on risk
  function gaugeColor(score) {
    if (score < 20) return '#5DF8D8'
    if (score < 40) return '#FFD60A'
    if (score < 70) return '#FF8C42'
    return '#FF5A5A'
  }

  //  SVG Gauge─
  function RiskGauge({ score }) {
    const pct   = Math.min(score / 100, 1)
    const angle = pct * 180 - 90  // -90° = left, +90° = right
    const color = gaugeColor(score)
    const rad   = (angle * Math.PI) / 180
    const nx    = 100 + 70 * Math.cos(rad)
    const ny    = 100 + 70 * Math.sin(rad)

    return (
      <svg viewBox="0 0 200 110" width="220">
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#2A4870" strokeWidth="18" strokeLinecap="round"/>
        {/* Coloured arc */}
        <path
          d={`M 20 100 A 80 80 0 ${pct > 0.5 ? 1 : 0} 1 ${100 + 80*Math.cos((pct*180-90)*Math.PI/180)} ${100 + 80*Math.sin((pct*180-90)*Math.PI/180)}`}
          fill="none" stroke={color} strokeWidth="18" strokeLinecap="round"
          style={{transition:'all 1s ease'}}
        />
        {/* Needle */}
        <line x1="100" y1="100" x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <circle cx="100" cy="100" r="5" fill={color}/>
        {/* Score text */}
        <text x="100" y="88" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{score}%</text>
        {/* Labels */}
        <text x="18"  y="115" fill="#607090" fontSize="9">Low</text>
        <text x="155" y="115" fill="#607090" fontSize="9">High</text>
      </svg>
    )
  }

  //  PDF download
  function downloadPDF() {
    const doc   = new jsPDF()
    const color = gaugeColor(risk_score)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(14, 27, 42)
    doc.text('GlucoSense Risk Report', 20, 20)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(89, 89, 89)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30)

    doc.setDrawColor(46, 117, 182)
    doc.line(20, 35, 190, 35)

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0,0,0)
    doc.text(`Risk Score: ${risk_score}%`, 20, 48)
    doc.text(`Stage: ${stage}`, 20, 58)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Contributing Factors:', 20, 72)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    shap_factors?.forEach((f, i) => {
      doc.text(
        `${i+1}. ${f.feature} — ${f.direction} (value: ${f.user_value})`,
        22, 82 + i*8
      )
    })

    const recStart = 82 + (shap_factors?.length || 0) * 8 + 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Recommendations:', 20, recStart)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    recommendations?.forEach((r, i) => {
      const lines = doc.splitTextToSize(`• ${r}`, 170)
      doc.text(lines, 22, recStart + 10 + i * 10)
    })

    doc.setFontSize(9)
    doc.setTextColor(130,130,130)
    doc.text('This report is for informational purposes only. Consult a doctor for medical advice.', 20, 285)

    doc.save(`GlucoSense_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const color = gaugeColor(risk_score)

  return (
    <div className="page">
      <h1>Your Risk Assessment Results</h1>
      <p style={{marginBottom:'32px'}}>Based on your health data and our AI model</p>

      {/*  Main result card ─ */}
      <div className="card" style={{
        textAlign:'center', marginBottom:'24px',
        borderColor: color, borderWidth:'2px'
      }}>
        <RiskGauge score={risk_score} />
        <h2 style={{color, marginTop:'12px'}}>{stage}</h2>
        <p style={{fontSize:'14px', marginTop:'8px'}}>
          Your predicted diabetes risk score is <strong style={{color}}>{risk_score}%</strong>
        </p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',marginTop:'20px'}}>
          <button className="btn btn-outline" onClick={downloadPDF}>
            📄 Download PDF Report
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/predict')}>
            🔄 New Assessment
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/history')}>
            📊 View History
          </button>
        </div>
      </div>

      {/*  SHAP Explanation  */}
      {shap_factors?.length > 0 && (
        <div className="card" style={{marginBottom:'24px'}}>
          <h3 style={{marginBottom:'16px'}}>
            🧠 Why did you get this score?
          </h3>
          <p style={{marginBottom:'20px', fontSize:'13px'}}>
            These are the top 5 factors that influenced your risk score.
            Red bars increase risk, green bars reduce it.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={shap_factors.map(f => ({
                name  : f.feature.length > 18 ? f.feature.slice(0,18)+'…' : f.feature,
                value : Math.abs(f.shap_value),
                raw   : f.shap_value,
                dir   : f.direction,
                yourVal: f.user_value,
              }))}
              layout="vertical"
              margin={{left: 20}}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={150} tick={{fill:'#A8B8D0',fontSize:12}} />
              <Tooltip
                formatter={(v, n, p) => [
                  `Impact: ${p.payload.raw > 0 ? '+' : ''}${p.payload.raw.toFixed(3)}`,
                  `Your value: ${p.payload.yourVal}`
                ]}
                contentStyle={{background:'#1A3050',border:'1px solid #2A4870'}}
              />
              <Bar dataKey="value" radius={4}>
                {shap_factors.map((f, i) => (
                  <Cell key={i} fill={f.shap_value > 0 ? '#FF5A5A' : '#2EE080'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{fontSize:'11px',color:'#607090',marginTop:'8px'}}>
            🔴 Red = increases your risk &nbsp;&nbsp; 🟢 Green = reduces your risk
          </p>
        </div>
      )}

      {/*  Recommendations  */}
      {recommendations?.length > 0 && (
        <div className="card">
          <h3 style={{marginBottom:'16px'}}>💡 Personalised Recommendations</h3>
          <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'10px'}}>
            {recommendations.map((r, i) => (
              <li key={i} style={{
                padding:'10px 14px',
                background:'rgba(78,155,255,0.06)',
                borderRadius:'8px',
                borderLeft:'3px solid var(--blue)',
                fontSize:'13px'
              }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
