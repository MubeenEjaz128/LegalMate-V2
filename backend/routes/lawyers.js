const express = require('express')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')
const Appointment = require('../models/Appointment')
const { auth, requireLawyer } = require('../middleware/auth')
const router = express.Router()

// Search lawyers
router.get('/search', async (req, res) => {
  try {
    const {
      specialization,
      location,
      priceRange,
      rating,
      language,
      search
    } = req.query

    // Build query
    const query = { role: 'lawyer', isActive: true, isVerified: true }

    if (specialization) {
      query.specialization = specialization
    }

    if (location) {
      query.location = location
    }

    if (language) {
      query.languages = language
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ]
    }

    // Find lawyers
    let lawyers = await User.find(query)
      .select('name email specialization location hourlyRate bio languages isVerified level averageRating reviewCount consultationCount')
      .sort({ level: -1, averageRating: -1, consultationCount: -1, name: 1 })

    // Apply price range filter
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number)
      if (max) {
        lawyers = lawyers.filter(lawyer =>
          lawyer.hourlyRate >= min && lawyer.hourlyRate <= max
        )
      } else {
        lawyers = lawyers.filter(lawyer => lawyer.hourlyRate >= min)
      }
    }

    // TODO: Apply rating filter (requires aggregation with feedback collection)
    // For now, we'll return all lawyers and handle rating filtering on frontend

    res.json(lawyers)
  } catch (error) {
    console.error('Search lawyers error:', error)
    res.status(500).json({ message: 'Error searching lawyers' })
  }
})

// Get lawyer by ID
router.get('/:id', async (req, res) => {
  try {
    const lawyer = await User.findById(req.params.id)
      .select('-password')
      .where({ role: 'lawyer', isActive: true })

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' })
    }

    const lawyerData = lawyer.toJSON()
    // Rating/Stats are now part of the user model

    res.json(lawyerData)
  } catch (error) {
    console.error('Get lawyer error:', error)
    res.status(500).json({ message: 'Error fetching lawyer' })
  }
})

// Get lawyer profile
router.get('/profile/:id', async (req, res) => {
  try {
    console.log('Looking for user with ID:', req.params.id);

    // Check if it's a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findOne({
      _id: req.params.id,
      isActive: true
    }).select('-password')

    if (!user) {
      console.log('No user found with the specified criteria');
      return res.status(404).json({ message: 'User not found' })
    }

    console.log('User found:', { id: user._id, name: user.name, role: user.role });

    const userData = user.toJSON()

    res.json(userData)
  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({ message: 'Error fetching user profile' })
  }
})

// Get lawyer availability
router.get('/availability/:id', async (req, res) => {
  try {
    const { date } = req.query
    const lawyerId = req.params.id

    if (!date) {
      return res.status(400).json({ message: 'Date is required' })
    }

    // Check if lawyer exists
    const lawyer = await User.findById(lawyerId)
      .where({ role: 'lawyer', isActive: true })

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' })
    }

    // Get existing appointments for the date
    const existingAppointments = await Appointment.find({
      lawyer: lawyerId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    }).select('time')

    const bookedTimes = existingAppointments.map(apt => apt.time)

    // Generate available time slots (9 AM to 6 PM)
    const timeSlots = []
    for (let hour = 9; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      if (!bookedTimes.includes(time)) {
        timeSlots.push(time)
      }
    }

    res.json({ timeSlots })
  } catch (error) {
    console.error('Get availability error:', error)
    res.status(500).json({ message: 'Error fetching availability' })
  }
})

// Get lawyer reviews
router.get('/reviews/:id', async (req, res) => {
  try {
    // TODO: Implement when feedback model is created
    res.json([])
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({ message: 'Error fetching reviews' })
  }
})

// Update lawyer profile
router.put('/profile', auth, requireLawyer, [
  body('specialization').optional().trim().notEmpty().withMessage('Specialization is required'),
  body('hourlyRate').optional().isNumeric().withMessage('Hourly rate must be a number'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio must be less than 1000 characters'),
  body('languages').optional().isArray().withMessage('Languages must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'lawyer') {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Update allowed fields
    const allowedUpdates = ['specialization', 'hourlyRate', 'bio', 'languages']
    const updates = {}

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    })

    Object.assign(user, updates)
    await user.save()

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    })
  } catch (error) {
    console.error('Update lawyer profile error:', error)
    res.status(500).json({ message: 'Error updating profile' })
  }
})

module.exports = router 