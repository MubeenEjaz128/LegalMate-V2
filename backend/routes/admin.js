const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawRequest = require('../models/WithdrawRequest');
const { auth, requireAdmin } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// Additional models for data reset
const AiChat = require('../models/AIChat');
const Blog = require('../models/Blog');
const BuyBalanceRequest = require('../models/BuyBalanceRequest');
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const ContactMessage = require('../models/ContactMessage');
const Conversation = require('../models/Conversation');
const CreditPurchase = require('../models/CreditPurchase');
const FAQ = require('../models/FAQ');
const Feedback = require('../models/Feedback');
const LawyerPayoutProfile = require('../models/LawyerPayoutProfile');
const Page = require('../models/Page');
const PaymentMethod = require('../models/PaymentMethod');
const PayoutPolicy = require('../models/PayoutPolicy');
const Service = require('../models/Service');
const SystemSettings = require('../models/SystemSettings');
const Transaction = require('../models/Transaction');
const VideoCallRecording = require('../models/VideoCallRecording');

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/payment-proofs/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `withdraw-proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'), false);
    }
  }
});
const { Parser } = require('json2csv');
const { getCommission, setCommission } = require('../config/commission');
const bcrypt = require('bcryptjs');

// Declare router once at the top
const router = express.Router();

// List payments (admin only, paginated, dummy data)
router.get('/payments', auth, requireAdmin, async (req, res) => {
  try {
    // TODO: Replace with real Payment model if available
    res.json({
      payments: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 }
    });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// List invoices (admin only, paginated, dummy data)
router.get('/invoices', auth, requireAdmin, async (req, res) => {
  try {
    // TODO: Replace with real Invoice model if available
    res.json({
      invoices: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 }
    });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// List feedback (admin only, paginated)
router.get('/feedback', auth, requireAdmin, async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    let { page = 1, limit = 20, rating, lawyerId, search = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    // Rating filter
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }

    // Lawyer filter
    if (lawyerId) {
      query.lawyer = lawyerId;
    }

    // Search filter (by lawyer name or client name)
    const aggregationPipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'lawyer',
          foreignField: '_id',
          as: 'lawyer'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'client',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$lawyer'
      },
      {
        $unwind: '$client'
      }
    ];

    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'lawyer.name': { $regex: search, $options: 'i' } },
            { 'client.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add other filters
    if (Object.keys(query).length > 0) {
      aggregationPipeline.push({ $match: query });
    }

    // Add pagination
    aggregationPipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    const feedback = await Feedback.aggregate(aggregationPipeline);

    // Get total count
    const totalPipeline = [...aggregationPipeline.slice(0, -2)]; // Remove skip and limit
    totalPipeline.push({ $count: "total" });
    const totalResult = await Feedback.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List feedback error:', error);
    res.status(500).json({ message: 'Error fetching feedback' });
  }
});

// List withdrawal requests (admin only, paginated)
router.get('/withdrawal-requests', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // User filter
    if (userId) {
      query.lawyer = userId;
    }

    // Get withdrawal requests with user details
    const withdrawalRequests = await WithdrawRequest.find(query)
      .populate('lawyer', 'name email role')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WithdrawRequest.countDocuments(query);

    // Filter by search if provided
    let filteredRequests = withdrawalRequests;
    if (search) {
      filteredRequests = withdrawalRequests.filter(req =>
        req.lawyer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        req.lawyer?.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      withdrawalRequests: filteredRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List withdrawal requests error:', error);
    res.status(500).json({ message: 'Error fetching withdrawal requests' });
  }
});

// Approve withdrawal request (admin only)
router.patch('/withdrawal-requests/:id/approve', auth, requireAdmin, proofUpload.single('proof'), [
  body('disbursementReference').optional().isLength({ max: 100 }).withMessage('Disbursement reference too long'),
  body('adminNote').optional().isLength({ max: 500 }).withMessage('Admin note too long')
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
    const manualProofUrl = req.body.adminProofUrl;
    const proofUrl = req.file
      ? `${req.protocol}://${req.get('host')}/uploads/payment-proofs/${req.file.filename}`
      : manualProofUrl;

    const withdrawRequest = await WithdrawRequest.findById(id);
    if (!withdrawRequest) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawRequest.status !== 'PENDING_ADMIN_ACTION') {
      return res.status(400).json({ message: 'Only pending requests can be approved' });
    }

    // Update withdrawal request
    withdrawRequest.status = 'PAID';
    withdrawRequest.processedBy = req.user.userId;
    withdrawRequest.processedAt = new Date();
    withdrawRequest.disbursementReference = disbursementReference;
    withdrawRequest.adminNote = adminNote;
    withdrawRequest.adminProofUrl = proofUrl;
    withdrawRequest.recipientConfirmationStatus = 'PENDING';
    withdrawRequest.recipientConfirmedAt = null;
    withdrawRequest.recipientConfirmationNote = null;
    withdrawRequest.recipientResponseBy = null;

    await withdrawRequest.save();

    // Process the actual withdrawal - balance was already deducted when request was created (escrow)
    // Just create the transaction record for tracking
    const userBalance = await UserBalance.findOne({ user: withdrawRequest.lawyer });
    if (userBalance) {
      // Update totalWithdrawn tracker
      userBalance.totalWithdrawn = (userBalance.totalWithdrawn || 0) + withdrawRequest.requestedAmountPkr;
      await userBalance.save();

      // Create withdrawal transaction record for user
      await WalletTransaction.create({
        user: withdrawRequest.lawyer,
        type: 'WITHDRAWAL',
        amountPkr: withdrawRequest.requestedAmountPkr,
        balanceBefore: userBalance.balancePkr,
        balanceAfter: userBalance.balancePkr,
        reference: `WITHDRAWAL-${withdrawRequest._id}`,
        description: `Withdrawal request #${withdrawRequest._id} approved and processed`,
        relatedRequest: withdrawRequest._id
      });

      // Create admin tracking transaction record
      let adminBalance = await UserBalance.findOne({ user: req.user.userId });
      if (!adminBalance) {
        adminBalance = new UserBalance({
          user: req.user.userId,
          balancePkr: 0
        });
      }
      await WalletTransaction.create({
        user: req.user.userId,
        type: 'ADJUSTMENT',
        amountPkr: withdrawRequest.requestedAmountPkr,
        balanceBefore: adminBalance.balancePkr,
        balanceAfter: adminBalance.balancePkr,
        reference: `WITHDRAWAL-ADMIN-${withdrawRequest._id}`,
        description: `Processed withdrawal request #${withdrawRequest._id} for user ${withdrawRequest.lawyer}`,
        metadata: {
          requestId: withdrawRequest._id,
          requesterRole: withdrawRequest.requesterRole
        },
        relatedRequest: withdrawRequest._id,
        processedBy: req.user.userId
      });

      console.log(`Withdrawal approved: ${withdrawRequest.requestedAmountPkr} PKR for user ${withdrawRequest.lawyer} (already escrowed)`);
    }

    res.json({
      message: 'Withdrawal request approved successfully',
      withdrawalRequest: withdrawRequest
    });
  } catch (error) {
    console.error('Approve withdrawal request error:', error);
    res.status(500).json({ message: 'Error approving withdrawal request' });
  }
});

// Reject withdrawal request (admin only)
router.patch('/withdrawal-requests/:id/reject', auth, requireAdmin, [
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  body('adminNote').optional().isLength({ max: 500 }).withMessage('Admin note too long')
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
    const { rejectionReason, adminNote } = req.body;

    const withdrawRequest = await WithdrawRequest.findById(id);
    if (!withdrawRequest) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawRequest.status !== 'PENDING_ADMIN_ACTION') {
      return res.status(400).json({ message: 'Only pending requests can be rejected' });
    }

    // Update withdrawal request
    withdrawRequest.status = 'REJECTED';
    withdrawRequest.processedBy = req.user.userId;
    withdrawRequest.processedAt = new Date();
    withdrawRequest.rejectionReason = rejectionReason;
    withdrawRequest.adminNote = adminNote;

    await withdrawRequest.save();

    // Refund the amount back to user's balance
    const userBalance = await UserBalance.findOne({ user: withdrawRequest.lawyer });
    if (userBalance) {
      userBalance.balancePkr += withdrawRequest.requestedAmountPkr;
      await userBalance.save();

      // Create transaction record
      await WalletTransaction.create({
        user: withdrawRequest.lawyer,
        type: 'REFUND',
        amountPkr: withdrawRequest.requestedAmountPkr,
        balanceBefore: userBalance.balancePkr - withdrawRequest.requestedAmountPkr,
        balanceAfter: userBalance.balancePkr,
        reference: `REFUND-WITHDRAWAL-${withdrawRequest._id}`,
        description: `Refund for rejected withdrawal request #${withdrawRequest._id}`,
        relatedRequest: withdrawRequest._id
      });
    }

    res.json({
      message: 'Withdrawal request rejected successfully',
      withdrawalRequest: withdrawRequest
    });
  } catch (error) {
    console.error('Reject withdrawal request error:', error);
    res.status(500).json({ message: 'Error rejecting withdrawal request' });
  }
});

// List logs (admin only, paginated)
router.get('/logs', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;

    const auditLogs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    // Format logs for frontend
    const logs = auditLogs.map(log => ({
      _id: log._id,
      timestamp: log.createdAt,
      level: 'info', // Default level since AuditLog doesn't have level
      message: `${log.action}${log.details ? ' - ' + JSON.stringify(log.details) : ''}`,
      user: log.user ? `${log.user.name} (${log.user.email})` : 'System',
      action: log.action,
      ip: log.ip,
      userAgent: log.userAgent,
      details: log.details
    }));

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List logs error:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

// Messaging: conversations (admin only, paginated)
router.get('/messaging/conversations', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, type } = req.query;
    const skip = (page - 1) * limit;

    // Build query for conversations
    let conversationQuery = {};

    // Get conversations from chat messages (primary source)
    const conversationIds = await ChatMessage.distinct('conversationId');
    const conversations = [];

    for (const convId of conversationIds) {
      // Get last message for this conversation
      const lastMessage = await ChatMessage.findOne({ conversationId: convId })
        .sort({ timestamp: -1 })
        .populate('from', 'name email role avatar')
        .populate('to', 'name email role avatar');

      if (!lastMessage) continue;

      // Count messages in this conversation
      const messageCount = await ChatMessage.countDocuments({ conversationId: convId });

      // Get all participants in this conversation
      const participantIds = await ChatMessage.distinct('from', { conversationId: convId });
      const toIds = await ChatMessage.distinct('to', { conversationId: convId });
      const allParticipantIds = [...new Set([...participantIds, ...toIds])];

      const participants = await User.find({ _id: { $in: allParticipantIds } })
        .select('name email role avatar');

      // Determine conversation status (active if messages in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMessageCount = await ChatMessage.countDocuments({
        conversationId: convId,
        timestamp: { $gte: thirtyDaysAgo }
      });

      const conversation = {
        _id: convId,
        participants,
        lastMessage: lastMessage.message,
        lastMessageContent: lastMessage.message,
        lastMessageAt: lastMessage.timestamp,
        messageCount,
        status: recentMessageCount > 0 ? 'active' : 'inactive',
        type: participants.some(p => p.role === 'lawyer') && participants.some(p => p.role === 'client') ? 'lawyer-client' : 'other',
        createdAt: lastMessage.timestamp,
        updatedAt: lastMessage.timestamp
      };

      conversations.push(conversation);
    }

    // Fallback: include existing conversations with no messages yet
    // This helps admins see newly created client-lawyer conversations before first message
    const existingConversations = await Conversation.find({})
      .populate('members', 'name email role avatar')
      .populate('lastMessage');

    for (const conv of existingConversations) {
      const idStr = conv._id.toString();
      if (conversationIds.includes(idStr)) continue; // already included from messages
      const participants = conv.members || [];
      const lastMessage = conv.lastMessage || null;
      const conversation = {
        _id: idStr,
        participants,
        lastMessage: lastMessage ? lastMessage.message : 'Start your conversation',
        lastMessageContent: lastMessage ? lastMessage.message : 'Start your conversation',
        lastMessageAt: lastMessage ? lastMessage.timestamp : conv.updatedAt || conv.createdAt,
        messageCount: 0,
        status: 'inactive',
        type: participants.some(p => p.role === 'lawyer') && participants.some(p => p.role === 'client') ? 'lawyer-client' : 'other',
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
      conversations.push(conversation);
    }

    // Apply search filter
    let filteredConversations = conversations;
    if (search) {
      filteredConversations = conversations.filter(conv =>
        conv.participants.some(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredConversations = filteredConversations.filter(conv => conv.status === status);
    }

    // Apply type filter
    if (type && type !== 'all') {
      filteredConversations = filteredConversations.filter(conv => conv.type === type);
    }

    // Sort by last activity (fallback to updatedAt/createdAt)
    filteredConversations.sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.updatedAt || a.createdAt);
      const bTime = new Date(b.lastMessageAt || b.updatedAt || b.createdAt);
      return bTime - aTime;
    });

    // Apply pagination
    const total = filteredConversations.length;
    const paginatedConversations = filteredConversations.slice(skip, skip + parseInt(limit));

    res.json({
      conversations: paginatedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List messaging conversations error:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Messaging: stats (admin only)
router.get('/messaging/stats', auth, requireAdmin, async (req, res) => {
  try {
    const totalMessages = await ChatMessage.countDocuments();
    const conversationIds = await ChatMessage.distinct('conversationId');
    const totalConversations = conversationIds.length;

    // Count active conversations (with messages in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeConversationIds = await ChatMessage.distinct('conversationId', {
      timestamp: { $gte: thirtyDaysAgo }
    });
    const activeConversations = activeConversationIds.length;

    res.json({
      totalConversations,
      activeConversations,
      totalMessages
    });
  } catch (error) {
    console.error('Messaging stats error:', error);
    res.status(500).json({ message: 'Error fetching messaging stats' });
  }
});

// Advanced analytics endpoint (admin only)
router.get('/advanced-analytics', auth, requireAdmin, async (req, res) => {
  try {
    // Dummy values for demonstration; replace with real aggregation as needed
    const registrations = { daily: 0, weekly: 0, monthly: 0 };
    const appointments = { daily: 0, weekly: 0, monthly: 0 };
    const revenue = { daily: 0, weekly: 0, monthly: 0 };
    const topLawyers = [];

    // TODO: Replace with real aggregation logic for daily/weekly/monthly
    // Example: registrations.daily = await ...

    res.json({
      registrations,
      appointments,
      revenue,
      topLawyers
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    res.status(500).json({ message: 'Error fetching advanced analytics' });
  }
});

// System Settings Endpoints (admin only)
router.get('/system-settings', auth, requireAdmin, async (req, res) => {
  try {
    const settings = await SystemSettings.find({});
    res.json(settings);
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ message: 'Error fetching system settings' });
  }
});

// Public system settings endpoint (must be before /:key wildcard)
router.get('/system-settings/public/:key', async (req, res) => {
  try {
    const setting = await SystemSettings.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json(setting);
  } catch (error) {
    console.error('Get public system setting error:', error);
    res.status(500).json({ message: 'Error fetching system setting' });
  }
});

router.get('/system-settings/:key', auth, requireAdmin, async (req, res) => {
  try {
    const setting = await SystemSettings.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json(setting);
  } catch (error) {
    console.error('Get system setting error:', error);
    res.status(500).json({ message: 'Error fetching system setting' });
  }
});

router.post('/system-settings/:key', auth, requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const key = req.params.key;
    let setting = await SystemSettings.findOneAndUpdate(
      { key },
      { value, updatedBy: req.user.userId, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    await AuditLog.create({
      user: req.user.userId,
      action: 'update_system_setting',
      details: { key, value },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(setting);
  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({ message: 'Error updating system setting' });
  }
});

// Export user data (admin only, CSV or JSON, with audit logging)
router.get('/export/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const fields = ['_id', 'name', 'email', 'role', 'createdAt', 'isActive', 'isVerified'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(users);
    res.header('Content-Type', 'text/csv');
    res.attachment('users_export.csv');
    res.send(csv);
    await AuditLog.create({
      user: req.user.userId,
      action: 'export_users',
      details: { format: 'csv' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ message: 'Error exporting users' });
  }
});

// List users (admin only, paginated)
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    let { page = 1, limit = 20, search = '', role, status, verification } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role && role !== 'all') {
      query.role = role;
    }

    // Status filter (active/inactive)
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Verification filter (for lawyers)
    if (verification && verification !== 'all') {
      if (verification === 'verified') {
        query.isVerified = true;
      } else if (verification === 'pending') {
        query.$or = [
          { verificationStatus: 'pending' },
          { verificationStatus: { $exists: false }, isVerified: false }
        ];
      } else if (verification === 'rejected') {
        query.verificationStatus = 'rejected';
      }
    }

    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user details (admin only) - Enhanced with related data
router.get('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get basic user info
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get related data based on user role
    const relatedData = {};

    if (user.role === 'client') {
      // For clients, get their appointments and feedback given
      relatedData.appointments = await Appointment.find({ client: userId })
        .populate('lawyer', 'name specialization')
        .sort({ createdAt: -1 })
        .limit(10);

      relatedData.feedbackGiven = await require('../models/Feedback').find({ client: userId })
        .populate('lawyer', 'name specialization')
        .sort({ createdAt: -1 })
        .limit(10);

      relatedData.totalAppointments = await Appointment.countDocuments({ client: userId });
      relatedData.completedAppointments = await Appointment.countDocuments({ client: userId, status: 'completed' });
      relatedData.totalFeedbackGiven = await require('../models/Feedback').countDocuments({ client: userId });
    }
    else if (user.role === 'lawyer') {
      // For lawyers, get their appointments and feedback received
      relatedData.appointments = await Appointment.find({ lawyer: userId })
        .populate('client', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);

      relatedData.feedbackReceived = await require('../models/Feedback').find({ lawyer: userId })
        .populate('client', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      relatedData.totalAppointments = await Appointment.countDocuments({ lawyer: userId });
      relatedData.completedAppointments = await Appointment.countDocuments({ lawyer: userId, status: 'completed' });
      relatedData.totalFeedbackReceived = await require('../models/Feedback').countDocuments({ lawyer: userId });

      // Calculate average rating
      const feedbackStats = await require('../models/Feedback').aggregate([
        { $match: { lawyer: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);

      relatedData.averageRating = feedbackStats.length > 0 ? feedbackStats[0].averageRating : 0;
      relatedData.totalRatings = feedbackStats.length > 0 ? feedbackStats[0].totalRatings : 0;
    }

    // Get recent chat activity for all users
    relatedData.recentChats = await ChatMessage.find({
      $or: [{ from: userId }, { to: userId }]
    })
      .populate('from', 'name role')
      .populate('to', 'name role')
      .sort({ createdAt: -1 })
      .limit(10);

    relatedData.totalMessages = await ChatMessage.countDocuments({
      $or: [{ from: userId }, { to: userId }]
    });

    res.json({
      user: user.toJSON(),
      relatedData
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
});

// Update user status (admin only)
router.patch('/users/:id/status', auth, requireAdmin, [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { isActive, isVerified } = req.body;
    const userId = req.params.id;
    console.log(`Updating user ${userId} status:`, { isActive, isVerified });
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    let updated = false;
    if (isActive !== undefined) {
      user.isActive = isActive;
      updated = true;
      console.log(`Updated isActive to: ${isActive}`);
    }
    if (isVerified !== undefined) {
      user.isVerified = isVerified;
      updated = true;
      console.log(`Updated isVerified to: ${isVerified}`);
    }
    if (!updated) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    await user.save();
    console.log(`User ${userId} updated successfully`);
    await AuditLog.create({
      user: req.user.userId,
      action: 'update_user_status',
      details: { userId, isActive, isVerified },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ message: 'User status updated successfully', user: user.toJSON() });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, action } = req.query;
    const skip = (page - 1) * limit;
    const query = {};
    if (userId) query.user = userId;
    if (action) query.action = action;
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('user', 'name email role');
    const total = await AuditLog.countDocuments(query);
    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

// Get appointments (admin only, paginated)
router.get('/appointments', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, clientId, lawyerId } = req.query;
    const skip = (page - 1) * limit;
    const query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (clientId) query.client = clientId;
    if (lawyerId) query.lawyer = lawyerId;

    const appointments = await Appointment.find(query)
      .populate('client', 'name email')
      .populate('lawyer', 'name email specialization')
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin appointments error:', error);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});

// Refund requests overview
router.get('/refund-requests', auth, requireAdmin, async (req, res) => {
  try {
    const { status = 'REQUESTED', page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter based on refundStatus field
    let filter;
    if (status.toUpperCase() === 'ALL') {
      // Get all appointments that have any refund status except 'NONE'
      filter = { refundStatus: { $in: ['REQUESTED', 'APPROVED', 'REJECTED'] } };
    } else {
      // Get appointments with specific refund status
      filter = { refundStatus: status.toUpperCase() };
    }

    const requests = await Appointment.find(filter)
      .populate('client', 'name email phone')
      .populate('lawyer', 'name email specialization')
      .populate('refundRequestedBy', 'name email')
      .populate('refundDecidedBy', 'name email')
      .sort({ refundRequestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.json({
      refundRequests: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    res.status(500).json({ message: 'Error fetching refund requests' });
  }
});


// Get system statistics (admin only)
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for max speed
    const [
      userCounts,
      appointmentCounts,
      recentRegistrations,
      recentAppointments,
      activeChats,
      overdueInvoices
    ] = await Promise.all([
      // User counts via aggregation (single query)
      User.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          lawyers: { $sum: { $cond: [{ $eq: ['$role', 'lawyer'] }, 1, 0] } },
          clients: { $sum: { $cond: [{ $eq: ['$role', 'client'] }, 1, 0] } },
          activeLawyers: { $sum: { $cond: [{ $and: [{ $eq: ['$role', 'lawyer'] }, { $eq: ['$isActive', true] }, { $eq: ['$isVerified', true] }] }, 1, 0] } }
        }}
      ]),
      // Appointment counts via aggregation (single query)
      Appointment.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }}
      ]),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Appointment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      (async () => { try { const Conversation = require('../models/Conversation'); return await Conversation.countDocuments({ updatedAt: { $gte: oneHourAgo } }); } catch { return 0; } })(),
      Appointment.countDocuments({ date: { $lt: yesterday }, status: { $in: ['pending', 'confirmed'] } })
    ]);

    const uc = userCounts[0] || { total: 0, lawyers: 0, clients: 0, activeLawyers: 0 };
    const ac = appointmentCounts[0] || { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, rejected: 0 };

    res.json({
      users: {
        total: uc.total,
        lawyers: uc.lawyers,
        clients: uc.clients,
        activeLawyers: uc.activeLawyers,
        recentRegistrations
      },
      appointments: {
        total: ac.total,
        pending: ac.pending,
        confirmed: ac.confirmed,
        completed: ac.completed,
        cancelled: ac.cancelled,
        rejected: ac.rejected,
        recent: recentAppointments
      },
      online: { users: req.app.get('onlineUsers')?.size || 0 },
      active: { pendingAppointments: ac.pending, activeChats, overdueInvoices }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      message: 'Error fetching statistics',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get lawyer verification requests (admin only)
router.get('/verification-requests', auth, requireAdmin, async (req, res) => {
  try {
    const lawyers = await User.find({
      role: 'lawyer',
      isActive: true,
      $or: [
        { isVerified: false },
        { verificationStatus: 'pending' },
        { verificationStatus: { $exists: false } }
      ]
    })
      .select('name email specialization location createdAt isVerified verificationStatus')
      .sort({ createdAt: -1 });
    res.json(lawyers);
  } catch (error) {
    console.error('Get verification requests error:', error);
    res.status(500).json({ message: 'Error fetching verification requests' });
  }
});

// Dummy endpoint for pending lawyers (same as /verification-requests)
router.get('/pending-lawyers', auth, requireAdmin, async (req, res) => {
  try {
    const lawyers = await User.find({
      role: 'lawyer',
      isActive: true,
      $or: [
        { isVerified: false },
        { verificationStatus: 'pending' },
        { verificationStatus: { $exists: false } }
      ]
    })
      .select('name email specialization location createdAt isVerified verificationStatus')
      .sort({ createdAt: -1 });
    res.json(lawyers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending lawyers' });
  }
});

// Verify/Unverify lawyer (admin only)
router.put('/verify-lawyer/:id', auth, requireAdmin, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const lawyerId = req.params.id;
    const { status } = req.body;

    const lawyer = await User.findById(lawyerId).where({ role: 'lawyer' });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (status === 'approved') {
      lawyer.isVerified = true;
      lawyer.verificationStatus = 'approved';
    } else if (status === 'rejected') {
      lawyer.isVerified = false;
      lawyer.verificationStatus = 'rejected';
    }

    await lawyer.save();

    await AuditLog.create({
      user: req.user.userId,
      action: status === 'approved' ? 'verify_lawyer' : 'reject_lawyer',
      details: { lawyerId, status },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const message = status === 'approved' ? 'Lawyer verified successfully' : 'Lawyer verification rejected';
    res.json({ message, lawyer: lawyer.toJSON() });
  } catch (error) {
    console.error('Verify/reject lawyer error:', error);
    res.status(500).json({ message: 'Error updating lawyer verification status' });
  }
});

// Legacy POST endpoint for backward compatibility
router.post('/verify-lawyer/:id', auth, requireAdmin, async (req, res) => {
  try {
    const lawyerId = req.params.id;
    const lawyer = await User.findById(lawyerId).where({ role: 'lawyer' });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }
    lawyer.isVerified = true;
    lawyer.verificationStatus = 'approved';
    await lawyer.save();
    await AuditLog.create({
      user: req.user.userId,
      action: 'verify_lawyer',
      details: { lawyerId },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ message: 'Lawyer verified successfully', lawyer: lawyer.toJSON() });
  } catch (error) {
    console.error('Verify lawyer error:', error);
    res.status(500).json({ message: 'Error verifying lawyer' });
  }
});

// Get system logs (admin only)
router.get('/logs', auth, requireAdmin, async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

// Dummy endpoint for analytics (same as /stats)
router.get('/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      userCounts,
      appointmentCounts,
      recentRegistrations,
      recentAppointments,
      revenueAgg,
      recentRevenueAgg,
      chatCounts,
      feedbackAgg
    ] = await Promise.all([
      // User counts (single aggregation)
      User.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          lawyers: { $sum: { $cond: [{ $eq: ['$role', 'lawyer'] }, 1, 0] } },
          clients: { $sum: { $cond: [{ $eq: ['$role', 'client'] }, 1, 0] } },
          activeLawyers: { $sum: { $cond: [{ $and: [{ $eq: ['$role', 'lawyer'] }, { $eq: ['$isActive', true] }, { $eq: ['$isVerified', true] }] }, 1, 0] } }
        }}
      ]),
      // Appointment counts (single aggregation)
      Appointment.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }}
      ]),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Appointment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      // Revenue via aggregation (no loading all docs into memory)
      Appointment.aggregate([
        { $match: { status: 'completed', amount: { $exists: true, $ne: null } } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Recent revenue via aggregation
      Appointment.aggregate([
        { $match: { status: 'completed', amount: { $exists: true, $ne: null }, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, revenue: { $sum: '$amount' } } }
      ]),
      // Chat counts
      (async () => {
        try {
          const Conversation = require('../models/Conversation');
          const [total, recent] = await Promise.all([
            Conversation.countDocuments(),
            Conversation.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
          ]);
          return { total, recent };
        } catch { return { total: 0, recent: 0 }; }
      })(),
      // Feedback average (aggregation instead of loading all docs)
      (async () => {
        try {
          const Feedback = require('../models/Feedback');
          const [countResult, avgResult] = await Promise.all([
            Feedback.countDocuments(),
            Feedback.aggregate([
              { $match: { rating: { $exists: true } } },
              { $group: { _id: null, avg: { $avg: '$rating' } } }
            ])
          ]);
          return { total: countResult, avg: avgResult[0]?.avg || 0 };
        } catch { return { total: 0, avg: 0 }; }
      })()
    ]);

    const uc = userCounts[0] || { total: 0, lawyers: 0, clients: 0, activeLawyers: 0 };
    const ac = appointmentCounts[0] || { total: 0, pending: 0, completed: 0 };
    const rev = revenueAgg[0] || { totalRevenue: 0, count: 0 };
    const recentRev = recentRevenueAgg[0] || { revenue: 0 };

    res.json({
      users: {
        total: uc.total,
        new: recentRegistrations,
        lawyers: uc.lawyers,
        clients: uc.clients,
        active: uc.activeLawyers
      },
      appointments: {
        total: ac.total,
        inPeriod: recentAppointments,
        pending: ac.pending,
        completed: ac.completed
      },
      payments: {
        totalRevenue: rev.totalRevenue,
        revenueInPeriod: recentRev.revenue,
        total: rev.count
      },
      chats: {
        total: chatCounts.total,
        inPeriod: chatCounts.recent
      },
      invoices: {
        paid: ac.completed,
        overdue: ac.pending,
        total: ac.total
      },
      feedback: {
        averageRating: Math.round(feedbackAgg.avg * 10) / 10,
        total: feedbackAgg.total
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Dummy endpoint for pending lawyers (same as /verification-requests)
router.get('/pending-lawyers', auth, requireAdmin, async (req, res) => {
  try {
    const lawyers = await User.find({ role: 'lawyer', isActive: true, isVerified: false })
      .select('name email specialization location createdAt')
      .sort({ createdAt: -1 });
    res.json(lawyers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending lawyers' });
  }
});

// Moderate content (admin only)
router.post('/moderate-content', auth, requireAdmin, [
  body('contentId').notEmpty().withMessage('Content ID is required'),
  body('action').isIn(['approve', 'remove']).withMessage('Action must be approve or remove')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { contentId, action } = req.body;
    await AuditLog.create({
      user: req.user.userId,
      action: 'moderate_content',
      details: { contentId, action },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ message: `Content ${action} successfully`, contentId, action });
  } catch (error) {
    console.error('Moderate content error:', error);
    res.status(500).json({ message: 'Error moderating content' });
  }
});

// Debug endpoint to check appointment counts
router.get('/debug/appointments', auth, requireAdmin, async (req, res) => {
  try {
    console.log('Debug: Checking appointment counts...');
    const total = await Appointment.countDocuments();
    const pending = await Appointment.countDocuments({ status: 'pending' });
    const confirmed = await Appointment.countDocuments({ status: 'confirmed' });
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    const rejected = await Appointment.countDocuments({ status: 'rejected' });
    const sampleAppointments = await Appointment.find()
      .select('status date time client lawyer')
      .limit(5)
      .populate('client', 'name')
      .populate('lawyer', 'name');
    const debugData = {
      counts: { total, pending, confirmed, completed, cancelled, rejected },
      sampleAppointments: sampleAppointments.map(apt => ({
        id: apt._id,
        status: apt.status,
        date: apt.date,
        time: apt.time,
        client: apt.client?.name || 'Unknown',
        lawyer: apt.lawyer?.name || 'Unknown'
      }))
    };
    console.log('Debug data:', debugData);
    res.json(debugData);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Error fetching debug data' });
  }
});

// Test endpoint to create sample data (for development only)
router.post('/test-data', auth, requireAdmin, async (req, res) => {
  try {
    console.log('Creating test data...');
    const testAppointment = new Appointment({
      client: '507f1f77bcf86cd799439011',
      lawyer: '507f1f77bcf86cd799439012',
      date: new Date(),
      time: '10:00',
      consultationType: 'video',
      status: 'completed',
      amount: 1000,
      notes: 'Test completed appointment'
    });
    await testAppointment.save();
    console.log('Test appointment created:', testAppointment._id);
    res.json({ message: 'Test data created successfully', appointmentId: testAppointment._id });
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ message: 'Error creating test data' });
  }
});

// Get current commission percentage
router.get('/commission', auth, requireAdmin, (req, res) => {
  res.json({ commission: getCommission() });
});

// Set commission percentage
router.post('/commission', auth, requireAdmin, [
  body('commission').isNumeric().isFloat({ min: 0, max: 100 }).withMessage('Commission must be between 0 and 100')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { commission } = req.body;
  setCommission(Number(commission));
  try {
    await AuditLog.create({
      user: req.user.userId,
      action: 'update_commission',
      details: { commission: Number(commission) },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (err) {
    console.error('Audit log error (commission update):', err);
  }
  res.json({ commission: getCommission() });
});

// Get all chat logs (admin only, paginated)
router.get('/chat-logs', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, conversationId } = req.query;
    const query = {};
    if (userId) {
      query.$or = [{ from: userId }, { to: userId }];
    }
    if (conversationId) {
      query.conversationId = conversationId;
    }
    const messages = await ChatMessage.find(query)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await ChatMessage.countDocuments(query);
    res.json({
      messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin chat logs error:', error);
    res.status(500).json({ message: 'Error fetching chat logs' });
  }
});

// Get conversation messages (admin only)
router.get('/messaging/conversations/:conversationId/messages', auth, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ conversationId })
      .populate('from', 'name email role avatar')
      .populate('to', 'name email role avatar')
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChatMessage.countDocuments({ conversationId });

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.message,
      sender: {
        _id: msg.from._id,
        name: msg.from.name,
        email: msg.from.email,
        role: msg.from.role,
        avatar: msg.from.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.from.name)}&background=random`
      },
      recipient: msg.to ? {
        _id: msg.to._id,
        name: msg.to.name,
        email: msg.to.email,
        role: msg.to.role
      } : null,
      createdAt: msg.timestamp,
      isRead: msg.isRead,
      readAt: msg.readAt,
      attachment: msg.attachmentUrl ? {
        url: msg.attachmentUrl,
        name: msg.attachmentName,
        type: msg.attachmentType
      } : null,
      status: msg.isRead ? 'read' : 'delivered',
      isEdited: false
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ message: 'Error fetching conversation messages' });
  }
});

// Update conversation notes (admin only)
router.patch('/messaging/conversations/:conversationId/notes', auth, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { notes } = req.body;

    // For now, we'll store admin notes in a separate collection or add to existing conversation
    // Since we don't have a dedicated conversation notes model, we'll create an audit log entry
    await AuditLog.create({
      user: req.user.userId,
      action: 'update_conversation_notes',
      details: { conversationId, notes },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Admin notes updated successfully' });
  } catch (error) {
    console.error('Update conversation notes error:', error);
    res.status(500).json({ message: 'Error updating conversation notes' });
  }
});

// Archive conversation (admin only)
router.post('/messaging/conversations/:conversationId/archive', auth, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;

    // Create audit log for archiving
    await AuditLog.create({
      user: req.user.userId,
      action: 'archive_conversation',
      details: { conversationId, reason },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Note: In a full implementation, you might want to mark messages as archived
    // For now, we'll just log the action

    res.json({ message: 'Conversation archived successfully' });
  } catch (error) {
    console.error('Archive conversation error:', error);
    res.status(500).json({ message: 'Error archiving conversation' });
  }
});

// Delete conversation (admin only)
router.delete('/messaging/conversations/:conversationId', auth, requireAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Delete all messages in the conversation
    const deletedMessages = await ChatMessage.deleteMany({ conversationId });

    // Create audit log for deletion
    await AuditLog.create({
      user: req.user.userId,
      action: 'delete_conversation',
      details: { conversationId, deletedMessagesCount: deletedMessages.deletedCount },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      message: 'Conversation deleted successfully',
      deletedMessagesCount: deletedMessages.deletedCount
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Error deleting conversation' });
  }
});

// Delete individual message (admin only)
router.delete('/messaging/messages/:messageId', auth, requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Create audit log for message deletion
    await AuditLog.create({
      user: req.user.userId,
      action: 'delete_message',
      details: { messageId, conversationId: message.conversationId },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Get all video call logs (admin only, paginated)
router.get('/video-call-logs', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const query = { consultationType: 'video' };
    if (userId) {
      query.$or = [{ client: userId }, { lawyer: userId }];
    }
    const appointments = await Appointment.find(query)
      .populate('client', 'name email')
      .populate('lawyer', 'name email')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Appointment.countDocuments(query);
    const logs = appointments.map(a => ({
      _id: a._id,
      client: a.client,
      lawyer: a.lawyer,
      startTime: a.startTime,
      endTime: a.endTime,
      durationMinutes: a.startTime && a.endTime ? Math.round((a.endTime - a.startTime) / 60000) : null,
      status: a.status,
      sessionId: a.sessionId,
    }));
    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin video call logs error:', error);
    res.status(500).json({ message: 'Error fetching video call logs' });
  }
});

// Admin credits a user's account (add credits)
router.post('/credit-user', auth, requireAdmin, [
  body('userId').isMongoId().withMessage('Valid userId is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { userId, amount } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.credits = (user.credits || 0) + Number(amount);
    await user.save();
    try {
      await AuditLog.create({
        user: req.user.userId,
        action: 'admin_credit_user',
        details: { creditedUserId: userId, amount: Number(amount) },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (err) {
      console.error('Audit log error (credit user):', err);
    }
    res.json({ message: `Credited ${amount} to user`, user });
  } catch (error) {
    console.error('Credit user error:', error);
    res.status(500).json({ message: 'Error crediting user' });
  }
});

// Reset/Create default admin user (for emergency access)
router.post('/reset-admin', async (req, res) => {
  try {
    const { secretKey } = req.body;

    // Simple secret key check for security
    if (secretKey !== 'LEGALMATE_ADMIN_RESET_2025') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    // Check if admin already exists
    let adminUser = await User.findOne({ email: 'legalmate.services@gmail.com' });

    if (adminUser) {
      // Update existing admin
      adminUser.password = 'Legal@12'; // Let the User model hash this in pre-save middleware
      adminUser.role = 'admin';
      adminUser.adminLevel = 'super';
      adminUser.isActive = true;
      adminUser.isVerified = true;
      adminUser.verificationStatus = 'approved';
      // Ensure required fields are present
      if (!adminUser.phone) adminUser.phone = '+92-300-0000000';
      if (!adminUser.address) adminUser.address = 'LegalMate Admin Office, Pakistan';
      await adminUser.save();

      console.log('🔄 Admin user password reset successfully');
    } else {
      // Create new admin
      adminUser = new User({
        name: 'System Administrator',
        email: 'legalmate.services@gmail.com',
        password: 'Legal@12', // Let the User model hash this in pre-save middleware
        phone: '+92-300-0000000',
        address: 'LegalMate Admin Office, Pakistan',
        role: 'admin',
        adminLevel: 'super',
        isActive: true,
        isVerified: true,
        verificationStatus: 'approved'
      });
      await adminUser.save();

      console.log('🎯 New admin user created successfully');
    }

    // Create audit log (if possible)
    try {
      await AuditLog.create({
        user: adminUser._id,
        action: 'admin_reset',
        details: { method: 'emergency_reset', email: 'legalmate.services@gmail.com' },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (err) {
      console.error('Audit log error (admin reset):', err);
    }

    res.json({
      message: 'Admin user reset/created successfully',
      email: 'legalmate.services@gmail.com',
      note: 'Default password is Legal@12. Please change it immediately after login.'
    });
  } catch (error) {
    console.error('Admin reset error:', error);
    res.status(500).json({ message: 'Error resetting admin user' });
  }
});

// Get all user balances (admin only)
router.get('/user-balances', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search = '' } = req.query;

    // Build user filter for search
    let userFilter = {};
    if (search) {
      userFilter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    if (role && role !== 'all') {
      userFilter.role = role;
    }

    // First get users that match the filter
    const users = await User.find(userFilter, '_id name email role');
    const userIds = users.map(u => u._id);

    // Get balances for these users
    const balances = await UserBalance.find({ user: { $in: userIds } })
      .populate('user', 'name email role isActive createdAt')
      .sort({ balancePkr: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await UserBalance.countDocuments({ user: { $in: userIds } });

    res.json({
      balances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user balances:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all wallet transactions (admin only)
router.get('/transactions', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, userId, dateFrom, dateTo } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.user = userId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const transactions = await WalletTransaction.find(filter)
      .populate('user', 'name email role')
      .populate('relatedAppointment', 'appointmentId date time')
      .populate('relatedUser', 'name email')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WalletTransaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DATA RESET MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// All resettable collections with their models and labels
const RESETTABLE_COLLECTIONS = {
  appointments: { model: Appointment, label: 'Appointments', description: 'All appointment records including video calls' },
  chatMessages: { model: ChatMessage, label: 'Chat Messages', description: 'All chat messages between users' },
  conversations: { model: Conversation, label: 'Conversations', description: 'All conversation threads' },
  aiChats: { model: AiChat, label: 'AI Chats', description: 'AI chatbot conversations' },
  chatSessions: { model: ChatSession, label: 'AI Chat Sessions', description: 'AI chat session records' },
  feedback: { model: Feedback, label: 'Feedback & Ratings', description: 'All lawyer feedback and ratings' },
  contactMessages: { model: ContactMessage, label: 'Contact Messages', description: 'Contact form submissions' },
  blogs: { model: Blog, label: 'Blogs', description: 'All blog posts' },
  faqs: { model: FAQ, label: 'FAQs', description: 'Frequently asked questions' },
  pages: { model: Page, label: 'CMS Pages', description: 'Custom CMS pages (About, Privacy, etc.)' },
  services: { model: Service, label: 'Services', description: 'Legal services catalog' },
  walletTransactions: { model: WalletTransaction, label: 'Wallet Transactions', description: 'All wallet transaction records' },
  userBalances: { model: UserBalance, label: 'User Balances', description: 'All user PKR balances (resets to 0)' },
  buyBalanceRequests: { model: BuyBalanceRequest, label: 'Balance Requests', description: 'Buy balance / top-up requests' },
  withdrawRequests: { model: WithdrawRequest, label: 'Withdrawal Requests', description: 'Lawyer withdrawal requests' },
  creditPurchases: { model: CreditPurchase, label: 'Credit Purchases', description: 'Legacy credit purchase records' },
  transactions: { model: Transaction, label: 'Transactions', description: 'Legacy transaction records' },
  paymentMethods: { model: PaymentMethod, label: 'Payment Methods', description: 'Admin-configured payment methods' },
  payoutProfiles: { model: LawyerPayoutProfile, label: 'Payout Profiles', description: 'Lawyer payout bank/wallet details' },
  payoutPolicy: { model: PayoutPolicy, label: 'Payout Policy', description: 'Payout policy configuration' },
  systemSettings: { model: SystemSettings, label: 'System Settings', description: 'Key-value system settings' },
  auditLogs: { model: AuditLog, label: 'Audit Logs', description: 'Admin action audit trail' },
  videoCallRecordings: { model: VideoCallRecording, label: 'Video Call Recordings', description: 'Video call recordings and chat logs' },
};

// GET /api/admin/data-reset/collections - List all resettable collections with counts
router.get('/data-reset/collections', auth, requireAdmin, async (req, res) => {
  try {
    const collections = [];
    for (const [key, config] of Object.entries(RESETTABLE_COLLECTIONS)) {
      const count = await config.model.countDocuments();
      collections.push({
        key,
        label: config.label,
        description: config.description,
        count,
      });
    }
    res.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/data-reset/reset - Reset one or more collections
router.post('/data-reset/reset', auth, requireAdmin, [
  body('collections').isArray({ min: 1 }).withMessage('Select at least one collection'),
  body('confirmText').equals('RESET DATA').withMessage('Confirmation text must be "RESET DATA"'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { collections } = req.body;
    const results = [];
    let totalDeleted = 0;

    for (const collectionKey of collections) {
      const config = RESETTABLE_COLLECTIONS[collectionKey];
      if (!config) {
        results.push({ key: collectionKey, status: 'skipped', reason: 'Unknown collection' });
        continue;
      }

      try {
        const countBefore = await config.model.countDocuments();
        await config.model.deleteMany({});
        results.push({ key: collectionKey, label: config.label, status: 'success', deletedCount: countBefore });
        totalDeleted += countBefore;
      } catch (err) {
        results.push({ key: collectionKey, label: config.label, status: 'error', reason: err.message });
      }
    }

    // Log this action in audit (create new audit log after potential audit reset)
    try {
      await AuditLog.create({
        user: req.user._id,
        action: 'DATA_RESET',
        details: {
          collections: collections,
          results: results,
          totalDeleted,
        },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (logErr) {
      console.error('Failed to create audit log for data reset:', logErr);
    }

    res.json({
      message: `Successfully reset ${results.filter(r => r.status === 'success').length} collection(s)`,
      totalDeleted,
      results,
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ message: 'Server error during reset' });
  }
});

// Export the router
module.exports = router;
