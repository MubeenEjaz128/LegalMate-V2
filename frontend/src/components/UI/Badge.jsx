import React from 'react'

const Badge = ({ children, variant = 'default', size = 'md', className = '', icon: Icon, ...props }) => {
  const baseClasses = 'inline-flex items-center gap-1 rounded-full font-semibold tracking-wide transition-colors'

  const variants = {
    default: 'bg-secondary-100 text-secondary-700',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-error-100 text-error-700',
    info: 'bg-info-100 text-info-700',

    'primary-solid': 'bg-primary-600 text-white',
    'secondary-solid': 'bg-secondary-600 text-white',
    'success-solid': 'bg-success-600 text-white',
    'warning-solid': 'bg-warning-500 text-white',
    'danger-solid': 'bg-error-600 text-white',
    'info-solid': 'bg-info-600 text-white',

    'primary-outline': 'border border-primary-300 bg-white text-primary-700',
    'secondary-outline': 'border border-secondary-300 bg-white text-secondary-700',
    'success-outline': 'border border-success-300 bg-white text-success-700',
    'warning-outline': 'border border-warning-300 bg-white text-warning-700',
    'danger-outline': 'border border-error-300 bg-white text-error-700',
    'info-outline': 'border border-info-300 bg-white text-info-700'
  }

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm',
    xl: 'px-4 py-2 text-sm'
  }

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-4 w-4'
  }

  const classes = `${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`

  return (
    <span className={classes} {...props}>
      {Icon && <Icon className={iconSizes[size] || iconSizes.md} />}
      {children}
    </span>
  )
}

export default Badge
