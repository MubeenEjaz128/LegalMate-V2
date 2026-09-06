import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, User, FileText, Eye, Download, File } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const LawyerProfileModal = ({ lawyer, isOpen, onClose, onVerify }) => {
  const [activeTab, setActiveTab] = useState('profile')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && lawyer && activeTab === 'documents') {
      fetchDocuments()
    }
  }, [isOpen, lawyer, activeTab])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/documents/admin/all')
      const lawyers = response.data
      const currentLawyer = lawyers.find(l => l.id === lawyer._id)
      if (currentLawyer && currentLawyer.documents) {
        setDocuments(currentLawyer.documents)
      } else {
        setDocuments([])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to fetch documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async (doc) => {
    try {
      const response = await api.get(`/documents/view/${doc.id}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to view document')
    }
  }

  const handleDownloadDocument = async (doc) => {
    try {
      const response = await api.get(`/documents/view/${doc.id}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Lawyer Details</h2>
            <button 
              onClick={onClose}
              className="text-secondary-500 hover:text-secondary-700"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-secondary-200 mb-4 sm:mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile Information
                </div>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Lawyer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-500">Full Name</label>
                <p className="text-lg text-secondary-900">{lawyer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Email</label>
                <p className="text-secondary-900">{lawyer.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Phone</label>
                <p className="text-secondary-900">{lawyer.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Specialization</label>
                <p className="text-secondary-900">{lawyer.specialization || 'Not specified'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-500">Experience</label>
                <p className="text-secondary-900">{lawyer.experience ? `${lawyer.experience} years` : 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Hourly Rate</label>
                <p className="text-secondary-900">{lawyer.hourlyRate ? `${lawyer.currency || 'PKR'} ${lawyer.hourlyRate}` : 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Address</label>
                <p className="text-secondary-900">{lawyer.address || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary-500">Registration Date</label>
                <p className="text-secondary-900">{new Date(lawyer.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {lawyer.bio && (
            <div className="mb-6">
              <label className="text-sm font-medium text-secondary-500">Biography</label>
              <p className="text-secondary-900 mt-1 bg-secondary-50 p-4 rounded-lg">{lawyer.bio}</p>
            </div>
          )}

          {/* Languages */}
          {lawyer.languages && lawyer.languages.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-secondary-500">Languages</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {lawyer.languages.map((language, index) => (
                  <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                    {language}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Specializations */}
          {lawyer.specializations && lawyer.specializations.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-secondary-500">All Specializations</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {lawyer.specializations.map((spec, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

              {/* Verification Status */}
              {!lawyer.isVerified && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">Verification Status</h3>
                  <p className="text-yellow-700 text-sm">
                    This lawyer is pending verification. Please review all information and documents before making a decision.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <File className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">No Documents Found</h3>
                  <p className="text-secondary-600">This lawyer hasn't uploaded any documents yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <FileText className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-secondary-900 mb-1">
                              {doc.type || 'Document'}
                            </h4>
                            <p className="text-sm text-secondary-600 mb-2">
                              {doc.name || 'No name available'}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-secondary-500">
                              <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                              <span className={`px-2 py-1 rounded-full ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {doc.status || 'pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View Document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                            title="Download Document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
            {!lawyer.isVerified && onVerify && (
              <>
                <button
                  onClick={() => onVerify(lawyer._id, 'approve')}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                >
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Approve Lawyer
                </button>
                <button
                  onClick={() => onVerify(lawyer._id, 'reject')}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Reject Application
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-400 transition-colors sm:ml-auto text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LawyerProfileModal