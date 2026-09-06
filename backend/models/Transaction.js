const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  commission: {
    type: Number,
    required: true,
    min: [0, 'Commission cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'refunded'],
    default: 'pending'
  },

  // Payment proof (URL as string). If an object is sent (e.g., file meta), we try to read .url
  proof: {
    type: String,
    default: null,
    set: (v) => {
      if (typeof v === 'string') return v || null;
      if (v && typeof v === 'object' && 'url' in v) return String(v.url || '') || null;
      return null; // avoid "{}" cast errors
    }
  },

  refundRequested: {
    type: Boolean,
    default: false
  },

  // Refund proof (URL as string). Safe-setter to tolerate objects.
  refundProof: {
    type: String,
    default: null,
    set: (v) => {
      if (typeof v === 'string') return v || null;
      if (v && typeof v === 'object' && 'url' in v) return String(v.url || '') || null;
      return null;
    }
  },

  // Multiple refund proofs (array of URLs)
  refundProofs: {
    type: [String],
    default: []
  },

  // Refund reason/explanation
  refundReason: {
    type: String,
    default: null
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  isDummy: {
    type: Boolean,
    default: true
  },

}, {
  timestamps: true
});

// Helpful indexes (optional)
transactionSchema.index({ appointment: 1, createdAt: -1 });
transactionSchema.index({ payer: 1, createdAt: -1 });
transactionSchema.index({ payee: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
