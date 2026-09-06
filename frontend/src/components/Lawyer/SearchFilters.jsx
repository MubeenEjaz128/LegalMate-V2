import React from 'react'
import { X } from 'lucide-react'

const SearchFilters = ({ filters, onFilterChange }) => {
  const specializations = [
    'Criminal Law',
    'Civil Law',
    'Family Law',
    'Property Law',
    'Corporate Law',
    'Tax Law',
    'Labor Law',
    'Constitutional Law'
  ]

  const locations = [
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Gujranwala',
    'Sialkot',
    'Bahawalpur'
  ]

  const priceRanges = [
    { label: 'Any Price', value: '' },
    { label: 'Under PKR 1000', value: '0-1000' },
    { label: 'PKR 1000 - 2000', value: '1000-2000' },
    { label: 'PKR 2000 - 5000', value: '2000-5000' },
    { label: 'Over PKR 5000', value: '5000+' }
  ]

  const ratings = [
    { label: 'Any Rating', value: '' },
    { label: '4+ Stars', value: '4' },
    { label: '3+ Stars', value: '3' },
    { label: '2+ Stars', value: '2' }
  ]

  const languages = [
    'English',
    'Urdu',
    'Punjabi'
  ]

  const clearFilters = () => {
    onFilterChange({
      specialization: '',
      location: '',
      priceRange: '',
      rating: '',
      language: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <div className="bg-white border border-secondary-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Specialization */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Specialization
          </label>
          <select
            value={filters.specialization}
            onChange={(e) => onFilterChange({ specialization: e.target.value })}
            className="input-field"
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Location
          </label>
          <select
            value={filters.location}
            onChange={(e) => onFilterChange({ location: e.target.value })}
            className="input-field"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Price Range
          </label>
          <select
            value={filters.priceRange}
            onChange={(e) => onFilterChange({ priceRange: e.target.value })}
            className="input-field"
          >
            {priceRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Minimum Rating
          </label>
          <select
            value={filters.rating}
            onChange={(e) => onFilterChange({ rating: e.target.value })}
            className="input-field"
          >
            {ratings.map((rating) => (
              <option key={rating.value} value={rating.value}>
                {rating.label}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Language
          </label>
          <select
            value={filters.language}
            onChange={(e) => onFilterChange({ language: e.target.value })}
            className="input-field"
          >
            <option value="">All Languages</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-secondary-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (value) {
                return (
                  <div
                    key={key}
                    className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    <span className="capitalize">{key}: {value}</span>
                    <button
                      onClick={() => onFilterChange({ [key]: '' })}
                      className="hover:text-primary-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchFilters 