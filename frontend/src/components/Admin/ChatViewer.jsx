import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, MessageSquare, Calendar, Clock, Eye } from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const ChatViewer = () => {
  const { chatId } = useParams()
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})

  useEffect(() => {
    fetchChatDetails()
  }, [chatId])

  const fetchChatDetails = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getChatMessages(chatId)
      setChat(response.data.chat)
      setMessages(response.data.messages)
      setPagination(response.data.pagination || {})
    } catch (error) {
      console.error('Error fetching chat details:', error)
      toast.error('Failed to load chat details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">Chat not found</h2>
        <p className="text-secondary-600 mb-4">The chat you're looking for doesn't exist or may have been removed.</p>
        <Link to="/admin-dashboard" className="btn-primary">
          Back to Admin Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/admin-dashboard"
            className="flex items-center gap-2 text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Admin Dashboard
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            chat.status === 'active' ? 'bg-green-100 text-green-800' :
            chat.status === 'ended' ? 'bg-red-100 text-red-800' :
            'bg-secondary-100 text-secondary-800'
          }`}>
            {chat.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Chat Information */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Chat Details</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Participants */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Participants
            </h3>
            
            <div className="space-y-4">
              <div className="bg-secondary-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">Client</div>
                    <div className="text-sm text-secondary-600">{chat.client?.name}</div>
                    <div className="text-sm text-secondary-500">{chat.client?.email}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">Lawyer</div>
                    <div className="text-sm text-secondary-600">{chat.lawyer?.name}</div>
                    <div className="text-sm text-secondary-500">{chat.lawyer?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Information */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-secondary-600">Chat ID:</span>
                <span className="font-mono text-sm bg-secondary-100 px-2 py-1 rounded">
                  {chat._id}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary-400" />
                <span className="text-secondary-600">Created:</span>
                <span className="text-secondary-900">{formatDate(chat.createdAt)}</span>
              </div>
              
              {chat.endedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-secondary-400" />
                  <span className="text-secondary-600">Ended:</span>
                  <span className="text-secondary-900">{formatDate(chat.endedAt)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-secondary-400" />
                <span className="text-secondary-600">Messages:</span>
                <span className="text-secondary-900">{messages.length}</span>
              </div>
            </div>

            {/* Related Appointment */}
            {chat.appointment && (
              <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                <h4 className="font-medium text-primary-900 mb-2">Related Appointment</h4>
                <div className="text-sm text-primary-800">
                  <div>Date: {formatDate(chat.appointment.date)}</div>
                  <div>Time: {chat.appointment.time}</div>
                  <div>Type: {chat.appointment.consultationType}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages ({messages.length})
          </h2>
        </div>
        
        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-500">No messages in this chat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message._id} className="flex gap-3">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.sender.role === 'lawyer' ? 'bg-green-100' : 'bg-primary-100'
                  }`}>
                    <User className={`h-4 w-4 ${
                      message.sender.role === 'lawyer' ? 'text-green-600' : 'text-primary-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-secondary-900">
                        {message.sender.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        message.sender.role === 'lawyer' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {message.sender.role}
                      </span>
                      <span className="text-xs text-secondary-500">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    
                    <div className="bg-secondary-50 p-3 rounded-lg">
                      {message.type === 'text' ? (
                        <p className="text-secondary-900">{message.content}</p>
                      ) : message.type === 'file' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-primary-600">📎 File shared</span>
                          <span className="text-sm text-secondary-500">{message.fileName}</span>
                        </div>
                      ) : (
                        <p className="text-secondary-900">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 border-t border-secondary-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchChatDetails(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => fetchChatDetails(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-secondary-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> messages
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => fetchChatDetails(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-secondary-300 bg-white text-sm font-medium text-secondary-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchChatDetails(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatViewer 