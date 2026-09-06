import React, { useState, useEffect } from 'react'
import {
  X, User, Mail, Calendar, MapPin, Phone, Star,
  MessageCircle, FileText, CheckCircle, XCircle,
  Activity, Clock, TrendingUp, Eye, Download, File
} from 'lucide-react'
import api, { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const UserDetailsModal = ({ userId, isOpen, onClose }) => {
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [documents, setDocuments] = useState([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
    }
  }, [isOpen, userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUserDetails(userId)
      setUserDetails(response.data)

      // Fetch documents if user is a lawyer
      if (response.data.user.role === 'lawyer') {
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const response = await api.get(`/documents/admin/all`)
      console.log('📄 Documents response:', response.data)

      // Find the lawyer's documents from the response
      const lawyerData = response.data?.find(lawyer => lawyer.id === userId)
      const docs = lawyerData?.documents || []

      console.log('📄 Filtered documents for user:', docs)
      setDocuments(docs)
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
      setDocuments([])
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleViewDocument = async (documentId) => {
    try {
      const response = await api.get(`/documents/view/${documentId}`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      toast.success('Document opened in new tab')
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to view document')
    }
  }

  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      const response = await api.get(`/documents/view/${documentId}`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)
      toast.success('Document downloaded successfully')
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const handleStatusChange = async (isActive) => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive })
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
      fetchUserDetails() // Refresh data
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleVerificationChange = async (isVerified) => {
    try {
      await adminAPI.updateUserStatus(userId, { isVerified })
      toast.success(`User ${isVerified ? 'verified' : 'unverified'} successfully`)
      fetchUserDetails() // Refresh data
    } catch (error) {
      console.error('Error updating user verification:', error)
      toast.error('Failed to update user verification')
    }
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-secondary-600">User not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-secondary-500 text-white rounded hover:bg-secondary-600"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const { user, relatedData } = userDetails

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'feedback', label: 'Feedback', icon: Star },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
  ]

  // Add Documents tab only for lawyers
  if (user.role === 'lawyer') {
    tabs.splice(1, 0, { id: 'documents', label: 'Documents', icon: FileText })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between p-3 sm:p-6 border-b gap-2">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-secondary-900 truncate">{user.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-secondary-500">
                <span className="capitalize">{user.role}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.role === 'lawyer' && (
                  <span className={`px-2 py-1 rounded-full text-xs ${user.isVerified ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'
                    }`}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto">
          <nav className="flex space-x-1 px-6 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                      ? 'border-b-2 border-primary-500 text-primary-600'
                      : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
          {activeTab === 'overview' && (
            <OverviewTab
              user={user}
              relatedData={relatedData}
              onStatusChange={handleStatusChange}
              onVerificationChange={handleVerificationChange}
            />
          )}
          {activeTab === 'documents' && user.role === 'lawyer' && (
            <DocumentsTab
              documents={documents}
              loading={loadingDocuments}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
          )}
          {activeTab === 'appointments' && (
            <AppointmentsTab appointments={relatedData.appointments || []} user={user} />
          )}
          {activeTab === 'feedback' && (
            <FeedbackTab
              feedback={user.role === 'client' ? relatedData.feedbackGiven : relatedData.feedbackReceived}
              user={user}
              relatedData={relatedData}
            />
          )}
          {activeTab === 'messages' && (
            <MessagesTab messages={relatedData.recentChats || []} totalMessages={relatedData.totalMessages} />
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
const OverviewTab = ({ user, relatedData, onStatusChange, onVerificationChange }) => (
  <div className="space-y-4 sm:space-y-6">
    {/* Basic Information */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div className="bg-secondary-50 p-3 sm:p-4 rounded-lg">
        <h3 className="font-semibold text-secondary-900 mb-3">Basic Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-secondary-400" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-secondary-400" />
            <span>{user.phone || 'Not provided'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-secondary-400" />
            <span>{user.address || 'Not provided'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-secondary-400" />
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-secondary-50 p-3 sm:p-4 rounded-lg">
        <h3 className="font-semibold text-secondary-900 mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {relatedData.totalAppointments || 0}
            </div>
            <div className="text-secondary-600">Total Appointments</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {relatedData.completedAppointments || 0}
            </div>
            <div className="text-secondary-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {relatedData.totalMessages || 0}
            </div>
            <div className="text-secondary-600">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {user.role === 'client' ? relatedData.totalFeedbackGiven : relatedData.totalFeedbackReceived || 0}
            </div>
            <div className="text-secondary-600">Feedback</div>
          </div>
        </div>
      </div>
    </div>

    {/* Lawyer-specific information */}
    {user.role === 'lawyer' && (
      <div className="bg-secondary-50 p-3 sm:p-4 rounded-lg">
        <h3 className="font-semibold text-secondary-900 mb-3">Lawyer Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-secondary-600">Specialization</div>
            <div className="font-medium">{user.specialization || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-sm text-secondary-600">Experience</div>
            <div className="font-medium">{user.experience || 'Not specified'} years</div>
          </div>
          <div>
            <div className="text-sm text-secondary-600">Hourly Rate</div>
            <div className="font-medium">PKR {user.hourlyRate || 'Not set'}/hour</div>
          </div>
          <div>
            <div className="text-sm text-secondary-600">Average Rating</div>
            <div className="flex items-center space-x-2">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(relatedData.averageRating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-secondary-300'
                      }`}
                  />
                ))}
              </div>
              <span className="font-medium">
                {(relatedData.averageRating || 0).toFixed(1)} ({relatedData.totalRatings || 0} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Actions */}
    <div className="bg-secondary-50 p-3 sm:p-4 rounded-lg">
      <h3 className="font-semibold text-secondary-900 mb-3">Actions</h3>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => onStatusChange(!user.isActive)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${user.isActive
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
        >
          {user.isActive ? 'Deactivate User' : 'Activate User'}
        </button>

        {user.role === 'lawyer' && (
          <button
            onClick={() => onVerificationChange(!user.isVerified)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${user.isVerified
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
              }`}
          >
            {user.isVerified ? 'Unverify Lawyer' : 'Verify Lawyer'}
          </button>
        )}
      </div>
    </div>
  </div>
)

// Appointments Tab Component
const AppointmentsTab = ({ appointments, user }) => (
  <div>
    <h3 className="font-semibold text-secondary-900 mb-4">Recent Appointments</h3>
    {appointments.length === 0 ? (
      <p className="text-secondary-500 text-center py-8">No appointments found</p>
    ) : (
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment._id} className="border rounded-lg p-4 hover:bg-secondary-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start mb-2 gap-1">
              <div>
                <div className="font-medium">
                  {user.role === 'client' ? appointment.lawyer?.name : appointment.client?.name}
                </div>
                <div className="text-sm text-secondary-500">
                  {user.role === 'client' ? appointment.lawyer?.specialization : appointment.client?.email}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'confirmed' ? 'bg-primary-100 text-primary-800' :
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                }`}>
                {appointment.status}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-secondary-600 gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(appointment.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{appointment.time}</span>
                </div>
              </div>
              <div className="font-medium">PKR {appointment.amount?.toLocaleString() || 0}</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)

// Feedback Tab Component
const FeedbackTab = ({ feedback, user, relatedData }) => (
  <div>
    <h3 className="font-semibold text-secondary-900 mb-4">
      {user.role === 'client' ? 'Feedback Given' : 'Feedback Received'}
    </h3>

    {user.role === 'lawyer' && relatedData.averageRating > 0 && (
      <div className="bg-primary-50 p-4 rounded-lg mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-primary-600">
            {relatedData.averageRating.toFixed(1)}
          </div>
          <div>
            <div className="flex">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < Math.floor(relatedData.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-secondary-300'
                    }`}
                />
              ))}
            </div>
            <div className="text-sm text-secondary-600">
              Based on {relatedData.totalRatings} reviews
            </div>
          </div>
        </div>
      </div>
    )}

    {feedback?.length === 0 ? (
      <p className="text-secondary-500 text-center py-8">No feedback found</p>
    ) : (
      <div className="space-y-4">
        {feedback?.map((item) => (
          <div key={item._id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium">
                  {user.role === 'client' ? item.lawyer?.name : item.client?.name}
                </div>
                <div className="text-sm text-secondary-500">
                  {user.role === 'client' ? item.lawyer?.specialization : ''}
                </div>
              </div>
              <div className="text-sm text-secondary-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-secondary-300'
                    }`}
                />
              ))}
              <span className="text-sm text-secondary-600">({item.rating}/5)</span>
            </div>

            {item.comment && (
              <p className="text-sm text-secondary-700 mt-2">{item.comment}</p>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)

// Messages Tab Component
const MessagesTab = ({ messages, totalMessages }) => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold text-secondary-900">Recent Messages</h3>
      <div className="text-sm text-secondary-500">Total: {totalMessages} messages</div>
    </div>

    {messages.length === 0 ? (
      <p className="text-secondary-500 text-center py-8">No messages found</p>
    ) : (
      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message._id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium">
                  {message.from?.name} → {message.to?.name}
                </div>
                <div className="text-sm text-secondary-500">
                  {message.from?.role} to {message.to?.role}
                </div>
              </div>
              <div className="text-sm text-secondary-500">
                {new Date(message.createdAt).toLocaleDateString()}
              </div>
            </div>
            <p className="text-sm text-secondary-700">{message.content}</p>
          </div>
        ))}
      </div>
    )}
  </div>
)

// Documents Tab Component
const DocumentsTab = ({ documents, loading, onViewDocument, onDownloadDocument }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-secondary-900 mb-4">Documents</h3>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-secondary-400 mx-auto mb-3" />
          <p className="text-secondary-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {documents.map((doc, index) => {
            const docId = doc.id || doc._id

            return (
              <div key={docId || index} className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-secondary-900 truncate">
                        {doc.documentType || doc.type || 'Document'}
                      </h4>
                      {getStatusBadge(doc.status)}
                    </div>
                    <p className="text-sm text-secondary-500 truncate mb-2">
                      {doc.name || doc.filename || doc.fileName || 'Unknown'}
                    </p>
                    <p className="text-xs text-secondary-400">
                      Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => docId && onViewDocument(docId)}
                        disabled={!docId}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm ${docId
                            ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                            : 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
                          }`}
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => docId && onDownloadDocument(docId, doc.name || doc.filename || doc.fileName)}
                        disabled={!docId}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm ${docId
                            ? 'bg-secondary-50 text-secondary-600 hover:bg-secondary-100'
                            : 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
                          }`}
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default UserDetailsModal