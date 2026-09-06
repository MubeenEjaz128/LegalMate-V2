import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck, Trash2, DollarSign, UserPlus, Calendar, MessageCircle, Star, Video, AlertCircle, CreditCard, RefreshCw } from 'lucide-react'
import { adminAPI } from '../../services/api'
import io from 'socket.io-client'

// Map notification type → dashboard tab
const TYPE_TO_ROUTE = {
  balance_request:     '/dashboard?tab=balance-requests',
  withdrawal_request:  '/dashboard?tab=withdrawal-requests',
  new_lawyer:          '/dashboard?tab=users',
  new_user:            '/dashboard?tab=users',
  lawyer_verification: '/dashboard?tab=users',
  new_appointment:     '/dashboard?tab=appointments',
  contact_message:     '/dashboard?tab=contact-messages',
  new_feedback:        '/dashboard?tab=feedback',
  video_call_started:  '/dashboard?tab=appointments',
  refund_request:      '/dashboard?tab=refund-requests',
  system:              '/dashboard?tab=overview',
}

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
  if (envUrl) return envUrl
  return window.location?.origin || ''
}

const TYPE_CONFIG = {
  balance_request:     { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Balance' },
  withdrawal_request:  { icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Withdrawal' },
  new_lawyer:          { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'New Lawyer' },
  new_user:            { icon: UserPlus, color: 'text-sky-600', bg: 'bg-sky-50', label: 'New User' },
  lawyer_verification: { icon: Check, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Verification' },
  new_appointment:     { icon: Calendar, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Appointment' },
  contact_message:     { icon: MessageCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Contact' },
  new_feedback:        { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Feedback' },
  video_call_started:  { icon: Video, color: 'text-red-600', bg: 'bg-red-50', label: 'Video Call' },
  refund_request:      { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Refund' },
  system:              { icon: AlertCircle, color: 'text-secondary-600', bg: 'bg-secondary-50', label: 'System' },
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdminNotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const socketRef = useRef(null)
  const panelRef = useRef(null)
  const bellRef = useRef(null)

  const handleNotificationClick = async (n) => {
    // Mark as read if unread
    if (!n.read) {
      try {
        await adminAPI.markNotificationRead(n._id)
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch {}
    }
    // Navigate to relevant tab
    const route = TYPE_TO_ROUTE[n.type] || '/dashboard?tab=overview'
    setOpen(false)
    navigate(route)
  }

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getNotifications({ limit: 30 })
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch unread count only (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminAPI.getUnreadNotificationCount()
      setUnreadCount(res.data.count || 0)
    } catch {
      // silent
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Socket connection for real-time notifications
  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-admin-notifications')
    })

    socket.on('admin-notification', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50))
      setUnreadCount(prev => prev + 1)

      // Play a subtle notification sound if available
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YTAAAACAf39/f4CAgICAgH9/f39/gICAgICAf39/f4CAgICAgH9/f39/gICAgICA')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch {}
    })

    return () => {
      socket.emit('leave-admin-notifications')
      socket.disconnect()
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // When panel opens, fetch fresh
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await adminAPI.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await adminAPI.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      const wasUnread = notifications.find(n => n._id === id && !n.read)
      await adminAPI.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-all"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-secondary-200 z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-secondary-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all text-xs"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => fetchNotifications()}
                className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-all"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 text-secondary-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="h-8 w-8 text-secondary-300 mx-auto mb-2" />
                <p className="text-secondary-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-secondary-50">
                {notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system
                  const Icon = config.icon
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors cursor-pointer group ${!n.read ? 'bg-primary-50/30' : ''}`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg} flex-shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-secondary-900 truncate">{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-secondary-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-secondary-400 mt-1 block">{timeAgo(n.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkRead(n._id, e)}
                            className="p-1 text-secondary-400 hover:text-primary-600 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(n._id, e)}
                          className="p-1 text-secondary-400 hover:text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
