const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['client', 'lawyer', 'admin'],
    default: 'client',
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  // Lawyer-specific fields
  specialization: {
    type: String,
    required: function () { return this.role === 'lawyer' }
  },
  barNumber: {
    type: String,
    required: function () { return this.role === 'lawyer' }
  },
  hourlyRate: {
    type: Number,
    required: function () { return this.role === 'lawyer' },
    min: 0,
    default: 0
  },
  // Lawyer Level and Stats
  level: {
    type: Number,
    min: 0,
    max: 3,
    default: 0
  },
  consultationCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  languages: [{
    type: String,
    enum: ['English', 'Urdu', 'Punjabi']
  }],
  availability: {
    type: Map,
    of: [{
      startTime: String,
      endTime: String,
      isAvailable: Boolean
    }],
    default: {}
  },
  // Verification documents for lawyers
  verificationDocuments: [{
    id: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    documentType: {
      type: String,
      enum: ['Law Degree Certificate', 'Bar Council License', 'Professional ID Card', 'other'],
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  // Admin-specific fields
  adminLevel: {
    type: String,
    enum: ['super', 'moderator'],
    default: 'moderator'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Single-device session enforcement
  activeSessionToken: {
    type: String,
    default: null
  },
  lastHeartbeat: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Index for efficient queries (role is already indexed in schema definition)
userSchema.index({ specialization: 1 })

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    // Validate password strength before hashing
    const password = this.password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must include at least one lowercase letter')
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must include at least one uppercase letter')
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error('Password must include at least one special character')
    }

    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  return user
}

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return this.name
})

// Instance method to check if user is lawyer
userSchema.methods.isLawyer = function () {
  return this.role === 'lawyer'
}

// Instance method to check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === 'admin'
}

// Static method to find lawyers
userSchema.statics.findLawyers = function (filters = {}) {
  const query = { role: 'lawyer', isActive: true, isVerified: true }

  if (filters.specialization) {
    query.specialization = filters.specialization
  }

  if (filters.location) {
    query.location = filters.location
  }

  if (filters.minRating) {
    // This would need to be implemented with aggregation
    // For now, we'll handle rating filtering in the service layer
  }

  return this.find(query)
}

module.exports = mongoose.model('User', userSchema) 