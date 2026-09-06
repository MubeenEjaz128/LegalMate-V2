import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Filter, Search, ChevronDown, MessageCircle, Calendar, User } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import feedbackAPI from '../services/feedbackAPI'

const LawyerFeedbackPage = () => {
  const { user } = useAuthStore()
  const { lawyerId } = useParams()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })
  const [filters, setFilters] = useState({
    rating: 'all',
    sortBy: 'newest',
    searchTerm: ''
  })

  useEffect(() => {
    fetchFeedback()
  }, [user?._id, lawyerId])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const targetId = lawyerId || user?._id

      if (!targetId) return

      const response = await feedbackAPI.getByLawyer(targetId)
      const feedbackData = response.data || []

      setFeedback(feedbackData)
      calculateStats(feedbackData)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (feedbackData) => {
    if (feedbackData.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      })
      return
    }

    const averageRating = feedbackData.reduce((sum, fb) => sum + fb.rating, 0) / feedbackData.length
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

    feedbackData.forEach(fb => {
      ratingDistribution[fb.rating]++
    })

    setStats({
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: feedbackData.length,
      ratingDistribution
    })
  }

  const filteredFeedback = feedback.filter(fb => {
    // Filter by rating
    if (filters.rating !== 'all' && fb.rating !== parseInt(filters.rating)) {
      return false
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      return (
        fb.client?.name?.toLowerCase().includes(searchLower) ||
        fb.comment?.toLowerCase().includes(searchLower)
      )
    }

    return true
  }).sort((a, b) => {
    // Sort feedback
    switch (filters.sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt)
      case 'highest':
        return b.rating - a.rating
      case 'lowest':
        return a.rating - b.rating
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })

  const renderStars = (rating, size = 'w-4 h-4') => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${size} ${i < rating ? 'text-yellow-400 fill-current' : 'text-secondary-300'
          }`}
      />
    ))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-secondary-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-secondary-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">{lawyerId ? 'Lawyer Reviews' : 'Client Feedback'}</h1>
        <p className="text-secondary-600">
          {lawyerId ? 'See what clients are saying' : 'View and manage all feedback from your clients'}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Average Rating */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Average Rating</p>
              <div className="flex items-center mt-2">
                <span className="text-3xl font-bold text-secondary-900">
                  {stats.averageRating}
                </span>
                <span className="text-secondary-500 ml-1">/5</span>
              </div>
              <div className="flex items-center mt-2">
                {renderStars(Math.round(stats.averageRating))}
              </div>
            </div>
            <div className="text-primary-600">
              <Star className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Reviews</p>
              <p className="text-3xl font-bold text-secondary-900 mt-2">
                {stats.totalReviews}
              </p>
              <p className="text-sm text-green-600 mt-2">
                From satisfied clients
              </p>
            </div>
            <div className="text-green-600">
              <MessageCircle className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <h3 className="text-sm font-medium text-secondary-600 mb-4">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center">
                <span className="text-sm text-secondary-600 w-3">{rating}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-current mx-1" />
                <div className="flex-1 bg-secondary-200 rounded-full h-2 mx-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{
                      width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating] / stats.totalReviews) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-secondary-600 w-8">
                  {stats.ratingDistribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Search Reviews
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search by client name or comment..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Filter by Rating
            </label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Sort by
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-6">
        {filteredFeedback.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-12 text-center">
            <MessageCircle className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              {feedback.length === 0 ? 'No feedback yet' : 'No feedback matches your filters'}
            </h3>
            <p className="text-secondary-600">
              {feedback.length === 0
                ? 'Feedback from completed consultations will appear here'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </div>
        ) : (
          filteredFeedback.map((fb) => (
            <div key={fb._id} className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-secondary-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-secondary-900">
                      {fb.client?.name || 'Anonymous Client'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {renderStars(fb.rating)}
                      <span className="text-sm text-secondary-500">
                        {fb.rating}/5 stars
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-secondary-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(fb.createdAt)}
                </div>
              </div>

              {fb.comment && (
                <div className="bg-secondary-50 rounded-lg p-4 mb-4">
                  <p className="text-secondary-800 leading-relaxed">"{fb.comment}"</p>
                </div>
              )}

              {/* Category Ratings */}
              {fb.categories && Object.keys(fb.categories).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-secondary-700 mb-3">Category Ratings:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(fb.categories).map(([category, rating]) => (
                      <div key={category} className="flex items-center justify-between p-2 bg-secondary-50 rounded">
                        <span className="text-sm text-secondary-600 capitalize">{category}:</span>
                        <div className="flex items-center space-x-1">
                          {renderStars(rating, 'w-3 h-3')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More Button (for future pagination) */}
      {filteredFeedback.length > 0 && (
        <div className="text-center mt-8">
          <p className="text-secondary-600">
            Showing {filteredFeedback.length} of {stats.totalReviews} reviews
          </p>
        </div>
      )}
    </div>
  )
}

export default LawyerFeedbackPage