const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'balance_request',
      'withdrawal_request',
      'new_lawyer',
      'lawyer_verification',
      'new_appointment',
      'contact_message',
      'new_feedback',
      'new_user',
      'video_call_started',
      'refund_request',
      'system'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  // Optional reference to the related document
  referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
  referenceModel: {
    type: String,
    enum: ['User', 'Appointment', 'BuyBalanceRequest', 'WithdrawRequest', 'ContactMessage', 'Feedback', 'VideoCallRecording', null]
  },
  // For quick identification in UI
  metadata: {
    userName: String,
    userEmail: String,
    amount: Number,
    extra: String
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date }
}, {
  timestamps: true
});

// Index for fetching unread notifications quickly
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
