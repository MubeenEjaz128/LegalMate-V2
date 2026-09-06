import React, { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, User, Bot } from 'lucide-react'
import { aiAPI } from '../../services/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ChatbotInterface = () => {
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
    // Get session ID from localStorage or generate new one
    const stored = localStorage.getItem('aiChatSessionId')
    return stored || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Save session ID and load history on mount
  useEffect(() => {
    localStorage.setItem('aiChatSessionId', sessionId)
    loadChatHistory()
  }, [sessionId])

  const loadChatHistory = async () => {
    try {
      const response = await aiAPI.getChatHistory(sessionId)
      if (response.data.success && response.data.conversations.length > 0) {
        const historyMessages = response.data.conversations.map((chat, index) => ([
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
        
        // Add history messages before the welcome message
        setMessages(prev => [prev[0], ...historyMessages])
      }
    } catch (error) {
      console.log('No previous chat history found or error loading:', error.message)
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
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.message || response.data.response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again or consider connecting with a lawyer for more specific assistance.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to get response from AI assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const startNewChat = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
    setMessages([{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI legal assistant. I can help you with basic legal questions about Punjab laws. What would you like to know?',
      timestamp: new Date()
    }])
    localStorage.setItem('aiChatSessionId', newSessionId)
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header with New Chat Button */}
      <div className="flex items-center justify-between p-3 border-b border-secondary-200 bg-secondary-50">
        <h3 className="text-sm font-medium text-secondary-700">AI Legal Assistant</h3>
        <button
          onClick={startNewChat}
          className="px-3 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          New Chat
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-secondary-200 text-secondary-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div className={`chat-bubble ${
                message.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'
              }`}>
                {message.type === 'bot' ? (
                  <div className="text-sm prose prose-sm max-w-none prose-headings:text-secondary-800 prose-strong:text-secondary-900 prose-p:text-secondary-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom components for better styling
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-secondary-800 mt-4 mb-2 first:mt-0" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold text-secondary-800 mt-3 mb-1" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                        li: ({node, ...props}) => <li className="text-secondary-700" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-secondary-900" {...props} />,
                        p: ({node, ...props}) => <p className="text-secondary-700 mb-2 last:mb-0" {...props} />,
                        table: ({node, ...props}) => <table className="min-w-full divide-y divide-secondary-200 my-3 text-sm border border-secondary-300 rounded-lg overflow-hidden" {...props} />,
                        thead: ({node, ...props}) => <thead className="bg-secondary-50" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-secondary-200" {...props} />,
                        th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider border-r border-secondary-200 last:border-r-0" {...props} />,
                        td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-secondary-900 border-r border-secondary-200 last:border-r-0" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-3 border-secondary-200" {...props} />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-primary-100' : 'text-secondary-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-200 text-secondary-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="chat-bubble chat-bubble-bot">
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
      <div className="border-t border-secondary-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about Punjab laws..."
            className="flex-1 input-field"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-2 text-xs text-secondary-500 text-center">
          <p>This AI assistant provides general information only. For specific legal advice, please consult with a qualified lawyer.</p>
        </div>
      </div>
    </div>
  )
}

export default ChatbotInterface 