const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { auth, requireClient, requireAdmin } = require('../middleware/auth');
const BuyBalanceRequest = require('../models/BuyBalanceRequest');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');
const PaymentMethod = require('../models/PaymentMethod');
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'balance-proof-' + uniqueSuffix + path.extname(file.originalname));
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

// Client: Get their balance
router.get('/balance', auth, async (req, res) => {
  try {
    let balance = await UserBalance.findOne({ user: req.user.userId });
    
    if (!balance) {
      balance = await UserBalance.create({
        user: req.user.userId,
        balancePkr: 0
      });
    }

    res.json({ 
      balancePkr: balance.balancePkr,
      totalDeposited: balance.totalDeposited,
      totalWithdrawn: balance.totalWithdrawn,
      totalEarned: balance.totalEarned
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Get available payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ isActive: true })
      .sort({ displayOrder: 1, method: 1 });
    
    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Create buy balance request
router.post('/request', auth, requireClient, upload.single('proof'), [
  body('requestedAmountPkr').isFloat({ min: 100 }).withMessage('Minimum amount is 100 PKR'),
  body('method').notEmpty().withMessage('Payment method is required'),
  body('userReference').optional().isLength({ max: 100 }).withMessage('Reference too long'),
  body('userNote').optional().isLength({ max: 500 }).withMessage('Note too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Payment proof is required' });
    }

    const { requestedAmountPkr, method, userReference, userNote } = req.body;

    // Verify payment method exists and is active
    const paymentMethod = await PaymentMethod.findOne({ method, isActive: true });
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Selected payment method is not available' });
    }

    const balanceRequest = new BuyBalanceRequest({
      user: req.user.userId,
      requestedAmountPkr: parseFloat(requestedAmountPkr),
      method,
      userReference,
      userNote,
      proofAttachmentUrl: `${req.protocol}://${req.get('host')}/uploads/payment-proofs/${req.file.filename}`
    });

    await balanceRequest.save();

    // Notify admin
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(req.app.get('io'), {
        type: 'balance_request',
        title: 'New Balance Request',
        message: `${req.user.name || 'A user'} requested PKR ${balanceRequest.requestedAmountPkr} via ${balanceRequest.method}`,
        referenceId: balanceRequest._id,
        referenceModel: 'BuyBalanceRequest',
        metadata: { userName: req.user.name, userEmail: req.user.email, amount: balanceRequest.requestedAmountPkr }
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    // Email admin about the new balance request
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://new.legalmate.me';
      const adminLink = `${frontendUrl}/dashboard?tab=balance-requests`;
      await sendEmail({
        email: 'legalmate.services@gmail.com',
        subject: `New Balance Request — PKR ${balanceRequest.requestedAmountPkr.toLocaleString()} by ${req.user.name || 'User'}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #047857); padding: 28px 24px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 22px;">💰 New Balance Request</h1>
            </div>
            <div style="padding: 28px 24px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">User</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${req.user.name || 'N/A'}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Email</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${req.user.email || 'N/A'}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Amount</td><td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right; font-size: 18px;">PKR ${balanceRequest.requestedAmountPkr.toLocaleString()}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Method</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${balanceRequest.method}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Reference</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${balanceRequest.userReference || '—'}</td></tr>
              </table>
              <div style="text-align: center; margin-top: 24px;">
                <a href="${adminLink}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Review Balance Requests →</a>
              </div>
              <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #94a3b8;">You are receiving this because a new balance purchase request was submitted on LegalMate.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) { console.error('Admin email error:', emailErr.message); }

    res.status(201).json({
      message: 'Balance request submitted successfully. It will be reviewed within 24-48 hours.',
      request: {
        id: balanceRequest._id,
        requestedAmountPkr: balanceRequest.requestedAmountPkr,
        method: balanceRequest.method,
        status: balanceRequest.status,
        createdAt: balanceRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Get their balance requests
router.get('/requests', auth, requireClient, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user.userId };
    if (status) filter.status = status;

    const requests = await BuyBalanceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await BuyBalanceRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching balance requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Get specific balance request
router.get('/requests/:id', auth, requireClient, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BuyBalanceRequest.findOne({ 
      _id: id, 
      user: req.user.userId 
    });

    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all balance requests
router.get('/admin/requests', auth, requireAdmin, async (req, res) => {
  try {
    const { status, method, userId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (userId) filter.user = userId;

    const requests = await BuyBalanceRequest.find(filter)
      .populate('user', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await BuyBalanceRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching balance requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get specific balance request
router.get('/admin/requests/:id', auth, requireAdmin, async (req, res) => {
  try {
    const request = await BuyBalanceRequest.findById(req.params.id)
      .populate('user', 'name email')
      .populate('processedBy', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve balance request
router.patch('/admin/requests/:id/approve', auth, requireAdmin, async (req, res) => {
  console.log('🔍 Approve request started');
  console.log('🔍 Request params:', req.params);
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request user:', req.user);
  
  try {

    const { id } = req.params;
    const { finalApprovedAmountPkr, adminNote } = req.body;

    const request = await BuyBalanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    console.log('Request status:', request.status);
    console.log('Request ID:', id);
    console.log('Request details:', {
      status: request.status,
      requestedAmount: request.requestedAmountPkr,
      user: request.user
    });

    if (request.status !== 'PENDING_PROOF_REVIEW') {
      return res.status(400).json({ 
        message: 'Only pending requests can be approved',
        currentStatus: request.status 
      });
    }

    const approvedAmount = finalApprovedAmountPkr || request.requestedAmountPkr;

    console.log('🔍 Checking admin balance before proceeding...');
    
    // Check if admin has sufficient balance (for system funds)
    const adminUser = await mongoose.model('User').findById(req.user.userId);
    console.log('👤 Admin user found:', adminUser?.email);
    
    let adminBalance = await UserBalance.findOne({ user: req.user.userId });
    console.log('💰 Admin balance found:', adminBalance?.balancePkr || 'No balance record');
    
    if (!adminBalance) {
      console.log('🆕 Creating admin balance...');
      adminBalance = await UserBalance.create({
        user: req.user.userId,
        balancePkr: 10000000, // 10 million PKR
        totalDeposited: 10000000,
        totalWithdrawn: 0
      });
      console.log('✅ Admin balance created with 10M PKR');
    }

    // Check if admin has sufficient balance to fund this approval
    if (adminBalance.balancePkr < approvedAmount) {
      return res.status(400).json({ 
        message: 'Insufficient admin balance to approve this request',
        adminBalance: adminBalance.balancePkr,
        required: approvedAmount
      });
    }

    // Start manual transaction (without MongoDB sessions for standalone setup)
    console.log('🔄 Starting manual transaction...');
    console.log('🔄 Database connection state:', mongoose.connection.readyState);
    console.log('🔄 Database name:', mongoose.connection.name);

    try {
      console.log('🔄 Processing request:', request._id);
      console.log('🔄 Approved amount:', approvedAmount);
      console.log('🔄 Request user:', request.user);
      
      // Update request
      request.status = 'APPROVED';
      request.finalApprovedAmountPkr = approvedAmount;
      request.adminNote = adminNote;
      request.processedBy = req.user.userId;
      request.processedAt = new Date();
      await request.save();
      console.log('✅ Request updated successfully');

      // Update user balance
      let userBalance = await UserBalance.findOne({ user: request.user });
      console.log('🔍 UserBalance found:', !!userBalance);
      
      if (!userBalance) {
        console.log('🆕 Creating new UserBalance for user:', request.user);
        userBalance = new UserBalance({
          user: request.user,
          balancePkr: 0,
          totalDeposited: 0
        });
      }

      const balanceBefore = userBalance.balancePkr;
      userBalance.balancePkr += approvedAmount;
      userBalance.totalDeposited += approvedAmount;
      await userBalance.save();
      console.log('✅ UserBalance updated successfully');

      // Deduct from admin balance (admin is funding this approval)
      const adminBalanceBefore = adminBalance.balancePkr;
      adminBalance.balancePkr -= approvedAmount;
      adminBalance.totalWithdrawn += approvedAmount;
      await adminBalance.save();
      console.log('✅ Admin balance deducted:', approvedAmount, 'PKR');
      console.log('💰 Admin new balance:', adminBalance.balancePkr, 'PKR');

      // Create wallet transaction
      console.log('🔄 Creating WalletTransaction...');
      const walletTransaction = new WalletTransaction({
        user: request.user,
        type: 'DEPOSIT',
        amountPkr: approvedAmount,
        balanceBefore,
        balanceAfter: userBalance.balancePkr,
        reference: `DEPOSIT-${request._id}`,
        description: `Balance top-up via ${request.method} - Request #${request._id}`,
        metadata: {
          method: request.method,
          userReference: request.userReference,
          originalRequestedAmount: request.requestedAmountPkr
        },
        relatedRequest: request._id,
        processedBy: req.user.userId
      });
      await walletTransaction.save();
      console.log('✅ WalletTransaction created successfully');

      // Create admin wallet transaction (deduction)
      const adminWalletTransaction = new WalletTransaction({
        user: req.user.userId,
        type: 'PAYMENT_FUNDING',
        amountPkr: -approvedAmount, // Negative for deduction
        balanceBefore: adminBalanceBefore,
        balanceAfter: adminBalance.balancePkr,
        reference: `FUNDING-${request._id}`,
        description: `Funded balance approval for ${userBalance.user} - Request #${request._id}`,
        metadata: {
          method: request.method,
          fundedUser: request.user,
          originalRequestedAmount: request.requestedAmountPkr
        },
        relatedRequest: request._id,
        processedBy: req.user.userId
      });
      await adminWalletTransaction.save();
      console.log('✅ Admin WalletTransaction created successfully');

      console.log('✅ Manual transaction completed successfully');

      res.json({
        message: 'Balance request approved successfully',
        approvedAmount,
        newBalance: userBalance.balancePkr
      });
    } catch (error) {
      console.error('❌ Manual transaction error:', error);
      
      // If error occurred, try to revert the request status
      try {
        request.status = 'PENDING_PROOF_REVIEW';
        await request.save();
        console.log('⚠️ Request status reverted due to error');
        
        // Try to revert admin balance if it was deducted
        if (adminBalance.balancePkr !== adminBalanceBefore) {
          adminBalance.balancePkr += approvedAmount;
          adminBalance.totalWithdrawn -= approvedAmount;
          await adminBalance.save();
          console.log('⚠️ Admin balance reverted due to error');
        }
      } catch (revertError) {
        console.error('❌ Failed to revert request status and balances:', revertError);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('❌ Error approving balance request:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    
    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }
    
    // Log specific error details
    if (error.name === 'ValidationError') {
      console.error('❌ Validation Error Details:', error.errors);
    }
    
    if (error.name === 'MongoServerError') {
      console.error('❌ MongoDB Error Code:', error.code);
      console.error('❌ MongoDB Error Details:', error.errorResponse);
    }
    
    res.status(500).json({ 
      message: 'Server error while approving balance request',
      error: error.message,
      errorName: error.name,
      errorCode: error.code || 'UNKNOWN'
    });
  }
});

// Admin: Reject balance request
router.patch('/admin/requests/:id/reject', auth, requireAdmin, [
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required')
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
    const { rejectionReason } = req.body;

    const request = await BuyBalanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    if (request.status !== 'PENDING_PROOF_REVIEW') {
      return res.status(400).json({ message: 'Only pending requests can be rejected' });
    }

    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason;
    request.processedBy = req.user.userId;
    request.processedAt = new Date();
    await request.save();

    res.json({
      message: 'Balance request rejected',
      request
    });
  } catch (error) {
    console.error('Error rejecting balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Cancel their own balance request
router.delete('/requests/:id', auth, requireClient, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await BuyBalanceRequest.findOne({
      _id: id,
      user: req.user.userId
    });

    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    if (request.status !== 'PENDING_PROOF_REVIEW') {
      return res.status(400).json({ 
        message: 'Only pending requests can be cancelled' 
      });
    }

    // Update status to CANCELLED
    request.status = 'CANCELLED';
    request.adminNote = 'Cancelled by user';
    await request.save();

    res.json({
      message: 'Balance request cancelled successfully',
      request
    });
  } catch (error) {
    console.error('Error cancelling balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Request more information
router.patch('/admin/requests/:id/need-info', auth, requireAdmin, [
  body('adminNote').notEmpty().withMessage('Admin note is required')
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
    const { adminNote } = req.body;

    const request = await BuyBalanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Balance request not found' });
    }

    if (request.status !== 'PENDING_PROOF_REVIEW') {
      return res.status(400).json({ message: 'Only pending requests can be marked as needing more info' });
    }

    request.status = 'NEEDS_MORE_INFO';
    request.adminNote = adminNote;
    request.processedBy = req.user.userId;
    request.processedAt = new Date();
    await request.save();

    res.json({
      message: 'Balance request marked as needing more information',
      request
    });
  } catch (error) {
    console.error('Error updating balance request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
