const express = require('express');
const router = express.Router();
const { auth, requireLawyer, requireAdmin } = require('../middleware/auth');
const WithdrawRequest = require('../models/WithdrawRequest');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');
const LawyerPayoutProfile = require('../models/LawyerPayoutProfile');
const PayoutPolicy = require('../models/PayoutPolicy');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');

// Get withdrawal requests (for both lawyers and clients)
router.get('/requests', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Use 'lawyer' field for both lawyers and clients (legacy field name)
    const filter = { lawyer: req.user.userId };
    if (status) filter.status = status;

    const requests = await WithdrawRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WithdrawRequest.countDocuments(filter);

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
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get balance and payout profiles (for both lawyers and clients)
router.get('/balance', auth, async (req, res) => {
  try {
    let balance = await UserBalance.findOne({ user: req.user.userId });
    
    if (!balance) {
      balance = await UserBalance.create({
        user: req.user.userId,
        balancePkr: 0
      });
    }

    // Get approved payout profiles
    const payoutProfiles = await LawyerPayoutProfile.find({ 
      user: req.user.userId, 
      status: 'APPROVED' 
    }).sort({ isDefault: -1, createdAt: -1 });

    // Get payout policy
    const policy = await PayoutPolicy.findOne().sort({ createdAt: -1 });

    res.json({ 
      balancePkr: balance.balancePkr,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn,
      payoutProfiles,
      policy: {
        minWithdrawAmountPkr: policy?.minWithdrawAmountPkr || 100,
        maxWithdrawAmountPkrPerDay: policy?.maxWithdrawAmountPkrPerDay || 10000,
        requireVerificationBeforeWithdraw: policy?.requireVerificationBeforeWithdraw || true
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create withdrawal request (for both lawyers and clients)
router.post('/request', auth, [
  body('requestedAmountPkr').isFloat({ min: 100 }).withMessage('Minimum withdrawal amount is 100 PKR'),
  body('payoutProfileId').isMongoId().withMessage('Valid payout profile ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { requestedAmountPkr, payoutProfileId } = req.body;

    // Check user balance
    let balance = await UserBalance.findOne({ user: req.user.userId });
    if (!balance) {
      balance = await UserBalance.create({
        user: req.user.userId,
        balancePkr: 0
      });
    }

    if (balance.balancePkr < requestedAmountPkr) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        availableBalance: balance.balancePkr,
        requestedAmount: requestedAmountPkr
      });
    }

    // Check payout profile
    const payoutProfile = await LawyerPayoutProfile.findOne({ 
      _id: payoutProfileId, 
      user: req.user.userId, 
      status: 'APPROVED' 
    });

    if (!payoutProfile) {
      return res.status(404).json({ message: 'Approved payout profile not found' });
    }

    // Check daily withdrawal limit
    const policy = await PayoutPolicy.findOne().sort({ createdAt: -1 });
    const maxDailyWithdraw = policy?.maxWithdrawAmountPkrPerDay || 10000;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWithdrawals = await WithdrawRequest.find({
      lawyer: req.user.userId,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['PENDING_ADMIN_ACTION', 'PAID'] }
    });

    const todayTotal = todayWithdrawals.reduce((sum, req) => sum + req.requestedAmountPkr, 0);
    if (todayTotal + requestedAmountPkr > maxDailyWithdraw) {
      return res.status(400).json({ 
        message: 'Daily withdrawal limit exceeded',
        todayWithdrawn: todayTotal,
        maxDaily: maxDailyWithdraw,
        remaining: maxDailyWithdraw - todayTotal
      });
    }

    // Create withdrawal request
    const withdrawRequest = new WithdrawRequest({
      lawyer: req.user.userId,
      requesterRole: req.user.role === 'client' ? 'CLIENT' : 'LAWYER',
      requestedAmountPkr: parseFloat(requestedAmountPkr),
      payoutMethod: payoutProfile.method,
      payoutDetailsSnapshot: {
        accountName: payoutProfile.accountName,
        accountNumberOrIban: payoutProfile.accountNumberOrIban,
        extra: payoutProfile.extra,
        profileId: payoutProfile._id
      },
      status: 'PENDING_ADMIN_ACTION'
    });

    await withdrawRequest.save();

    // DEDUCT balance immediately (escrow) so it can't be spent elsewhere
    const balanceBefore = balance.balancePkr;
    balance.balancePkr -= parseFloat(requestedAmountPkr);
    await balance.save();

    // Create hold transaction record
    await WalletTransaction.create({
      user: req.user.userId,
      type: 'WITHDRAWAL_HOLD',
      amountPkr: -parseFloat(requestedAmountPkr),
      balanceBefore,
      balanceAfter: balance.balancePkr,
      reference: `WITHDRAWAL-HOLD-${withdrawRequest._id}`,
      description: `Balance held for withdrawal request #${withdrawRequest._id}`,
      relatedRequest: withdrawRequest._id
    });

    // Notify admin
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(req.app.get('io'), {
        type: 'withdrawal_request',
        title: 'New Withdrawal Request',
        message: `${req.user.name || 'A lawyer'} requested withdrawal of PKR ${withdrawRequest.requestedAmountPkr}`,
        referenceId: withdrawRequest._id,
        referenceModel: 'WithdrawRequest',
        metadata: { userName: req.user.name, userEmail: req.user.email, amount: withdrawRequest.requestedAmountPkr }
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    // Email admin about the new withdrawal request
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://new.legalmate.me';
      const adminLink = `${frontendUrl}/dashboard?tab=withdrawal-requests`;
      const roleName = req.user.role === 'client' ? 'Client' : 'Lawyer';
      await sendEmail({
        email: 'legalmate.services@gmail.com',
        subject: `New Withdrawal Request — PKR ${withdrawRequest.requestedAmountPkr.toLocaleString()} by ${req.user.name || 'User'}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 28px 24px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 22px;">🏦 New Withdrawal Request</h1>
            </div>
            <div style="padding: 28px 24px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">User</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${req.user.name || 'N/A'} (${roleName})</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Email</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${req.user.email || 'N/A'}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Amount</td><td style="padding: 10px 0; font-weight: 700; color: #dc2626; text-align: right; font-size: 18px;">PKR ${withdrawRequest.requestedAmountPkr.toLocaleString()}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Payout Method</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${withdrawRequest.payoutMethod}</td></tr>
                <tr><td style="padding: 10px 0; color: #64748b; font-size: 14px;">Account</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${withdrawRequest.payoutDetailsSnapshot?.accountName || '—'}<br/><span style="font-size: 12px; color: #64748b;">${withdrawRequest.payoutDetailsSnapshot?.accountNumberOrIban || ''}</span></td></tr>
              </table>
              <div style="text-align: center; margin-top: 24px;">
                <a href="${adminLink}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Review Withdrawal Requests →</a>
              </div>
              <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #94a3b8;">You are receiving this because a new withdrawal request was submitted on LegalMate.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) { console.error('Admin email error:', emailErr.message); }

    res.status(201).json({
      message: 'Withdrawal request submitted successfully. It will be processed within 24-48 hours.',
      request: {
        id: withdrawRequest._id,
        requestedAmountPkr: withdrawRequest.requestedAmountPkr,
        payoutMethod: withdrawRequest.payoutMethod,
        status: withdrawRequest.status,
        createdAt: withdrawRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific withdrawal request (for both lawyers and clients)
router.get('/requests/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await WithdrawRequest.findOne({ 
      _id: id, 
      lawyer: req.user.userId 
    });

    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel withdrawal request (for both lawyers and clients)
router.patch('/requests/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await WithdrawRequest.findOne({ 
      _id: id, 
      lawyer: req.user.userId 
    });

    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'PENDING_ADMIN_ACTION') {
      return res.status(400).json({ 
        message: 'Only pending withdrawal requests can be cancelled' 
      });
    }

    request.status = 'CANCELLED';
    await request.save();

    // Refund the held amount back to user balance
    const userBalance = await UserBalance.findOne({ user: req.user.userId });
    if (userBalance) {
      const balanceBefore = userBalance.balancePkr;
      userBalance.balancePkr += request.requestedAmountPkr;
      await userBalance.save();

      await WalletTransaction.create({
        user: req.user.userId,
        type: 'REFUND',
        amountPkr: request.requestedAmountPkr,
        balanceBefore,
        balanceAfter: userBalance.balancePkr,
        reference: `REFUND-CANCEL-${request._id}`,
        description: `Refund for cancelled withdrawal request #${request._id}`,
        relatedRequest: request._id
      });
    }

    res.json({
      message: 'Withdrawal request cancelled successfully',
      request
    });
  } catch (error) {
    console.error('Error cancelling withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all withdrawal requests
router.get('/admin/requests', auth, requireAdmin, async (req, res) => {
  try {
    const { status, method, lawyerId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.payoutMethod = method;
    if (lawyerId) filter.lawyer = lawyerId;

    const requests = await WithdrawRequest.find(filter)
      .populate('lawyer', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WithdrawRequest.countDocuments(filter);

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
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve withdrawal request
router.patch('/admin/requests/:id/approve', auth, requireAdmin, [
  body('disbursementReference').optional().isLength({ max: 100 }).withMessage('Reference too long'),
  body('adminNote').optional().isLength({ max: 500 }).withMessage('Note too long')
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
    const { disbursementReference, adminNote } = req.body;

    const request = await WithdrawRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'PENDING_ADMIN_ACTION') {
      return res.status(400).json({ message: 'Only pending requests can be approved' });
    }

    // Start manual transaction (without MongoDB sessions for standalone setup)
    try {
      // Update request
      request.status = 'PAID';
      request.disbursementReference = disbursementReference;
      request.adminNote = adminNote;
      request.processedBy = req.user.userId;
      request.processedAt = new Date();
      await request.save();

      // Balance was already deducted when request was created (escrow)
      // Just update totalWithdrawn tracker and create transaction record
      const lawyerBalance = await UserBalance.findOne({ user: request.lawyer });
      if (lawyerBalance) {
        lawyerBalance.totalWithdrawn = (lawyerBalance.totalWithdrawn || 0) + request.requestedAmountPkr;
        await lawyerBalance.save();
      }

      // Create wallet transaction record
      const walletTransaction = new WalletTransaction({
        user: request.lawyer,
        type: 'WITHDRAWAL',
        amountPkr: -request.requestedAmountPkr,
        balanceBefore: lawyerBalance?.balancePkr || 0,
        balanceAfter: lawyerBalance?.balancePkr || 0,
        reference: `WITHDRAWAL-${request._id}`,
        description: `Withdrawal via ${request.payoutMethod} - Request #${request._id}`,
        metadata: {
          payoutMethod: request.payoutMethod,
          disbursementReference,
          payoutDetails: request.payoutDetailsSnapshot
        },
        relatedRequest: request._id,
        processedBy: req.user.userId
      });
      await walletTransaction.save();

      res.json({
        message: 'Withdrawal request approved successfully',
        disbursementReference,
        newBalance: lawyerBalance?.balancePkr || 0
      });
    } catch (error) {
      // If error occurred, try to revert the request status
      try {
        request.status = 'PENDING_ADMIN_ACTION';
        await request.save();
        console.log('⚠️ Request status reverted due to error');
      } catch (revertError) {
        console.error('❌ Failed to revert request status:', revertError);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error approving withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Reject withdrawal request
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

    const request = await WithdrawRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'PENDING_ADMIN_ACTION') {
      return res.status(400).json({ message: 'Only pending requests can be rejected' });
    }

    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason;
    request.processedBy = req.user.userId;
    request.processedAt = new Date();
    await request.save();

    // Refund the held amount back to user balance
    const userBalance = await UserBalance.findOne({ user: request.lawyer });
    if (userBalance) {
      const balanceBefore = userBalance.balancePkr;
      userBalance.balancePkr += request.requestedAmountPkr;
      await userBalance.save();

      await WalletTransaction.create({
        user: request.lawyer,
        type: 'REFUND',
        amountPkr: request.requestedAmountPkr,
        balanceBefore,
        balanceAfter: userBalance.balancePkr,
        reference: `REFUND-REJECT-${request._id}`,
        description: `Refund for rejected withdrawal request #${request._id}`,
        relatedRequest: request._id
      });
    }

    res.json({
      message: 'Withdrawal request rejected',
      request
    });
  } catch (error) {
    console.error('Error rejecting withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User confirmation (client/lawyer) after payment
router.patch('/requests/:id/confirm', auth, [
  body('status').isIn(['CONFIRMED', 'DISPUTED']).withMessage('Invalid confirmation status'),
  body('note').optional().isLength({ max: 500 }).withMessage('Note too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user.userId;

    const request = await WithdrawRequest.findOne({ _id: id, lawyer: userId });
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'PAID') {
      return res.status(400).json({ message: 'Confirmation only allowed after admin marks the request as paid' });
    }

    request.recipientConfirmationStatus = status;
    request.recipientConfirmationNote = note;
    request.recipientConfirmedAt = new Date();
    request.recipientResponseBy = userId;
    await request.save();

    res.json({
      message: status === 'CONFIRMED' ? 'Payment confirmed. Thank you!' : 'Dispute recorded. Admin will review.',
      request
    });
  } catch (error) {
    console.error('Error updating withdrawal confirmation:', error);
    res.status(500).json({ message: 'Failed to update confirmation status' });
  }
});

module.exports = router;
