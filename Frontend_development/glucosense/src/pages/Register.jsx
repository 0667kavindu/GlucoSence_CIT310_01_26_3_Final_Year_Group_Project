// Register.jsx 
// User registration with STRONG password validation and input validation

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
    
    // Check length
    if (pwd.length < 8) {
      errors_list.push('Must be at least 8 characters')
    }
    
    // Check uppercase
    if (!/[A-Z]/.test(pwd)) {
      errors_list.push('Must contain uppercase letter (A-Z)')
    }
    
    // Check lowercase
    if (!/[a-z]/.test(pwd)) {
      errors_list.push('Must contain lowercase letter (a-z)')
    }
    
    // Check number
    if (!/[0-9]/.test(pwd)) {
      errors_list.push('Must contain number (0-9)')
    }
    
    // Check special character
    if (!/[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(pwd)) {
      errors_list.push('Must contain special character (!@#$%^&*)')
    }
    
    // Determine strength
    let strength = 'Weak'
    if (errors_list.length === 0) {
      strength = pwd.length >= 12 ? 'Very Strong' : 'Strong'
    }
    
    return { isValid: errors_list.length === 0, errors: errors_list, strength }
  }


  // INPUT VALIDATION


  const validateForm = () => {
    const new_errors = {}
    
    // Validate full name
    if (!formData.full_name.trim()) {
      new_errors.full_name = 'Full name is required'
    } else if (formData.full_name.length < 2) {
      new_errors.full_name = 'Full name must be at least 2 characters'
    } else if (formData.full_name.length > 100) {
      new_errors.full_name = 'Full name must not exceed 100 characters'
    }
    
    // Validate email
    if (!formData.email.trim()) {
      new_errors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      new_errors.email = 'Invalid email format'
    }
    
    // Validate password
    if (!formData.password) {
      new_errors.password = 'Password is required'
    } else {
      const pwd_validation = validatePassword(formData.password)
      if (!pwd_validation.isValid) {
        setPasswordErrors(pwd_validation.errors)
        new_errors.password = 'Password does not meet requirements'
      }
    }
    
    // Validate password confirm
    if (!formData.password_confirm) {
      new_errors.password_confirm = 'Please confirm password'
    } else if (formData.password !== formData.password_confirm) {
      new_errors.password_confirm = 'Passwords do not match'
    }
    
    setErrors(new_errors)
    return Object.keys(new_errors).length === 0
  }

  // Email validation
  const isValidEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return pattern.test(email)
  }


  // HANDLE INPUT CHANGE
  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }))
    
    // Real-time password validation
    if (name === 'password') {
      const pwd_validation = validatePassword(value)
      setPasswordErrors(pwd_validation.errors)
      setPasswordStrength(pwd_validation.strength)
    }
  }


  // HANDLE REGISTER
  const handleRegister = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      console.log("Form validation failed")
      return
    }
    
    setLoading(true)
    console.log("\n🔘 Submitting registration...")
    
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        password_confirm: formData.password_confirm
      }
      
      console.log("📤 Payload:", { ...payload, password: '***' })
      
      const response = await axios.post(`${API}/api/register`, payload)
      
      console.log("📥 Response:", response.data)
      
      setSuccessMessage('✅ Registration successful! Redirecting to login...')
      
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error("❌ ERROR:", err)
      console.error("Response:", err.response?.data)
      
      if (err.response?.data?.password_errors) {
        setPasswordErrors(err.response.data.password_errors)
        setErrors(prev => ({
          ...prev,
          password: err.response.data.error
        }))
      } else if (err.response?.data?.error) {
        setErrors({
          submit: err.response.data.error
        })
      } else {
        setErrors({
          submit: 'Registration failed. Please try again.'
        })
      }
    } finally {
      setLoading(false)
    }
  }


  // PASSWORD STRENGTH COLOR
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'Weak':
        return '#FF5A5A'
      case 'Strong':
        return '#FFD60A'
      case 'Very Strong':
        return '#5DF8D8'
      default:
        return '#A8B8D0'
    }
  }


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
              display: 'block',
              fontSize: '13px',
              color: '#A8B8D0',
              marginBottom: '8px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Password *</span>
              <span style={{ color: getPasswordStrengthColor() }}>
                {passwordStrength}
              </span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter strong password"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${errors.password ? '#FF5A5A' : '#2A4870'}`,
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
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
                
                {/* Length */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  color: formData.password.length >= 8 ? '#2EE080' : '#FF5A5A'
                }}>
                  <span>{formData.password.length >= 8 ? '✓' : '✗'}</span>
                  At least 8 characters ({formData.password.length}/8)
                </div>
                
                {/* Uppercase */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  color: /[A-Z]/.test(formData.password) ? '#2EE080' : '#FF5A5A'
                }}>
                  <span>{/[A-Z]/.test(formData.password) ? '✓' : '✗'}</span>
                  Uppercase letter (A-Z)
                </div>
                
                {/* Lowercase */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  color: /[a-z]/.test(formData.password) ? '#2EE080' : '#FF5A5A'
                }}>
                  <span>{/[a-z]/.test(formData.password) ? '✓' : '✗'}</span>
                  Lowercase letter (a-z)
                </div>
                
                {/* Number */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  color: /[0-9]/.test(formData.password) ? '#2EE080' : '#FF5A5A'
                }}>
                  <span>{/[0-9]/.test(formData.password) ? '✓' : '✗'}</span>
                  Number (0-9)
                </div>
                
                {/* Special Character */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: /[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(formData.password) ? '#2EE080' : '#FF5A5A'
                }}>
                  <span>{/[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(formData.password) ? '✓' : '✗'}</span>
                  Special character (!@#$%^&*)
                </div>
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
            <input
              type="password"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleInputChange}
              placeholder="Re-enter password"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${
                  errors.password_confirm ? '#FF5A5A' :
                  formData.password_confirm && formData.password === formData.password_confirm ? '#2EE080' :
                  '#2A4870'
                }`,
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            
            {formData.password_confirm && formData.password === formData.password_confirm && (
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
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#3A7FD6'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#4E9BFF'
            }}
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
            <a
              href="/login"
              style={{ color: '#4E9BFF', textDecoration: 'none', fontWeight: 600 }}
            >
              Login here
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}