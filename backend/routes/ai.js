const express = require('express');
const { auth } = require('../middleware/auth');
const { aiRateLimit } = require('../middleware/aiRateLimit');
const aiController = require('../controllers/aiControllerNew');
const router = express.Router();

// Chat route — auth + per-user rate limiting
router.post('/chat', auth, aiRateLimit, aiController.chat);

// Frontend compatibility routes
router.get('/chat/sessions', auth, aiController.getSessions);
router.post('/chat/session/init', auth, aiController.createSession);
router.get('/chat/history/:sessionId', auth, aiController.getSessionMessages);
router.delete('/chat/sessions/:sessionId', auth, aiController.deleteSession);

// Legacy Session routes (keeping for backward compatibility if needed)
router.get('/sessions', auth, aiController.getSessions);
router.post('/sessions', auth, aiController.createSession);
router.get('/sessions/:sessionId/messages', auth, aiController.getSessionMessages);

module.exports = router;
