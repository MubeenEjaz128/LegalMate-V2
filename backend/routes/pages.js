const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const pageController = require('../controllers/pageController');

// Admin routes (MUST be before /:name wildcard)
router.get('/admin/all', auth, requireAdmin, pageController.getAllPages);
router.put('/:name', auth, requireAdmin, pageController.updatePage);

// Public routes (wildcard - must be last)
router.get('/:name', pageController.getPage);

module.exports = router;
