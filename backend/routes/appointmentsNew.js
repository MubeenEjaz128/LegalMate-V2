const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');
const { auth, requireClient, requireLawyer, requireAdmin } = require('../middleware/auth');
const { createOrGetConversation } = require('../utils/conversationHelper');
const commission = require('../config/commission');
const mongoose = require('mongoose');

const refundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/refund-proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `refund-proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const refundUpload = multer({
  storage: refundStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'), false);
    }
  }
});

async function getOrCreateUserBalance(userId) {
  let balance = await UserBalance.findOne({ user: userId });
  if (!balance) {
    balance = await UserBalance.create({
      user: userId,
      balancePkr: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalEarned: 0,
      totalCommission: 0
    });
  }
  return balance;
}

async function distributeAppointmentFunds(appointment) {
  if (appointment.paymentStatus === 'paid') {
    return { processed: false };
  }

  const commissionPercent = commission.getCommission() || 10;
  const adminCommission = (appointment.amount * commissionPercent) / 100;
  const lawyerEarning = appointment.amount - adminCommission;

  const lawyerBalance = await getOrCreateUserBalance(appointment.lawyer);
  const lawyerBalanceBefore = lawyerBalance.balancePkr;
  lawyerBalance.balancePkr += lawyerEarning;
  lawyerBalance.totalEarned = (lawyerBalance.totalEarned || 0) + lawyerEarning;
  await lawyerBalance.save();

  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    throw new Error('Admin user not found to receive commission');
  }

  const adminBalance = await getOrCreateUserBalance(adminUser._id);
  const adminBalanceBefore = adminBalance.balancePkr;
  adminBalance.balancePkr += adminCommission;
  adminBalance.totalCommission = (adminBalance.totalCommission || 0) + adminCommission;
  await adminBalance.save();

  const adminTransaction = new WalletTransaction({
    user: adminUser._id,
    type: 'COMMISSION',
    amountPkr: adminCommission,
    balanceBefore: adminBalanceBefore,
    balanceAfter: adminBalance.balancePkr,
    reference: `COMMISSION-${appointment._id}`,
    description: `Commission from appointment ${appointment._id} - ${commissionPercent}%`,
    metadata: {
      appointmentId: appointment._id,
      lawyerId: appointment.lawyer,
      clientId: appointment.client,
      commissionPercent,
      totalAmount: appointment.amount
    },
    relatedAppointment: appointment._id,
    relatedUser: appointment.lawyer
  });
  await adminTransaction.save();

  const lawyerTransaction = new WalletTransaction({
    user: appointment.lawyer,
    type: 'BOOKING_EARNING',
    amountPkr: lawyerEarning,
    balanceBefore: lawyerBalanceBefore,
    balanceAfter: lawyerBalance.balancePkr,
    reference: `EARNING-${appointment._id}`,
    description: `Earnings from appointment with ${appointment.client}`,
    metadata: {
      appointmentId: appointment._id,
      clientId: appointment.client,
      commissionPercent,
      totalAmount: appointment.amount,
      adminCommission
    },
    relatedAppointment: appointment._id,
    relatedUser: appointment.client
  });
  await lawyerTransaction.save();

  appointment.paymentStatus = 'paid';
  await appointment.save();

  return {
    processed: true,
    adminCommission,
    lawyerEarning
  };
}

async function refundReservedPayment(appointment, { reason, actorId }) {
  const clientBalance = await getOrCreateUserBalance(appointment.client);
  const balanceBefore = clientBalance.balancePkr;
  clientBalance.balancePkr += appointment.amount;
  await clientBalance.save();

  await WalletTransaction.create({
    user: appointment.client,
    type: 'REFUND',
    amountPkr: appointment.amount,
    balanceBefore,
    balanceAfter: clientBalance.balancePkr,
    reference: `REFUND-${appointment._id}`,
    description: `Refund for appointment ${appointment._id}`,
    metadata: {
      appointmentId: appointment._id,
      reason,
      actionedBy: actorId
    },
    relatedAppointment: appointment._id,
    processedBy: actorId || appointment.client
  });

  appointment.paymentStatus = 'refunded';
  await appointment.save();
}

async function refundPaidPayment(appointment, { reason, actorId }) {
  const commissionPercent = commission.getCommission() || 10;
  const adminCommission = (appointment.amount * commissionPercent) / 100;
  const lawyerEarning = appointment.amount - adminCommission;

  const lawyerBalance = await getOrCreateUserBalance(appointment.lawyer);
  if (lawyerBalance.balancePkr < lawyerEarning) {
    throw new Error('Lawyer balance is insufficient to process the refund');
  }
  const lawyerBalanceBefore = lawyerBalance.balancePkr;
  lawyerBalance.balancePkr -= lawyerEarning;
  lawyerBalance.totalEarned = Math.max(0, (lawyerBalance.totalEarned || 0) - lawyerEarning);
  await lawyerBalance.save();

  await WalletTransaction.create({
    user: appointment.lawyer,
    type: 'ADJUSTMENT',
    amountPkr: -lawyerEarning,
    balanceBefore: lawyerBalanceBefore,
    balanceAfter: lawyerBalance.balancePkr,
    reference: `REFUND-LAWYER-${appointment._id}`,
    description: `Refund adjustment for appointment ${appointment._id}`,
    metadata: {
      appointmentId: appointment._id,
      reason,
      actionedBy: actorId
    },
    relatedAppointment: appointment._id,
    processedBy: actorId
  });

  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    throw new Error('Admin user not found to process refund');
  }

  const adminBalance = await getOrCreateUserBalance(adminUser._id);
  if (adminBalance.balancePkr < adminCommission) {
    throw new Error('Admin balance is insufficient to process the refund');
  }
  const adminBalanceBefore = adminBalance.balancePkr;
  adminBalance.balancePkr -= adminCommission;
  adminBalance.totalCommission = Math.max(0, (adminBalance.totalCommission || 0) - adminCommission);
  await adminBalance.save();

  await WalletTransaction.create({
    user: adminUser._id,
    type: 'ADJUSTMENT',
    amountPkr: -adminCommission,
    balanceBefore: adminBalanceBefore,
    balanceAfter: adminBalance.balancePkr,
    reference: `REFUND-ADMIN-${appointment._id}`,
    description: `Commission reversal for appointment ${appointment._id}`,
    metadata: {
      appointmentId: appointment._id,
      reason,
      actionedBy: actorId
    },
    relatedAppointment: appointment._id,
    processedBy: actorId
  });

  await refundReservedPayment(appointment, { reason, actorId });
}

// Book appointment with PKR payment
router.post('/', auth, requireClient, [
  body('lawyerId').isMongoId().withMessage('Valid lawyer ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format is required'),
  body('consultationType').isIn(['chat', 'video']).withMessage('Valid consultation type is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    console.log('Book appointment request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { lawyerId, date, time, consultationType, description } = req.body;
    const clientId = req.user.userId;

    // Find lawyer
    const lawyer = await User.findById(lawyerId).where({ role: 'lawyer', isActive: true });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    // Check if lawyer has hourly rate set
    if (!lawyer.hourlyRate || lawyer.hourlyRate <= 0) {
      return res.status(400).json({ message: 'Lawyer has not set their hourly rate' });
    }

    // Check for existing appointment (Concurrency Check)
    const existingAppointment = await Appointment.findOne({
      lawyer: lawyerId,
      // Removed client: clientId to ensure the slot is free for EVERYONE
      date: new Date(date),
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This slot has already been booked. Please choose another time.' });
    }

    // Check client balance
    let clientBalance = await UserBalance.findOne({ user: clientId });
    if (!clientBalance) {
      clientBalance = await UserBalance.create({
        user: clientId,
        balancePkr: 0
      });
    }

    console.log('Balance check:', {
      clientId,
      clientBalance: clientBalance.balancePkr,
      lawyerHourlyRate: lawyer.hourlyRate,
      hasEnoughBalance: clientBalance.balancePkr >= lawyer.hourlyRate
    });

    if (clientBalance.balancePkr < lawyer.hourlyRate) {
      console.log('Insufficient balance error:', {
        required: lawyer.hourlyRate,
        available: clientBalance.balancePkr
      });
      return res.status(400).json({
        message: 'Insufficient balance. Please add funds to your account.',
        required: lawyer.hourlyRate,
        available: clientBalance.balancePkr
      });
    }

    // Start manual transaction (without MongoDB sessions for standalone setup)
    try {
      // Deduct payment from client balance
      const balanceBefore = clientBalance.balancePkr;
      clientBalance.balancePkr -= lawyer.hourlyRate;
      await clientBalance.save();

      // Create appointment
      const appointment = new Appointment({
        lawyer: lawyerId,
        client: clientId,
        date: new Date(date),
        time,
        consultationType,
        description,
        status: 'pending',
        amount: lawyer.hourlyRate,
        paymentStatus: 'reserved'
      });
      await appointment.save();

      // Create wallet transaction for client payment
      console.log('🔄 Creating client wallet transaction...');
      const clientTransaction = new WalletTransaction({
        user: clientId,
        type: 'BOOKING_PAYMENT',
        amountPkr: -lawyer.hourlyRate, // Negative for payment
        balanceBefore,
        balanceAfter: clientBalance.balancePkr,
        reference: `BOOKING-${appointment._id}`,
        description: `Funds reserved for consultation with ${lawyer.name}`,
        metadata: {
          appointmentId: appointment._id,
          lawyerId: lawyerId,
          consultationType,
          date: new Date(date),
          time
        },
        relatedAppointment: appointment._id,
        relatedUser: lawyerId
      });
      console.log('🔄 Saving client transaction...');
      await clientTransaction.save();
      console.log('✅ Client transaction saved successfully');

      await appointment.populate('lawyer', 'name email specialization');
      await appointment.populate('client', 'name email');

      // Notify admin
      try {
        const { createNotification } = require('../utils/notificationHelper');
        await createNotification(req.app.get('io'), {
          type: 'new_appointment',
          title: 'New Appointment Booked',
          message: `${appointment.client?.name || 'Client'} booked with ${appointment.lawyer?.name || 'Lawyer'}`,
          referenceId: appointment._id,
          referenceModel: 'Appointment',
          metadata: { userName: appointment.client?.name, userEmail: appointment.client?.email }
        });
      } catch (notifErr) { console.error('Notification error:', notifErr.message); }

      res.status(201).json({
        message: 'Appointment booked successfully. Funds have been reserved for this booking.',
        appointment,
        newBalance: clientBalance.balancePkr
      });
    } catch (error) {
      // If error occurred, try to revert the client balance
      try {
        clientBalance.balancePkr += lawyer.hourlyRate;
        await clientBalance.save();
        console.log('⚠️ Client balance reverted due to error');
      } catch (revertError) {
        console.error('❌ Failed to revert client balance:', revertError);
      }

      throw error;
    }
  } catch (error) {
    console.error('❌ Book appointment error:', error);

    // Handle race condition duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'This slot was just booked by someone else. Please verify availability and try again.'
      });
    }

    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      message: 'Error booking appointment',
      error: error.message,
      errorName: error.name
    });
  }
});

// Get appointments for user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let appointments;
    if (user.role === 'lawyer') {
      appointments = await Appointment.find({ lawyer: userId })
        .populate('client', 'name email')
        .sort({ date: -1, time: -1 });
    } else {
      appointments = await Appointment.find({ client: userId })
        .populate('lawyer', 'name email specialization')
        .sort({ date: -1, time: -1 });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});

// Get appointment statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let stats = {};

    if (user.role === 'lawyer') {
      const totalAppointments = await Appointment.countDocuments({ lawyer: userId });
      const completedAppointments = await Appointment.countDocuments({
        lawyer: userId,
        status: 'completed'
      });
      const pendingAppointments = await Appointment.countDocuments({
        lawyer: userId,
        status: 'pending'
      });
      const confirmedAppointments = await Appointment.countDocuments({
        lawyer: userId,
        status: 'confirmed'
      });

      // Calculate earnings
      const completedAppointmentsWithAmount = await Appointment.find({
        lawyer: userId,
        status: 'completed'
      }).select('amount');

      const totalEarnings = completedAppointmentsWithAmount.reduce((sum, apt) => sum + (apt.amount || 0), 0);

      // Get lawyer balance
      let balance = await UserBalance.findOne({ user: userId });
      if (!balance) {
        balance = await UserBalance.create({ user: userId, balancePkr: 0 });
      }

      stats = {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        confirmedAppointments,
        totalEarnings,
        currentBalance: balance.balancePkr
      };
    } else {
      const totalAppointments = await Appointment.countDocuments({ client: userId });
      const completedAppointments = await Appointment.countDocuments({
        client: userId,
        status: 'completed'
      });
      const pendingAppointments = await Appointment.countDocuments({
        client: userId,
        status: 'pending'
      });

      // Get client balance
      let balance = await UserBalance.findOne({ user: userId });
      if (!balance) {
        balance = await UserBalance.create({ user: userId, balancePkr: 0 });
      }

      stats = {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        currentBalance: balance.balancePkr
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ message: 'Error fetching appointment statistics' });
  }
});

// Get specific appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.userId;

    const appointment = await Appointment.findById(appointmentId)
      .populate('lawyer', 'name email specialization phone')
      .populate('client', 'name email phone');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.lawyer._id.toString() !== userId && appointment.client._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Error fetching appointment' });
  }
});

// Update appointment status (lawyer only)
router.patch('/:id/status', auth, requireLawyer, [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    console.log('🔍 Status update request (lawyer):', {
      params: req.params,
      body: req.body,
      user: { userId: req.user.userId, role: req.user.role }
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors (lawyer):', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const lawyerId = req.user.userId;

    console.log('🔍 Looking for appointment:', { id, lawyerId });

    const appointment = await Appointment.findOne({
      _id: id,
      lawyer: lawyerId
    });

    console.log('📋 Appointment found:', appointment ? 'Yes' : 'No');
    if (appointment) {
      console.log('📋 Appointment details:', {
        id: appointment._id,
        status: appointment.status,
        lawyer: appointment.lawyer,
        client: appointment.client
      });
    }

    if (!appointment) {
      console.log('❌ Appointment not found for lawyer:', lawyerId);
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const oldStatus = appointment.status;
    let payoutMeta = null;

    // Business logic: Prevent certain status transitions for lawyers
    if (oldStatus === 'completed' && status !== 'completed') {
      return res.status(400).json({
        message: 'Cannot change status of completed appointment'
      });
    }

    // Prevent lawyers from setting appointments back to pending (unless they were already pending)
    if (status === 'pending' && oldStatus !== 'pending') {
      return res.status(400).json({
        message: 'Cannot change appointment status back to pending'
      });
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;

    // If confirming appointment (lawyer accepting), release reserved funds
    if (status === 'confirmed' && oldStatus === 'pending') {
      try {
        const payoutResult = await distributeAppointmentFunds(appointment);
        if (!payoutResult.processed) {
          console.log(`Appointment ${appointment._id} payout already processed`);
        } else {
          console.log(`Appointment ${appointment._id} confirmed - Lawyer earning: PKR ${payoutResult.lawyerEarning}, Admin commission: PKR ${payoutResult.adminCommission}`);
          payoutMeta = payoutResult;
        }
      } catch (paymentError) {
        console.error('Error processing payment for confirmed appointment:', paymentError);
        return res.status(500).json({
          message: 'Error processing payment',
          error: paymentError.message
        });
      }
    }

    // Earnings are already calculated when the appointment is confirmed
    await appointment.save();

    // If appointment is confirmed, create conversation and send welcome message
    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      try {
        const Conversation = require('../models/Conversation');
        const ChatMessage = require('../models/ChatMessage');
        const User = require('../models/User');

        // Get lawyer and client details
        const [lawyer, client] = await Promise.all([
          User.findById(lawyerId).select('name'),
          User.findById(appointment.client).select('name')
        ]);

        if (lawyer && client) {
          // Check if conversation already exists between lawyer and client
          let conversation = await Conversation.findOne({
            members: { $all: [lawyerId, appointment.client] },
            isGroup: false
          });

          // Create conversation if it doesn't exist
          if (!conversation) {
            conversation = new Conversation({
              members: [lawyerId, appointment.client],
              participants: [lawyerId, appointment.client],
              isGroup: false,
              createdBy: lawyerId
            });
            await conversation.save();
            console.log(`✅ Created new conversation ${conversation._id} for appointment ${appointment._id}`);
          }

          // Format appointment date and time
          const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const appointmentTime = new Date(appointment.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });

          // Create welcome message
          const welcomeMessage = `🎉 Appointment Confirmed!

Dear ${client.name},

Your consultation appointment with ${lawyer.name} has been confirmed.

📅 Date: ${appointmentDate}
⏰ Time: ${appointmentTime}
💰 Amount: PKR ${appointment.amount}

Please be available at the scheduled time. You can discuss your legal matters through this chat.

Thank you for choosing LegalMate!`;

          // Send welcome message from system (use lawyer as sender for now)
          const chatMessage = new ChatMessage({
            conversationId: conversation._id.toString(),
            from: lawyerId,
            to: appointment.client,
            message: welcomeMessage,
            timestamp: new Date(),
            isDelivered: true,
            deliveredAt: new Date()
          });
          await chatMessage.save();

          // Update conversation's last message
          conversation.lastMessage = chatMessage._id;
          conversation.lastActivity = new Date();
          await conversation.save();

          console.log(`✅ Sent appointment confirmation message for appointment ${appointment._id}`);
        }
      } catch (messageError) {
        console.error('Error creating conversation/message for confirmed appointment:', messageError);
        // Don't fail the appointment confirmation if messaging fails
      }
    }

    // Prepare response with payment info if payment was processed
    const response = {
      message: 'Appointment status updated successfully',
      appointment,
      paymentProcessed: Boolean(payoutMeta?.processed)
    };

    if (payoutMeta?.processed) {
      response.paymentDetails = {
        clientCharged: appointment.amount,
        lawyerEarning: payoutMeta.lawyerEarning,
        adminCommission: payoutMeta.adminCommission
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Error updating appointment status' });
  }
});

// Update appointment status (admin only)
router.patch('/:id/admin-status', auth, requireAdmin, [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
  body('rejectionReason').optional().isLength({ max: 500 }).withMessage('Rejection reason too long')
], async (req, res) => {
  try {
    console.log('🔍 Status update request (admin):', {
      params: req.params,
      body: req.body,
      user: { userId: req.user.userId, role: req.user.role }
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors (admin):', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;
    const adminId = req.user.userId;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const oldStatus = appointment.status;
    let payoutMeta = null;
    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (rejectionReason) appointment.rejectionReason = rejectionReason;

    if (status === 'confirmed' && oldStatus === 'pending') {
      try {
        const payoutResult = await distributeAppointmentFunds(appointment);
        if (!payoutResult.processed) {
          console.log(`Appointment ${appointment._id} payout already processed`);
        } else {
          payoutMeta = payoutResult;
          console.log(`Appointment ${appointment._id} confirmed by admin - Lawyer earning: PKR ${payoutResult.lawyerEarning}, Admin commission: PKR ${payoutResult.adminCommission}`);
        }
      } catch (error) {
        console.error('Error processing appointment payment (admin):', error);
        return res.status(500).json({
          message: 'Error processing payment',
          error: error.message
        });
      }
    }

    await appointment.save();

    // If appointment is confirmed, create conversation and send welcome message
    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      try {
        const Conversation = require('../models/Conversation');
        const ChatMessage = require('../models/ChatMessage');
        const User = require('../models/User');

        // Get lawyer and client details
        const [lawyer, client] = await Promise.all([
          User.findById(appointment.lawyer).select('name'),
          User.findById(appointment.client).select('name')
        ]);

        if (lawyer && client) {
          // Check if conversation already exists between lawyer and client
          let conversation = await Conversation.findOne({
            members: { $all: [appointment.lawyer, appointment.client] },
            isGroup: false
          });

          // Create conversation if it doesn't exist
          if (!conversation) {
            conversation = new Conversation({
              members: [appointment.lawyer, appointment.client],
              participants: [appointment.lawyer, appointment.client],
              isGroup: false,
              createdBy: adminId
            });
            await conversation.save();
            console.log(`✅ Created new conversation ${conversation._id} for admin-confirmed appointment ${appointment._id}`);
          }

          // Format appointment date and time
          const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const appointmentTime = new Date(appointment.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });

          // Create welcome message
          const welcomeMessage = `🎉 Appointment Confirmed by Admin!

Dear ${client.name},

Your consultation appointment with ${lawyer.name} has been confirmed by the administrator.

📅 Date: ${appointmentDate}
⏰ Time: ${appointmentTime}
💰 Amount: PKR ${appointment.amount}

Please be available at the scheduled time. You can discuss your legal matters through this chat.

Thank you for choosing LegalMate!`;

          // Send welcome message from lawyer
          const chatMessage = new ChatMessage({
            conversationId: conversation._id.toString(),
            from: appointment.lawyer,
            to: appointment.client,
            message: welcomeMessage,
            timestamp: new Date(),
            isDelivered: true,
            deliveredAt: new Date()
          });
          await chatMessage.save();

          // Update conversation's last message
          conversation.lastMessage = chatMessage._id;
          conversation.lastActivity = new Date();
          await conversation.save();

          console.log(`✅ Sent admin appointment confirmation message for appointment ${appointment._id}`);
        }
      } catch (messageError) {
        console.error('Error creating conversation/message for admin-confirmed appointment:', messageError);
        // Don't fail the appointment confirmation if messaging fails
      }
    }

    res.json({
      message: 'Appointment status updated successfully by admin',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error (admin):', error);
    res.status(500).json({ message: 'Error updating appointment status' });
  }
});

// Admin: approve/reject refund requests
router.patch('/:id/refund-decision', auth, requireAdmin, [
  body('action').isIn(['approve', 'reject']).withMessage('Invalid action'),
  body('adminNote').optional().isLength({ max: 500 }).withMessage('Admin note too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { action, adminNote } = req.body;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.refundStatus !== 'REQUESTED') {
      return res.status(400).json({ message: 'No pending refund request for this appointment' });
    }

    if (action === 'approve') {
      if (!['reserved', 'paid'].includes(appointment.paymentStatus)) {
        return res.status(400).json({ message: 'Nothing to refund for this appointment' });
      }

      if (appointment.paymentStatus === 'reserved') {
        await refundReservedPayment(appointment, { reason: appointment.refundReason, actorId: req.user.userId });
      } else {
        await refundPaidPayment(appointment, { reason: appointment.refundReason, actorId: req.user.userId });
      }

      appointment.status = appointment.status === 'pending' ? 'cancelled' : appointment.status;
      appointment.refundStatus = 'APPROVED';
      appointment.refundDecidedAt = new Date();
      appointment.refundDecidedBy = req.user.userId;
      appointment.refundAdminNote = adminNote;
    } else {
      appointment.refundStatus = 'REJECTED';
      appointment.refundDecidedAt = new Date();
      appointment.refundDecidedBy = req.user.userId;
      appointment.refundAdminNote = adminNote;
    }

    await appointment.save();

    res.json({
      message: `Refund ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      appointment
    });
  } catch (error) {
    console.error('Refund decision error:', error);
    res.status(500).json({ message: 'Error processing refund decision' });
  }
});

// Cancel appointment (client only)
router.patch('/:id/cancel', auth, requireClient, [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
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
    const { reason } = req.body;
    const clientId = req.user.userId;

    const appointment = await Appointment.findOne({
      _id: id,
      client: clientId
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }

    // Refund payment based on current payment state
    if (appointment.amount > 0 && ['reserved', 'paid'].includes(appointment.paymentStatus)) {
      try {
        if (appointment.paymentStatus === 'reserved') {
          await refundReservedPayment(appointment, { reason, actorId: clientId });
        } else if (appointment.paymentStatus === 'paid') {
          await refundPaidPayment(appointment, { reason, actorId: clientId });
        }

        appointment.refundStatus = 'APPROVED';
        appointment.refundAmount = appointment.amount;
        appointment.refundReason = reason || appointment.refundReason;
        appointment.refundRequestedAt = appointment.refundRequestedAt || new Date();
        appointment.refundRequestedBy = appointment.refundRequestedBy || clientId;
        appointment.refundDecidedAt = new Date();
        appointment.refundDecidedBy = clientId;
      } catch (error) {
        console.error('Refund processing error during cancellation:', error);
        return res.status(500).json({ message: 'Error processing refund', error: error.message });
      }
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = clientId;
    appointment.cancellationReason = reason;
    appointment.cancelledAt = new Date();
    if (['reserved', 'paid'].includes(appointment.paymentStatus)) {
      appointment.paymentStatus = 'refunded';
    }
    await appointment.save();

    res.json({
      message: 'Appointment cancelled successfully. Payment has been refunded.',
      appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Error cancelling appointment' });
  }
});

// Reschedule appointment request
router.patch('/:id/reschedule', auth, [
  body('newDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('newTime').notEmpty().withMessage('Time is required'),
  body('reason').isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters')
], async (req, res) => {
  console.log('📅 Reschedule request received:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Reschedule validation failed:', JSON.stringify(errors.array(), null, 2));
      console.log('Request body:', req.body);
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { newDate, newTime, reason } = req.body;
    const userId = req.user.userId;

    // Find appointment
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is part of this appointment
    const isClient = appointment.client.toString() === userId;
    const isLawyer = appointment.lawyer.toString() === userId;

    if (!isClient && !isLawyer) {
      return res.status(403).json({ message: 'Unauthorized to reschedule this appointment' });
    }

    console.log('📊 Appointment status:', appointment.status);

    // Check if appointment can be rescheduled
    if (appointment.status === 'completed') {
      console.log('❌ Cannot reschedule - appointment is completed');
      return res.status(400).json({ message: 'Cannot reschedule completed appointment' });
    }

    if (appointment.status === 'cancelled') {
      console.log('❌ Cannot reschedule - appointment is cancelled');
      return res.status(400).json({ message: 'Cannot reschedule cancelled appointment' });
    }

    // Store reschedule request
    console.log('✅ Storing reschedule request...');
    appointment.rescheduleRequest = {
      requestedBy: userId,
      requestedAt: new Date(),
      newDate: new Date(newDate),
      newTime,
      reason,
      status: 'pending'
    };

    console.log('💾 Saving appointment...');
    await appointment.save();

    console.log('👥 Populating client and lawyer...');
    await appointment.populate('client', 'name email');
    await appointment.populate('lawyer', 'name email');

    console.log('✅ Reschedule request successful!');
    res.json({
      message: 'Reschedule request sent successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Reschedule request error:', error);
    res.status(500).json({ message: 'Error sending reschedule request' });
  }
});

// Client: request manual refund (for completed/confirmed appointments)

router.post('/:id/request-refund', auth, requireClient, refundUpload.array('proofs', 5), async (req, res) => {
  try {
    console.log('🔍 Refund request received:', {
      appointmentId: req.params.id,
      filesCount: req.files ? req.files.length : 0,
      bodyKeys: Object.keys(req.body),
      reason: req.body.reason ? req.body.reason.substring(0, 50) : 'none'
    });

    if (!req.files || req.files.length === 0) {
      console.log('❌ No files uploaded');
      return res.status(400).json({ message: 'At least one refund proof image is required' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const clientId = req.user.userId;

    // Manual validation for reason field
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Reason is required and must be at least 10 characters' });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({ message: 'Reason must not exceed 500 characters' });
    }

    const appointment = await Appointment.findOne({ _id: id, client: clientId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!['paid'].includes(appointment.paymentStatus)) {
      return res.status(400).json({ message: 'Refund requests are only allowed after payment has been released' });
    }

    if (appointment.refundStatus !== 'NONE') {
      return res.status(400).json({ message: 'Refund request already submitted for this appointment' });
    }

    // Store all proof file paths
    const proofPaths = req.files.map(file => `/uploads/refund-proofs/${file.filename}`);

    // Update appointment with refund request details using flat fields
    appointment.refundStatus = 'REQUESTED';
    appointment.refundAmount = appointment.amount;
    appointment.refundReason = reason.trim();
    appointment.refundProofUrl = proofPaths[0]; // Store first proof in the main field for backward compatibility
    appointment.refundProofUrls = proofPaths; // Store all proofs in array
    appointment.refundRequestedAt = new Date();
    appointment.refundRequestedBy = clientId;

    await appointment.save();

    console.log('✅ Refund request saved:', {
      appointmentId: appointment._id,
      refundStatus: appointment.refundStatus,
      refundAmount: appointment.refundAmount
    });

    res.json({
      message: 'Refund request submitted successfully. Admin will review it shortly.',
      appointment
    });
  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({ message: 'Error submitting refund request' });
  }
});

// Submit Feedback for Appointment
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find appointment
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is the client
    if (appointment.client.toString() !== userId) {
      return res.status(403).json({ message: 'Only clients can submit feedback' });
    }

    // Check if appointment is completed
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only submit feedback for completed appointments' });
    }

    // Check if feedback already exists
    if (appointment.feedback && appointment.feedback.rating) {
      return res.status(400).json({ message: 'Feedback already submitted for this appointment' });
    }

    // Add feedback
    appointment.feedback = {
      rating: parseInt(rating),
      comment: comment || '',
      submittedAt: new Date()
    };

    await appointment.save();

    // Update lawyer's rating
    const Lawyer = require('../models/User');
    const lawyer = await Lawyer.findById(appointment.lawyer);

    if (lawyer) {
      // Calculate new average rating
      const allAppointments = await Appointment.find({
        lawyer: appointment.lawyer,
        'feedback.rating': { $exists: true, $ne: null }
      });

      const totalRating = allAppointments.reduce((sum, apt) => sum + (apt.feedback?.rating || 0), 0);
      const avgRating = totalRating / allAppointments.length;

      lawyer.averageRating = parseFloat(avgRating.toFixed(1));
      await lawyer.save();
    }

    res.json({
      message: 'Feedback submitted successfully',
      appointment
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: 'Error submitting feedback' });
  }
});

module.exports = router;
