// Register.jsx 
// User registration with STRONG password validation and input validation

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Eye / EyeOff SVG icons (inline, no extra dependency)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// Reusable wrapper that adds the eye toggle to any password input
function PasswordInput({ name, value, onChange, placeholder, borderColor }) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 42px 12px 14px',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          boxSizing: 'border-box'
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#A8B8D0',
          padding: 0,
          display: 'flex',
          alignItems: 'center'
        }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    password_confirm: ''
  })
  
  const [errors, setErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState([])
  const [passwordStrength, setPasswordStrength] = useState('None')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')


  // PASSWORD VALIDATION RULES
  const validatePassword = (pwd) => {
    const errors_list = []
    
    if (pwd.length < 8) {
      errors_list.push('Must be at least 8 characters')
    }
    if (!/[A-Z]/.test(pwd)) {
      errors_list.push('Must contain uppercase letter (A-Z)')
    }
    if (!/[a-z]/.test(pwd)) {
      errors_list.push('Must contain lowercase letter (a-z)')
    }
    if (!/[0-9]/.test(pwd)) {
      errors_list.push('Must contain number (0-9)')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(pwd)) {
      errors_list.push('Must contain special character (!@#$%^&*)')
    }
    
    let strength = 'Weak'
    if (errors_list.length === 0) {
      strength = pwd.length >= 12 ? 'Very Strong' : 'Strong'
    }
    
    return { isValid: errors_list.length === 0, errors: errors_list, strength }
  }


  // INPUT VALIDATION
  const validateForm = () => {
    const new_errors = {}
    const pwd = formData.password.trim()
    const pwdConfirm = formData.password_confirm.trim()
    
    if (!formData.full_name.trim()) {
      new_errors.full_name = 'Full name is required'
    } else if (formData.full_name.length < 2) {
      new_errors.full_name = 'Full name must be at least 2 characters'
    } else if (formData.full_name.length > 100) {
      new_errors.full_name = 'Full name must not exceed 100 characters'
    }
    
    if (!formData.email.trim()) {
      new_errors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      new_errors.email = 'Invalid email format'
    }
    
    if (!pwd) {
      new_errors.password = 'Password is required'
    } else {
      const pwd_validation = validatePassword(pwd)
      if (!pwd_validation.isValid) {
        setPasswordErrors(pwd_validation.errors)
        new_errors.password = 'Password does not meet requirements'
      }
    }
    
    if (!pwdConfirm) {
      new_errors.password_confirm = 'Please confirm password'
    } else if (pwd !== pwdConfirm) {
      new_errors.password_confirm = 'Passwords do not match'
    }
    
    setErrors(new_errors)
    return Object.keys(new_errors).length === 0
  }

  const isValidEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return pattern.test(email)
  }


  // HANDLE INPUT CHANGE
  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    
    if (name === 'password') {
      const pwd_validation = validatePassword(value)
      setPasswordErrors(pwd_validation.errors)
      setPasswordStrength(pwd_validation.strength)

      if (formData.password_confirm) {
        setErrors(prev => ({
          ...prev,
          password_confirm:
            value.trim() !== formData.password_confirm.trim()
              ? 'Passwords do not match'
              : ''
        }))
      }
    }

    if (name === 'password_confirm') {
      setErrors(prev => ({
        ...prev,
        password_confirm:
          formData.password.trim() !== value.trim()
            ? 'Passwords do not match'
            : ''
      }))
    }
  }


  // HANDLE REGISTER
  const handleRegister = async (e) => {
    e.preventDefault()
    setErrors(prev => ({ ...prev, submit: '' }))
    
    if (!validateForm()) {
      console.log("Form validation failed")
      return
    }
    
    setLoading(true)
    
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password.trim(),
        password_confirm: formData.password_confirm.trim()
      }
      
      const response = await axios.post(`${API}/api/register`, payload)
      console.log("📥 Response:", response.data)
      
      setSuccessMessage('✅ Registration successful! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error("❌ ERROR:", err)
      
      if (err.response?.data?.password_errors) {
        setPasswordErrors(err.response.data.password_errors)
        setErrors(prev => ({ ...prev, password: err.response.data.error }))
      } else if (err.response?.data?.error) {
        setErrors({ submit: err.response.data.error })
      } else {
        setErrors({ submit: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }


  // PASSWORD STRENGTH COLOR
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'Weak':      return '#FF5A5A'
      case 'Strong':    return '#FFD60A'
      case 'Very Strong': return '#5DF8D8'
      default:          return '#A8B8D0'
    }
  }

  const passwordBorderColor = errors.password ? '#FF5A5A' : '#2A4870'
  const confirmBorderColor  = errors.password_confirm ? '#FF5A5A'
    : formData.password_confirm && formData.password.trim() === formData.password_confirm.trim()
      ? '#2EE080'
      : '#2A4870'


  // RENDER
  return (
    <div className="page">
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
            GlucoSense
          </h1>
          <p style={{ color: '#A8B8D0', fontSize: '14px' }}>
            Create your account
          </p>
        </div>

        {successMessage && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(93,248,216,0.1)',
            border: '1px solid #5DF8D8',
            borderRadius: '8px',
            color: '#5DF8D8',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255,90,90,0.1)',
            border: '1px solid #FF5A5A',
            borderRadius: '8px',
            color: '#FF5A5A',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ❌ {errors.submit}
          </div>
        )}

        <form onSubmit={handleRegister} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid #2A4870',
          borderRadius: '12px',
          padding: '24px'
        }}>
          {/* Full Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: '#A8B8D0',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${errors.full_name ? '#FF5A5A' : '#2A4870'}`,
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            {errors.full_name && (
              <div style={{ color: '#FF5A5A', fontSize: '12px', marginTop: '4px' }}>
                ❌ {errors.full_name}
              </div>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: '#A8B8D0',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${errors.email ? '#FF5A5A' : '#2A4870'}`,
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            {errors.email && (
              <div style={{ color: '#FF5A5A', fontSize: '12px', marginTop: '4px' }}>
                ❌ {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#A8B8D0',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              <span>Password *</span>
              <span style={{ color: getPasswordStrengthColor() }}>{passwordStrength}</span>
            </label>

            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter strong password"
              borderColor={passwordBorderColor}
            />
            
            {/* Password Requirements */}
            {formData.password && (
              <div style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#A8B8D0' }}>
                  Password Requirements:
                </div>
                {[
                  { label: `At least 8 characters (${formData.password.length}/8)`, met: formData.password.length >= 8 },
                  { label: 'Uppercase letter (A-Z)',        met: /[A-Z]/.test(formData.password) },
                  { label: 'Lowercase letter (a-z)',        met: /[a-z]/.test(formData.password) },
                  { label: 'Number (0-9)',                  met: /[0-9]/.test(formData.password) },
                  { label: 'Special character (!@#$%^&*)',  met: /[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(formData.password) },
                ].map(({ label, met }, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: i < 4 ? '6px' : 0,
                    color: met ? '#2EE080' : '#FF5A5A'
                  }}>
                    <span>{met ? '✓' : '✗'}</span> {label}
                  </div>
                ))}
              </div>
            )}
            
            {errors.password && (
              <div style={{ color: '#FF5A5A', fontSize: '12px', marginTop: '8px' }}>
                ❌ {errors.password}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: '#A8B8D0',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              Confirm Password *
            </label>

            <PasswordInput
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleInputChange}
              placeholder="Re-enter password"
              borderColor={confirmBorderColor}
            />
            
            {formData.password_confirm && formData.password.trim() === formData.password_confirm.trim() && (
              <div style={{ color: '#5DF8D8', fontSize: '12px', marginTop: '4px' }}>
                ✓ Passwords match
              </div>
            )}
            {errors.password_confirm && (
              <div style={{ color: '#FF5A5A', fontSize: '12px', marginTop: '4px' }}>
                ❌ {errors.password_confirm}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#4E9BFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = '#3A7FD6' }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = '#4E9BFF' }}
          >
            {loading ? '⏳ Creating Account...' : '✓ Create Account'}
          </button>

          {/* Login Link */}
          <div style={{
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '13px',
            color: '#A8B8D0'
          }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#4E9BFF', textDecoration: 'none', fontWeight: 600 }}>
              Login here
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}