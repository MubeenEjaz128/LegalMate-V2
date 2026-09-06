const mongoose = require('mongoose');

const lawyerPayoutProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'],
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountNumberOrIban: {
    type: String,
    required: true
  },
  extra: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED'],
    default: 'DRAFT'
  },
  reviewedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewNote: {
    type: String,
    default: null
  },
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
lawyerPayoutProfileSchema.index({ user: 1, status: 1 });
lawyerPayoutProfileSchema.index({ user: 1, isDefault: 1 });
lawyerPayoutProfileSchema.index({ status: 1 });

// Ensure only one default profile per user
lawyerPayoutProfileSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('LawyerPayoutProfile', lawyerPayoutProfileSchema);
