import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Calendar, Clock, User, MapPin, Phone, Mail, CheckCircle, XCircle, AlertCircle, Filter, Search, MessageSquare, DollarSign, UserCircle2, ArrowRight, RefreshCw, ChevronDown, Check } from 'lucide-react'
import { appointmentAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import RejectionModal from '../components/RejectionModal'

const AppointmentsPage = () => {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, upcoming, completed, cancelled, rejected
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAppointments, setSelectedAppointments] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [appointmentToReject, setAppointmentToReject] = useState(null)
  const [rejectionLoading, setRejectionLoading] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundProofs, setRefundProofs] = useState([])
  const [refundReason, setRefundReason] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundAppointment, setRefundAppointment] = useState(null)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const response = await appointmentAPI.list()
      setAppointments(response.data || [])
    } catch (error) {
      toast.error('Failed to fetch appointments')
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-primary-100 text-primary-800',
      cancelled: 'bg-error-100 text-red-800',
      rejected: 'bg-orange-100 text-orange-800'
    }
    return badges[status] || 'bg-secondary-100 text-secondary-800'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time) => {
    // Assuming time is in "HH:MM" 24h format
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours, 10))
    date.setMinutes(parseInt(minutes, 10))
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const isUpcoming = (appointment) => {
    const appointmentDate = new Date(appointment.date)
    const [hours, minutes] = appointment.time.split(':')
    appointmentDate.setHours(parseInt(hours, 10))
    appointmentDate.setMinutes(parseInt(minutes, 10))
    return appointmentDate > new Date() && appointment.status === 'confirmed'
  }

  const isCompleted = (appointment) => {
    const appointmentDate = new Date(appointment.date)
    const [hours, minutes] = appointment.time.split(':')
    appointmentDate.setHours(parseInt(hours, 10))
    appointmentDate.setMinutes(parseInt(minutes, 10))
    return appointmentDate < new Date() && appointment.status === 'confirmed'
  }

  const isCancelled = (appointment) => {
    return appointment.status === 'cancelled'
  }

  const isRejected = (appointment) => {
    return appointment.status === 'rejected'
  }

  const filteredAppointments = appointments.filter(appointment => {
    // Filter by status
    if (filter === 'upcoming' && !isUpcoming(appointment)) return false
    if (filter === 'completed' && !isCompleted(appointment)) return false
    if (filter === 'cancelled' && !isCancelled(appointment)) return false
    if (filter === 'rejected' && !isRejected(appointment)) return false

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const clientName = appointment.client?.name?.toLowerCase() || ''
      const clientEmail = appointment.client?.email?.toLowerCase() || ''
      const lawyerName = appointment.lawyer?.name?.toLowerCase() || ''
      const date = formatDate(appointment.date).toLowerCase()

      return clientName.includes(searchLower) ||
        clientEmail.includes(searchLower) ||
        lawyerName.includes(searchLower) ||
        date.includes(searchLower)
    }

    return true
  }).sort((a, b) => {
    // Sort by date and time (most recent first)
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)

    if (dateA.getTime() !== dateB.getTime()) {
      return dateB - dateA // Most recent date first
    }

    // If same date, sort by time
    const [hoursA, minutesA] = a.time.split(':').map(Number)
    const [hoursB, minutesB] = b.time.split(':').map(Number)
    const timeA = hoursA * 60 + minutesA
    const timeB = hoursB * 60 + minutesB

    return timeB - timeA // Most recent time first
  })

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await appointmentAPI.cancel(appointmentId)
      toast.success('Appointment cancelled successfully')
      fetchAppointments() // Refresh the list
    } catch (error) {
      toast.error('Failed to cancel appointment')
      console.error('Error cancelling appointment:', error)
    }
  }

  const handleUpdateAppointmentStatus = async (appointmentId, status, rejectionReason = null) => {
    try {
      const appointment = appointments.find(a => a._id === appointmentId)
      if (!appointment) {
        toast.error('Appointment not found')
        return
      }
      if (appointment.status === status) {
        // toast.error('Appointment is already in this status')
        return
      }

      // If rejecting, show modal first
      if (status === 'rejected' && !rejectionReason) {
        setAppointmentToReject(appointment)
        setRejectionModalOpen(true)
        return
      }

      console.log('Updating appointment status:', appointmentId, status)
      const updateData = { status }
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason
      }

      // Use appropriate API based on user role
      if (user.role === 'admin') {
        await appointmentAPI.adminUpdateStatus(appointmentId, updateData)
      } else {
        await appointmentAPI.updateStatus(appointmentId, updateData)
      }

      toast.success(`Appointment ${status} successfully`)
      fetchAppointments() // Refresh the list
    } catch (error) {
      console.error('Error updating appointment status:', error)
      toast.error(`Failed to ${status} appointment: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleRejectWithReason = async (reason) => {
    if (!appointmentToReject) return

    try {
      setRejectionLoading(true)
      await handleUpdateAppointmentStatus(appointmentToReject._id, 'rejected', reason)
      setRejectionModalOpen(false)
      setAppointmentToReject(null)
    } catch (error) {
      console.error('Error rejecting appointment:', error)
    } finally {
      setRejectionLoading(false)
    }
  }

  const handleCloseRejectionModal = () => {
    setRejectionModalOpen(false)
    setAppointmentToReject(null)
    setRejectionLoading(false)
  }

  const handleJoinConsultation = (appointmentId) => {
    // Navigate to consultation page
    window.location.href = `/consultation/${appointmentId}`
  }

  const handleOpenChat = (appointment) => {
    // Navigate to chat page with the other party (client or lawyer)
    if (user.role === 'client') {
      // Client chats with lawyer
      window.location.href = `/chat?userId=${appointment.lawyer._id}&userName=${appointment.lawyer.name}`
    } else {
      // Lawyer chats with client
      window.location.href = `/chat?userId=${appointment.client._id}&userName=${appointment.client.name}`
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedAppointments.length === 0) {
      toast.error('Please select appointments and an action')
      return
    }

    if (!window.confirm(`Are you sure you want to ${bulkAction} ${selectedAppointments.length} appointments?`)) return

    try {
      const promises = selectedAppointments.map(appointmentId =>
        appointmentAPI.updateStatus(appointmentId, { status: bulkAction })
      )

      await Promise.all(promises)
      toast.success(`Successfully updated ${selectedAppointments.length} appointments to ${bulkAction}`)
      setSelectedAppointments([])
      setBulkAction('')
      fetchAppointments()
    } catch (error) {
      console.error('Bulk action error:', error)
      toast.error('Failed to update one or more appointments')
    }
  }

  const toggleAppointmentSelection = (appointmentId) => {
    setSelectedAppointments(prev =>
      prev.includes(appointmentId)
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    )
  }

  const selectAllAppointments = () => {
    setSelectedAppointments(filteredAppointments.map(apt => apt._id))
  }

  const clearSelection = () => {
    setSelectedAppointments([])
  }

  const handleOpenRefund = (appointment) => {
    setRefundAppointment(appointment);
    setRefundModalOpen(true);
  };
  const handleCloseRefund = () => {
    setRefundModalOpen(false);
    setRefundAppointment(null);
    setRefundProofs([]);
    setRefundReason('');
  };
  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (refundProofs.length === 0) {
      toast.error('Please upload at least one proof image');
      return;
    }
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }
    setRefundLoading(true);
    try {
      const formData = new FormData();
      refundProofs.forEach(file => {
        formData.append('proofs', file);
      });
      formData.append('reason', refundReason);

      await appointmentAPI.requestRefund(refundAppointment._id, formData);
      toast.success('Refund requested successfully. Admin will review your request.');
      handleCloseRefund();
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request refund');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 mb-2">
              My Appointments
            </h1>
            <p className="text-secondary-600 text-sm sm:text-base">
              Manage and view all your appointments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'lawyer' && (
              <button
                onClick={() => {
                  setFilter('all');
                  setSearchTerm('');
                  toast.success('Showing all appointments for management');
                }}
                className="btn-primary text-xs sm:text-sm px-3 py-2"
              >
                Manage All
              </button>
            )}
            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="px-3 py-2 border rounded hover:bg-secondary-100 flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Appointments</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Lawyer Bulk Actions */}
            {user.role === 'lawyer' && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Bulk Action</option>
                  <option value="confirmed">Confirm Selected</option>
                  <option value="completed">Mark Complete</option>
                  <option value="cancelled">Cancel Selected</option>
                  <option value="rejected">Reject Selected</option>
                </select>

                {selectedAppointments.length > 0 && (
                  <button
                    onClick={handleBulkAction}
                    className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700"
                  >
                    Apply ({selectedAppointments.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-secondary-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No appointments found</h3>
          <p className="text-secondary-500 text-sm">
            {filter === 'all'
              ? "You don't have any appointments yet."
              : `No ${filter} appointments found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lawyer Selection Controls */}
          {user.role === 'lawyer' && (
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAllAppointments}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-secondary-600 hover:text-secondary-700"
                >
                  Clear Selection
                </button>
                {selectedAppointments.length > 0 && (
                  <span className="text-sm text-secondary-600">
                    {selectedAppointments.length} selected
                  </span>
                )}
              </div>
            </div>
          )}

          {filteredAppointments.map((appointment) => (
            <div key={appointment._id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Selection Checkbox for Lawyers */}
                {user.role === 'lawyer' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedAppointments.includes(appointment._id)}
                      onChange={() => toggleAppointmentSelection(appointment._id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                )}
                {/* Appointment Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusBadge(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                    {isUpcoming(appointment) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">Upcoming</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Show Lawyer info for clients, Client name only for lawyers */}
                    <div>
                      <h4 className="font-medium text-secondary-900 text-sm mb-1">
                        {user.role === 'client' ? 'Lawyer' : 'Client'}
                      </h4>
                      <h3 className="font-semibold text-secondary-900 text-sm sm:text-base mb-1">
                        {user.role === 'client'
                          ? (appointment.lawyer?.name || 'Lawyer')
                          : (appointment.client?.name || 'Client')
                        }
                      </h3>
                      {user.role === 'client' && (
                        <div className="space-y-1 text-xs sm:text-sm text-secondary-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appointment.lawyer?.specialization || 'Legal Specialist'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div>
                      <h4 className="font-medium text-secondary-900 text-sm mb-1">Date & Time</h4>
                      <div className="space-y-1 text-xs sm:text-sm text-secondary-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(appointment.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(appointment.time)}
                        </div>
                      </div>
                    </div>

                    {/* Location/Type */}
                    <div>
                      <h4 className="font-medium text-secondary-900 text-sm mb-1">Type</h4>
                      <div className="space-y-1 text-xs sm:text-sm text-secondary-600">
                        <div className="flex items-center gap-1">
                          {appointment.consultationType === 'video' ? <UserCircle2 className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          {appointment.consultationType === 'video' ? 'Video Call' : 'Chat Consultation'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {appointment.notes && (
                    <div className="mt-3">
                      <h4 className="font-medium text-secondary-900 text-sm mb-1">Notes</h4>
                      <p className="text-xs sm:text-sm text-secondary-600">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {user.role === 'lawyer' ? (
                    // Lawyer Actions
                    <>
                      {/* Detail Button - Always show */}
                      <button
                        onClick={() => window.location.href = `/consultation/${appointment._id}`}
                        className="border border-primary-600 text-primary-600 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-primary-50 flex items-center gap-1"
                      >
                        <ArrowRight className="h-3 w-3" />
                        View Details
                      </button>

                      {/* Status Dropdown - The Feature Requested */}
                      <div className="flex items-center gap-2">
                        <select
                          value={appointment.status}
                          onChange={(e) => handleUpdateAppointmentStatus(appointment._id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-sm border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleJoinConsultation(appointment._id)}
                          className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-primary-700"
                        >
                          Join
                        </button>
                      )}
                    </>
                  ) : (
                    // Client Actions
                    <>
                      {/* Detail Button - Always show */}
                      <button
                        onClick={() => window.location.href = `/consultation/${appointment._id}`}
                        className="border border-primary-600 text-primary-600 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-primary-50 flex items-center gap-1"
                      >
                        <ArrowRight className="h-3 w-3" />
                        View Details
                      </button>

                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleOpenChat(appointment)}
                          className="border border-secondary-300 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-secondary-50 flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Chat
                        </button>
                      )}
                      {isUpcoming(appointment) && (
                        <>
                          <button
                            onClick={() => handleJoinConsultation(appointment._id)}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-primary-700"
                          >
                            Join
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment._id)}
                            className="bg-error-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-error-700"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* Feedback Button - Show if appointment is completed and no feedback given */}
                      {user.role === 'client' && appointment.status === 'completed' && !appointment.feedback?.rating && (
                        <button
                          onClick={() => window.location.href = `/feedback/${appointment._id}`}
                          className="border border-green-600 text-green-600 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-green-50 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Give Feedback
                        </button>
                      )}

                      {/* Feedback Details Button - Show if feedback already given */}
                      {user.role === 'client' && appointment.feedback?.rating && (
                        <button
                          onClick={() => window.location.href = `/feedback/${appointment._id}`}
                          className="border border-purple-600 text-purple-600 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-purple-50 flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          View Feedback
                        </button>
                      )}

                      {/* Refund Button - Show for completed appointments without refund request */}
                      {user.role === 'client' && appointment.status === 'completed' && !appointment.refundRequest?.status && (
                        <button
                          className="border border-error-600 text-error-600 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-error-50 flex items-center gap-1"
                          onClick={() => handleOpenRefund(appointment)}
                        >
                          <DollarSign className="h-3 w-3" />
                          Request Refund
                        </button>
                      )}

                      {/* Refund Status - Show if refund requested */}
                      {user.role === 'client' && appointment.refundRequest?.status === 'pending' && (
                        <button className="text-yellow-600 text-xs sm:text-sm font-medium border border-yellow-600 px-3 py-2 rounded-lg">
                          Refund Pending
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && filteredAppointments.length > 0 && (
        <div className="mt-6 sm:mt-8 p-4 bg-secondary-50 rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-secondary-900">
                {appointments.filter(apt => isUpcoming(apt)).length}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600">Upcoming</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary-900">
                {appointments.filter(apt => isCompleted(apt)).length}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary-900">
                {appointments.filter(apt => isCancelled(apt)).length}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600">Cancelled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary-900">
                {appointments.filter(apt => isRejected(apt)).length}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600">Rejected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary-900">
                {appointments.length}
              </div>
              <div className="text-xs sm:text-sm text-secondary-600">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Request Refund</h2>
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              {/* Reason Field */}
              <div>
                <label className="block font-medium mb-2 text-secondary-700">
                  Reason for Refund <span className="text-error-500">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="Please explain why you are requesting a refund..."
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows="4"
                  maxLength="500"
                  required
                />
                <p className="text-xs text-secondary-500 mt-1">{refundReason.length}/500 characters</p>
              </div>

              {/* Multiple File Upload */}
              <div>
                <label className="block font-medium mb-2 text-secondary-700">
                  Upload Proof Images <span className="text-error-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={e => setRefundProofs(Array.from(e.target.files))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-xs text-secondary-500 mt-1">
                  You can upload up to 5 images (JPEG, PNG, PDF). Max 5MB per file.
                </p>
                {refundProofs.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-secondary-700 mb-1">Selected files:</p>
                    <ul className="text-xs text-secondary-600 space-y-1">
                      {refundProofs.map((file, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-600" />
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseRefund}
                  className="flex-1 px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50"
                  disabled={refundLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={refundLoading || refundProofs.length === 0 || !refundReason.trim()}
                >
                  {refundLoading ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModalOpen}
        onClose={handleCloseRejectionModal}
        onConfirm={handleRejectWithReason}
        title="Reject Appointment"
        appointmentDetails={appointmentToReject}
        loading={rejectionLoading}
      />
    </div>
  )
}

export default AppointmentsPage
