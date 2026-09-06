import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star, MessageCircle, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { feedbackAPI, appointmentAPI } from '../services/api'
import { Card, Button, Alert } from '../components/UI'
import { toast } from 'react-hot-toast'

const FeedbackPage = () => {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  // Feedback form state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [categories, setCategories] = useState({
    communication: 0,
    expertise: 0,
    professionalism: 0,
    value: 0
  })

  useEffect(() => {
    fetchAppointmentDetails()
  }, [appointmentId])

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true)
      const response = await appointmentAPI.getById(appointmentId)
      const apt = response.data
      
      // Check if user is authorized to give feedback for this appointment
      if (user.role !== 'client' || apt.client._id !== user._id) {
        navigate('/dashboard')
        return
      }
      
      // Check if appointment is completed
      if (apt.status !== 'completed') {
        toast.error('You can only provide feedback for completed appointments')
        navigate('/dashboard')
        return
      }
      
      setAppointment(apt)
      
      // Check if feedback already exists
      if (apt.feedback) {
        setSubmitted(true)
        setRating(apt.feedback.rating)
        setComment(apt.feedback.comment)
        setCategories(apt.feedback.categories || {})
      }
    } catch (error) {
      console.error('Error fetching appointment:', error)
      console.error('Error details:', error.response?.data)
      toast.error('Failed to load appointment details')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      toast.error('Please provide a rating')
      return
    }

    try {
      setSubmitting(true)
      
      const feedbackData = {
        appointmentId,
        lawyerId: appointment.lawyer._id,
        rating,
        comment: comment.trim(),
        categories: categories
      }

      await feedbackAPI.submit(feedbackData)
      
      setSubmitted(true)
      toast.success('Thank you for your feedback!')
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
      
    } catch (error) {
      console.error('Error submitting feedback:', error)
      console.error('Error details:', error.response?.data)
      toast.error(error.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryRating = (category, value) => {
    setCategories(prev => ({
      ...prev,
      [category]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading appointment details...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-secondary-900 mb-2">Appointment Not Found</h2>
          <p className="text-secondary-600 mb-4">The appointment you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/dashboard">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-secondary-900">
            {submitted ? 'Feedback Submitted' : 'Share Your Feedback'}
          </h1>
          <p className="text-secondary-600 mt-2">
            Help us improve by sharing your experience with this consultation
          </p>
        </div>

        {/* Appointment Summary */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">Consultation Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold">
                    {appointment.lawyer?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-secondary-900">{appointment.lawyer?.name}</h3>
                  <p className="text-secondary-600">{appointment.lawyer?.specialization}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-secondary-600 space-y-1">
              <p><span className="font-medium">Date:</span> {new Date(appointment.date).toLocaleDateString()}</p>
              <p><span className="font-medium">Time:</span> {appointment.time}</p>
              <p><span className="font-medium">Type:</span> {appointment.consultationType}</p>
              <p><span className="font-medium">Duration:</span> {appointment.duration || 60} minutes</p>
            </div>
          </div>
        </Card>

        {submitted ? (
          /* Feedback Submitted */
          <Card className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-success-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">Thank You!</h2>
            <p className="text-secondary-600 mb-6">
              Your feedback has been submitted successfully. We appreciate your input!
            </p>
            
            {/* Show submitted feedback */}
            <div className="bg-secondary-50 rounded-lg p-6 mb-6 text-left">
              <div className="flex items-center justify-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-secondary-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-lg font-medium">({rating}/5)</span>
              </div>
              
              {comment && (
                <div className="mb-4">
                  <h4 className="font-medium text-secondary-900 mb-2">Your Comment:</h4>
                  <p className="text-secondary-700 italic">"{comment}"</p>
                </div>
              )}
            </div>

            <Button onClick={() => navigate('/dashboard')} variant="primary">
              Back to Dashboard
            </Button>
          </Card>
        ) : (
          /* Feedback Form */
          <form onSubmit={handleSubmitFeedback}>
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-6">Rate Your Experience</h2>
              
              {/* Overall Rating */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Overall Rating *
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-colors"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-secondary-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-4 text-sm text-secondary-600">
                    {rating === 0 ? 'Click to rate' : 
                     rating === 1 ? 'Poor' :
                     rating === 2 ? 'Fair' :
                     rating === 3 ? 'Good' :
                     rating === 4 ? 'Very Good' :
                     'Excellent'}
                  </span>
                </div>
              </div>

              {/* Category Ratings */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-secondary-900 mb-4">Rate Specific Areas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'communication', label: 'Communication', desc: 'How well did the lawyer communicate?' },
                    { key: 'expertise', label: 'Legal Expertise', desc: 'Did they demonstrate good legal knowledge?' },
                    { key: 'professionalism', label: 'Professionalism', desc: 'Were they professional and courteous?' },
                    { key: 'value', label: 'Value for Money', desc: 'Was the consultation worth the cost?' }
                  ].map((category) => (
                    <div key={category.key} className="border rounded-lg p-4">
                      <div className="mb-2">
                        <h4 className="font-medium text-secondary-900">{category.label}</h4>
                        <p className="text-sm text-secondary-600">{category.desc}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleCategoryRating(category.key, star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                star <= (categories[category.key] || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-secondary-300 hover:text-yellow-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label htmlFor="comment" className="block text-sm font-medium text-secondary-700 mb-2">
                  Additional Comments
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share more details about your experience (optional)..."
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Your feedback helps us improve our services and helps other clients make informed decisions.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={rating === 0 || submitting}
                  loading={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </Card>
          </form>
        )}

        {/* Privacy Notice */}
        <Alert variant="info" className="text-sm">
          <MessageCircle className="h-4 w-4" />
          <div>
            <strong>Privacy Notice:</strong> Your feedback will be visible to the lawyer and may be displayed 
            on their profile to help other clients. Your name will be shown with the review.
          </div>
        </Alert>
      </div>
    </div>
  )
}

export default FeedbackPage