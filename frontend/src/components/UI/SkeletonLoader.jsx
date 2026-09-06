// Skeleton loading patterns for different content types
import React from 'react'

const Pulse = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
)

const SkeletonCard = () => (
  <div className="card animate-pulse space-y-4">
    <Pulse className="h-40 w-full rounded-xl" />
    <Pulse className="h-5 w-3/4" />
    <Pulse className="h-4 w-1/2" />
    <div className="flex gap-2">
      <Pulse className="h-8 w-20 rounded-full" />
      <Pulse className="h-8 w-20 rounded-full" />
    </div>
  </div>
)

const SkeletonRow = () => (
  <div className="flex items-center space-x-4 animate-pulse py-4">
    <Pulse className="h-12 w-12 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Pulse className="h-4 w-3/4" />
      <Pulse className="h-3 w-1/2" />
    </div>
    <Pulse className="h-8 w-24 rounded-lg" />
  </div>
)

const SkeletonText = ({ lines = 3 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: lines }, (_, i) => (
      <Pulse
        key={i}
        className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
)

const SkeletonProfile = () => (
  <div className="flex items-center space-x-4 animate-pulse">
    <Pulse className="h-16 w-16 rounded-full" />
    <div className="space-y-2">
      <Pulse className="h-5 w-32" />
      <Pulse className="h-4 w-48" />
    </div>
  </div>
)

const SkeletonGrid = ({ count = 6, cols = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-6`}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

const SkeletonLoader = {
  Card: SkeletonCard,
  Row: SkeletonRow,
  Text: SkeletonText,
  Profile: SkeletonProfile,
  Grid: SkeletonGrid,
  Pulse,
}

export default SkeletonLoader
