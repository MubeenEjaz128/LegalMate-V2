import React, { useState, useEffect } from 'react'
import { adminAPI, chatAPI } from '../../services/api'
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Eye,
  Archive, 
  Trash2, 
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  UserCheck,
  MessageSquare,
  Send,
  Calendar,
  Activity,
  FileText,
  RefreshCw,
  ChevronRight,
  X,
  Plus
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const MessagingOversight = () => {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [adminNotes, setAdminNotes] = useState('')
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    flaggedConversations: 0
  })

  useEffect(() => {
    loadConversations()
    loadStats()
  }, [])

  useEffect(() => {
    loadConversations()
  }, [searchQuery, statusFilter, typeFilter])

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation._id)
      setAdminNotes(selectedConversation.adminNotes || '')
    }
  }, [selectedConversation])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getMessagingConversations({
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
      setConversations(response.data.conversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await adminAPI.getMessagingStats()
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadConversationMessages = async (conversationId) => {
    try {
      const response = await adminAPI.getConversationMessages(conversationId)
      // Normalize attachment URLs for safe opening via backend /chat/file route
      const normalized = (response.data.messages || []).map((msg) => {
        if (msg?.attachment?.url) {
          try {
            const url = msg.attachment.url
            if (url.startsWith('/uploads/chat/')) {
              const filename = url.split('/').pop()
              return {
                ...msg,
                attachment: {
                  ...msg.attachment,
                  url: chatAPI.getFileUrl(filename)
                }
              }
            }
          } catch (_) {}
        }
        return msg
      })
      setMessages(normalized)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const updateAdminNotes = async () => {
    if (!selectedConversation) return

    try {
      await adminAPI.updateConversationNotes(selectedConversation._id, { notes: adminNotes })
      toast.success('Admin notes updated successfully')
      await loadConversations()
    } catch (error) {
      console.error('Error updating admin notes:', error)
      toast.error('Failed to update admin notes')
    }
  }

  const archiveConversation = async (conversationId) => {
    const reason = prompt('Please provide a reason for archiving this conversation:')
    if (!reason) return

    try {
      await adminAPI.archiveConversation(conversationId, { reason })
      toast.success('Conversation archived successfully')
      await loadConversations()
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error archiving conversation:', error)
      toast.error('Failed to archive conversation')
    }
  }

  const deleteConversation = async (conversationId) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return

    try {
      await adminAPI.deleteConversation(conversationId)
      toast.success('Conversation deleted successfully')
      await loadConversations()
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }

  const deleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      await adminAPI.deleteMessage(messageId)
      toast.success('Message deleted successfully')
      await loadConversationMessages(selectedConversation._id)
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const participants = conv.participants?.map(p => p.name).join(' ') || ''
      if (!participants.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
    }
    return true
  })

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading messaging data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary-900">Messaging Oversight</h2>
          <p className="text-secondary-600 mt-2">Monitor and manage all platform conversations</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              loadConversations()
              loadStats()
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Admin Mode</span>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl border border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-600 text-sm font-medium">Total Conversations</p>
              <p className="text-3xl font-bold text-primary-900">{stats.totalConversations || 0}</p>
            </div>
            <div className="bg-primary-200 p-3 rounded-full">
              <MessageSquare className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Active Conversations</p>
              <p className="text-3xl font-bold text-green-900">{stats.activeConversations || 0}</p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Messages</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalMessages || 0}</p>
            </div>
            <div className="bg-purple-200 p-3 rounded-full">
              <Send className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Flagged Conversations</p>
              <p className="text-3xl font-bold text-orange-900">{stats.flaggedConversations || 0}</p>
            </div>
            <div className="bg-orange-200 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-secondary-200 shadow-sm">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Conversations</h3>
              <span className="bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full text-xs font-medium">
                {filteredConversations.length} total
              </span>
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search by participant name..."
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="flagged">Flagged</option>
                </select>
                
                <select
                  className="flex-1 px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="lawyer-client">Client-Lawyer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversations found</p>
                <p className="text-xs text-secondary-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="divide-y divide-secondary-100">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-secondary-50 ${
                      selectedConversation?._id === conversation._id
                        ? 'bg-primary-50 border-r-2 border-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex -space-x-1">
                            {conversation.participants?.slice(0, 2).map((participant, idx) => (
                              <div
                                key={idx}
                                className="h-6 w-6 bg-secondary-300 rounded-full flex items-center justify-center text-xs font-medium text-secondary-700 border-2 border-white"
                              >
                                {participant.name?.charAt(0)?.toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-secondary-900 truncate">
                              {conversation.participants?.map(p => p.name).join(' & ') || 'Unknown'}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {conversation.participants?.map(p => p.role).join(' - ') || ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            conversation.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : conversation.status === 'archived'
                              ? 'bg-secondary-100 text-secondary-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {conversation.status || 'active'}
                          </span>
                          <span className="text-xs text-secondary-400">
                            {conversation.messageCount || 0} msgs
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-secondary-400 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-secondary-200 shadow-sm">
          {selectedConversation ? (
            <ConversationDetails
              conversation={selectedConversation}
              messages={messages}
              adminNotes={adminNotes}
              setAdminNotes={setAdminNotes}
              onUpdateNotes={updateAdminNotes}
              onArchive={archiveConversation}
              onDelete={deleteConversation}
              onDeleteMessage={deleteMessage}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-secondary-300" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">Select a Conversation</h3>
                <p className="text-secondary-500">Choose a conversation from the list to view details and messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Enhanced Conversation Details Component
const ConversationDetails = ({ 
  conversation, 
  messages, 
  adminNotes, 
  setAdminNotes, 
  onUpdateNotes, 
  onArchive, 
  onDelete,
  onDeleteMessage,
  onClose
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-secondary-400 hover:text-secondary-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">
                {conversation.participants?.map(p => p.name).join(' & ') || 'Conversation'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-secondary-500 mt-1">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {new Date(conversation.createdAt).toLocaleDateString()}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{messages.length} messages</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onArchive(conversation._id)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
            >
              <Archive className="h-3 w-3" />
              <span>Archive</span>
            </button>
            <button
              onClick={() => onDelete(conversation._id)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-secondary-300" />
            <p className="text-secondary-500">No messages in this conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message._id} className="bg-secondary-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600">
                        {message.sender?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">
                        {message.sender?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {message.sender?.role || 'Unknown'} • {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteMessage(message._id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="ml-11 space-y-2">
                  {message.content && (
                    <p className="text-secondary-700">{message.content}</p>
                  )}
                  {message.attachment && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-secondary-100 rounded-md">
                      <span className="text-secondary-600 text-sm">📎 {message.attachment.name}</span>
                      <a
                        href={message.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 text-sm hover:underline"
                      >
                        Open
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Notes */}
      <div className="p-6 border-t border-secondary-200 bg-secondary-50">
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-sm font-medium text-secondary-700">
            <FileText className="h-4 w-4" />
            <span>Admin Notes</span>
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add private admin notes about this conversation..."
            className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
          />
          <button
            onClick={onUpdateNotes}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Update Notes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessagingOversight 