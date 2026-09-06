const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const blogController = require('../controllers/blogController');

// Public routes
router.get('/', blogController.getBlogs);
router.get('/slug/:slug', blogController.getBlogBySlug);

// Protected routes (authenticated users)
router.post('/:id/like', auth, blogController.toggleLikeBlog);

// Admin routes
router.get('/admin/all', auth, requireAdmin, blogController.getAllBlogs);
router.get('/admin/:id', auth, requireAdmin, blogController.getBlogById);
router.post('/', auth, requireAdmin, blogController.createBlog);
router.put('/:id', auth, requireAdmin, blogController.updateBlog);
router.delete('/:id', auth, requireAdmin, blogController.deleteBlog);

module.exports = router;
