const express = require('express');
const router = express.Router();
const WalletTransaction = require('../models/WalletTransaction');
const { auth } = require('../middleware/auth');

router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = { user: req.user.userId };
    if (type) {
      filter.type = type;
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      WalletTransaction.countDocuments(filter)
    ]);

    res.json({
      transactions,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500).json({ message: 'Failed to load wallet transactions' });
  }
});

module.exports = router;
