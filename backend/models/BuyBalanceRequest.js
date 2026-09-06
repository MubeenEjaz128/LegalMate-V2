const mongoose = require('mongoose');

const buyBalanceRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAmountPkr: {
    type: Number,
    required: true,
    min: 100 // Minimum 100 PKR
  },
  method: {
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING_PROOF_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'NEEDS_MORE_INFO'],
    default: 'PENDING_PROOF_REVIEW'
  },
  userNote: {
    type: String,
    maxlength: 500
  },
  adminNote: {
    type: String,
    maxlength: 500
  },
  proofAttachmentUrl: {
    type: String,
    required: true
  },
  userReference: {
    type: String,
    maxlength: 100
  },
  finalApprovedAmountPkr: {
    type: Number,
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
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
buyBalanceRequestSchema.index({ user: 1, status: 1 });
buyBalanceRequestSchema.index({ status: 1, createdAt: -1 });
buyBalanceRequestSchema.index({ processedBy: 1 });

module.exports = mongoose.model('BuyBalanceRequest', buyBalanceRequestSchema);
