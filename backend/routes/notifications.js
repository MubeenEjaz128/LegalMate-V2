const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth, requireAdmin } = require('../middleware/auth');

// All routes require admin auth
router.use(auth, requireAdmin);

// GET /api/admin/notifications — fetch notifications (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    const filter = {};
    if (unreadOnly) filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ read: false })
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// GET /api/admin/notifications/unread-count — quick badge count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get count' });
  }
});

// PATCH /api/admin/notifications/:id/read — mark one as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// PATCH /api/admin/notifications/read-all — mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true, readAt: new Date() });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
});

// DELETE /api/admin/notifications/:id — delete one
router.delete('/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;
