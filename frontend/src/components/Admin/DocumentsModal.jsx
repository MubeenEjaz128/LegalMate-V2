import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, File, Eye, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const DocumentsModal = ({ lawyer, isOpen, onClose, onVerify }) => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && lawyer) {
      fetchDocuments()
    }
  }, [isOpen, lawyer])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      console.log('Fetching documents for lawyer:', lawyer)
      const response = await api.get('/documents/admin/all')
      console.log('Documents response received:', response.data)
      const lawyers = response.data
      const currentLawyer = lawyers.find(l => l.id === lawyer._id)
      if (currentLawyer && currentLawyer.documents) {
        setDocuments(currentLawyer.documents)
      } else {
        console.log('No documents found for lawyer:', lawyer._id)
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
      
      // Create a blob URL for viewing
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Clean up the blob URL after a short delay
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
      
      // Create a blob URL for downloading
      const blob = new Blob([response.data], { type: response.headers['content-type'] })
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element for download
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const handleDocumentStatusUpdate = async (documentId, status) => {
    try {
      await api.patch(`/documents/admin/${documentId}/status`, { status })
      
      // Update local state
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId ? { ...doc, status } : doc
        )
      )
      toast.success(`Document ${status} successfully`)
    } catch (error) {
      console.error('Error updating document status:', error)
      toast.error('Error updating document status')
    }
  }

  const getFileIcon = (type) => {
    if (type.includes('pdf')) {
      return <File className="h-8 w-8 text-red-600" />
    } else if (type.includes('image')) {
      return <File className="h-8 w-8 text-primary-600" />
    }
    return <File className="h-8 w-8 text-secondary-600" />
  }

  const getDocumentTypeName = (documentType) => {
    const typeNames = {
      'lawDegree': 'Law Degree Certificate',
      'barLicense': 'Bar Council License', 
      'professionalId': 'Professional ID Card',
      'other': 'Other Document'
    }
    return typeNames[documentType] || documentType
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900">Verification Documents</h2>
            <button 
              onClick={onClose}
              className="text-secondary-500 hover:text-secondary-700"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Lawyer Info */}
          <div className="bg-secondary-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-secondary-900">{lawyer.name}</h3>
                <p className="text-secondary-600 text-sm sm:text-base break-all">{lawyer.email}</p>
                <p className="text-secondary-600 text-sm sm:text-base">{lawyer.specialization}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-secondary-500">Applied on</p>
                <p className="font-medium text-secondary-900">
                  {lawyer.createdAt ? new Date(lawyer.createdAt).toLocaleDateString() : 'Date not available'}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-primary-50 border border-primary-200 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
            <h3 className="font-medium text-primary-800 mb-2">Document Review Instructions</h3>
            <ul className="text-primary-700 text-sm space-y-1">
              <li>• Verify all documents are authentic and belong to the applicant</li>
              <li>• Check that the law degree is from a recognized institution</li>
              <li>• Ensure the bar council license is active and valid</li>
              <li>• Confirm identity documents match the provided information</li>
            </ul>
          </div>

          {/* Documents List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-secondary-600">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <File className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No Documents Found</h3>
              <p className="text-secondary-500">This lawyer has not uploaded any verification documents yet.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-secondary-900">Uploaded Documents ({documents.length})</h3>
              {documents.map((doc) => (
                <div key={doc.id} className="border border-secondary-200 rounded-lg p-3 sm:p-4 hover:bg-secondary-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <File className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-secondary-900 text-sm sm:text-base">{getDocumentTypeName(doc.documentType)}</h4>
                        <p className="text-xs sm:text-sm text-secondary-600 mt-1 truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-secondary-500 mt-2">
                          Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Date not available'} 
                          {doc.uploadedAt ? ` at ${new Date(doc.uploadedAt).toLocaleTimeString()}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            doc.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : doc.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.status === 'approved' ? 'Approved' : doc.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary-100 text-primary-800 rounded-md hover:bg-primary-200 transition-colors text-xs sm:text-sm"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-secondary-100 text-secondary-800 rounded-md hover:bg-secondary-200 transition-colors text-xs sm:text-sm"
                      >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Download
                      </button>
                      {doc.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDocumentStatusUpdate(doc.id, 'approved')}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-xs sm:text-sm"
                          >
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleDocumentStatusUpdate(doc.id, 'rejected')}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-xs sm:text-sm"
                          >
                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Status */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">Verification Decision</h3>
            <p className="text-yellow-700 text-sm">
              After reviewing all documents and profile information, please approve or reject this lawyer application.
              Approved lawyers will be able to accept client consultations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6 border-t">
            <button
              onClick={() => onVerify(lawyer._id, 'approve')}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
            >
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Approve Application
            </button>
            <button
              onClick={() => onVerify(lawyer._id, 'reject')}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base"
            >
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Reject Application
            </button>
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-400 transition-colors font-medium text-sm sm:text-base"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentsModal