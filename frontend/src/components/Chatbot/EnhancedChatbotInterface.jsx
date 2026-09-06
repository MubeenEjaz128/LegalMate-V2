import React, { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, User, Bot, Plus, MoreHorizontal, Clock, Menu, X } from 'lucide-react'
import { aiAPI } from '../../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const EnhancedChatbotInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem('aiChatSessionId')
    return stored || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  const [sessions, setSessions] = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load sessions on mount
  useEffect(() => {
    loadChatSessions()
  }, [])

  // Save session ID and load history when session changes
  useEffect(() => {
    localStorage.setItem('aiChatSessionId', sessionId)
    loadChatHistory()
  }, [sessionId])

  const loadChatSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await aiAPI.getSessions()
      if (Array.isArray(response.data)) {
        setSessions(response.data)
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadChatHistory = async () => {
    if (!sessionId) return;
    try {
      const response = await aiAPI.getSessionMessages(sessionId)
      if (Array.isArray(response.data) && response.data.length > 0) {
        const historyMessages = response.data.map((chat, index) => ([
          {
            id: `user_${chat._id}`,
            type: 'user',
            content: chat.userQuery,
            timestamp: new Date(chat.timestamp)
          },
          {
            id: `bot_${chat._id}`,
            type: 'bot', 
            content: chat.aiResponse,
            timestamp: new Date(chat.timestamp)
          }
        ])).flat()
        
        setMessages([
          {
            id: 1,
            type: 'bot',
            content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
            timestamp: new Date()
          },
          ...historyMessages
        ])
      } else {
        // Reset to welcome message for new sessions
        setMessages([{
          id: 1,
          type: 'bot',
          content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.log('No previous chat history found or error loading:', error.message)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await aiAPI.createSession();
      const newSession = response.data;
      setSessionId(newSession.sessionId);
      setSessions(prev => [newSession, ...prev]);
      setMessages([{
        id: 1,
        type: 'bot',
        content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  }


  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await aiAPI.chat(inputMessage, sessionId)
      
      // Update session ID if backend returned a different one (e.g. if original was invalid)
      if (response.data.sessionId && response.data.sessionId !== sessionId) {
        setSessionId(response.data.sessionId)
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.message || response.data.response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMessage])
      
      // Refresh sessions list to show updated conversation
      loadChatSessions()
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again or consider connecting with a lawyer for more specific assistance.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('Failed to get response from AI assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatSessionTime = (timestamp) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }


  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-secondary-50 border-r border-secondary-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-secondary-200">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="p-4 text-center text-secondary-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm">Loading chats...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-secondary-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No previous chats</p>
              </div>
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => setSessionId(session.sessionId)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors hover:bg-secondary-100 ${
                      session.sessionId === sessionId ? 'bg-primary-50 border-l-4 border-primary-600' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-secondary-900 truncate">
                          {session.title || 'New Chat'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-secondary-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-white">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-secondary-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-secondary-800">AI Legal Assistant</h3>
              <p className="text-xs text-secondary-500">Powered by LegalMate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showSidebar && (
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-secondary-100 rounded-lg"
                title="Hide sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-xs lg:max-w-2xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white border border-secondary-200 text-secondary-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white border border-secondary-200 text-secondary-800 shadow-sm'
                }`}>
                  {message.type === 'bot' ? (
                    <div className="text-sm prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2: ({node, ...props}) => <h2 className="text-base font-semibold text-secondary-800 mt-3 mb-2 first:mt-0" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-secondary-800 mt-2 mb-1" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                          li: ({node, ...props}) => <li className="text-secondary-700 text-sm" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-secondary-900" {...props} />,
                          p: ({node, ...props}) => <p className="text-secondary-700 text-sm mb-2 last:mb-0" {...props} />,
                          table: ({node, ...props}) => <table className="min-w-full divide-y divide-secondary-200 my-3 text-xs border border-secondary-300 rounded-lg overflow-hidden" {...props} />,
                          thead: ({node, ...props}) => <thead className="bg-secondary-50" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-secondary-200" {...props} />,
                          th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider" {...props} />,
                          td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-xs text-secondary-900" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-primary-100' : 'text-secondary-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-xs lg:max-w-2xl">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-secondary-200 text-secondary-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white border border-secondary-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-secondary-200">
          <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me about Punjab laws..."
                className="w-full px-4 py-3 border border-secondary-300 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="flex-shrink-0 p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="text-xs text-secondary-500 mt-2 text-center">
            This AI assistant provides general information only. For specific legal advice, please consult with a qualified lawyer.
          </p>
        </div>
      </div>
    </div>
  )
}

export default EnhancedChatbotInterface
