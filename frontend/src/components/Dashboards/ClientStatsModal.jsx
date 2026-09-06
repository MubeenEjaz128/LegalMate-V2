import React from 'react'
import { 
  X, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Star,
  Activity,
  TrendingUp,
  MessageCircle,
  BarChart3,
  Award,
  User
} from 'lucide-react'

const ClientStatsModal = ({ isOpen, onClose, stats, appointments = [], user }) => {
  if (!isOpen) return null

  // Calculate detailed statistics
  const completedAppointments = appointments.filter(apt => apt.status === 'completed')
  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.date + ' ' + apt.time) > new Date() && apt.status === 'confirmed'
  )
  const pendingAppointments = appointments.filter(apt => apt.status === 'pending')
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled')

  // Monthly statistics
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const thisMonthAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date)
    return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear
  })

  const thisMonthSpent = thisMonthAppointments.reduce((total, apt) => 
    total + (apt.lawyer?.hourlyRate || 0), 0
  )

  // Average session cost
  const avgSessionCost = completedAppointments.length > 0 
    ? completedAppointments.reduce((total, apt) => total + (apt.lawyer?.hourlyRate || 0), 0) / completedAppointments.length
    : 0

  // Most consulted specialization
  const specializationCount = {}
  appointments.forEach(apt => {
    const spec = apt.lawyer?.specialization || 'General'
    specializationCount[spec] = (specializationCount[spec] || 0) + 1
  })
  const mostConsultedSpec = Object.keys(specializationCount).reduce((a, b) => 
    specializationCount[a] > specializationCount[b] ? a : b, 'None'
  )

  // Consultation frequency (appointments per month since joining)
  const joinDate = new Date(user?.createdAt || Date.now())
  const monthsSinceJoining = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
  const consultationFrequency = (appointments.length / monthsSinceJoining).toFixed(1)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-secondary-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-4xl p-3 sm:p-6 my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-secondary-900">Detailed Statistics</h3>
              <p className="text-secondary-600 text-sm">Comprehensive overview of your consultation activity</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-700">Total Consultations</p>
                  <p className="text-2xl font-bold text-primary-900">{appointments.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            
            <div className="bg-success-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success-700">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{completedAppointments.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Upcoming</p>
                  <p className="text-2xl font-bold text-orange-900">{upcomingAppointments.length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Total Spent</p>
                  <p className="text-2xl font-bold text-purple-900">PKR {stats.totalSpent?.toLocaleString() || '0'}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Appointment Status Breakdown */}
            <div className="bg-secondary-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Appointment Status Breakdown
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
                    <span className="text-secondary-700">Completed</span>
                  </div>
                  <span className="font-medium">{completedAppointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    <span className="text-secondary-700">Upcoming</span>
                  </div>
                  <span className="font-medium">{upcomingAppointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-warning-500 rounded-full mr-2"></div>
                    <span className="text-secondary-700">Pending</span>
                  </div>
                  <span className="font-medium">{pendingAppointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-error-500 rounded-full mr-2"></div>
                    <span className="text-secondary-700">Cancelled</span>
                  </div>
                  <span className="font-medium">{cancelledAppointments.length}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-secondary-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary-700">Total Spent:</span>
                  <span className="font-medium">PKR {stats.totalSpent?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-700">This Month:</span>
                  <span className="font-medium">PKR {thisMonthSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-700">Average per Session:</span>
                  <span className="font-medium">PKR {Math.round(avgSessionCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-700">Current PKR Credits:</span>
                  <span className="font-medium">{(stats.creditBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Consultation Patterns */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg border border-primary-200">
              <h4 className="text-lg font-semibold text-primary-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Consultation Patterns
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-700">Frequency:</span>
                  <span className="font-medium text-primary-900">{consultationFrequency}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Most Active Month:</span>
                  <span className="font-medium text-primary-900">
                    {thisMonthAppointments.length > 0 ? 'This Month' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700">Success Rate:</span>
                  <span className="font-medium text-primary-900">
                    {appointments.length > 0 ? Math.round((completedAppointments.length / appointments.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Preferences */}
            <div className="bg-gradient-to-br from-success-50 to-success-100 p-6 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Legal Preferences
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-success-700">Preferred Area:</span>
                  <span className="font-medium text-green-900">{mostConsultedSpec}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-success-700">Lawyers Consulted:</span>
                  <span className="font-medium text-green-900">
                    {new Set(appointments.map(apt => apt.lawyer?._id)).size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-success-700">Repeat Rate:</span>
                  <span className="font-medium text-green-900">
                    {appointments.length > 1 ? Math.round(((appointments.length - new Set(appointments.map(apt => apt.lawyer?._id)).size) / appointments.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-700">Member Since:</span>
                  <span className="font-medium text-purple-900">
                    {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Active Months:</span>
                  <span className="font-medium text-purple-900">{monthsSinceJoining}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Profile Status:</span>
                  <span className="font-medium text-purple-900">
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientStatsModal