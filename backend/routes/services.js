const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

// Public routes
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getService);

// Admin routes
router.get('/admin/all', auth, requireAdmin, serviceController.getAllServices);
router.post('/', auth, requireAdmin, serviceController.createService);
router.put('/:id', auth, requireAdmin, serviceController.updateService);
router.delete('/:id', auth, requireAdmin, serviceController.deleteService);

module.exports = router;
