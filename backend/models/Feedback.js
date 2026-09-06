const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  categories: {
    communication: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    expertise: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    professionalism: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    value: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
