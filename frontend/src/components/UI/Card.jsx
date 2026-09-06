import React from 'react'

const Card = ({
  children,
  variant = 'default',
  padding = 'default',
  hover = false,
  interactive = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'transition-all duration-300'

  const variants = {
    default: 'card',
    elevated: 'card shadow-strong',
    outlined: 'rounded-3xl border border-secondary-200 bg-white/75 shadow-none',
    flat: 'rounded-3xl border border-white/70 bg-white/80 shadow-soft',
    premium: 'card-premium',
    glass: 'glass',
    neumorph: 'neumorph'
  }

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  const hoverStyles = hover || interactive ? 'hover:-translate-y-1 hover:shadow-strong' : ''
  const interactiveStyles = interactive ? 'cursor-pointer active:translate-y-0 active:scale-[0.99]' : ''

  const classes = `${baseClasses} ${variants[variant] || variants.default} ${paddings[padding] || paddings.default} ${hoverStyles} ${interactiveStyles} ${className}`

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

Card.Header = ({ children, className = '' }) => (
  <div className={`mb-4 border-b border-secondary-200/80 pb-4 ${className}`}>{children}</div>
)

Card.Body = ({ children, className = '' }) => <div className={className}>{children}</div>

Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-5 border-t border-secondary-200/80 pt-4 ${className}`}>{children}</div>
)

Card.Title = ({ children, className = '' }) => (
  <h3 className={`font-display text-lg font-semibold text-secondary-900 ${className}`}>{children}</h3>
)

Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-secondary-600 ${className}`}>{children}</p>
)

export default Card
