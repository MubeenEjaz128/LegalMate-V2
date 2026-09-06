import React, { forwardRef } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

const Select = forwardRef(
  (
    {
      label,
      error,
      help,
      required = false,
      placeholder = 'Select an option...',
      options = [],
      className = '',
      containerClassName = '',
      children,
      ...props
    },
    ref
  ) => {
    const selectClasses = `
      w-full appearance-none rounded-2xl border bg-white px-4 py-3 pr-11 text-secondary-800 transition-all duration-200
      ${error ? 'border-error-400 focus:border-error-500' : 'border-secondary-200 focus:border-primary-400'}
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
          <select ref={ref} className={selectClasses} {...props}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}

            {children}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <ChevronDown className={`h-4 w-4 ${error ? 'text-error-400' : 'text-secondary-400'}`} />
          </div>

          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center pr-2">
              <AlertCircle className="h-4 w-4 text-error-500" />
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

Select.displayName = 'Select'

export default Select
