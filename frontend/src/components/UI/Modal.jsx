import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './index'

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = ''
}) => {
  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]'
  }

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <motion.button
            type="button"
            className="fixed inset-0 h-full w-full bg-secondary-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-label="Close modal overlay"
          />

          <div className="relative flex min-h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full ${sizes[size] || sizes.md} rounded-3xl border border-white/70 bg-white/92 p-6 shadow-strong backdrop-blur-xl ${className}`}
            >
              {(title || showCloseButton) && (
                <div className="mb-5 flex items-center justify-between border-b border-secondary-200/80 pb-4">
                  {title ? <h3 className="font-display text-xl font-semibold text-secondary-900">{title}</h3> : <span />}

                  {showCloseButton && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={X}
                      className="rounded-xl px-2.5 py-2 text-secondary-500 hover:text-secondary-700"
                      onClick={onClose}
                    />
                  )}
                </div>
              )}

              <div>{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

Modal.Header = ({ children, className = '' }) => (
  <div className={`mb-5 border-b border-secondary-200/80 pb-4 ${className}`}>{children}</div>
)

Modal.Body = ({ children, className = '' }) => <div className={className}>{children}</div>

Modal.Footer = ({ children, className = '' }) => (
  <div className={`mt-6 flex flex-wrap justify-end gap-3 border-t border-secondary-200/80 pt-4 ${className}`}>{children}</div>
)

export default Modal
