const mongoose = require('mongoose')

const videoCallRecordingSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Who started the call
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  initiatorRole: {
    type: String,
    enum: ['client', 'lawyer'],
  },
  // Recording file
  recordingUrl: {
    type: String,
  },
  recordingSize: {
    type: Number, // bytes
    default: 0
  },
  recordingDuration: {
    type: Number, // seconds
    default: 0
  },
  recordingFormat: {
    type: String,
    default: 'webm'
  },
  // Call metadata
  callStartedAt: {
    type: Date
  },
  callEndedAt: {
    type: Date
  },
  endReason: {
    type: String,
    enum: ['manual', 'session_expired', 'disconnected', 'error'],
    default: 'manual'
  },
  // In-call chat log
  chatMessages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderName: String,
    senderRole: {
      type: String,
      enum: ['client', 'lawyer']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Session info
  sessionDurationLimit: {
    type: Number,
    default: 3600 // 1 hour in seconds
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'failed'],
    default: 'in-progress'
  }
}, {
  timestamps: true
})

videoCallRecordingSchema.index({ createdAt: -1 })
videoCallRecordingSchema.index({ status: 1 })

module.exports = mongoose.model('VideoCallRecording', videoCallRecordingSchema)
