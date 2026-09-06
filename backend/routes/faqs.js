const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const faqController = require('../controllers/faqController');

// Public routes
router.get('/', faqController.getFAQs);

// Admin routes
router.get('/admin/all', auth, requireAdmin, faqController.getAllFAQs);
router.post('/', auth, requireAdmin, faqController.createFAQ);
router.put('/:id', auth, requireAdmin, faqController.updateFAQ);
router.delete('/:id', auth, requireAdmin, faqController.deleteFAQ);

module.exports = router;
