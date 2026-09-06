const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, requireLawyer, requireAdmin, requireLawyerOrAdmin } = require('../middleware/auth');
const LawyerPayoutProfile = require('../models/LawyerPayoutProfile');
const PayoutPolicy = require('../models/PayoutPolicy');
const PaymentMethod = require('../models/PaymentMethod');
const { body, validationResult } = require('express-validator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payout-attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payout-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'), false);
    }
  }
});

// Get payout profiles (for both lawyers and clients)
router.get('/', auth, async (req, res) => {
  try {
    const profiles = await LawyerPayoutProfile.find({ user: req.user.userId })
      .sort({ isDefault: -1, createdAt: -1 });
    
    res.json({ profiles });
  } catch (error) {
    console.error('Error fetching payout profiles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dynamic validation middleware for payment methods
const validatePaymentMethod = async (req, res, next) => {
  try {
    // Allow common payment methods without database dependency
    const allowedMethods = ['JAZZCASH', 'EASYPAYSA', 'NAYAPAY', 'BANK'];
    
    if (!req.body.method) {
      return res.status(400).json({ 
        message: 'Payment method is required',
        allowedMethods: allowedMethods
      });
    }
    
    // Validate against allowed methods
    if (!allowedMethods.includes(req.body.method.toUpperCase())) {
      return res.status(400).json({ 
        message: 'Invalid payment method',
        allowedMethods: allowedMethods
      });
    }
    
    // Normalize method to uppercase
    req.body.method = req.body.method.toUpperCase();
    
    next();
  } catch (error) {
    console.error('Error validating payment method:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
};

// Create payout profile (for both lawyers and clients)
router.post('/', auth, validatePaymentMethod, [
  body('accountName').notEmpty().withMessage('Account name is required'),
  body('accountNumberOrIban').notEmpty().withMessage('Account number/IBAN is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check profile limit
    const policy = await PayoutPolicy.findOne().sort({ createdAt: -1 });
    const maxProfiles = policy?.maxProfilesPerLawyer || 3;
    
    const existingProfiles = await LawyerPayoutProfile.countDocuments({ user: req.user.userId });
    if (existingProfiles >= maxProfiles) {
      return res.status(400).json({ 
        message: `Maximum ${maxProfiles} payout profiles allowed per lawyer` 
      });
    }

    const { method, accountName, accountNumberOrIban, extra = {}, isDefault = false } = req.body;

    const profile = new LawyerPayoutProfile({
      user: req.user.userId,
      method,
      accountName,
      accountNumberOrIban,
      extra,
      isDefault,
      status: 'APPROVED' // Auto-approve payout profiles for easier access
    });

    await profile.save();

    res.status(201).json({ 
      message: 'Payout profile created and approved successfully',
      profile 
    });
  } catch (error) {
    console.error('Error creating payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dynamic validation middleware for payment method updates
const validatePaymentMethodUpdate = async (req, res, next) => {
  try {
    // Skip validation if method is not being updated
    if (!req.body.method) {
      return next();
    }
    
    // Get active payment methods from database
    const activePaymentMethods = await PaymentMethod.find({ isActive: true }, 'method');
    const validMethods = activePaymentMethods.map(pm => pm.method);
    
    // If no payment methods are configured, allow any method
    if (validMethods.length === 0) {
      return next();
    }
    
    // Validate against database methods
    if (!validMethods.includes(req.body.method)) {
      return res.status(400).json({ 
        message: 'Invalid payment method',
        validMethods: validMethods
      });
    }
    
    next();
  } catch (error) {
    console.error('Error validating payment method:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
};

// Update payout profile (for both lawyers and clients)
router.put('/:id', auth, validatePaymentMethodUpdate, [
  body('accountName').optional().notEmpty().withMessage('Account name cannot be empty'),
  body('accountNumberOrIban').optional().notEmpty().withMessage('Account number/IBAN cannot be empty')
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

    const profile = await LawyerPayoutProfile.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    // Check if profile is locked
    if (profile.status === 'LOCKED') {
      return res.status(403).json({ message: 'This payout profile is locked and cannot be edited' });
    }

    // If editing approved profile, set status back to SUBMITTED
    if (profile.status === 'APPROVED' && Object.keys(updateData).length > 0) {
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date();
    }

    Object.assign(profile, updateData);
    await profile.save();

    res.json({ 
      message: 'Payout profile updated successfully',
      profile 
    });
  } catch (error) {
    console.error('Error updating payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lawyer: Submit profile for verification
router.post('/:id/submit', auth, requireLawyerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await LawyerPayoutProfile.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (profile.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft profiles can be submitted for verification' });
    }

    profile.status = 'SUBMITTED';
    profile.submittedAt = new Date();
    await profile.save();

    res.json({ 
      message: 'Payout profile submitted for verification',
      profile 
    });
  } catch (error) {
    console.error('Error submitting payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set profile as default (for both lawyers and clients)
router.post('/:id/set-default', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await LawyerPayoutProfile.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (profile.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved profiles can be set as default' });
    }

    // Unset other default profiles
    await LawyerPayoutProfile.updateMany(
      { user: req.user.userId, _id: { $ne: id } },
      { $set: { isDefault: false } }
    );

    profile.isDefault = true;
    await profile.save();

    res.json({ 
      message: 'Default payout profile updated',
      profile 
    });
  } catch (error) {
    console.error('Error setting default payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lawyer: Upload attachments
router.post('/:id/attachments', auth, requireLawyerOrAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await LawyerPayoutProfile.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      url: file.path,
      type: file.mimetype,
      size: file.size
    }));

    profile.attachments = [...(profile.attachments || []), ...attachments];
    await profile.save();

    res.json({ 
      message: 'Attachments uploaded successfully',
      profile 
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payout profile (for both lawyers and clients)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await LawyerPayoutProfile.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    // Only allow deletion of draft or rejected profiles
    if (!['DRAFT', 'REJECTED'].includes(profile.status)) {
      return res.status(400).json({ 
        message: 'Only draft or rejected profiles can be deleted' 
      });
    }

    await LawyerPayoutProfile.findByIdAndDelete(id);

    res.json({ message: 'Payout profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all payout profiles with filters
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const { status, method, lawyerId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (lawyerId) filter.user = lawyerId;

    const profiles = await LawyerPayoutProfile.find(filter)
      .populate('user', 'name email')
      .populate('reviewedByAdmin', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LawyerPayoutProfile.countDocuments(filter);

    res.json({
      profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payout profiles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve payout profile
router.patch('/admin/:id/approve', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const profile = await LawyerPayoutProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (profile.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted profiles can be approved' });
    }

    profile.status = 'APPROVED';
    profile.reviewedByAdmin = req.user.userId;
    profile.reviewNote = reviewNote;
    profile.reviewedAt = new Date();
    await profile.save();

    res.json({ 
      message: 'Payout profile approved successfully',
      profile 
    });
  } catch (error) {
    console.error('Error approving payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Reject payout profile
router.patch('/admin/:id/reject', auth, requireAdmin, [
  body('reviewNote').notEmpty().withMessage('Review note is required for rejection')
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
    const { reviewNote } = req.body;

    const profile = await LawyerPayoutProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (profile.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted profiles can be rejected' });
    }

    profile.status = 'REJECTED';
    profile.reviewedByAdmin = req.user.userId;
    profile.reviewNote = reviewNote;
    profile.reviewedAt = new Date();
    await profile.save();

    res.json({ 
      message: 'Payout profile rejected',
      profile 
    });
  } catch (error) {
    console.error('Error rejecting payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Lock/unlock payout profile
router.patch('/admin/:id/lock', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await LawyerPayoutProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    const newStatus = profile.status === 'LOCKED' ? 'APPROVED' : 'LOCKED';
    profile.status = newStatus;
    profile.reviewedByAdmin = req.user.userId;
    profile.reviewedAt = new Date();
    await profile.save();

    res.json({ 
      message: `Payout profile ${newStatus === 'LOCKED' ? 'locked' : 'unlocked'} successfully`,
      profile 
    });
  } catch (error) {
    console.error('Error toggling payout profile lock:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Edit payout profile
router.put('/admin/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const profile = await LawyerPayoutProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    Object.assign(profile, updateData);
    profile.reviewedByAdmin = req.user.userId;
    profile.reviewedAt = new Date();
    await profile.save();

    res.json({ 
      message: 'Payout profile updated by admin',
      profile 
    });
  } catch (error) {
    console.error('Error updating payout profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
