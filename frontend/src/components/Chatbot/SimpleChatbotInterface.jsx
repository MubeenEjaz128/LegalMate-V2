import React, { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, User, Bot, Plus, Menu, X, Clock, Trash2, Minimize2 } from 'lucide-react'
import { aiAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

const SimpleChatbotInterface = ({ onClose, fullPage = false, isFloating = false, onMinimize }) => {
  const { user, isAuthenticated } = useAuthStore()
  const isUserAuthenticated = Boolean(isAuthenticated && user)

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
    const userId = user?._id || 'guest'
    const stored = localStorage.getItem(`aiChatSessionId_${userId}`)
    return stored || `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  const [sessions, setSessions] = useState([])
  // When floating, always default to hidden sidebar and treat as mobile
  const [showSidebar, setShowSidebar] = useState(() => {
    if (isFloating) return false;
    return window.innerWidth > 768; // Default based on screen size for non-floating (full page)
  })
  const [loadingSessions, setLoadingSessions] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      // If floating, never auto-open sidebar on resize, let it stay closed or manually toggled
      // If NOT floating, respect breakpoint
      if (!isFloating) {
        if (window.innerWidth < 768) {
          setShowSidebar(false)
        } else {
          setShowSidebar(true)
        }
      } else {
        // In floating mode, ensure it stays responsive (e.g. if we want to force close on very small screens, or just leave it be)
        // For now, let's just make sure we don't accidentally open it
        // Actually, if we are in floating mode, we probably just want to keep the current state unless explicitly changed?
        // Or if we resize the window, does the floating window resize?
        // The floating window is fixed width or max-width.
        // Let's just NOT auto-open it in floating mode.
      }
    }

    // Only add resize listener if not floating, or different logic for floating
    if (!isFloating) {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      if (!isFloating) window.removeEventListener('resize', handleResize)
    }
  }, [isFloating])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputMessage])

  // Load sessions on mount
  useEffect(() => {
    if (!isUserAuthenticated) return
    loadChatSessions()
  }, [isUserAuthenticated])

  // Restore session when user logs in (no sessionId in deps to avoid self-triggering loop)
  useEffect(() => {
    if (!isUserAuthenticated || !user?._id) return
    const storedSession = localStorage.getItem(`aiChatSessionId_${user._id}`)
    if (storedSession) {
      setSessionId(prev => prev !== storedSession ? storedSession : prev)
    }
  }, [isUserAuthenticated, user?._id])

  // Save session ID and load history when session changes
  useEffect(() => {
    if (!isUserAuthenticated || !sessionId) return
    const userId = user?._id || 'guest'
    localStorage.setItem(`aiChatSessionId_${userId}`, sessionId)
    loadChatHistory()

    // Initialize/Warm-up session on the backend
    const initSession = async () => {
      try {
        await aiAPI.initSession(sessionId)
      } catch (error) {
        console.warn('Session initialization warning:', error)
      }
    }
    initSession()
  }, [isUserAuthenticated, sessionId, user?._id])

  const loadChatSessions = async () => {
    if (!isUserAuthenticated) return
    try {
      setLoadingSessions(true)
      const response = await aiAPI.getChatSessions()

      if (response.data && response.data.success) {
        const newSessions = response.data.sessions || []
        setSessions(newSessions)
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('❌ Failed to load chat sessions:', error)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadChatHistory = async () => {
    if (!isUserAuthenticated) return
    try {
      const response = await aiAPI.getChatHistory(sessionId)
      if (response.data && response.data.success && response.data.conversations.length > 0) {
        const historyMessages = response.data.conversations.map((chat) => ([
          {
            id: `user_${chat.id}`,
            type: 'user',
            content: chat.userQuery,
            timestamp: new Date(chat.timestamp)
          },
          {
            id: `bot_${chat.id}`,
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
        setMessages([{
          id: 1,
          type: 'bot',
          content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.log('No previous chat history found:', error.message)
    }
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!isUserAuthenticated) return
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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }

    try {
      let response;
      const MAX_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          }
          response = await aiAPI.chat(inputMessage, sessionId);
          break;
        } catch (err) {
          const status = err.response?.status;
          if (status !== 500 && status !== 503) {
            throw err;
          }
          if (attempt === MAX_RETRIES) throw err;
        }
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.message || response.data.response || 'I apologize, but I couldn\'t process your request.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])

      setTimeout(() => {
        loadChatSessions()
      }, 1000)
    } catch (error) {
      console.error('Chatbot error:', error)
      let errorMessageContent = 'I apologize, but I\'m having trouble processing your request right now. Please try again.';

      if (error.response?.status === 503) {
        errorMessageContent = 'The AI service is currently warming up or busy. Please try sending your message again in a few seconds.';
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: errorMessageContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    if (!isUserAuthenticated) return
    const userId = user?._id || 'guest'
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const newSessionId = `session_${userId}_${timestamp}_${randomStr}`

    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: 'Hello! I am your LegalMate AI assistant. How can I help you today with your legal questions?',
      timestamp: new Date()
    }])

    setSessionId(newSessionId)
    toast.success('New chat started!')
    if (window.innerWidth < 768) setShowSidebar(false) // Close sidebar on mobile
  }

  const switchToSession = (newSessionId) => {
    if (!isUserAuthenticated) return
    setSessionId(newSessionId)
    loadChatSessions()
    if (window.innerWidth < 768) setShowSidebar(false) // Close sidebar on mobile
  }

  const deleteSession = async (sessionIdToDelete, e) => {
    if (!isUserAuthenticated) return
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this chat?')) {
      return
    }

    try {
      await aiAPI.deleteSession(sessionIdToDelete)
      setSessions(prev => prev.filter(session => session.sessionId !== sessionIdToDelete))
      if (sessionId === sessionIdToDelete) {
        startNewChat()
      }
      toast.success('Chat deleted successfully')
    } catch (error) {
      toast.error('Failed to delete chat.')
    }
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatSessionTime = (timestamp) => {
    if (!timestamp) return 'Unknown'
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

  if (!isUserAuthenticated) {
    return (
      <div className={`flex bg-white rounded-lg shadow-lg overflow-hidden border ${fullPage ? 'h-full' : 'h-full'}`}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-secondary-50">
          <div className="max-w-md bg-white p-6 rounded-2xl shadow-sm border border-secondary-100">
            <Bot className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-800 mb-2">Login Required</h3>
            <p className="text-secondary-600 mb-6">
              Please login to your account to access the AI Legal Assistant.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-secondary-100 text-secondary-700 rounded-xl hover:bg-secondary-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (

    <div className={`flex bg-white ${fullPage ? 'h-[calc(100vh-12rem)] rounded-lg shadow-lg border overflow-hidden' : 'h-full flex-col ' + (isFloating ? '' : 'md:flex-row')}`}>

      {/* Sidebar Overlay (Mobile / Floating) */}
      {(showSidebar && (window.innerWidth < 768 || isFloating)) && (
        <div
          className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-secondary-100 z-50 transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        ${!isFloating ? 'md:relative md:translate-x-0 md:z-auto' : ''}
        ${(!isFloating && !showSidebar) ? 'md:hidden' : ''}
        ${!isFloating && showSidebar ? 'md:w-80' : ''}
      `}
        style={isFloating ? { position: 'absolute', height: '100%' } : {}}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-secondary-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-secondary-900 truncate">
                  {user ? `${user.name || user.email}` : 'Guest User'}
                </h4>
              </div>
            </div>
            {/* Always show close on mobile or floating */}
            {(window.innerWidth < 768 || isFloating) && (
              <button onClick={() => setShowSidebar(false)} className="p-1 rounded-full hover:bg-secondary-100">
                <X className="h-5 w-5 text-secondary-500" />
              </button>
            )}
          </div>
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="p-4 text-center text-secondary-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-xs">Loading...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-secondary-400">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No chat history</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => switchToSession(session.sessionId)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all border ${session.sessionId === sessionId
                    ? 'bg-primary-50 border-primary-200 shadow-sm'
                    : 'bg-white border-transparent hover:bg-secondary-50'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${session.sessionId === sessionId ? 'text-primary-900' : 'text-secondary-900'}`}>
                        {session.title || 'Legal Consultation'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-secondary-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatSessionTime(session.lastActivity)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.sessionId, e)}
                      className="p-1.5 text-secondary-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        {/* Chat Header */}
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-100 bg-white z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-600 active:bg-secondary-200 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-col">
              <h3 className="font-semibold text-secondary-800 text-sm md:text-base">AI Assistant</h3>
              <p className="text-xs text-secondary-500 hidden sm:block">24/7 Legal Support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onMinimize && (
              <button onClick={onMinimize} className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500" title="Minimize">
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-error-50 rounded-lg text-secondary-500 hover:text-error-500 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-secondary-50 scroll-smooth min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end space-x-2 max-w-[85%] sm:max-w-[75%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm ${message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-secondary-200 text-primary-600'
                  }`}>
                  {message.type === 'user' ? (
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </div>
                <div className={`px-4 py-3 rounded-2xl shadow-sm ${message.type === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-white border border-secondary-200 text-secondary-800 rounded-bl-none'
                  }`}>
                  {message.type === 'bot' ? (
                    <div className="text-sm prose prose-sm max-w-none prose-p:text-secondary-700 prose-headings:text-secondary-900 prose-ul:text-secondary-700 prose-ol:text-secondary-700 prose-li:text-secondary-700">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-loose" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside pl-5 mb-4 space-y-2 marker:text-secondary-400" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside pl-5 mb-4 space-y-2 marker:text-secondary-500" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-secondary-900 mb-3 mt-4" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-base font-bold text-secondary-900 mb-2 mt-3" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-secondary-900 mb-2 mt-3" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold text-secondary-900" {...props} />,
                          a: ({ node, ...props }) => <a className="text-primary-600 hover:underline font-medium" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-secondary-200 pl-4 py-1 italic text-secondary-600 my-4" {...props} />,
                        }}
                      >
                        {(() => {
                          const preprocessContent = (text) => {
                            if (!text) return '';

                            let processed = text;

                            // 1. Ensure headings start on new lines
                            processed = processed.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n\n$2');

                            // 2. Ensure spacing before lists (Numbered or Bullet)
                            // Only force newline if it's clearly a list item markers following non-newline character
                            processed = processed.replace(/([^\n])\s*(\d+\.|[•*-])\s+/g, '$1\n\n$2 ');

                            // 3. Normalize bullets (• -> -) 
                            processed = processed.replace(/•/g, '-');

                            // 4. Max 2 newlines
                            processed = processed.replace(/\n{3,}/g, '\n\n');

                            return processed.trim();
                          };
                          return preprocessContent(message.content);
                        })()}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className={`text-[10px] mt-1.5 text-right opacity-70`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-secondary-200">
                  <Bot className="h-4 w-4 text-secondary-400" />
                </div>
                <div className="bg-white border border-secondary-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-white border-t border-secondary-100 z-10">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="flex-1 bg-secondary-50 rounded-2xl focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask legal questions..."
                className="w-full px-4 py-3 bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm sm:text-base text-secondary-700 placeholder-secondary-400"
                rows="1"
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
              className="flex-shrink-0 p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="text-[10px] text-secondary-400 mt-2 text-center">
            General info only. Consult a lawyer for advice.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SimpleChatbotInterface
