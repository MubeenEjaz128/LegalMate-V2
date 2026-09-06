const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterRole: {
    type: String,
    enum: ['CLIENT', 'LAWYER'],
    default: 'LAWYER'
  },
  requestedAmountPkr: {
    type: Number,
    required: true,
    min: 100 // Minimum 100 PKR
  },
  payoutMethod: {
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'],
    required: true
  },
  payoutDetailsSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING_ADMIN_ACTION', 'PAID', 'REJECTED', 'CANCELLED'],
    default: 'PENDING_ADMIN_ACTION'
  },
  adminNote: {
    type: String,
    maxlength: 500
  },
  disbursementReference: {
    type: String,
    maxlength: 100
  },
  adminProofUrl: {
    type: String,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  recipientConfirmationStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'DISPUTED'],
    default: 'PENDING'
  },
  recipientConfirmedAt: {
    type: Date
  },
  recipientConfirmationNote: {
    type: String,
    maxlength: 500
  },
  recipientResponseBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
withdrawRequestSchema.index({ lawyer: 1, status: 1 });
withdrawRequestSchema.index({ status: 1, createdAt: -1 });
withdrawRequestSchema.index({ processedBy: 1 });

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);
