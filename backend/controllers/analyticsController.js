const User = require('../models/User');
const Appointment = require('../models/Appointment');
const WalletTransaction = require('../models/WalletTransaction');
const UserBalance = require('../models/UserBalance');

/**
 * Get admin analytics
 */
const getAnalytics = async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const lawyers = await User.countDocuments({ role: 'lawyer' });
    const clients = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get appointment statistics
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });

    // Get transaction statistics
    const transactions = await WalletTransaction.find();
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amountPkr || 0), 0);

    // Get user balances
    const userBalances = await UserBalance.find();
    const totalBalance = userBalances.reduce((sum, bal) => sum + (bal.balancePkr || 0), 0);

    return res.status(200).json({
      users: {
        total: totalUsers,
        lawyers,
        clients,
        active: activeUsers,
        new: 0 // Can be calculated based on date range
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        inPeriod: 0 // Can be calculated based on date range
      },
      payments: {
        totalRevenue,
        total: transactions.length,
        revenueInPeriod: 0 // Can be calculated based on date range
      },
      chats: {
        total: 0, // Add chat count if needed
        inPeriod: 0
      },
      invoices: {
        paid: 0,
        overdue: 0,
        total: 0
      },
      feedback: {
        averageRating: 0,
        total: 0
      },
      balance: {
        total: totalBalance
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ message: 'Error fetching analytics' });
  }
};

/**
 * Get real-time stats
 */
const getRealtimeStats = async (req, res) => {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent activities
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: hourAgo }
    });

    const recentAppointments = await Appointment.countDocuments({
      createdAt: { $gte: hourAgo }
    });

    const recentTransactions = await WalletTransaction.countDocuments({
      createdAt: { $gte: hourAgo }
    });

    return res.status(200).json({
      recentUsers,
      recentAppointments,
      recentTransactions,
      timestamp: now
    });
  } catch (error) {
    console.error('Get realtime stats error:', error);
    return res.status(500).json({ message: 'Error fetching realtime stats' });
  }
};

module.exports = {
  getAnalytics,
  getRealtimeStats
};
