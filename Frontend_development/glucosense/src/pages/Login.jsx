// GlucoSense — Login.jsx
// Login page — calls /api/login, stores JWT token

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API}/api/login`, form)
      // Save token and user to localStorage
      localStorage.setItem('glucosense_token', res.data.token)
      localStorage.setItem('glucosense_user',  JSON.stringify(res.data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{maxWidth:'480px'}}>
      <h1>Welcome Back</h1>
      <p style={{marginBottom:'28px'}}>Log in to access your risk history and saved assessments</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email" value={form.email}
              onChange={e => setForm(f=>({...f,email:e.target.value}))}
              className="input" placeholder="your@email.com" required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password" value={form.password}
              onChange={e => setForm(f=>({...f,password:e.target.value}))}
              className="input" placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{width:'100%', marginTop:'8px'}}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </div>
      </form>

      <p style={{textAlign:'center', marginTop:'16px', fontSize:'13px'}}>
        No account? <Link to="/register">Create one free</Link>
      </p>
    </div>
  )
}
