const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const contactController = require('../controllers/contactController');

// Public routes (auth optional)
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    return auth(req, res, next);
  }
  next();
};

router.post('/', optionalAuth, contactController.createContactMessage);

// Admin routes
router.get('/', auth, requireAdmin, contactController.getContactMessages);
router.get('/:id', auth, requireAdmin, contactController.getContactMessage);
router.post('/:id/reply', auth, requireAdmin, contactController.replyContactMessage);
router.delete('/:id', auth, requireAdmin, contactController.deleteContactMessage);

module.exports = router;
