// Glassmorphism card with configurable blur intensity
import React from 'react'

const GlassCard = ({
  children,
  className = '',
  dark = false,
  intensity = 'md', // 'sm' | 'md' | 'lg'
  hover = false,
  ...props
}) => {
  const blurs = {
    sm: 'backdrop-blur-md',
    md: 'backdrop-blur-xl',
    lg: 'backdrop-blur-2xl',
  }

  const base = dark
    ? `bg-secondary-900/60 ${blurs[intensity]} border border-secondary-700/40 text-white`
    : `bg-white/50 ${blurs[intensity]} border border-white/30`

  const hoverClass = hover
    ? 'hover:bg-white/60 hover:shadow-strong hover:-translate-y-0.5 cursor-pointer'
    : ''

  return (
    <div
      className={`rounded-2xl shadow-medium p-6 transition-all duration-300 ${base} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default GlassCard
