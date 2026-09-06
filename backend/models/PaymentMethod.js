const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'],
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  extra: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
paymentMethodSchema.index({ method: 1, isActive: 1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
