const User = require('../models/User');
const UserBalance = require('../models/UserBalance');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Get all users with pagination and filters
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    // Role filter
    if (role && role !== 'all') {
      query.role = role;
    }

    // Status filter
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    return res.status(200).json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    if (reason) {
      user.deactivationReason = reason;
    }

    await user.save();

    return res.status(200).json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ message: 'Error updating user status' });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete - mark as deleted instead of removing
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletionReason = reason;
    await user.save();

    return res.status(200).json({
      message: 'User deleted successfully',
      user
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};

/**
 * Get user balances
 */
const getUserBalances = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const balances = await UserBalance.find()
      .populate('user', 'name email role')
      .sort({ balancePkr: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserBalance.countDocuments();

    return res.status(200).json({
      userBalances: balances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user balances error:', error);
    return res.status(500).json({ message: 'Error fetching user balances' });
  }
};

/**
 * Get transactions
 */
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, userId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (userId) {
      query.user = userId;
    }

    const transactions = await WalletTransaction.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WalletTransaction.countDocuments(query);

    return res.status(200).json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ message: 'Error fetching transactions' });
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  deleteUser,
  getUserBalances,
  getTransactions
};
