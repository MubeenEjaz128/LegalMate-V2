const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const PaymentMethod = require('../models/PaymentMethod');
const { body, validationResult } = require('express-validator');

// Get all active payment methods (public)
router.get('/', async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ isActive: true })
      .sort({ displayOrder: 1, method: 1 });
    
    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all payment methods (including inactive)
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find()
      .sort({ displayOrder: 1, method: 1 });
    
    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching all payment methods:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create payment method
router.post('/admin', auth, requireAdmin, [
  body('method').isIn(['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK']).withMessage('Invalid payment method'),
  body('accountName').notEmpty().withMessage('Account name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('displayOrder').optional().isInt().withMessage('Display order must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { method, accountName, accountNumber, extra = {}, displayOrder = 0 } = req.body;

    const paymentMethod = new PaymentMethod({
      method,
      accountName,
      accountNumber,
      extra,
      displayOrder
    });

    await paymentMethod.save();

    res.status(201).json({ 
      message: 'Payment method created successfully',
      paymentMethod 
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update payment method
router.put('/admin/:id', auth, requireAdmin, [
  body('method').optional().isIn(['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK']).withMessage('Invalid payment method'),
  body('accountName').optional().notEmpty().withMessage('Account name cannot be empty'),
  body('accountNumber').optional().notEmpty().withMessage('Account number cannot be empty'),
  body('displayOrder').optional().isInt().withMessage('Display order must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    res.json({ 
      message: 'Payment method updated successfully',
      paymentMethod 
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete payment method
router.delete('/admin/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findByIdAndDelete(id);

    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Toggle payment method active status
router.patch('/admin/:id/toggle', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    paymentMethod.isActive = !paymentMethod.isActive;
    await paymentMethod.save();

    res.json({ 
      message: `Payment method ${paymentMethod.isActive ? 'activated' : 'deactivated'} successfully`,
      paymentMethod 
    });
  } catch (error) {
    console.error('Error toggling payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
