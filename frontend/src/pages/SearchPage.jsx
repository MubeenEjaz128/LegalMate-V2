import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Award, Users, Clock, SlidersHorizontal, X, Scale } from 'lucide-react'
import { lawyerAPI } from '../services/api'
import LawyerCard from '../components/Lawyer/LawyerCard'
import SearchFilters from '../components/Lawyer/SearchFilters'
import { AnimatedSection, SkeletonLoader } from '../components/UI'

const SearchPage = () => {
  const [filters, setFilters] = useState({
    specialization: '',
    location: '',
    priceRange: '',
    rating: '',
    language: '',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [lawyers, setLawyers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Debounce the search term to avoid firing on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Stable search function via useCallback
  const searchLawyers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const backendFilters = {
        ...filters,
        address: filters.location,
        search: debouncedSearchTerm,
      }
      delete backendFilters.location
      const response = await lawyerAPI.search(backendFilters)
      setLawyers(response.data || [])
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message || 'Failed to load lawyers')
    } finally {
      setIsLoading(false)
    }
  }, [filters.specialization, filters.location, filters.priceRange, filters.rating, filters.language, debouncedSearchTerm])

  // Use primitive dependencies to avoid object-reference re-triggers
  useEffect(() => {
    searchLawyers()
  }, [searchLawyers])

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => {
      // Only create a new object if values actually changed
      const next = { ...prev, ...newFilters }
      const changed = Object.keys(next).some((k) => next[k] !== prev[k])
      return changed ? next : prev
    })
  }

  const handleSearch = (e) => {
    e.preventDefault()
    searchLawyers()
  }

  const clearFilters = () => {
    setFilters({
      specialization: '',
      location: '',
      priceRange: '',
      rating: '',
      language: '',
    })
    setSearchTerm('')
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="min-h-screen bg-[var(--surface-base)]">
      {/* ─── Hero header ──────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-900 to-secondary-800">
        {/* Decorative */}
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-60 w-60 rounded-full bg-accent-400/10 blur-3xl" />

        <div className="relative container-custom py-14 lg:py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl"
          >
            Find Your Perfect{' '}
            <span className="text-gradient-hero">Lawyer</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base text-secondary-300 sm:text-lg"
          >
            Search verified lawyers specializing in Punjab laws. Get expert legal consultation from qualified professionals.
          </motion.p>

          {/* Search bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-8 max-w-3xl"
          >
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, specialization, or location..."
                className="w-full rounded-2xl border border-white/15 bg-white/10 py-4 pl-14 pr-5 text-white placeholder:text-secondary-400 backdrop-blur-lg focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30 transition-all duration-200"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  showFilters
                    ? 'bg-primary-500 text-white shadow-glow-sm'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button type="submit" className="btn-primary !py-2.5 !px-8 !rounded-xl">
                Search Lawyers
              </button>
            </div>
          </motion.form>
        </div>
      </div>

      {/* ─── Filters panel ────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-secondary-100 bg-white shadow-soft"
          >
            <div className="container-custom py-6">
              <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Results ──────────────────────────────────── */}
      <div className="container-custom py-10 lg:py-14">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="py-10">
            <SkeletonLoader.Grid columns={3} count={6} />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md rounded-2xl border border-error-200 bg-error-50 p-8">
              <Search className="mx-auto mb-4 h-12 w-12 text-error-400" />
              <h3 className="text-lg font-semibold text-secondary-900">Error loading lawyers</h3>
              <p className="mt-2 text-sm text-secondary-600">{error}</p>
              <button onClick={searchLawyers} className="btn-primary mt-6">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && lawyers.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md rounded-2xl border border-secondary-200 bg-white p-8 shadow-soft">
              <Scale className="mx-auto mb-4 h-14 w-14 text-secondary-300" />
              <h3 className="text-lg font-semibold text-secondary-900">No lawyers found</h3>
              <p className="mt-2 text-sm text-secondary-600">
                Try adjusting your search criteria or filters.
              </p>
              <button onClick={clearFilters} className="btn-outline mt-6">
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Results grid */}
        {!isLoading && !error && lawyers.length > 0 && (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-secondary-900">
                  Found {lawyers.length} lawyer{lawyers.length !== 1 ? 's' : ''}
                </h2>
                <p className="mt-1 text-sm text-secondary-600">
                  Best matches for your search criteria
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-secondary-500">Sort by:</span>
                <select className="select-field w-auto !py-2 !text-sm !rounded-xl">
                  <option>Relevance</option>
                  <option>Rating</option>
                  <option>Experience</option>
                  <option>Price</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lawyers.map((lawyer, idx) => (
                <AnimatedSection key={lawyer._id} preset="fadeUp" delay={idx * 0.04}>
                  <LawyerCard lawyer={lawyer} />
                </AnimatedSection>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Trust features ───────────────────────────── */}
      <section className="border-t border-secondary-100 bg-white py-16">
        <div className="container-custom">
          <AnimatedSection preset="fadeUp" className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-secondary-900 md:text-3xl">
              Why Choose LegalMate Lawyers?
            </h2>
            <p className="mt-3 text-secondary-600">
              All our lawyers are verified professionals with extensive experience in Punjab laws.
            </p>
          </AnimatedSection>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Award,
                title: 'Verified Credentials',
                text: 'Proper bar council credentials and thorough background checks.',
                color: 'primary',
              },
              {
                icon: Users,
                title: 'Expert Specialization',
                text: 'Specialized in specific areas of Punjab law and procedures.',
                color: 'success',
              },
              {
                icon: Clock,
                title: '24/7 Availability',
                text: 'Flexible scheduling with round-the-clock booking options.',
                color: 'accent',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <AnimatedSection key={item.title} preset="fadeUp" delay={i * 0.1}>
                  <div className="text-center">
                    <div
                      className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-${item.color}-100 text-${item.color}-600`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-secondary-600">{item.text}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default SearchPage
