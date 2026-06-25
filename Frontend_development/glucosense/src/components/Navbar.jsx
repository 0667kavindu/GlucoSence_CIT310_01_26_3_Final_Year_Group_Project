// GlucoSense — Navbar.jsx
// Shows login/register links when logged out, user name + logout when logged in

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './Navbar.css'
import GoogleTranslate from './GoogleTranslate'

export default function Navbar() {
  const [user, setUser]         = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate                = useNavigate()
  const location                = useLocation()

  // Sync auth state and close mobile menu on route change
  useEffect(() => {
    const stored = localStorage.getItem('glucosense_user')
    setUser(stored ? JSON.parse(stored) : null)
    setMenuOpen(false)
  }, [location.pathname])

  function handleLogout() {
    localStorage.removeItem('glucosense_token')
    localStorage.removeItem('glucosense_user')
    setUser(null)
    navigate('/')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-gluco">Gluco</span>
          <span className="logo-sense">Sense</span>
        </Link>

        {/* Hamburger button (mobile only) */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(m => !m)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        {/* Nav links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/"           className={isActive('/')}>Home</Link>
          <Link to="/predict"    className={isActive('/predict')}>Check Risk</Link>
          <Link to="/prevention" className={isActive('/prevention')}>Prevention</Link>
          <Link to="/diet"       className={isActive('/diet')}>Diet</Link>
          <Link to="/exercise"   className={isActive('/exercise')}>Exercise</Link>
          <Link to="/numbers"    className={isActive('/numbers')}>Know Your Numbers</Link>
          <Link to="/faq"        className={isActive('/faq')}>FAQ</Link>

          {user ? (
            <>
              <Link to="/history" className={isActive('/history')}>My History</Link>
              <Link to="/profile" className={isActive('/profile')}>
                👤 {user.full_name?.split(' ')[0]}
              </Link>
              {user.is_admin && (
                <Link to="/admin" className={isActive('/admin')}>Admin</Link>
              )}
              <button className="btn btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className={`btn btn-outline ${isActive('/login')}`}>Log In</Link>
              <Link to="/register" className={`btn btn-primary ${isActive('/register')}`}>Sign Up</Link>
            </>
          )}

          {/* Google Translate — moved inside mobile menu so it shows in the dropdown too */}
          <div className="translator-wrapper translator-wrapper-mobile">
            <GoogleTranslate />
          </div>
        </div>

        {/* Google Translate — desktop only (hidden on mobile via CSS) */}
        <div className="translator-wrapper translator-wrapper-desktop">
          <GoogleTranslate />
        </div>

      </div>
    </nav>
  )
}