// GlucoSense — App.jsx
// Every page component is mapped to a URL path here

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar       from './components/Navbar'
import Home         from './pages/Home'
import Predict      from './pages/Predict'
import Results      from './pages/Results'
import Login        from './pages/Login'
import Register     from './pages/Register'
import History      from './pages/History'
import Profile      from './pages/Profile'
import Prevention   from './pages/Prevention'
import Diet         from './pages/Diet'
import Exercise     from './pages/Exercise'
import FAQ          from './pages/FAQ'
import KnowYourNumbers from './pages/KnowYourNumbers'
import Admin        from './pages/Admin'
import NormalPrediction from './pages/NormalPrediction'
import MedicalPrediction from './pages/MedicalPrediction'
import './styles/global.css'

// PrivateRoute: redirects to /login if user not authenticated 
function PrivateRoute({ children }) {
  const token = localStorage.getItem('glucosense_token')
  return token ? children : <Navigate to="/login" replace />
}

// AdminRoute: redirects if not admin
function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('glucosense_user') || '{}')
  return user?.is_admin ? children : <Navigate to="/" replace />
}

export default function App() {  
  return (
    <BrowserRouter>
      {/* Navbar appears on every page */}
      <Navbar />

      <Routes>
        {/* Public routes — anyone can access */}
        <Route path="/"           element={<Home />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/prevention" element={<Prevention />} />
        <Route path="/diet"       element={<Diet />} />
        <Route path="/exercise"   element={<Exercise />} />
        <Route path="/faq"        element={<FAQ />} />
        <Route path="/numbers"    element={<KnowYourNumbers />} />

        {/* Protected routes — require login */}
        <Route path="/predict" element={
          <PrivateRoute><Predict /></PrivateRoute>
        } />
        <Route path="/results" element={
          <PrivateRoute><Results /></PrivateRoute>
        } />
        <Route path="/history" element={
          <PrivateRoute><History /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><Profile /></PrivateRoute>
        } />

        <Route path="/predict/medical" element={<MedicalPrediction />} />
        <Route path="/predict/normal" element={<NormalPrediction />} />

        {/* Admin only */}
        <Route path="/admin" element={
          <AdminRoute><Admin /></AdminRoute>
        } />

        {/* Catch-all: redirect unknown URLs to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
