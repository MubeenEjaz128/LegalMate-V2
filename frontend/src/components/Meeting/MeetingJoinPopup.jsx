import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Video, Phone, X, Loader2, User } from 'lucide-react'
import io from 'socket.io-client'
import { useAuthStore } from '../../stores/authStore'
import { appointmentAPI } from '../../services/api'

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
  if (envUrl) return envUrl
  return window.location?.origin || ''
}

/**
 * MeetingJoinPopup — shows a floating popup when the other party is waiting
 * in a video call meeting room. Works on both client and lawyer dashboards.
 * 
 * Props:
 *   onJoinCall(appointmentId) — called when user clicks "Join Meeting"
 */
export default function MeetingJoinPopup({ onJoinCall }) {
  const { user } = useAuthStore()
  const [waitingData, setWaitingData] = useState(null) // { consultationId, name, role, userId }
  const [dismissed, setDismissed] = useState(new Set())
  const [confirmedAppointments, setConfirmedAppointments] = useState([])
  const socketRef = useRef(null)
  const pulseTimerRef = useRef(null)

  // Fetch confirmed video appointments to validate meeting popups
  useEffect(() => {
    const fetchConfirmedAppointments = async () => {
      try {
        const res = await appointmentAPI.list()
        const apts = (res.data || []).filter(
          a => a.status === 'confirmed' && a.consultationType === 'video'
        )
        setConfirmedAppointments(apts)
      } catch (err) {
        console.error('Failed to fetch appointments for meeting popup:', err)
      }
    }
    fetchConfirmedAppointments()
    // Refresh every 2 minutes
    const interval = setInterval(fetchConfirmedAppointments, 120000)
    return () => clearInterval(interval)
  }, [])

  // Socket connection
  useEffect(() => {
    if (!user?._id) return

    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('🔔 MeetingJoinPopup socket connected')
    })

    // Listen for someone waiting in a call room
    socket.on('user-waiting-in-call', (data) => {
      // Ignore if it's our own waiting event
      if (data.userId === user._id) return

      // Check if this appointment belongs to us
      const isOurMeeting = confirmedAppointments.some(
        a => a._id === data.consultationId
      )
      if (!isOurMeeting) return

      // Don't show if dismissed
      if (dismissed.has(data.consultationId)) return

      setWaitingData(data)
    })

    // If the waiting user leaves, clear the popup
    socket.on('user-left', (data) => {
      if (waitingData && data.consultationId === waitingData.consultationId) {
        setWaitingData(null)
      }
    })

    socket.on('call-ended', (data) => {
      if (waitingData && data.consultationId === waitingData.consultationId) {
        setWaitingData(null)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [user?._id, confirmedAppointments, dismissed])

  // Pulse animation timer for the popup
  useEffect(() => {
    if (waitingData) {
      pulseTimerRef.current = setInterval(() => {
        // Keep alive — the popup persists
      }, 5000)
    }
    return () => {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current)
    }
  }, [waitingData])

  const handleJoin = useCallback(() => {
    if (waitingData && onJoinCall) {
      onJoinCall(waitingData.consultationId)
      setWaitingData(null)
    }
  }, [waitingData, onJoinCall])

  const handleDismiss = useCallback(() => {
    if (waitingData) {
      setDismissed(prev => new Set(prev).add(waitingData.consultationId))
      setWaitingData(null)
    }
  }, [waitingData])

  if (!waitingData) return null

  const otherRole = waitingData.role === 'lawyer' ? 'Lawyer' : 'Client'
  const otherName = waitingData.name || otherRole

  // Find the appointment for display
  const appointment = confirmedAppointments.find(a => a._id === waitingData.consultationId)

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-primary-200 overflow-hidden w-80 sm:w-96">
        {/* Animated top bar */}
        <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 animate-shimmer" />
        
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary-600" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary-900">Meeting in Progress</p>
                <p className="text-xs text-secondary-500">
                  {otherName} is waiting for you
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Appointment info */}
          {appointment && (
            <div className="bg-secondary-50 rounded-xl p-3 mb-3 text-xs">
              <div className="flex items-center justify-between text-secondary-600">
                <span className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  {user.role === 'client' 
                    ? (appointment.lawyer?.name || 'Lawyer')
                    : (appointment.client?.name || 'Client')
                  }
                </span>
                <span>
                  {appointment.date ? new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} 
                  {appointment.time ? ` at ${appointment.time}` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleJoin}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-200 active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              Join Meeting
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-600 rounded-xl text-sm font-medium transition-all"
            >
              Later
            </button>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-100">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-secondary-400">
              Waiting for {user.role === 'client' ? 'you to join...' : 'you to join...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
