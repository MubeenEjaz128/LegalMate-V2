import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MessageCircle,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  Users,
  TrendingUp,
  Eye,
  Settings,
  Activity,
  ArrowRight,
  Plus,
  Video,
  UserCircle2,
  FileText,
  Filter,
  Search,
  Download,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Bell,
  BarChart3
} from 'lucide-react'
import { appointmentAPI, chatAPI, feedbackAPI, balanceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { authAPI } from '../../services/api'
import { toast } from 'react-hot-toast'
import { Card, Button, Badge, Loading, Alert } from '../UI'
import { getProfilePictureUrl } from '../../utils/imageUtils'
import VideoCall from '../VideoCall/VideoCall'
import MeetingJoinPopup from '../Meeting/MeetingJoinPopup'

const LawyerDashboard = () => {
  const { user, updateUser } = useAuthStore()
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    pendingRequests: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalClients: 0,
    recentChats: [],
    pkrBalance: 0
  })
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all') // all, pending, confirmed, completed
  const [searchTerm, setSearchTerm] = useState('')

  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [currentCallId, setCurrentCallId] = useState(null)

  // Memoized data fetching function
  const fetchDashboardData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setAppointmentsLoading(true)
    }
    setError(null)

    try {
      const [appointmentsRes, chatRes, feedbackRes, balanceRes] = await Promise.all([
        appointmentAPI.list().catch(err => {
          console.warn('Failed to fetch appointments:', err)
          return { data: [] }
        }),
        chatAPI.getHistory(user._id).catch(err => {
          console.warn('Failed to fetch chat history:', err)
          return { data: [] }
        }),
        feedbackAPI.getByLawyer(user._id).catch(err => {
          console.warn('Failed to fetch feedback:', err)
          return { data: [] }
        }),
        balanceAPI.getBalance().catch(err => {
          console.warn('Failed to fetch balance:', err)
          return { data: { balancePkr: 0 } }
        })
      ])

      const appointmentData = appointmentsRes.data || []
      const chatData = chatRes.data || []
      const feedbackData = feedbackRes.data || []

      // Calculate statistics
      const now = new Date()
      const upcomingAppointments = appointmentData.filter(apt => {
        const aptDateTime = new Date(`${apt.date}T${apt.time}`)
        return aptDateTime > now && apt.status === 'confirmed'
      })

      const pendingRequests = appointmentData.filter(apt => apt.status === 'pending')
      const completedAppointments = appointmentData.filter(apt => apt.status === 'completed')

      // Use totalEarned from balance instead of calculating from appointments
      // This ensures we show the actual earnings from the wallet
      const totalEarnings = balanceRes.data?.totalEarned || 0

      const thisMonth = new Date()
      // For monthly earnings, we'll still calculate from completed appointments this month
      // But use the actual amount field instead of fee
      const monthlyEarnings = completedAppointments
        .filter(apt => {
          const aptDate = new Date(apt.date)
          return aptDate.getMonth() === thisMonth.getMonth() &&
            aptDate.getFullYear() === thisMonth.getFullYear()
        })
        .reduce((sum, apt) => sum + (apt.amount || apt.fee || user.hourlyRate || 0), 0)

      const uniqueClients = new Set(
        appointmentData
          .filter(apt => apt.client?._id)
          .map(apt => apt.client._id)
      ).size

      // Calculate average rating from actual feedback
      const averageRating = feedbackData.length > 0
        ? parseFloat((feedbackData.reduce((sum, fb) => sum + fb.rating, 0) / feedbackData.length).toFixed(1))
        : 0

      setAppointments(appointmentData)
      setStats({
        totalAppointments: appointmentData.length,
        upcomingAppointments: upcomingAppointments.length,
        pendingRequests: pendingRequests.length,
        totalEarnings,
        monthlyEarnings,
        averageRating,
        totalClients: uniqueClients,
        recentChats: chatData.slice(0, 5),
        pkrBalance: balanceRes.data?.balancePkr || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setAppointmentsLoading(false)
      setRefreshing(false)
    }
  }, [user._id, user.hourlyRate])

  useEffect(() => {
    if (user?._id) {
      fetchDashboardData()
    }
  }, [fetchDashboardData, user._id])

  const handleStatusChange = async (id, status) => {
    try {
      await appointmentAPI.updateStatus(id, { status })

      // Update appointments state
      setAppointments(prev => prev.map(a =>
        a._id === id ? { ...a, status } : a
      ))

      // Update stats
      setStats(prev => {
        const updatedStats = { ...prev }
        if (status === 'confirmed') {
          updatedStats.pendingRequests = Math.max(0, prev.pendingRequests - 1)
          updatedStats.upcomingAppointments = prev.upcomingAppointments + 1
        } else if (status === 'rejected') {
          updatedStats.pendingRequests = Math.max(0, prev.pendingRequests - 1)
        }
        return updatedStats
      })

      toast.success(`Appointment ${status} successfully`)
    } catch (error) {
      console.error('Error updating appointment status:', error)
      toast.error('Failed to update appointment status')
    }
  }

  const handleToggleAvailability = async () => {
    try {
      const response = await authAPI.toggleAvailability()
      if (response.data.user) {
        // Update user in store if updateUser is available
        if (updateUser) {
          updateUser({ isAvailable: response.data.user.isAvailable })
        }
        toast.success(response.data.message)
      }
    } catch (error) {
      console.error('Error toggling availability:', error)
      toast.error('Failed to toggle availability')
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Video call handlers
  const handleJoinVideoCall = (appointmentId) => {
    setCurrentCallId(appointmentId)
    setShowVideoCall(true)
  }

  const handleCloseVideoCall = () => {
    setShowVideoCall(false)
    setCurrentCallId(null)
  }

  // Filter and search functionality
  const filteredAppointments = appointments.filter(apt => {
    // Filter by status
    if (filter !== 'all' && apt.status !== filter) return false

    // Search by client name or consultation type
    if (searchTerm && !apt.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !apt.consultationType?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    return true
  })

  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toDateString()
    const aptDate = new Date(apt.date).toDateString()
    return aptDate === today && apt.status === 'confirmed'
  })

  // Utility functions
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const formatTime = (timeStr) => {
    try {
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeStr
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <img
                  src={getProfilePictureUrl(user.profilePicture, 'lawyer')}
                  alt="Profile"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-secondary-200"
                  onError={(e) => {
                    e.target.src = '/default-lawyer.svg';
                  }}
                />
                {user.isAvailable && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-success-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-secondary-900">
                  Welcome back, {user.name}!
                </h1>
                <div className="flex items-center space-x-2 text-secondary-600 text-sm sm:text-base">
                  <span>{user.specialization}</span>
                  <span>•</span>
                  <Badge variant={user.isAvailable ? 'success' : 'warning'} size="sm">
                    {user.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                loading={refreshing}
                icon={RefreshCw}
                size="sm"
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant={user.isAvailable ? 'danger' : 'success'}
                onClick={handleToggleAvailability}
                size="sm"
              >
                {user.isAvailable ? 'Set Unavailable' : 'Set Available'}
              </Button>
              <Link to="/profile">
                <Button variant="outline" size="sm" icon={Settings}>
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4">
              <Alert variant="danger" className="flex items-center space-x-2 text-sm sm:text-base">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto"
                >
                  Dismiss
                </Button>
              </Alert>
            </div>
          )}

          {/* Profile Verification Alert - Only show if not verified */}
          {user && user.isVerified === false && (
            <div className="mt-4">
              <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-5 shadow-md">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-red-900 mb-2">
                      Account Verification Required
                    </h3>
                    <p className="text-sm text-red-800 leading-relaxed mb-3">
                      Your account is currently <span className="font-semibold">under administrative review</span> and is not yet visible to clients.
                      You will not appear in our lawyer directory or receive appointment requests until your profile is verified and approved by our admin team.
                    </p>

                    <div className="bg-white border border-red-200 rounded-md p-3 mb-3">
                      <p className="text-sm font-semibold text-red-900 mb-2">Required Steps for Verification:</p>
                      <ul className="text-sm text-secondary-700 space-y-1.5 ml-1">
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Upload all required professional documents (Bar Council License, CNIC, etc.)</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Complete your professional profile with accurate credentials and specializations</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Wait for admin review and approval (typically within 24-48 business hours)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
                      <p className="text-xs text-red-800">
                        <strong>Important:</strong> Once approved, you will receive an email notification and your profile will automatically become visible
                        in the lawyer directory. You'll be able to start accepting client appointments immediately after verification.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link to="/profile">
                        <button className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md">
                          <FileText className="h-4 w-4 mr-2" />
                          Complete Profile Now
                        </button>
                      </Link>
                      <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg">
                        <Clock className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">
                          Status: Pending Admin Approval
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-secondary-600">Total Clients</p>
                <div className="text-xl sm:text-2xl font-bold text-secondary-900 mt-1">
                  {loading ? <div className="h-6 sm:h-8 w-12 bg-secondary-200 rounded animate-pulse"></div> : stats.totalClients}
                </div>
                <p className="text-xs text-secondary-500 mt-1">Active relationships</p>
              </div>
              <div className="p-2 sm:p-3 bg-primary-100 rounded-full">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-secondary-600">Pending Requests</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-xl sm:text-2xl font-bold text-secondary-900">
                    {loading ? <div className="h-6 sm:h-8 w-12 bg-secondary-200 rounded animate-pulse"></div> : stats.pendingRequests}
                  </div>
                  {stats.pendingRequests > 0 && (
                    <Badge variant="warning" size="sm" icon={Bell}>
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-secondary-500 mt-1">Awaiting response</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-secondary-600">Monthly Earnings</p>
                <div className="text-xl sm:text-2xl font-bold text-secondary-900 mt-1">
                  {loading ? (
                    <div className="h-6 sm:h-8 w-20 bg-secondary-200 rounded animate-pulse"></div>
                  ) : (
                    formatCurrency(stats.monthlyEarnings)
                  )}
                </div>
                <p className="text-xs text-secondary-500 mt-1">This month</p>
              </div>
              <div className="p-2 sm:p-3 bg-success-100 rounded-full">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-success-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-secondary-600">Average Rating</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-xl sm:text-2xl font-bold text-secondary-900">
                    {loading ? <div className="h-6 sm:h-8 w-12 bg-secondary-200 rounded animate-pulse"></div> : stats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 sm:w-4 sm:h-4 ${i < Math.floor(stats.averageRating) ? 'text-yellow-400 fill-current' : 'text-secondary-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-secondary-500 mt-1">Client feedback</p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link to="/appointments" className="group">
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow group-hover:border-primary-300">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-primary-100 rounded-full">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900 text-sm sm:text-base">Manage Appointments</h3>
                  <p className="text-xs sm:text-sm text-secondary-600">{stats.upcomingAppointments} upcoming</p>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400 group-hover:text-primary-600" />
              </div>
            </Card>
          </Link>

          <Link to="/balance" className="group">
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow group-hover:border-orange-300">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900 text-sm sm:text-base">Balance</h3>
                  <p className="text-xs sm:text-sm text-secondary-600">₨{stats.pkrBalance?.toLocaleString() || '0'} PKR</p>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400 group-hover:text-orange-600" />
              </div>
            </Card>
          </Link>

          <Link to="/chat" className="group">
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow group-hover:border-green-300">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-success-100 rounded-full">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900 text-sm sm:text-base">Client Messages</h3>
                  <p className="text-xs sm:text-sm text-secondary-600">{stats.recentChats.length} conversations</p>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400 group-hover:text-success-600" />
              </div>
            </Card>
          </Link>

          <Link to="/profile" className="group">
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow group-hover:border-purple-300">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-900 text-sm sm:text-base">Update Profile</h3>
                  <p className="text-xs sm:text-sm text-secondary-600">Manage your details</p>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400 group-hover:text-purple-600" />
              </div>
            </Card>
          </Link>
        </div>

        {/* All Appointments List */}
        <Card className="p-4 sm:p-6 mt-6 sm:mt-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-secondary-900 text-sm sm:text-base">
                All Appointments
              </h3>
              <Badge variant="info" size="sm">
                {filteredAppointments.length}
              </Badge>
              <Link to="/appointments" className="ml-2 text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium">
                View All
              </Link>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-secondary-500" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-auto"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-secondary-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilter('all')
                  setSearchTerm('')
                }}
                icon={RefreshCw}
              >
                Reset
              </Button>
            </div>
          </div>

          {appointmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 sm:h-8 bg-secondary-200 rounded w-full animate-pulse" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Calendar className="h-8 sm:h-12 w-8 sm:w-12 text-secondary-300 mb-3 sm:mb-4" />
              <div className="text-secondary-400 text-sm sm:text-base font-medium">
                {filter === 'all' && !searchTerm
                  ? 'No appointments found'
                  : 'No appointments match your filters'
                }
              </div>
              <p className="text-secondary-500 text-xs sm:text-sm mt-1 sm:mt-2">
                {filter === 'all' && !searchTerm
                  ? 'New bookings will appear here!'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 text-xs">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-secondary-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-secondary-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-secondary-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-secondary-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredAppointments.slice(0, 5).map((apt) => {
                    const canJoin = apt.status === 'confirmed'
                    const isPending = apt.status === 'pending'
                    const aptDateTime = new Date(`${apt.date}T${apt.time}`)
                    const isToday = new Date(apt.date).toDateString() === new Date().toDateString()
                    const isUpcoming = aptDateTime > new Date()

                    return (
                      <tr
                        key={apt._id}
                        className={`hover:bg-primary-50 transition-colors ${isToday ? 'bg-yellow-50' : ''
                          }`}
                      >
                        <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0">
                              <UserCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-secondary-900 truncate">
                                {apt.client?.name || 'Client'}
                              </p>
                              {apt.client?.email && (
                                <p className="text-xs text-secondary-500 truncate">
                                  {apt.client.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-secondary-400" />
                              <span className="text-secondary-900">{formatDate(apt.date)}</span>
                              {isToday && (
                                <Badge variant="warning" size="xs">Today</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <Clock className="w-3 h-3 text-secondary-400" />
                              <span className="text-secondary-600">{formatTime(apt.time)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {apt.consultationType === 'video' ? (
                              <Video className="w-3 h-3 sm:w-4 sm:h-4 text-primary-500" />
                            ) : (
                              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success-500" />
                            )}
                            <span className="text-xs sm:text-sm text-secondary-900 capitalize">
                              {apt.consultationType}
                            </span>
                          </div>
                        </td>

                        <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              apt.status === 'confirmed' ? 'success' :
                                apt.status === 'pending' ? 'warning' :
                                  apt.status === 'completed' ? 'info' :
                                    apt.status === 'rejected' ? 'danger' :
                                      'default'
                            }
                            size="sm"
                            className={apt.status === 'pending' ? 'animate-pulse' : ''}
                          >
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </Badge>
                        </td>

                        <td className="px-2 sm:px-3 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {isPending ? (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Button
                                  size="xs"
                                  variant="success"
                                  onClick={() => handleStatusChange(apt._id, 'confirmed')}
                                  className="px-2 sm:px-3 py-1 text-xs font-medium"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="xs"
                                  variant="danger"
                                  onClick={() => handleStatusChange(apt._id, 'rejected')}
                                  className="px-2 sm:px-3 py-1 text-xs font-medium"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : canJoin ? (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                {apt.consultationType === 'video' ? (
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    onClick={() => handleJoinVideoCall(apt._id)}
                                    className="px-2 sm:px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700"
                                  >
                                    <Video className="w-3 h-3 mr-1" />
                                    Join Video
                                  </Button>
                                ) : (
                                  <Link to={`/consultation/${apt._id}`}>
                                    <Button
                                      size="xs"
                                      variant="primary"
                                      className="px-2 sm:px-3 py-1 text-xs font-medium bg-success-600 hover:bg-success-700"
                                    >
                                      <MessageCircle className="w-3 h-3 mr-1" />
                                      Join Chat
                                    </Button>
                                  </Link>
                                )}
                                {apt.client?.email && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => window.open(`mailto:${apt.client.email}`)}
                                    className="px-2 sm:px-3 py-1 text-xs font-medium border-secondary-300 text-secondary-700 hover:bg-secondary-50"
                                  >
                                    <Mail className="w-3 h-3 mr-1" />
                                    Email
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled
                                  className="px-2 sm:px-3 py-1 text-xs font-medium bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                                  title="Cannot join - appointment not confirmed"
                                >
                                  Unavailable
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Pending Requests */}
          {stats.pendingRequests > 0 && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Pending Requests</h3>
                <Badge variant="warning">{stats.pendingRequests}</Badge>
              </div>
              <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {appointments
                  .filter(apt => apt.status === 'pending')
                  .map(appointment => (
                    <div key={appointment._id} className="border border-secondary-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-secondary-900 text-sm sm:text-base">{appointment.client?.name || 'Client'}</h4>
                          <p className="text-xs sm:text-sm text-secondary-600">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                          </p>
                          <p className="text-xs sm:text-sm text-secondary-500">{appointment.consultationType} consultation</p>
                        </div>
                        <div className="flex space-x-1 sm:space-x-2">
                          <Button
                            size="xs"
                            variant="success"
                            onClick={() => handleStatusChange(appointment._id, 'confirmed')}
                            className="px-2 sm:px-3 py-1 text-xs"
                          >
                            Accept
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => handleStatusChange(appointment._id, 'rejected')}
                            className="px-2 sm:px-3 py-1 text-xs"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Recent Messages */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Recent Messages</h3>
              <Link to="/chat" className="text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-secondary-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 sm:h-4 bg-secondary-300 rounded w-1/3 mb-1 sm:mb-2"></div>
                      <div className="h-2 sm:h-3 bg-secondary-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentChats.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {stats.recentChats.map(chat => (
                  <Link
                    key={chat._id}
                    to="/chat"
                    state={{ selectedConversationId: chat._id }}
                    className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-secondary-50 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                      {chat.client?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 text-xs sm:text-sm truncate">{chat.client?.name || 'Client'}</p>
                      <p className="text-xs text-secondary-600 truncate">{chat.lastMessage || 'Start conversation'}</p>
                    </div>
                    <div className="text-xs text-secondary-500">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <MessageCircle className="w-8 sm:w-12 h-8 sm:h-12 text-secondary-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-secondary-600 text-xs sm:text-sm">No messages yet</p>
              </div>
            )}
          </Card>

          {/* Today's Schedule */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Today's Schedule</h3>
                <Badge variant="info" size="sm">{todayAppointments.length}</Badge>
              </div>
              <Link to="/appointments" className="text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-80 overflow-y-auto">
              {todayAppointments.length > 0 ? (
                todayAppointments.map(appointment => {
                  const aptTime = new Date(`${appointment.date}T${appointment.time}`)
                  const now = new Date()
                  const isUpcoming = aptTime > now
                  const isNow = Math.abs(aptTime.getTime() - now.getTime()) < 30 * 60 * 1000 // 30 minutes window
                  return (
                    <div
                      key={appointment._id}
                      className={`p-3 sm:p-4 rounded-lg border-l-4 transition-all ${isNow ? 'bg-success-50 border-success-500 shadow-md' :
                        isUpcoming ? 'bg-primary-50 border-primary-500' :
                          'bg-secondary-50 border-secondary-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <UserCircle2 className="w-3 sm:w-4 h-3 sm:h-4 text-secondary-600" />
                            <p className="font-medium text-secondary-900 text-xs sm:text-sm">
                              {appointment.client?.name || 'Client'}
                            </p>
                            {isNow && (
                              <Badge variant="success" size="sm" icon={Bell}>
                                Starting Soon
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-secondary-600">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(appointment.time)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span className="capitalize">{appointment.consultationType}</span>
                            </div>
                            {appointment.duration && (
                              <div className="flex items-center space-x-1">
                                <Activity className="w-3 h-3" />
                                <span>{appointment.duration} min</span>
                              </div>
                            )}
                          </div>
                          {appointment.notes && (
                            <p className="text-xs text-secondary-500 mt-1 truncate">
                              {appointment.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 ml-2 sm:ml-4">
                          {appointment.consultationType === 'video' ? (
                            <Button
                              size="xs"
                              variant={isNow ? 'primary' : 'outline'}
                              icon={Video}
                              onClick={() => handleJoinVideoCall(appointment._id)}
                              className="px-2 sm:px-3 py-1 text-xs"
                            >
                              {isNow ? 'Join Now' : 'Join Video'}
                            </Button>
                          ) : (
                            <Link to={`/consultation/${appointment._id}`}>
                              <Button
                                size="xs"
                                variant={isNow ? 'primary' : 'outline'}
                                icon={MessageCircle}
                                className="px-2 sm:px-3 py-1 text-xs"
                              >
                                {isNow ? 'Start Now' : 'Start Chat'}
                              </Button>
                            </Link>
                          )}
                          {appointment.client?.email && (
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={Mail}
                              onClick={() => window.open(`mailto:${appointment.client.email}`)}
                              className="px-2 sm:px-3 py-1 text-xs"
                            >
                              Email
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Calendar className="w-8 sm:w-12 h-8 sm:h-12 text-secondary-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-secondary-600 text-xs sm:text-sm">No appointments scheduled for today</p>
                  <p className="text-xs text-secondary-500 mt-1">Check your upcoming appointments for the week</p>
                </div>
              )}
            </div>
          </Card>

          {/* Earnings Overview */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Earnings Overview</h3>
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
              </div>
              <Link to="/balance" className="text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium">
                View Details
              </Link>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 bg-green-200 rounded-full">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success-700" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900 text-xs sm:text-sm">Total Earnings</p>
                      <p className="text-xs text-success-700">All time</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-green-900">
                    {loading ? (
                      <div className="h-5 sm:h-6 w-20 sm:w-24 bg-green-200 rounded animate-pulse"></div>
                    ) : (
                      formatCurrency(stats.totalEarnings)
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 bg-primary-200 rounded-full">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
                    </div>
                    <div>
                      <p className="font-medium text-primary-900 text-xs sm:text-sm">This Month</p>
                      <p className="text-xs text-primary-700">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-primary-900">
                    {loading ? (
                      <div className="h-5 sm:h-6 w-20 sm:w-24 bg-primary-200 rounded animate-pulse"></div>
                    ) : (
                      formatCurrency(stats.monthlyEarnings)
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-2 bg-purple-200 rounded-full">
                      <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-900 text-xs sm:text-sm">Hourly Rate</p>
                      <p className="text-xs text-purple-700">Per consultation</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-purple-900">
                    {formatCurrency(user.hourlyRate || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-secondary-200">
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-secondary-900">
                    {stats.totalAppointments - stats.pendingRequests}
                  </p>
                  <p className="text-xs text-secondary-600">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-2xl font-bold text-secondary-900">
                    {stats.upcomingAppointments}
                  </p>
                  <p className="text-xs text-secondary-600">Upcoming</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Client Feedback */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold text-secondary-900">Client Feedback</h3>
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
              </div>
              <Link to="/lawyer/feedback" className="text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium">
                View All
              </Link>
            </div>
            <LawyerFeedbackWidget />
          </Card>
        </div>

        {/* Video Call Modal */}
        {showVideoCall && currentCallId && (
          <VideoCall
            consultationId={currentCallId}
            userRole="lawyer"
            onClose={handleCloseVideoCall}
          />
        )}

        {/* Meeting Join Popup — shows when client is waiting */}
        {!showVideoCall && <MeetingJoinPopup onJoinCall={handleJoinVideoCall} />}
      </div>
    </div>
  )
}

// LawyerFeedbackWidget Component
const LawyerFeedbackWidget = () => {
  const { user } = useAuthStore()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    recentFeedback: []
  })

  useEffect(() => {
    fetchFeedback()
  }, [user._id])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const response = await feedbackAPI.getByLawyer(user._id)
      const feedbackData = response.data || []

      setFeedback(feedbackData)

      // Calculate stats
      if (feedbackData.length > 0) {
        const averageRating = feedbackData.reduce((sum, fb) => sum + fb.rating, 0) / feedbackData.length
        setStats({
          averageRating: parseFloat(averageRating.toFixed(1)),
          totalReviews: feedbackData.length,
          recentFeedback: feedbackData.slice(0, 3) // Show 3 most recent
        })
      } else {
        setStats({
          averageRating: 0,
          totalReviews: 0,
          recentFeedback: []
        })
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
      setFeedback([])
      setStats({ averageRating: 0, totalReviews: 0, recentFeedback: [] })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 sm:space-y-4">
        <div className="h-3 sm:h-4 bg-secondary-200 rounded w-1/2"></div>
        <div className="h-3 sm:h-4 bg-secondary-200 rounded w-3/4"></div>
        <div className="h-3 sm:h-4 bg-secondary-200 rounded w-1/3"></div>
      </div>
    )
  }

  if (stats.totalReviews === 0) {
    return (
      <div className="text-center py-6 sm:py-8">
        <Star className="h-8 sm:h-12 w-8 sm:w-12 text-secondary-400 mx-auto mb-2 sm:mb-3" />
        <p className="text-secondary-600 text-xs sm:text-sm">No client feedback yet</p>
        <p className="text-xs text-secondary-500 mt-1">Feedback from completed consultations will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${star <= Math.floor(stats.averageRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-secondary-300'
                    }`}
                />
              ))}
            </div>
            <span className="text-base sm:text-lg font-bold text-yellow-800">
              {stats.averageRating}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-yellow-700">Average Rating</p>
        </div>

        <div className="bg-primary-50 p-3 sm:p-4 rounded-lg text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600 mb-1">
            {stats.totalReviews}
          </div>
          <p className="text-xs sm:text-sm text-primary-700">
            Review{stats.totalReviews !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="space-y-2 sm:space-y-3">
        <h4 className="font-medium text-secondary-900 text-sm sm:text-base">Recent Reviews</h4>
        {stats.recentFeedback.map((fb) => (
          <div key={fb._id} className="bg-secondary-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start justify-between mb-1 sm:mb-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${star <= fb.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-secondary-300'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-secondary-600">
                  by {fb.client?.name || 'Anonymous'}
                </span>
              </div>
              <span className="text-xs text-secondary-500">
                {new Date(fb.createdAt).toLocaleDateString()}
              </span>
            </div>

            {fb.comment && (
              <p className="text-xs sm:text-sm text-secondary-700 line-clamp-2">
                "{fb.comment}"
              </p>
            )}

            {/* Category ratings if available */}
            {fb.categories && (
              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1 sm:gap-2 text-xs">
                {Object.entries(fb.categories).map(([category, rating]) => (
                  rating > 0 && (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize text-secondary-600">{category}:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-2 w-2 sm:h-3 sm:w-3 ${star <= rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-secondary-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {stats.totalReviews > 3 && (
        <div className="text-center pt-2">
          <Link
            to="/lawyer/feedback"
            className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all {stats.totalReviews} reviews →
          </Link>
        </div>
      )}
    </div>
  )
}

export default LawyerDashboard