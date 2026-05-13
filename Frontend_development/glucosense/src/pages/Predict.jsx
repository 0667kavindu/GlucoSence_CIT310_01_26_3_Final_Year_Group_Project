// GlucoSense — Predict.jsx 
// This page lets user choose between two prediction types
// Then routes to either PredictWithBlood.jsx or PredictSimplified.jsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Two modes: WITH_BLOOD (full medical + lifestyle data) vs WITHOUT_BLOOD (lifestyle only)
export default function Predict() {
  const navigate = useNavigate()
  const [token, setToken] = useState(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('glucosense_token')
    if (!storedToken) {
      navigate('/login')
    } else {
      setToken(storedToken)
      setTimeout(() => setAnimated(true), 100)
    }
  }, [navigate])

  const handleModeSelect = (mode) => {
    if (mode === 'WITH_BLOOD') {
      navigate('/predict/medical')
    } else {
      navigate('/predict/normal')
    }
  }

  if (!token) {
    return <div className="page"><div className="spinner"></div></div>
  }

  return (
    <div className="page">
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        animation: animated ? 'fadeInDown 0.5s ease' : 'none'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '12px' }}>
          🩺 Choose Your Assessment
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#A8B8D0',
          marginBottom: '40px',
          fontSize: '14px'
        }}>
          Select the type of diabetes risk assessment that works best for you
        </p>

        {/* Two Option Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* OPTION 1: WITH BLOOD RESULTS */}
          <div
            onClick={() => handleModeSelect('WITH_BLOOD')}
            style={{
              padding: '32px 24px',
              border: '2px solid #2A4870',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(78,155,255,0.05) 0%, rgba(46,224,128,0.05) 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4E9BFF'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(78,155,255,0.15) 0%, rgba(46,224,128,0.15) 100%)'
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(78,155,255,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A4870'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(78,155,255,0.05) 0%, rgba(46,224,128,0.05) 100%)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '48px', textAlign: 'center' }}>🩸</div>
            
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#E8F0FF' }}>
                Full Assessment
              </h2>
              <p style={{ fontSize: '13px', color: '#A8B8D0', margin: 0, marginBottom: '12px' }}>
                Most Accurate
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#5DF8D8' }}>✓</span>
                <span>23 health metrics</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#5DF8D8' }}>✓</span>
                <span>Medical + lifestyle data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#5DF8D8' }}>✓</span>
                <span>95% accuracy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#5DF8D8' }}>✓</span>
                <span>Blood test results needed</span>
              </div>
            </div>

            <button
              style={{
                marginTop: '16px',
                padding: '12px 20px',
                background: '#4E9BFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3A7FD6'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#4E9BFF'
                e.target.style.transform = 'scale(1)'
              }}
            >
              Get Started →
            </button>
          </div>

          {/* OPTION 2: WITHOUT BLOOD RESULTS */}
          <div
            onClick={() => handleModeSelect('WITHOUT_BLOOD')}
            style={{
              padding: '32px 24px',
              border: '2px solid #2A4870',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(255,214,10,0.05) 0%, rgba(255,140,66,0.05) 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FFD60A'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,214,10,0.15) 0%, rgba(255,140,66,0.15) 100%)'
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(255,214,10,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A4870'
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,214,10,0.05) 0%, rgba(255,140,66,0.05) 100%)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '48px', textAlign: 'center' }}>⚡</div>
            
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#E8F0FF' }}>
                Quick Assessment
              </h2>
              <p style={{ fontSize: '13px', color: '#A8B8D0', margin: 0, marginBottom: '12px' }}>
                Fast Screening
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#FFD60A' }}>✓</span>
                <span>11 lifestyle factors</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#FFD60A' }}>✓</span>
                <span>No blood tests needed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#FFD60A' }}>✓</span>
                <span>70% accuracy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#FFD60A' }}>✓</span>
                <span>2-3 minutes to complete</span>
              </div>
            </div>

            <button
              style={{
                marginTop: '16px',
                padding: '12px 20px',
                background: '#FFD60A',
                color: '#1A2E4A',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#FFC700'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#FFD60A'
                e.target.style.transform = 'scale(1)'
              }}
            >
              Get Started →
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: 'rgba(78,155,255,0.08)',
          borderRadius: '12px',
          borderLeft: '4px solid #4E9BFF'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#4E9BFF' }}>
            💡 How to Choose?
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#A8B8D0', lineHeight: '1.8' }}>
            <li>Choose <strong>Full Assessment</strong> if you have recent blood test results</li>
            <li>Choose <strong>Quick Assessment</strong> for initial screening without medical tests</li>
            <li>You can always upgrade to Full Assessment later by providing blood test results</li>
            <li>Both assessments provide personalized recommendations</li>
          </ul>
        </div>

        {/* Comparison Table */}
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
            📊 Quick Comparison
          </h3>
          <div style={{
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid #2A4870'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: 'rgba(78,155,255,0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#4E9BFF' }}>Feature</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#4E9BFF' }}>Full (🩸)</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD60A' }}>Quick (⚡)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Data Fields', '23', '11'],
                  ['Blood Tests', 'Required', 'Not needed'],
                  ['Accuracy', '95%', '70%'],
                  ['Time', '5-10 min', '2-3 min'],
                  ['Medical Data', 'Yes', 'Lifestyle only'],
                  ['Recommendations', 'Comprehensive', 'General']
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2A4870' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{row[0]}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row[1]}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
