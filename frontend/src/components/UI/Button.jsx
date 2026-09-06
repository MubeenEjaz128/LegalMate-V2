import React from 'react'
import { Loader2 } from 'lucide-react'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  as: Component = 'button',
  to,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none'

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost:
      'bg-transparent text-secondary-600 hover:bg-white hover:text-primary-700 border border-transparent hover:border-primary-100',
    danger: 'btn-danger',
    success: 'btn-success'
  }

  const sizes = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm md:text-base',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-9 py-4 text-lg'
  }

  const iconSizes = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  }

  const classes = `${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`

  const renderIcon = (position) => {
    if (loading && position === 'left') {
      return <Loader2 className={`${iconSizes[size] || iconSizes.md} animate-spin`} />
    }

    if (!loading && Icon && iconPosition === position) {
      return <Icon className={iconSizes[size] || iconSizes.md} />
    }

    return null
  }

  if (Component !== 'button') {
    const { type, ...linkProps } = props
    return (
      <Component className={classes} to={to} {...linkProps}>
        {renderIcon('left')}
        {children}
        {renderIcon('right')}
      </Component>
    )
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {renderIcon('left')}
      {children}
      {renderIcon('right')}
    </button>
  )
}

export default Button
