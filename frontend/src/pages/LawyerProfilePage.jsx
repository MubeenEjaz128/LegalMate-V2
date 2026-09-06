import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Star,
  MapPin,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  Award,
  Calendar,
  ArrowLeft,
  CheckCircle,
  FileText,
  Users,
  Shield
} from 'lucide-react'
import { lawyerAPI } from '../services/api'
import feedbackAPI from '../services/feedbackAPI'
import { useAuthStore } from '../stores/authStore'

const LawyerProfilePage = () => {
  const { user } = useAuthStore()
  const { lawyerId } = useParams()
  const [lawyer, setLawyer] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLawyerProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch lawyer data and feedback in parallel
        const [lawyerResponse, feedbackResponse] = await Promise.all([
          lawyerAPI.getById(lawyerId),
          feedbackAPI.getByLawyer(lawyerId).catch(() => ({ data: [] }))
        ])

        const lawyerData = lawyerResponse.data
        const feedbackData = feedbackResponse.data || []

        // Calculate actual rating and review count from feedback
        let actualRating = 0
        let actualReviewCount = feedbackData.length

        if (feedbackData.length > 0) {
          actualRating = feedbackData.reduce((sum, fb) => sum + fb.rating, 0) / feedbackData.length
        }

        // Update lawyer data with actual rating
        setLawyer({
          ...lawyerData,
          rating: actualRating,
          reviewCount: actualReviewCount
        })

        setFeedback(feedbackData)
      } catch (err) {
        console.error('Error fetching lawyer profile:', err)
        setError(err.message || 'Failed to load lawyer profile')
      } finally {
        setIsLoading(false)
      }
    }

    if (lawyerId) {
      fetchLawyerProfile()
    }
  }, [lawyerId])

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
      )
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-5 w-5 fill-yellow-400 text-yellow-400" />
      )
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-5 w-5 text-secondary-300" />
      )
    }

    return stars
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
        <div className="container-custom py-12">
          <div className="text-center py-16">
            <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">Loading lawyer profile...</h3>
            <p className="text-secondary-600">Please wait while we fetch the details.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
        <div className="container-custom py-12">
          <div className="text-center py-16">
            <div className="bg-error-50 border border-error-200 rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-error-600 mb-4">
                <User className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Error loading profile</h3>
              <p className="text-secondary-600 mb-4">{error}</p>
              <Link to="/search" className="btn-primary">
                Back to Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
        <div className="container-custom py-12">
          <div className="text-center py-16">
            <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-secondary-400 mb-4">
                <User className="h-12 w-12 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Lawyer not found</h3>
              <p className="text-secondary-600 mb-4">The lawyer profile you're looking for doesn't exist.</p>
              <Link to="/search" className="btn-primary">
                Back to Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
      {/* Header */}
      <div className="bg-white shadow-soft border-b border-secondary-100">
        <div className="container-custom py-8">
          <div className="flex items-center mb-6">
            <Link
              to="/search"
              className="flex items-center text-secondary-600 hover:text-primary-600 transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Search
            </Link>
          </div>

          {/* Lawyer Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {lawyer.name.charAt(0).toUpperCase()}
              </div>
              {lawyer.isVerified && (
                <div className="absolute -top-2 -right-2 bg-success-500 text-white p-2 rounded-full shadow-md">
                  <Award className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900">{lawyer.name}</h1>
                {lawyer.isVerified && (
                  <span className="badge badge-success">
                    <Shield className="h-4 w-4 mr-1" />
                    Verified
                  </span>
                )}
                {/* Level Badge */}
                {(() => {
                  const levels = ['New Lawyer', 'Junior Lawyer', 'Intermediate Lawyer', 'Senior Lawyer'];
                  const levelColors = ['bg-secondary-100 text-secondary-600', 'bg-primary-100 text-primary-600', 'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-700'];
                  const currentLevel = lawyer.level || 0;
                  return (
                    <span className={`badge ${levelColors[currentLevel]} border-0 sm:ml-2`}>
                      <Star className="h-4 w-4 mr-1" />
                      {levels[currentLevel]}
                    </span>
                  );
                })()}
              </div>
              <p className="text-lg sm:text-xl text-primary-600 font-semibold mb-2">{lawyer.specialization}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-secondary-600 text-sm sm:text-base">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{lawyer.address}</span>
                </div>
                {lawyer.experience && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{lawyer.experience} years experience</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4 md:mt-0">
              <Link
                to={`/booking/${lawyer._id}`}
                className="btn-primary px-4 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base w-full sm:w-auto text-center"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Rating and Reviews */}
            {lawyer.reviewCount > 0 ? (
              <div className="card">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">Rating & Reviews</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center">
                    {renderStars(lawyer.rating)}
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-secondary-900">{lawyer.rating.toFixed(1)}</span>
                    <span className="text-secondary-600 ml-2">({lawyer.reviewCount} reviews)</span>
                  </div>
                </div>

                {/* Real Reviews */}
                <div className="space-y-4">
                  {feedback.slice(0, 3).map((review) => (
                    <div key={review._id} className="bg-secondary-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm text-secondary-600">
                            {review.rating}/5
                          </span>
                        </div>
                        <span className="text-sm text-secondary-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-secondary-700 italic mb-2">"{review.comment}"</p>
                      )}
                      <p className="text-sm text-secondary-500">
                        - {review.client?.name || 'Anonymous Client'}
                      </p>
                    </div>
                  ))}

                  {feedback.length > 3 && (
                    <div className="text-center pt-4">
                      <Link
                        to={`/lawyer/${lawyerId}/reviews`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View all {feedback.length} reviews →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">Rating & Reviews</h2>
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <p className="text-secondary-600">No reviews yet</p>
                  <p className="text-sm text-secondary-500 mt-1">
                    Be the first to book a consultation and leave a review
                  </p>
                </div>
              </div>
            )}

            {/* About */}
            {lawyer.bio && (
              <div className="card">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">About</h2>
                <p className="text-secondary-700 leading-relaxed">{lawyer.bio}</p>
              </div>
            )}

            {/* Specializations */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Specializations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lawyer.specializations && lawyer.specializations.length > 0 ? (
                  // Dynamic specializations from lawyer data
                  lawyer.specializations.map((specialization, index) => {
                    const colorClasses = [
                      'bg-primary-50 text-primary-600',
                      'bg-success-50 text-success-600',
                      'bg-warning-50 text-warning-600',
                      'bg-info-50 text-info-600',
                      'bg-purple-50 text-purple-600',
                      'bg-pink-50 text-pink-600'
                    ];
                    const colorClass = colorClasses[index % colorClasses.length];
                    return (
                      <div key={index} className={`flex items-center p-4 rounded-xl ${colorClass.split(' ')[0]}`}>
                        <CheckCircle className={`h-5 w-5 mr-3 ${colorClass.split(' ')[1]}`} />
                        <span className="font-medium text-secondary-900">{specialization}</span>
                      </div>
                    );
                  })
                ) : (
                  // Default specialization if no array available
                  <div className="flex items-center p-4 bg-primary-50 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="font-medium text-secondary-900">{lawyer.specialization || 'General Practice'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            {lawyer.languages && lawyer.languages.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">Languages</h2>
                <div className="flex flex-wrap gap-3">
                  {lawyer.languages.map((language, index) => (
                    <span key={index} className="badge badge-outline">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Consultation Fee</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  PKR {lawyer.hourlyRate.toLocaleString()}
                </div>
                <p className="text-secondary-600">per hour</p>
              </div>
              <div className="mt-4 space-y-2 text-sm text-secondary-600">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  <span>Initial consultation included</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  <span>Flexible payment options</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                  <span>No hidden charges</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {/* Only show contact details to admins */}
                {user?.role === 'admin' && (
                  <>
                    {lawyer.phone && (
                      <div className="flex items-center text-secondary-600">
                        <Phone className="h-4 w-4 mr-3 text-primary-500" />
                        <span>{lawyer.phone}</span>
                      </div>
                    )}
                    {lawyer.email && (
                      <div className="flex items-center text-secondary-600">
                        <Mail className="h-4 w-4 mr-3 text-primary-500" />
                        <span>{lawyer.email}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center text-secondary-600">
                  <Calendar className="h-4 w-4 mr-3 text-primary-500" />
                  <span>Book consultation through platform</span>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Availability</h3>
              <div className="space-y-3">
                {lawyer.availability && lawyer.availability.length > 0 ? (
                  // Dynamic availability from lawyer data
                  lawyer.availability.map((slot, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-secondary-600">{slot.day}</span>
                      <span className={`font-medium ${slot.isAvailable ? '' : 'text-secondary-400'}`}>
                        {slot.isAvailable ? `${slot.startTime} - ${slot.endTime}` : 'Closed'}
                      </span>
                    </div>
                  ))
                ) : (
                  // Default availability if no specific data
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600">Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600">Saturday</span>
                      <span className="font-medium">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary-600">Sunday</span>
                      <span className="font-medium text-secondary-400">Closed</span>
                    </div>
                  </>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div >
  )
}

export default LawyerProfilePage 