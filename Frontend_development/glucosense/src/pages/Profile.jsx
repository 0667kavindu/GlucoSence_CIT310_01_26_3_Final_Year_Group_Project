// GlucoSense — Profile.jsx  
// User profile page showing account details and logout option

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'


export default function Profile() {   
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Fetch user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('glucosense_token')
    if (!token) { navigate('/login'); return }
    axios.get(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data.user))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }, [])

  // Logout function — clears localStorage and redirects to home
  function logout() {
    localStorage.removeItem('glucosense_token')
    localStorage.removeItem('glucosense_user')
    navigate('/')
  }

  if (loading) return <div className="page"><div className="spinner"/></div>

  // Main profile content
  return (
    <div className="page" style={{ maxWidth: '600px' }}>
      <h1>My Profile</h1>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4E9BFF, #5DF8D8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#0D1B2A'
          }}>
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ marginBottom: '4px' }}>{user?.full_name}</h2>
            <p style={{ fontSize: '13px' }}>{user?.email}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Total Assessments', value: user?.total_assessments ?? 0 },
            { label: 'Member Since', value: new Date(user?.created_at).toLocaleDateString() },
            { label: 'Account Type', value: user?.is_admin ? 'Admin' : 'User' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(78,155,255,0.07)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#607090', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-danger" onClick={logout} style={{ width: '100%' }}>
        Log Out
      </button>
    </div>
  )
}
