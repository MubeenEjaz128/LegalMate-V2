const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'DEPOSIT',           // Client deposits money
      'WITHDRAWAL',        // Lawyer withdraws money
      'BOOKING_PAYMENT',   // Client pays for booking
      'BOOKING_EARNING',   // Lawyer earns from booking
      'COMMISSION',        // Admin earns commission
      'REFUND',            // Refund to client
      'ADJUSTMENT',        // Manual adjustment by admin
      'PAYMENT_FUNDING',   // Admin funds payment approvals
      'APPOINTMENT_PAYMENT' // Client pays for appointment when lawyer accepts
    ],
    required: true
  },
  amountPkr: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  relatedAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  relatedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // Can reference BuyBalanceRequest or WithdrawRequest
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });
walletTransactionSchema.index({ reference: 1 });
walletTransactionSchema.index({ relatedAppointment: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
