// GlucoSense — History.jsx 
// Shows all past risk assessments as a Recharts line chart + table

import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const navigate              = useNavigate()

  // Fetch user's risk history on mount
  useEffect(() => {
    const token = localStorage.getItem('glucosense_token')
    if (!token) { navigate('/login'); return }

    axios.get(`${API}/api/history`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(res => setHistory(res.data.predictions || []))
      .catch(err => {
        if (err.response?.status === 401) navigate('/login')
        else setError('Could not load history.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="spinner"/></div>

  // Prepare chart data 
  const chartData = [...history].reverse().map((p, i) => ({
    date       : new Date(p.created_at).toLocaleDateString(),
    risk_score : p.risk_score,
    stage      : p.stage,
    name       : `Assessment ${i+1}`
  }))

  function riskColor(score) {
    if (score < 20) return '#2EE080'
    if (score < 40) return '#FFD60A'
    if (score < 70) return '#FF8C42'
    return '#FF5A5A'
  }

  //  If no history, show empty state
  return (
    <div className="page">
      <h1>My Risk History</h1>
      <p style={{marginBottom:'28px'}}>
        Track how your diabetes risk score changes over time
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {history.length === 0 ? (
        <div className="card" style={{textAlign:'center', padding:'48px'}}>
          <p>No assessments yet.</p>
          <button className="btn btn-primary" style={{marginTop:'16px'}}
            onClick={() => navigate('/predict')}>
            Take Your First Assessment
          </button>
        </div>
      ) : (
        <>
          {/*  Line Chart  */}
          <div className="card" style={{marginBottom:'24px'}}>
            <h3 style={{marginBottom:'16px'}}>Risk Score Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4870" />
                <XAxis dataKey="date" tick={{fill:'#A8B8D0',fontSize:11}} />
                <YAxis domain={[0,100]} tick={{fill:'#A8B8D0',fontSize:11}} />
                <Tooltip
                  contentStyle={{background:'#1A3050',border:'1px solid #2A4870'}}
                  formatter={(v) => [`${v}%`, 'Risk Score']}
                />
                <ReferenceLine y={40} stroke="#FFD60A" strokeDasharray="4 4" label={{value:'Moderate',fill:'#FFD60A',fontSize:10}} />
                <ReferenceLine y={70} stroke="#FF5A5A" strokeDasharray="4 4" label={{value:'High',fill:'#FF5A5A',fontSize:10}} />
                <Line
                  type="monotone" dataKey="risk_score"
                  stroke="#4E9BFF" strokeWidth={2.5}
                  dot={{ fill:'#4E9BFF', r:5 }}
                  activeDot={{ r:7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/*  Assessment Table  */}
          <div className="card">
            <h3 style={{marginBottom:'16px'}}>All Assessments</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #2A4870'}}>
                    {['Date','Risk Score','Stage','BMI','HbA1c','Glucose'].map(h => (
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'#A8B8D0',fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, i) => (
                    <tr key={p.id} style={{borderBottom:'1px solid #2A4870', background: i%2===0?'rgba(78,155,255,0.03)':'transparent'}}>
                      <td style={{padding:'8px 12px'}}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{padding:'8px 12px',fontWeight:700,color:riskColor(p.risk_score)}}>
                        {p.risk_score}%
                      </td>
                      <td style={{padding:'8px 12px'}}>{p.stage}</td>
                      <td style={{padding:'8px 12px'}}>{p.inputs?.bmi ?? 'N/A'}</td>
                      <td style={{padding:'8px 12px'}}>{p.inputs?.hba1c ?? 'N/A'}</td>
                      <td style={{padding:'8px 12px'}}>{p.inputs?.glucose_fasting ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
