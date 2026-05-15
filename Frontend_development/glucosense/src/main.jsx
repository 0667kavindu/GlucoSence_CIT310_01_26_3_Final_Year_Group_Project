// GlucoSense — main.jsx
// React entry point — mounts the App component to the HTML root element
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render( 
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
