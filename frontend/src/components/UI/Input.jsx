import React, { forwardRef } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(
  (
    {
      label,
      error,
      help,
      required = false,
      icon: Icon,
      iconPosition = 'left',
      showPasswordToggle = false,
      className = '',
      containerClassName = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputType = type === 'password' && showPassword ? 'text' : type

    const hasRightIcon = (Icon && iconPosition === 'right') || (type === 'password' && showPasswordToggle) || error

    const inputClasses = `
      w-full rounded-2xl border bg-white px-4 py-3 text-secondary-800 placeholder-secondary-400 transition-all duration-200
      ${error ? 'border-error-400 focus:border-error-500' : 'border-secondary-200 focus:border-primary-400'}
      ${Icon && iconPosition === 'left' ? 'pl-11' : ''}
      ${hasRightIcon ? 'pr-11' : ''}
      ${className}
    `

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-semibold text-secondary-700">
            {label}
            {required && <span className="ml-1 text-error-500">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
              <Icon className={`h-[18px] w-[18px] ${error ? 'text-error-400' : 'text-secondary-400'}`} />
            </div>
          )}

          <input ref={ref} type={inputType} className={inputClasses} {...props} />

          {Icon && iconPosition === 'right' && !showPasswordToggle && !error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-3.5">
              <Icon className="h-[18px] w-[18px] text-secondary-400" />
            </div>
          )}

          {type === 'password' && showPasswordToggle && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-400 transition-colors hover:text-secondary-600"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          )}

          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
              <AlertCircle className="h-[18px] w-[18px] text-error-500" />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-error-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        {help && !error && <p className="mt-1 text-xs text-secondary-500">{help}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
