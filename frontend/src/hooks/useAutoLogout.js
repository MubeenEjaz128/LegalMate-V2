import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes of inactivity → auto logout
const HEARTBEAT_INTERVAL = 60 * 1000 // Send heartbeat every 60 seconds

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel'
]

export default function useAutoLogout() {
  const { isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const idleTimerRef = useRef(null)
  const heartbeatRef = useRef(null)
  const isLoggingOut = useRef(false)
  const isActiveRef = useRef(true) // tracks if user is active (not idle)

  // Full logout: call backend to clear session, then clear frontend
  const doLogout = useCallback(async (reason) => {
    if (isLoggingOut.current) return
    isLoggingOut.current = true

    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore — we're logging out anyway
    }

    logout()
    sessionStorage.setItem('auto-logout', reason)
    navigate('/login', { replace: true })

    isLoggingOut.current = false
  }, [logout, navigate])

  // Reset the idle timer
  const resetIdleTimer = useCallback(() => {
    isActiveRef.current = true
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      isActiveRef.current = false
      doLogout('idle')
    }, IDLE_TIMEOUT)
  }, [doLogout])

  useEffect(() => {
    if (!isAuthenticated) return

    // Start idle timer
    resetIdleTimer()

    // Heartbeat: tell backend we're still alive (only if user is active)
    heartbeatRef.current = setInterval(() => {
      if (isActiveRef.current) {
        api.post('/auth/heartbeat').catch(() => {})
      }
    }, HEARTBEAT_INTERVAL)

    // Reset idle timer on any user activity
    const handleActivity = () => resetIdleTimer()
    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true })
    )

    // On tab/browser close → best-effort logout via fetch keepalive
    const handleBeforeUnload = () => {
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) return

      let token
      try {
        token = JSON.parse(authStorage).state?.token
      } catch {
        return
      }
      if (!token) return

      const baseURL = api.defaults.baseURL || '/api'
      const url = `${baseURL}/auth/logout`

      // fetch with keepalive is best-effort on browser close
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: '{}',
        keepalive: true,
        credentials: 'include'
      }).catch(() => {})

      localStorage.removeItem('auth-storage')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, handleActivity)
      )
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isAuthenticated, resetIdleTimer])
}
