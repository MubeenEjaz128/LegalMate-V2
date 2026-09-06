import React from 'react'
import { Link } from 'react-router-dom'
import { Star, MapPin, Clock, DollarSign, User, Phone, Mail, Award, Calendar, MessageCircle } from 'lucide-react'

const LawyerCard = ({ lawyer }) => {
  const {
    _id,
    name,
    specialization,
    address,
    hourlyRate,
    rating,
    reviewCount,
    bio,
    isVerified,
    experience,
    languages
  } = lawyer

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      )
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      )
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-secondary-300" />
      )
    }

    return stars
  }

  return (
    <div className="card-hover group">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              {name.charAt(0).toUpperCase()}
            </div>
            {isVerified && (
              <div className="absolute -top-2 -right-2 bg-success-500 text-white p-1 rounded-full shadow-md">
                <Award className="h-3 w-3" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-secondary-900 text-lg group-hover:text-primary-600 transition-colors">
                {name}
              </h3>
              {isVerified && (
                <span className="badge badge-success text-xs">
                  Verified
                </span>
              )}
            </div>
            <p className="text-primary-600 font-medium">{specialization}</p>
            {/* Level Badge */}
            <div className="mt-1">
              {(() => {
                const levels = ['New Lawyer', 'Junior Lawyer', 'Intermediate Lawyer', 'Senior Lawyer'];
                const levelColors = ['bg-secondary-100 text-secondary-600', 'bg-primary-100 text-primary-600', 'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-700'];
                const currentLevel = lawyer.level || 0;
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${levelColors[currentLevel]}`}>
                    <Award className="h-3 w-3 mr-1" />
                    {levels[currentLevel]}
                  </span>
                );
              })()}
            </div>
            {experience && (
              <p className="text-sm text-secondary-500 mt-1">{experience} years experience</p>
            )}
          </div>
        </div>
      </div>

      {/* Rating and Reviews */}
      {rating > 0 && (
        <div className="flex items-center mb-4">
          <div className="flex items-center mr-3">
            {renderStars(rating)}
          </div>
          <span className="text-secondary-600 font-medium">
            {rating.toFixed(1)}
          </span>
          <span className="text-secondary-500 text-sm ml-1">
            ({reviewCount} reviews)
          </span>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center text-sm text-secondary-600">
          <MapPin className="h-4 w-4 mr-3 text-primary-500" />
          <span className="truncate">{address}</span>
        </div>

        <div className="flex items-center text-sm text-secondary-600">
          <DollarSign className="h-4 w-4 mr-3 text-success-500" />
          <span className="font-medium">PKR {hourlyRate.toLocaleString()}/hour</span>
        </div>

        {languages && languages.length > 0 && (
          <div className="flex items-center text-sm text-secondary-600">
            <MessageCircle className="h-4 w-4 mr-3 text-warning-500" />
            <span>{languages.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-sm text-secondary-600 mb-6 line-clamp-3 leading-relaxed">
          {bio}
        </p>
      )}

      {/* Contact Info */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-secondary-500">
        <div className="flex items-center">
          <Phone className="h-4 w-4 mr-1" />
          <span>Available for calls</span>
        </div>
        <div className="flex items-center">
          <Mail className="h-4 w-4 mr-1" />
          <span>Email consultation</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link
          to={`/lawyer/${_id}`}
          className="btn-outline flex-1 text-center py-3 text-sm font-medium"
        >
          <User className="h-4 w-4 mr-2 inline" />
          View Profile
        </Link>
        <Link
          to={`/booking/${_id}`}
          className="btn-primary flex-1 text-center py-3 text-sm font-medium"
        >
          <Calendar className="h-4 w-4 mr-2 inline" />
          Book Now
        </Link>
      </div>


    </div>
  )
}

export default LawyerCard 