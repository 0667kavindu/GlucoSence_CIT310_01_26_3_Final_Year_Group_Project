// GlucoSense — Admin.jsx 
// Admin dashboard — aggregate stats, pie chart, bar chart
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const COLORS = ['#5DF8D8','#FFD60A','#FF8C42','#FF5A5A']

//  Admin dashboard component
export default function Admin() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('glucosense_token')
    if (!token) { navigate('/login'); return }
    axios.get(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStats(res.data))
      .catch(err => {
        if (err.response?.status === 403) navigate('/')
        else navigate('/login')
      })
      .finally(() => setLoading(false))
  }, [])

  //  Show loading spinner while fetching data, or error if access denied
  if (loading) return <div className="page"><div className="spinner"/></div>
  if (!stats)  return <div className="page"><div className="alert alert-error">Access denied.</div></div>

  const riskData  = Object.entries(stats.risk_distribution).map(([k,v]) => ({ name:k, value:v }))
  const stageData = Object.entries(stats.stage_distribution).map(([k,v]) => ({ name:k, count:v }))

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>
      <p style={{ marginBottom: '28px' }}>Aggregate statistics across all GlucoSense users.</p>

      {/* KPI row */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Total Users',       value: stats.total_users,        color: '#4E9BFF' },
          { label: 'Total Assessments', value: stats.total_assessments,  color: '#2EE080' },
          { label: 'Average Risk Score',value: `${stats.average_risk_score}%`, color: '#FF8C42' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '13px', color: '#A8B8D0', marginTop: '6px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Pie chart — risk distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Risk Level Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {riskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A3050', border: '1px solid #2A4870' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — stage distribution */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#A8B8D0', fontSize: 10 }} />
              <YAxis tick={{ fill: '#A8B8D0', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1A3050', border: '1px solid #2A4870' }} />
              <Bar dataKey="count" fill="#4E9BFF" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
