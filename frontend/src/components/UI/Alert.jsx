import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

const Alert = ({
  type,
  variant,
  title,
  message,
  children,
  onClose,
  dismissible = true,
  className = ''
}) => {
  const resolvedType = variant === 'danger' ? 'error' : variant || type || 'info'

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const styles = {
    success: {
      container: 'border-success-200 bg-success-50 text-success-800',
      icon: 'text-success-500',
      button: 'text-success-500 hover:bg-success-100'
    },
    error: {
      container: 'border-error-200 bg-error-50 text-error-800',
      icon: 'text-error-500',
      button: 'text-error-500 hover:bg-error-100'
    },
    warning: {
      container: 'border-warning-200 bg-warning-50 text-warning-800',
      icon: 'text-warning-500',
      button: 'text-warning-500 hover:bg-warning-100'
    },
    info: {
      container: 'border-primary-200 bg-primary-50 text-primary-800',
      icon: 'text-primary-500',
      button: 'text-primary-500 hover:bg-primary-100'
    }
  }

  const current = styles[resolvedType] || styles.info
  const Icon = icons[resolvedType] || Info

  return (
    <div className={`relative rounded-2xl border p-4 shadow-soft ${current.container} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${current.icon}`} />

        <div className="min-w-0 flex-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {message && <p className={`${title ? 'mt-1' : ''} text-sm`}>{message}</p>}
          {children && <div className={`${title || message ? 'mt-2' : ''}`}>{children}</div>}
        </div>

        {dismissible && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${current.button}`}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert
