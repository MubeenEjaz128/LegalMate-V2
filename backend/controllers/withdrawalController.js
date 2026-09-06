const WithdrawRequest = require('../models/WithdrawRequest');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Get all withdrawal requests with pagination and filters
 */
const getWithdrawalRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // User filter
    if (userId) {
      query.lawyer = userId;
    }

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

    return res.status(200).json({
      withdrawalRequests: filteredRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    return res.status(500).json({ message: 'Error fetching withdrawal requests' });
  }
};

/**
 * Approve withdrawal request
 */
const approveWithdrawalRequest = async (req, res) => {
  try {
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

    // Process the actual withdrawal
    const userBalance = await UserBalance.findOne({ user: withdrawRequest.lawyer });
    if (!userBalance) {
      return res.status(400).json({ message: 'User balance not found' });
    }

    // Check if user has sufficient balance
    if (userBalance.balancePkr < withdrawRequest.requestedAmountPkr) {
      withdrawRequest.status = 'PENDING_ADMIN_ACTION';
      await withdrawRequest.save();
      return res.status(400).json({
        message: 'Insufficient user balance for withdrawal',
        userBalance: userBalance.balancePkr,
        requestedAmount: withdrawRequest.requestedAmountPkr
      });
    }

    // Deduct from user balance
    userBalance.balancePkr -= withdrawRequest.requestedAmountPkr;
    userBalance.totalWithdrawn = (userBalance.totalWithdrawn || 0) + withdrawRequest.requestedAmountPkr;
    await userBalance.save();

    // Create withdrawal transaction record
    await WalletTransaction.create({
      user: withdrawRequest.lawyer,
      type: 'WITHDRAWAL',
      amount: withdrawRequest.requestedAmountPkr,
      balanceAfter: userBalance.balancePkr,
      description: `Withdrawal request #${withdrawRequest._id} approved and processed`,
      relatedEntity: 'WithdrawRequest',
      relatedEntityId: withdrawRequest._id
    });

    return res.status(200).json({
      message: 'Withdrawal request approved successfully',
      withdrawalRequest: withdrawRequest
    });
  } catch (error) {
    console.error('Approve withdrawal request error:', error);
    return res.status(500).json({ message: 'Error approving withdrawal request' });
  }
};

/**
 * Reject withdrawal request
 */
const rejectWithdrawalRequest = async (req, res) => {
  try {
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
        amount: withdrawRequest.requestedAmountPkr,
        balanceAfter: userBalance.balancePkr,
        description: `Refund for rejected withdrawal request #${withdrawRequest._id}`,
        relatedEntity: 'WithdrawRequest',
        relatedEntityId: withdrawRequest._id
      });
    }

    return res.status(200).json({
      message: 'Withdrawal request rejected successfully',
      withdrawalRequest: withdrawRequest
    });
  } catch (error) {
    console.error('Reject withdrawal request error:', error);
    return res.status(500).json({ message: 'Error rejecting withdrawal request' });
  }
};

module.exports = {
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest
};
