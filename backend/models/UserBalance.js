const mongoose = require('mongoose');

const userBalanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balancePkr: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCommission: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Note: Index on 'user' field is automatically created due to 'unique: true' constraint

// Ensure balance doesn't go negative
userBalanceSchema.pre('save', function(next) {
  if (this.balancePkr < 0) {
    return next(new Error('Balance cannot be negative'));
  }
  next();
});

module.exports = mongoose.model('UserBalance', userBalanceSchema);
