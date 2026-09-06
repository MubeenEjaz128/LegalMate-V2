import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import 'react-datepicker/dist/react-datepicker.css'

const setVhProperty = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

setVhProperty()
window.addEventListener('resize', setVhProperty)
window.addEventListener('orientationchange', () => {
  setTimeout(setVhProperty, 100)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4200,
          style: {
            background: 'rgba(255, 255, 255, 0.92)',
            color: '#2f3441',
            border: '1px solid rgba(255,255,255,0.75)',
            borderRadius: '14px',
            boxShadow: '0 16px 38px -20px rgba(21, 28, 43, 0.45)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'Manrope, DM Sans, sans-serif'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
