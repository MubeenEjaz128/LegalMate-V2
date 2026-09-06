import React, { useState } from 'react'
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react'
import SimpleChatbotInterface from './SimpleChatbotInterface'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

const FloatingChatbot = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const location = useLocation()

    // Hide on authentication pages or specific routes if needed
    const hiddenRoutes = ['/login', '/register', '/forgot-password']
    if (hiddenRoutes.includes(location.pathname)) return null

    const toggleOpen = () => {
        setIsOpen(!isOpen)
        setIsMinimized(false)
    }

    const toggleMinimize = (e) => {
        e.stopPropagation()
        setIsMinimized(!isMinimized)
    }

    React.useEffect(() => {
        const handleOpenChat = () => {
            setIsOpen(true)
            setIsMinimized(false)
        }
        window.addEventListener('open-floating-chatbot', handleOpenChat)
        return () => window.removeEventListener('open-floating-chatbot', handleOpenChat)
    }, [])

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[90vw] md:w-[450px] shadow-2xl rounded-xl overflow-hidden border border-secondary-200 bg-white"
                        style={{ maxHeight: 'calc(100vh - 100px)' }}
                    >
                        <div className="h-[600px] max-h-[80vh] flex flex-col relative">
                            {/* Controls Header - overlaid or part of the component? 
                   SimpleChatbotInterface has its own header. 
                   We might want to wrap it or modify SimpleChatbotInterface to accept external controls.
                   For now, let's just wrap it.
               */}
                            <SimpleChatbotInterface onClose={() => setIsOpen(false)} isFloating={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={isOpen && !isMinimized ? () => setIsMinimized(true) : toggleOpen}
                className={`flex items-center justify-center shadow-lg transition-all duration-300 ${isOpen && !isMinimized
                    ? 'w-12 h-12 rounded-full bg-secondary-200 text-secondary-600 hover:bg-secondary-300'
                    : 'w-14 h-14 rounded-full bg-primary-600 text-white hover:bg-primary-700 hover:scale-105'
                    }`}
                title={isOpen ? "Minimize Chat" : "Open Chat Helper"}
            >
                {isOpen && !isMinimized ? (
                    <Minimize2 className="h-6 w-6" />
                ) : (
                    <MessageCircle className="h-7 w-7" />
                )}
            </button>
        </div>
    )
}

export default FloatingChatbot
