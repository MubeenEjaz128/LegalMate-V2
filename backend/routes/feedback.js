const express = require('express')
const { body, validationResult } = require('express-validator')
const { auth, requireClient } = require('../middleware/auth')
const router = express.Router()

// TODO: Create Feedback model and implement feedback functionality
// For now, this is a placeholder route

// Submit feedback
router.post('/submit', auth, requireClient, [
  body('lawyerId').isMongoId().withMessage('Valid lawyer ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const Feedback = require('../models/Feedback');
    const Appointment = require('../models/Appointment');
    const User = require('../models/User');

    const { lawyerId, rating, comment, appointmentId, categories } = req.body;
    const clientId = req.user._id;

    // Check appointment exists and belongs to client
    const appointment = await Appointment.findOne({ _id: appointmentId, client: clientId, lawyer: lawyerId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }

    // Prevent duplicate feedback for same appointment
    const existing = await Feedback.findOne({ appointment: appointmentId });
    if (existing) {
      return res.status(400).json({ message: 'Feedback already submitted for this appointment' });
    }

    // Create feedback
    const feedback = new Feedback({
      appointment: appointmentId,
      lawyer: lawyerId,
      client: clientId,
      rating,
      comment,
      categories: categories || {}
    });
    await feedback.save();

    // Update the appointment's embedded feedback field
    appointment.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };
    await appointment.save();

    // Update lawyer stats
    const { updateLawyerStats } = require('../services/lawyerLevelService');
    await updateLawyerStats(lawyerId);

    // Notify admin
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(req.app.get('io'), {
        type: 'new_feedback',
        title: 'New Feedback Received',
        message: `${req.user.name || 'A client'} gave ${rating}-star feedback`,
        referenceId: feedback._id,
        referenceModel: 'Feedback',
        metadata: { userName: req.user.name, userEmail: req.user.email, extra: `${rating} stars` }
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (error) {
    console.error('Submit feedback error:', error)
    res.status(500).json({ message: 'Error submitting feedback' })
  }
})

// Get feedback for lawyer
router.get('/lawyer/:id', async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const lawyerId = req.params.id;
    // Optionally: populate client info
    const feedbacks = await Feedback.find({ lawyer: lawyerId }).populate('client', 'name');
    res.json(feedbacks);
  } catch (error) {
    console.error('Get feedback error:', error)
    res.status(500).json({ message: 'Error fetching feedback' })
  }
})

module.exports = router 