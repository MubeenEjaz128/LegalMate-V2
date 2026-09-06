import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, User, Video, MessageCircle, Phone, Calendar, MapPin, Star, AlertCircle, Send, X, Edit, Info, FileText, Briefcase, BookOpen, RefreshCcw, Scale } from 'lucide-react'
import { appointmentAPI, chatAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import VideoCall from '../components/VideoCall/VideoCall'
import ChatBox from '../components/Chat/ChatBox'
import io from 'socket.io-client'
import toast from 'react-hot-toast'

const ConsultationPage = () => {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [error, setError] = useState(null)
  const [waitingUser, setWaitingUser] = useState(null)
  const waitingSocketRef = useRef(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reschedule form states
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await appointmentAPI.getById(appointmentId)
        setAppointment(response.data)

        // Check if user is authorized for this consultation
        const isAuthorized = user._id === response.data.client?._id ||
          user._id === response.data.lawyer?._id ||
          user.role === 'admin'

        if (!isAuthorized) {
          setError('You are not authorized to join this consultation')
          toast.error('Access denied')
        }

      } catch (err) {
        console.error('Error fetching appointment:', err)
        setError('Failed to load consultation details')
        toast.error('Failed to load consultation')
      } finally {
        setLoading(false)
      }
    }

    if (appointmentId && user?._id) {
      fetchAppointment()
    }
  }, [appointmentId, user._id])

  // Listen for "user waiting in call" notification via Socket.IO
  useEffect(() => {
    if (!appointmentId || showVideoCall) return

    let SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    if (!SOCKET_URL || SOCKET_URL.startsWith('/')) {
      SOCKET_URL = window.location.origin
    }

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    waitingSocketRef.current = socket

    socket.on('user-waiting-in-call', (data) => {
      // Only show notification if this is for our consultation and it's not us
      if (data.consultationId === appointmentId && data.userId !== user?._id) {
        setWaitingUser(data)
        toast(
          (t) => (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{data.name} is waiting in the meeting room</p>
                <p className="text-xs text-gray-500">Please join the video call</p>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  setShowVideoCall(true)
                }}
                className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-600 transition-colors"
              >
                Join Now
              </button>
            </div>
          ),
          { duration: 30000, position: 'top-center', style: { maxWidth: '450px' } }
        )
      }
    })

    return () => {
      socket.disconnect()
      waitingSocketRef.current = null
    }
  }, [appointmentId, showVideoCall, user?._id])

  // Fetch Conversation ID
  const [conversationId, setConversationId] = useState(null)

  useEffect(() => {
    const fetchConversation = async () => {
      if (!user?._id || !appointment?.client?._id || !appointment?.lawyer?._id) return

      try {
        let conversations = []
        if (user.role === 'client') {
          const res = await chatAPI.getHistory(user._id)
          conversations = res.data
        } else if (user.role === 'lawyer') {
          const res = await chatAPI.getHistoryForLawyer(user._id)
          conversations = res.data
        }

        const otherPartyId = user.role === 'client' ? appointment.lawyer._id : appointment.client._id

        // Find conversation where the other party matches
        const conversation = conversations.find(c => {
          const otherId = user.role === 'client' ? c.otherUser?._id : c.client?._id
          // Additional check for lawyer side as structure differs
          if (user.role === 'lawyer') {
            return c.client?._id === otherPartyId
          }
          return c.otherUser?._id === otherPartyId || c.lawyer?._id === otherPartyId
        })

        if (conversation) {
          console.log('✅ Found conversation ID:', conversation.conversationId)
          setConversationId(conversation.conversationId)
        } else {
          console.log('⚠️ No conversation found for this appointment pair.')
        }
      } catch (err) {
        console.error('Error fetching conversation:', err)
      }
    }

    if (appointment) {
      fetchConversation()
    }
  }, [appointment?._id, user?._id, user?.role])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-success-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-primary-100 text-primary-800',
      cancelled: 'bg-error-100 text-red-800'
    }
    return colors[status] || 'bg-secondary-100 text-secondary-800'
  }

  const renderStars = (rating) => {
    const stars = []
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-300'}`}
        />
      )
    }
    return stars
  }

  const handleStartVideoCall = () => {
    if (appointment.consultationType === 'video') {
      setShowVideoCall(true)
    } else {
      toast.error('This is a chat consultation, not a video call')
    }
  }

  const handleCloseVideoCall = () => {
    setShowVideoCall(false)
    toast.success('Video call ended')
  }

  // Handle Send Message
  const handleSendMessage = () => {
    setShowChat(true)
    toast.success('Opening chat...')
  }

  const handleCloseChat = () => {
    setShowChat(false)
  }

  // Handle Call Now
  const handleCallNow = () => {
    setShowCallModal(true)
  }

  // Handle Reschedule
  const handleReschedule = () => {
    setShowRescheduleModal(true)
  }

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault()

    if (!rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setRescheduling(true)

      const rescheduleData = {
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason
      }

      // API call to reschedule appointment
      await appointmentAPI.reschedule(appointment._id, rescheduleData)

      toast.success('Reschedule request sent successfully!')
      setShowRescheduleModal(false)
      setRescheduleDate('')
      setRescheduleTime('')
      setRescheduleReason('')

      // Refresh appointment data
      const response = await appointmentAPI.getById(appointmentId)
      setAppointment(response.data)

    } catch (error) {
      console.error('Reschedule error:', error)
      toast.error('Failed to send reschedule request')
    } finally {
      setRescheduling(false)
    }
  }

  // Handle Feedback Submit
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()

    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    try {
      setSubmitting(true)

      const feedbackData = {
        rating,
        comment: comment.trim()
      }

      // API call to submit feedback
      await appointmentAPI.submitFeedback(appointment._id, feedbackData)

      toast.success('Feedback submitted successfully!')
      setShowFeedback(false)
      setFeedbackSubmitted(true)
      setRating(0)
      setComment('')

      // Refresh appointment data to show updated feedback
      const response = await appointmentAPI.getById(appointmentId)
      setAppointment(response.data)

    } catch (error) {
      console.error('Feedback submission error:', error)
      toast.error(error.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading consultation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">Access Denied</h3>
          <p className="text-secondary-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">Consultation Not Found</h3>
          <p className="text-secondary-600 mb-4">The consultation you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isClient = user.role === 'client';
  const isLawyer = user.role === 'lawyer';
  const otherParty = isClient ? appointment.lawyer : appointment.client;

  // Render different views based on user role
  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* Common Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-secondary-600 hover:text-secondary-900 transition-colors flex items-center space-x-2"
              >
                <span>←</span>
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-secondary-300 hidden sm:block"></div>
              <h1 className="text-xl font-semibold text-secondary-900">
                Legal Consultation
              </h1>
            </div>

            <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
              {appointment.consultationType === 'video' && appointment.status === 'confirmed' && (
                <button
                  onClick={handleStartVideoCall}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <Video className="h-4 w-4" />
                  <span>Start Video Call</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render client or lawyer view */}
      {isClient ? (
        <ClientView
          appointment={appointment}
          lawyer={otherParty}
          user={user}
          formatDate={formatDate}
          formatTime={formatTime}
          getStatusColor={getStatusColor}
          renderStars={renderStars}
          handleStartVideoCall={handleStartVideoCall}
          handleSendMessage={handleSendMessage}
          handleCallNow={handleCallNow}
          handleReschedule={handleReschedule}
        />
      ) : (
        <LawyerView
          appointment={appointment}
          client={otherParty}
          user={user}
          formatDate={formatDate}
          formatTime={formatTime}
          getStatusColor={getStatusColor}
          renderStars={renderStars}
          handleStartVideoCall={handleStartVideoCall}
          handleSendMessage={handleSendMessage}
          handleCallNow={handleCallNow}
          handleReschedule={handleReschedule}
        />
      )}

      {/* Waiting User Banner */}
      {waitingUser && !showVideoCall && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <div className="bg-gradient-to-r from-teal-600 to-primary-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{waitingUser.name} is waiting in the meeting room</p>
              <p className="text-xs text-white/70">Click to join the video call</p>
            </div>
            <button
              onClick={() => { setShowVideoCall(true); setWaitingUser(null) }}
              className="bg-white text-teal-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-50 transition-colors shadow-md"
            >
              Join Now
            </button>
            <button onClick={() => setWaitingUser(null)} className="text-white/60 hover:text-white ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCall
          consultationId={appointmentId}
          userRole={user.role}
          onClose={handleCloseVideoCall}
        />
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-2 sm:px-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] sm:h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-success-600 to-primary-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-6 w-6" />
                <div>
                  <h3 className="text-lg font-semibold">Chat with {otherParty?.name}</h3>
                  <p className="text-sm opacity-80">
                    {conversationId ? 'Connected' : 'Connecting...'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseChat}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              {conversationId ? (
                <ChatBox
                  conversationId={conversationId}
                  toUser={otherParty}
                  isGroup={false}
                  groupName=""
                  groupMembers={[]}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-secondary-500">
                  <p>Initializing chat...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Now Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-2 sm:px-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">Contact {otherParty?.name}</h3>
                </div>
                <button
                  onClick={() => setShowCallModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-secondary-900">{otherParty?.name}</h4>
                <p className="text-secondary-600">{isClient ? otherParty?.specialization || 'Legal Expert' : 'Client'}</p>
              </div>

              <div className="space-y-4">
                {/* Content restricted for privacy */}
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-primary-600" />
                  </div>
                  <h4 className="text-lg font-medium text-secondary-900 mb-2">Contact via App</h4>
                  <p className="text-secondary-600 mb-6">
                    For privacy and security, please communicate with your lawyer using the secure chat or video call features within the platform.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowCallModal(false);
                        handleSendMessage();
                      }}
                      className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Open Chat</span>
                    </button>

                    {appointment.consultationType === 'video' && appointment.status === 'confirmed' && (
                      <button
                        onClick={() => {
                          setShowCallModal(false);
                          handleStartVideoCall();
                        }}
                        className="w-full bg-success-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-success-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Video className="h-5 w-5" />
                        <span>Start Video Call</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-error-600 text-white p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6" />
                  <h3 className="text-lg font-semibold">Reschedule Consultation</h3>
                </div>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleRescheduleSubmit}>
                {/* Current Schedule Info */}
                <div className="bg-secondary-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-secondary-900 mb-2">Current Schedule</h4>
                  <div className="text-sm text-secondary-600 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(appointment.time)}</span>
                    </div>
                  </div>
                </div>

                {/* New Schedule Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      New Time *
                    </label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    >
                      <option value="">Select time</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="18:00">06:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Reason for Rescheduling *
                    </label>
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Please provide a reason for rescheduling..."
                      rows="4"
                      maxLength="500"
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                      required
                    />
                    <div className="text-right text-xs text-secondary-500 mt-1">
                      {rescheduleReason.length}/500
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important:</p>
                      <p>Your reschedule request will be sent to {otherParty?.name}. They will need to confirm the new schedule. You'll receive a notification once they respond.</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(false)}
                    className="flex-1 px-4 py-2 text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg font-medium transition-colors"
                    disabled={rescheduling}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduling || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {rescheduling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && !feedbackSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 sm:px-0">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Rate Your Consultation</h2>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-secondary-300'}`}
                  >
                    <Star className="h-8 w-8 fill-current" />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border rounded p-2 mb-4"
                rows="3"
                placeholder="Leave a comment (optional)"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2 space-y-3 sm:space-y-0 sm:space-x-2">
                <button type="button" className="btn-outline" onClick={() => setShowFeedback(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


export default ConsultationPage

// Client View Component
const ClientView = ({
  appointment,
  lawyer,
  user,
  formatDate,
  formatTime,
  getStatusColor,
  renderStars,
  handleStartVideoCall,
  handleSendMessage,
  handleCallNow,
  handleReschedule
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Header */}
          <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-primary-800">Client Dashboard</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            <p className="text-primary-700 text-sm">
              Welcome to your consultation page. Here you can connect with your lawyer, share documents, and get legal advice.
            </p>
          </div>

          {/* Consultation Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Consultation Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Date</p>
                    <p className="font-medium">{formatDate(appointment.date)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Time</p>
                    <p className="font-medium">{formatTime(appointment.time)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {appointment.consultationType === 'video' ? (
                    <Video className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-secondary-400" />
                  )}
                  <div>
                    <p className="text-sm text-secondary-500">Type</p>
                    <p className="font-medium">
                      {appointment.consultationType === 'video' ? 'Video Call' : 'Chat Consultation'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Duration</p>
                    <p className="font-medium">60 minutes</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Location</p>
                    <p className="font-medium">Online</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Status</p>
                    <p className="font-medium capitalize">{appointment.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Consultation Notes</h3>
              <p className="text-secondary-700 leading-relaxed">{appointment.notes}</p>
            </div>
          )}

          {/* Feedback Display - Show if feedback exists */}
          {appointment.feedback?.rating && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Your Feedback</h3>

              <div className="space-y-4">
                {/* Rating Display */}
                <div>
                  <p className="text-sm text-secondary-600 mb-2">Rating</p>
                  <div className="flex items-center space-x-2">
                    {renderStars(appointment.feedback.rating)}
                    <span className="text-lg font-semibold text-secondary-900">
                      {appointment.feedback.rating}/5
                    </span>
                  </div>
                </div>

                {/* Comment Display */}
                {appointment.feedback.comment && (
                  <div>
                    <p className="text-sm text-secondary-600 mb-2">Comment</p>
                    <div className="bg-secondary-50 rounded-lg p-4">
                      <p className="text-secondary-700 leading-relaxed">{appointment.feedback.comment}</p>
                    </div>
                  </div>
                )}

                {/* Submission Date */}
                {appointment.feedback.submittedAt && (
                  <div className="flex items-center space-x-2 text-sm text-secondary-500">
                    <Clock className="h-4 w-4" />
                    <span>Submitted on {formatDate(appointment.feedback.submittedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Client Actions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appointment.consultationType === 'video' && appointment.status === 'confirmed' && (
                <button
                  onClick={handleStartVideoCall}
                  className="bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Video className="h-5 w-5" />
                  <span>Join Video Call</span>
                </button>
              )}

              <button
                onClick={handleSendMessage}
                className="border border-success-500 text-success-600 px-4 py-3 rounded-lg hover:bg-success-50 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Send Message</span>
              </button>

              <button
                onClick={handleCallNow}
                className="border border-purple-500 text-purple-600 px-4 py-3 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="h-5 w-5" />
                <span>Call Lawyer</span>
              </button>

              <button
                onClick={handleReschedule}
                className="border border-orange-500 text-orange-600 px-4 py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Calendar className="h-5 w-5" />
                <span>Request Reschedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lawyer Info for Client */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Your Lawyer
            </h3>

            <div className="text-center mb-4">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-3">
                {lawyer?.name?.charAt(0).toUpperCase() || 'L'}
              </div>
              <h4 className="text-xl font-semibold text-secondary-900">{lawyer?.name || 'Unknown'}</h4>
              <p className="text-sm text-secondary-600">
                {lawyer?.specialization || 'Legal Expert'}
              </p>
            </div>

            {lawyer?.rating && (
              <div className="flex items-center justify-center space-x-1 mb-4">
                {renderStars(lawyer.rating)}
                <span className="text-sm text-secondary-600 ml-2">
                  ({lawyer.rating}/5)
                </span>
              </div>
            )}

            <div className="space-y-3">
              {lawyer?.yearsOfExperience && (
                <div className="flex items-center space-x-3 text-sm">
                  <Briefcase className="h-4 w-4 text-secondary-400" />
                  <span className="text-secondary-700">{lawyer.yearsOfExperience} years of experience</span>
                </div>
              )}

              {lawyer?.specialization && (
                <div className="flex items-center space-x-3 text-sm">
                  <Scale className="h-4 w-4 text-secondary-400" />
                  <span className="text-secondary-700">{lawyer.specialization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Consultation Info</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary-600">Consultation ID</span>
                <span className="font-medium">{appointment._id?.substring(0, 8) || 'N/A'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Created</span>
                <span className="font-medium">{formatDate(appointment.createdAt)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Fee</span>
                <span className="font-medium">PKR {appointment.fee || appointment.consultationFee || 0}/hour</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Payment Status</span>
                <span className="font-medium text-success-600">Paid</span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">Need Help?</h3>
            <p className="text-indigo-700 text-sm mb-3">
              If you need assistance with this consultation or have technical issues, our support team is available.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors w-full">
              <a href="mailto:legalmate.services@gmail.com">Contact Support</a>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lawyer View Component
const LawyerView = ({
  appointment,
  client,
  user,
  formatDate,
  formatTime,
  getStatusColor,
  renderStars,
  handleStartVideoCall,
  handleSendMessage,
  handleCallNow,
  handleReschedule
}) => {
  const [notes, setNotes] = useState(appointment.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await appointmentAPI.update(appointment._id, { notes });
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lawyer Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-emerald-800">Lawyer Dashboard</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            <p className="text-emerald-700 text-sm">
              Manage your client consultation, send legal advice, and track case progress.
            </p>
          </div>

          {/* Consultation Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Consultation Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Date</p>
                    <p className="font-medium">{formatDate(appointment.date)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Time</p>
                    <p className="font-medium">{formatTime(appointment.time)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {appointment.consultationType === 'video' ? (
                    <Video className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-secondary-400" />
                  )}
                  <div>
                    <p className="text-sm text-secondary-500">Type</p>
                    <p className="font-medium">
                      {appointment.consultationType === 'video' ? 'Video Call' : 'Chat Consultation'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Duration</p>
                    <p className="font-medium">60 minutes</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Location</p>
                    <p className="font-medium">Online</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Status</p>
                    <p className="font-medium capitalize">{appointment.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lawyer Notes Section - NEW */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Consultation Notes</h3>
              <span className="text-xs text-secondary-500">Private to you and the client</span>
            </div>
            <textarea
              className="w-full border border-secondary-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
              placeholder="Write your consultation notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {savingNotes ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    <span>Save Notes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lawyer Actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Lawyer Actions</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appointment.status === 'confirmed' && (
                <button
                  onClick={handleStartVideoCall}
                  className="bg-success-600 text-white px-4 py-3 rounded-lg hover:bg-success-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Video className="h-5 w-5" />
                  <span>Start Video Consultation</span>
                </button>
              )}
              <button
                onClick={handleSendMessage}
                className="border border-success-500 text-success-600 px-4 py-3 rounded-lg hover:bg-success-50 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Message Client</span>
              </button>
              <button
                onClick={handleReschedule}
                className="border border-amber-500 text-amber-600 px-4 py-3 rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCcw className="h-5 w-5" />
                <span>Propose New Time</span>
              </button>
            </div>
          </div>
        </div>


        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info for Lawyer */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Client Information
            </h3>

            <div className="text-center mb-4">
              <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-3">
                {client?.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <h4 className="text-xl font-semibold text-secondary-900">{client?.name || 'Unknown'}</h4>
              <p className="text-sm text-secondary-600">Client</p>
            </div>

            <div className="space-y-3">
              {client?.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone className="h-4 w-4 text-secondary-400" />
                    <span className="text-secondary-700">Phone</span>
                  </div>
                  <span className="text-secondary-800 font-medium">{client.phone}</span>
                </div>
              )}

              {client?.email && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-sm">
                    <MessageCircle className="h-4 w-4 text-secondary-400" />
                    <span className="text-secondary-700">Email</span>
                  </div>
                  <span className="text-secondary-800 font-medium">{client.email}</span>
                </div>
              )}

              {client?.address && (
                <div className="flex items-start space-x-3 text-sm">
                  <MapPin className="h-4 w-4 text-secondary-400 mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-secondary-700">Address</span>
                    <p className="text-secondary-800 font-medium mt-1">{client.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Info */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Billing Information</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary-600">Consultation ID</span>
                <span className="font-medium">{appointment._id?.substring(0, 8) || 'N/A'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Rate</span>
                <span className="font-medium">PKR {user?.hourlyRate || 0}/hour</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Duration</span>
                <span className="font-medium">60 minutes</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Total Amount</span>
                <span className="font-medium text-success-600">PKR {user?.hourlyRate || 0}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-secondary-600">Payment Status</span>
                <span className="font-medium text-success-600">Received</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};