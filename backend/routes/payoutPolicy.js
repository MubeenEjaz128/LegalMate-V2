const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const PayoutPolicy = require('../models/PayoutPolicy');
const PaymentMethod = require('../models/PaymentMethod');
const { body, validationResult } = require('express-validator');

// Helper function to get payment methods from database
const getPaymentMethodsConfig = async () => {
  try {
    const paymentMethods = await PaymentMethod.find({ isActive: true });
    
    if (paymentMethods.length === 0) {
      return {
        allowedMethods: [],
        requiredFieldsByMethod: {}
      };
    }
    
    const allowedMethods = paymentMethods.map(pm => pm.method);
    const requiredFieldsByMethod = {};
    
    paymentMethods.forEach(pm => {
      requiredFieldsByMethod[pm.method] = ['accountName', 'accountNumberOrIban'];
    });
    
    return { allowedMethods, requiredFieldsByMethod };
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return {
      allowedMethods: [],
      requiredFieldsByMethod: {}
    };
  }
};

// Get current payout policy
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    let policy = await PayoutPolicy.findOne().sort({ createdAt: -1 });
    
    if (!policy) {
      // Get dynamic payment methods for default policy
      const { allowedMethods, requiredFieldsByMethod } = await getPaymentMethodsConfig();
      
      // Create default policy if none exists
      policy = new PayoutPolicy({
        maxProfilesPerLawyer: 3,
        requireVerificationBeforeWithdraw: true,
        allowedMethods,
        requiredFieldsByMethod,
        minWithdrawAmountPkr: 100,
        maxWithdrawAmountPkrPerDay: 10000,
        blocklistAccounts: [],
        updatedBy: req.user.userId
      });
      await policy.save();
    }

    res.json({ policy });
  } catch (error) {
    console.error('Error fetching payout policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payout policy
router.put('/', auth, requireAdmin, [
  body('maxProfilesPerLawyer').optional().isInt({ min: 1, max: 10 }).withMessage('Max profiles must be between 1 and 10'),
  body('requireVerificationBeforeWithdraw').optional().isBoolean().withMessage('Require verification must be boolean'),
  body('allowedMethods').optional().isArray().withMessage('Allowed methods must be an array'),
  body('minWithdrawCredits').optional().isInt({ min: 0 }).withMessage('Min withdraw must be non-negative'),
  body('maxWithdrawCreditsPerDay').optional().isInt({ min: 0 }).withMessage('Max daily withdraw must be non-negative'),
  body('blocklistAccounts').optional().isArray().withMessage('Blocklist must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.userId
    };

    let policy = await PayoutPolicy.findOne().sort({ createdAt: -1 });
    
    if (policy) {
      // Update existing policy
      Object.assign(policy, updateData);
      await policy.save();
    } else {
      // Get dynamic payment methods for new policy
      const { allowedMethods, requiredFieldsByMethod } = await getPaymentMethodsConfig();
      
      // Create new policy
      policy = new PayoutPolicy({
        ...updateData,
        maxProfilesPerLawyer: updateData.maxProfilesPerLawyer || 3,
        requireVerificationBeforeWithdraw: updateData.requireVerificationBeforeWithdraw !== undefined ? updateData.requireVerificationBeforeWithdraw : true,
        allowedMethods: updateData.allowedMethods || allowedMethods,
        requiredFieldsByMethod: updateData.requiredFieldsByMethod || requiredFieldsByMethod,
        minWithdrawAmountPkr: updateData.minWithdrawAmountPkr || 100,
        maxWithdrawAmountPkrPerDay: updateData.maxWithdrawAmountPkrPerDay || 10000,
        blocklistAccounts: updateData.blocklistAccounts || []
      });
      await policy.save();
    }

    res.json({
      message: 'Payout policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Error updating payout policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get policy history (optional - for audit trail)
router.get('/history', auth, requireAdmin, async (req, res) => {
  try {
    const policies = await PayoutPolicy.find()
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10); // Last 10 changes

    res.json({ policies });
  } catch (error) {
    console.error('Error fetching policy history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
