import React from 'react'
import { Loader2 } from 'lucide-react'

const Loading = ({ type = 'spinner', size = 'md', text, fullScreen = false, className = '' }) => {
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-11 w-11',
    xl: 'h-14 w-14'
  }

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizes[size]} animate-spin text-primary-600`} />
      {text && <p className={`${textSizes[size]} font-medium text-secondary-600`}>{text}</p>}
    </div>
  )

  const Dots = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex items-center gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={`inline-block rounded-full bg-primary-500 ${size === 'xs' ? 'h-1.5 w-1.5' : size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-3 w-3' : 'h-3.5 w-3.5'} animate-bounce`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      {text && <p className={`${textSizes[size]} font-medium text-secondary-600`}>{text}</p>}
    </div>
  )

  const Pulse = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <span className={`${sizes[size]} rounded-full bg-primary-500/60 animate-pulse`} />
      {text && <p className={`${textSizes[size]} font-medium text-secondary-600`}>{text}</p>}
    </div>
  )

  const Wave = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex items-end gap-1.5">
        {[0, 1, 2, 3, 4].map((idx) => (
          <span
            key={idx}
            className={`inline-block rounded-full bg-primary-500 ${size === 'xs' ? 'h-5 w-1' : size === 'sm' ? 'h-6 w-1.5' : size === 'md' ? 'h-8 w-2' : size === 'lg' ? 'h-10 w-2.5' : 'h-12 w-3'}`}
            style={{ animation: 'wave 1.1s ease-in-out infinite', animationDelay: `${idx * 0.1}s` }}
          />
        ))}
      </div>
      {text && <p className={`${textSizes[size]} font-medium text-secondary-600`}>{text}</p>}
    </div>
  )

  const renderLoading = () => {
    switch (type) {
      case 'dots':
        return <Dots />
      case 'pulse':
        return <Pulse />
      case 'wave':
        return <Wave />
      default:
        return <Spinner />
    }
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f5f7fb]/80 backdrop-blur-sm">
        <div className={className}>{renderLoading()}</div>
      </div>
    )
  }

  return <div className={`flex items-center justify-center ${className}`}>{renderLoading()}</div>
}

const Skeleton = ({ width = 'w-full', height = 'h-4', className = '', count = 1, space = 'space-y-2' }) => (
  <div className={count > 1 ? space : ''}>
    {[...Array(count)].map((_, idx) => (
      <div key={idx} className={`skeleton ${width} ${height} ${className}`} />
    ))}
  </div>
)

Loading.Skeleton = Skeleton

export default Loading
