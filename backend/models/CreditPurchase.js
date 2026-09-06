const mongoose = require('mongoose');

const creditPurchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  credits: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'],
    default: 'BANK'
  },
  // Manual payment fields
  transactionId: {
    type: String
  },
  senderName: {
    type: String
  },
  notes: {
    type: String
  },
  paymentProofPath: {
    type: String
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  // Payment distribution tracking
  adminCommission: {
    type: Number,
    required: true,
    default: 0
  },
  lawyerPayment: {
    type: Number,
    required: true,
    default: 0
  },
  commissionPercentage: {
    type: Number,
    required: true,
    default: 10 // 10% admin commission
  }
}, {
  timestamps: true
});

// Calculate commission and lawyer payment before saving
creditPurchaseSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('commissionPercentage')) {
    this.adminCommission = (this.amount * this.commissionPercentage) / 100;
    this.lawyerPayment = this.amount - this.adminCommission;
  }
  next();
});

module.exports = mongoose.model('CreditPurchase', creditPurchaseSchema);