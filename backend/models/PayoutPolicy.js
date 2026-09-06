const mongoose = require('mongoose');

const payoutPolicySchema = new mongoose.Schema({
  maxProfilesPerLawyer: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  requireVerificationBeforeWithdraw: {
    type: Boolean,
    default: true
  },
  allowedMethods: [{
    type: String,
    enum: ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK']
  }],
  requiredFieldsByMethod: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      JAZZCASH: ['accountName', 'accountNumberOrIban'],
      EASYPAYSA: ['accountName', 'accountNumberOrIban'],
      NAYAPAY: ['accountName', 'accountNumberOrIban'],
      BANK: ['accountName', 'accountNumberOrIban']
    }
  },
  minWithdrawAmountPkr: {
    type: Number,
    default: 100,
    min: 0
  },
  maxWithdrawAmountPkrPerDay: {
    type: Number,
    default: 10000,
    min: 0
  },
  blocklistAccounts: [{
    type: String
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PayoutPolicy', payoutPolicySchema);
