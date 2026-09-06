const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const https = require('https');
const socketIo = require('socket.io');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const ragService = require('./services/ragService');
require('dotenv').config();

// Initialize Express and HTTP server
const app = express();

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

const http = require('http');
const server = http.createServer(app);

// CORS configuration - Allow same-origin (single port setup)
const PORT = process.env.PORT || 9000;

// Dynamic allowed origins from environment
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [])
].filter(Boolean);

const allowedOrigins = [
  `https://localhost:${PORT}`,
  `http://localhost:${PORT}`,
  'http://localhost:3000',
  'http://localhost:5173',
  ...configuredOrigins,
  `https://64.227.155.150:${PORT}`, // Allow public IP
  'https://www.legalmate.me',
  'https://legalmate.me',
  'https://new.legalmate.me',
  'http://new.legalmate.me',
  'nul', // For some file uploads from FormData
  undefined // For same-origin requests
];
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin) or from allowed origins
    if (!origin ||
      allowedOrigins.includes(origin) ||
      origin.includes(`localhost:${PORT}`) ||
      /^https?:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
      origin.includes('64.227.155.150')) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS warning for origin: ${origin} (allowed for same-origin)`);
      callback(null, true); // Allow for same-origin requests
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate limiting (API only; skip static assets)
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // default 15 minutes
const rateLimitMax =
  Number(process.env.RATE_LIMIT_MAX) ||
  (process.env.NODE_ENV === 'production' ? 1000 : 10000); // higher limit for local/dev
const apiRateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      frameSrc: ["'self'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https:"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      // No upgradeInsecureRequests — server runs on HTTP
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiRateLimiter);

// Handle favicon.ico requests explicitly
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/favicon.ico'));
});

// Serve static profile pictures with full CORS headers (including image cross-origin support)
app.use(
  '/uploads/profile-pictures',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

      // These headers are important for allowing images from another origin
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none'); // optional, only if embedding
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads/profile-pictures'))
);

// Serve static chat attachments with full CORS headers
app.use(
  '/uploads/chat',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

      // These headers are important for allowing files from another origin
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads/chat'))
);

// Serve static payment proofs with full CORS headers
app.use(
  '/uploads/payment-proofs',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

      // These headers are important for allowing files from another origin
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads/payment-proofs'))
);

// Serve static refund proofs with full CORS headers
app.use(
  '/uploads/refund-proofs',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

      // These headers are important for allowing files from another origin
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads/refund-proofs'))
);

// Serve static recordings with full CORS headers
app.use(
  '/uploads/recordings',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads/recordings'))
);


// Database connection
const connectDB = require('./config/database');
const seedAdmin = require('./utils/seedAdmin');

// Start AI service as child process (optional - set INTEGRATE_AI=true in .env)
const INTEGRATE_AI = process.env.INTEGRATE_AI === 'true';
let aiServiceProcess = null;

if (INTEGRATE_AI) {
  const { startAIService, stopAIService } = require('./start-ai-service');
  aiServiceProcess = startAIService();

  // Cleanup on exit
  process.on('SIGINT', () => {
    stopAIService();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stopAIService();
    process.exit(0);
  });
}

// Initialize database connection with async/await
(async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');

    // Seed default admin user after database connection
    await seedAdmin();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    server.close(() => {
      console.log('Server closed due to DB connection error.');
      process.exit(1);
    });
  }
})();

// Routes
const authRoutes = require('./routes/auth');
const lawyerRoutes = require('./routes/lawyers');
const appointmentRoutes = require('./routes/appointmentsNew'); // Updated to use PKR system
const feedbackRoutes = require('./routes/feedback');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const documentsRoutes = require('./routes/documents');
const walletRoutes = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');

// New PKR-based routes
const paymentMethodRoutes = require('./routes/paymentMethods');
const lawyerPayoutProfileRoutes = require('./routes/lawyerPayoutProfiles');
const buyBalanceRoutes = require('./routes/buyBalance');
const lawyerWithdrawRoutes = require('./routes/lawyerWithdraw');
const payoutPolicyRoutes = require('./routes/payoutPolicy');

// Public stats route (no auth required — for home page)
const publicStatsRoutes = require('./routes/publicStats');

// New website pages routes
const servicesRoutes = require('./routes/services');
const contactRoutes = require('./routes/contact');
const blogsRoutes = require('./routes/blogs');
const pagesRoutes = require('./routes/pages');
const faqsRoutes = require('./routes/faqs');
const videoRecordingsRoutes = require('./routes/videoRecordings');
const notificationRoutes = require('./routes/notifications');

console.log('🚀 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Registered /api/auth routes');
app.use('/api/lawyers', lawyerRoutes);
console.log('✅ Registered /api/lawyers routes');
app.use('/api/appointments', appointmentRoutes);
console.log('✅ Registered /api/appointments routes');
app.use('/api/feedback', feedbackRoutes);
console.log('✅ Registered /api/feedback routes');
app.use('/api/chat', (req, res, next) => {
  console.log(`[DEBUG] Request to /api/chat: ${req.method} ${req.url}`);
  next();
}, chatRoutes);
console.log('✅ Registered /api/chat routes');
app.use('/api/admin', adminRoutes);
console.log('✅ Registered /api/admin routes');
app.use('/api/ai', aiRoutes);
console.log('✅ Registered /api/ai routes');
app.use('/api/documents', documentsRoutes);
app.use('/api/wallet', walletRoutes);
console.log('✅ Registered /api/documents routes');

// New PKR-based payment routes
app.use('/api/payment-methods', paymentMethodRoutes);
console.log('✅ Registered /api/payment-methods routes');
app.use('/api/lawyer-payout-profiles', lawyerPayoutProfileRoutes);
console.log('✅ Registered /api/lawyer-payout-profiles routes');
app.use('/api/buy-balance', buyBalanceRoutes);
console.log('✅ Registered /api/buy-balance routes');
app.use('/api/lawyer-withdraw', lawyerWithdrawRoutes);
console.log('✅ Registered /api/lawyer-withdraw routes');
app.use('/api/payout-policy', payoutPolicyRoutes);
console.log('✅ Registered /api/payout-policy routes');

// New website pages routes
app.use('/api/services', servicesRoutes);
console.log('✅ Registered /api/services routes');

// Public stats (no auth)
app.use('/api/public', publicStatsRoutes);
console.log('✅ Registered /api/public routes');

app.use('/api/contact', contactRoutes);
console.log('✅ Registered /api/contact routes');
app.use('/api/blogs', blogsRoutes);
console.log('✅ Registered /api/blogs routes');
app.use('/api/pages', pagesRoutes);
console.log('✅ Registered /api/pages routes');
app.use('/api/faqs', faqsRoutes);
console.log('✅ Registered /api/faqs routes');
app.use('/api/video-recordings', videoRecordingsRoutes);
console.log('✅ Registered /api/video-recordings routes');
app.use('/api/admin/notifications', notificationRoutes);
console.log('✅ Registered /api/admin/notifications routes');

// Health check endpoint
app.get('/api/health', (req, res) => {
  let dbStatus = 'unknown';
  let dbError = null;
  try {
    if (!mongoose.connection) throw new Error('Mongoose not initialized');
    switch (mongoose.connection.readyState) {
      case 0:
        dbStatus = 'disconnected';
        break;
      case 1:
        dbStatus = 'connected';
        break;
      case 2:
        dbStatus = 'connecting';
        break;
      case 3:
        dbStatus = 'disconnecting';
        break;
      default:
        dbStatus = 'unknown';
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }
  res.json({
    status: 'ok',
    db: dbStatus,
    dbError,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend build (SPA) when available
const clientBuildPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(clientBuildPath)) {
  console.log(`✅ Serving frontend build from ${clientBuildPath}`);

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientBuildPath));

  // SPA fallback: return index.html for non-API GET requests
  app.get('*', (req, res, next) => {
    const requestPath = req.originalUrl || req.url || '';

    if (
      req.method !== 'GET' ||
      requestPath.startsWith('/api') ||
      requestPath.startsWith('/uploads') ||
      requestPath.startsWith('/socket.io')
    ) {
      return next();
    }

    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.warn('�?O Frontend build not found. Run `npm run build` inside /frontend to serve the UI from Express.');
}

// Socket.IO configuration - Allow same-origin (single port setup)
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow same-origin and allowed origins
      if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.includes(`localhost:${PORT}`) ||
        /^https?:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ Socket.IO CORS warning for origin: ${origin}`);
        callback(null, true); // Allow for same-origin
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
});
const Appointment = require('./models/Appointment');
const ChatMessage = require('./models/ChatMessage');

// Pass socket.io instance to chat routes after everything is set up
if (chatRoutes.setSocketIO) {
  chatRoutes.setSocketIO(io);
  console.log('✅ Socket.IO instance passed to chat routes');
}

// Make io available to routes via app.locals for notification triggers
app.set('io', io);

// Track consultation room participants with metadata
const consultationParticipants = new Map(); // consultationId -> Map(socketId -> { userId, name, role })

// Track all connected sockets for real-time online user count
const onlineUsers = new Set();

// Broadcast full real-time stats to admin room
const broadcastRealtimeStats = async () => {
  try {
    const Conversation = require('./models/Conversation');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [pendingAppointments, activeChats, overdueInvoices] = await Promise.all([
      Appointment.countDocuments({ status: 'pending' }),
      Conversation.countDocuments({ updatedAt: { $gte: oneHourAgo } }).catch(() => 0),
      Appointment.countDocuments({ date: { $lt: yesterday }, status: { $in: ['pending', 'confirmed'] } })
    ]);

    io.to('admin-notifications').emit('admin-realtime-stats', {
      onlineUsers: onlineUsers.size,
      pendingAppointments,
      activeChats,
      overdueInvoices
    });
  } catch (err) {
    // Fallback: at least send online count
    io.to('admin-notifications').emit('admin-realtime-stats', {
      onlineUsers: onlineUsers.size,
      pendingAppointments: 0,
      activeChats: 0,
      overdueInvoices: 0
    });
  }
};

// Periodic broadcast every 30s
setInterval(broadcastRealtimeStats, 30000);

// Expose for /stats endpoint
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  // Track this socket as online
  onlineUsers.add(socket.id);
  broadcastRealtimeStats();

  // Admin notification room
  socket.on('join-admin-notifications', () => {
    socket.join('admin-notifications');
    // Send current stats immediately when admin connects
    broadcastRealtimeStats();
  });

  socket.on('leave-admin-notifications', () => {
    socket.leave('admin-notifications');
  });

  // Handle check-participants for WebRTC initiator logic
  socket.on('check-participants', async (data) => {
    if (!data || !data.consultationId) return;
    const roomSockets = await io.in(data.consultationId).allSockets();
    socket.emit('participants-count', { count: roomSockets.size });
  });
  console.log('User connected:', socket.id);

  // Chat-specific events
  socket.on('join-chat-conversation', (conversationId) => {
    if (!conversationId) return;
    socket.join(conversationId);
    console.log(`User ${socket.id} joined chat conversation ${conversationId}`);
  });

  socket.on('leave-chat-conversation', (conversationId) => {
    if (!conversationId) return;
    socket.leave(conversationId);
    console.log(`User ${socket.id} left chat conversation ${conversationId}`);
  });

  socket.on('new-chat-message', async (data) => {
    try {
      const { conversationId, messageId } = data;
      if (!conversationId || !messageId) return;

      // Fetch the complete message from database
      const message = await ChatMessage.findById(messageId)
        .populate('from', 'name role')
        .populate('to', 'name role');

      if (message) {
        // Broadcast to all users in the conversation except sender
        socket.to(conversationId).emit('receive-chat-message', message);
        console.log(`Message broadcasted to conversation ${conversationId}`);
      }
    } catch (error) {
      console.error('Error broadcasting chat message:', error);
    }
  });

  socket.on('chat-typing', (data) => {
    const { conversationId, userId, isTyping } = data;
    if (!conversationId || !userId) return;

    socket.to(conversationId).emit('user-typing', {
      userId,
      isTyping,
      conversationId
    });
  });

  socket.on('message-delivered', async (data) => {
    try {
      const { messageId, userId } = data;
      if (!messageId || !userId) return;

      // Update message as delivered
      await ChatMessage.findByIdAndUpdate(messageId, {
        isDelivered: true,
        deliveredAt: new Date()
      });

      // Notify sender about delivery
      socket.broadcast.emit('message-delivery-confirmed', {
        messageId,
        userId,
        status: 'delivered'
      });
    } catch (error) {
      console.error('Error updating message delivery status:', error);
    }
  });

  socket.on('message-read', (data) => {
    const { conversationId, messageId, userId } = data;
    if (!conversationId || !messageId || !userId) return;

    socket.to(conversationId).emit('message-marked-read', {
      messageId,
      userId,
      conversationId
    });
  });

  socket.on('join-consultation', async (data) => {
    if (!data || typeof data !== 'object' || !data.consultationId || !data.userId) {
      socket.emit('error', { message: 'Invalid consultation data: consultationId and userId required' });
      return;
    }
    const { consultationId, userId, name, role } = data;
    // Check current number of participants in the room
    const roomSockets = await io.in(consultationId).allSockets();
    if (roomSockets.size >= 2) {
      socket.emit('error', { message: 'Consultation is full. Only 2 participants allowed.' });
      return;
    }
    socket.join(consultationId);
    console.log(`User ${socket.id} joined consultation ${consultationId} as ${name || 'Participant'} (${role || 'unknown'})`);

    // Store participant metadata for reliable lookups
    if (!consultationParticipants.has(consultationId)) {
      consultationParticipants.set(consultationId, new Map());
    }
    consultationParticipants.get(consultationId).set(socket.id, { userId, name: name || 'Participant', role: role || 'unknown' });

    try {
      await Appointment.findOneAndUpdate(
        { _id: consultationId, startTime: { $exists: false } },
        { $set: { startTime: new Date() } },
        { new: true }
      );
    } catch (err) {
      console.error('Error setting video call startTime:', err);
      socket.emit('error', { message: 'Failed to set appointment startTime', error: err.message });
    }

    // Get all sockets in the room BEFORE notifying (so we can send existing participants to joiner)
    const existingSocketIds = Array.from(await io.in(consultationId).allSockets());
    
    // Notify existing participants about the new joiner
    socket.to(consultationId).emit('user-joined', {
      id: socket.id,
      userId,
      name: name || 'Participant',
      role: role || 'unknown',
      timestamp: new Date(),
    });

    // Send existing participants list WITH metadata to the newly joined user
    const existingParticipants = [];
    const roomMeta = consultationParticipants.get(consultationId);
    for (const sid of existingSocketIds) {
      if (sid !== socket.id) {
        const meta = roomMeta?.get(sid) || {};
        existingParticipants.push({ id: sid, name: meta.name || 'Participant', role: meta.role || 'unknown', userId: meta.userId });
      }
    }
    if (existingParticipants.length > 0) {
      socket.emit('room-participants', { participants: existingParticipants, consultationId });
    }

    // Emit participant count to ALL in the room
    const updatedSockets = await io.in(consultationId).allSockets();
    io.in(consultationId).emit('participants-count', { count: updatedSockets.size });
    console.log(`User socket joined. Count: ${updatedSockets.size}. Emitting count to room ${consultationId}`);
    console.log(`Participants in room ${consultationId}:`, Array.from(updatedSockets));

    // If this is the first person in the room, emit a waiting event so the other party can be notified
    if (updatedSockets.size === 1) {
      // Store waiting info on the socket for later reference
      socket.waitingInConsultation = { consultationId, userId, name, role };
      // Broadcast to the global namespace so the ConsultationPage can pick it up
      io.emit('user-waiting-in-call', {
        consultationId,
        userId,
        name: name || 'Participant',
        role: role || 'unknown',
        timestamp: new Date(),
      });
    }
  });

  socket.on('user-joined', (data) => {
    if (!data || !data.consultationId) return;
    socket.to(data.consultationId).emit('user-joined', {
      id: socket.id,
      name: data.name || 'Participant',
      role: data.role || 'unknown',
      timestamp: new Date(),
    });
  });

  socket.on('offer', (data) => {
    if (!data || !data.consultationId || !data.offer) return;
    console.log(`Offer from ${socket.id} to consultation ${data.consultationId}`);
    socket.to(data.consultationId).emit('offer', {
      offer: data.offer,
      from: socket.id,
      name: data.name || 'Other',
      timestamp: new Date(),
    });
  });

  socket.on('answer', (data) => {
    if (!data || !data.consultationId || !data.answer) return;
    console.log(`Answer from ${socket.id} to consultation ${data.consultationId}`);
    socket.to(data.consultationId).emit('answer', {
      answer: data.answer,
      from: socket.id,
      name: data.name || 'Other',
      timestamp: new Date(),
    });
  });

  socket.on('ice-candidate', (data) => {
    if (!data || !data.consultationId || !data.candidate) return;
    socket.to(data.consultationId).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id,
      timestamp: new Date(),
    });
  });

  socket.on('chat-message', (data) => {
    if (!data || !data.consultationId || typeof data.message !== 'string') return;
    const safeMessage = sanitizeHtml(data.message, { allowedTags: [], allowedAttributes: {} });
    socket.to(data.consultationId).emit('chat-message', {
      message: safeMessage,
      from: socket.id,
      name: data.name || 'Other',
      userId: data.userId || null,
      role: data.role || 'unknown',
      timestamp: new Date(),
    });
  });

  // End call - notify the other participant to exit too
  socket.on('end-call', (data) => {
    if (!data || !data.consultationId) return;
    console.log(`User ${socket.id} ended call in ${data.consultationId}`);
    socket.to(data.consultationId).emit('call-ended', {
      endedBy: socket.id,
      name: data.name || 'Other',
      reason: data.reason || 'manual',
      timestamp: new Date(),
    });
  });

  socket.on('typing', (data) => {
    if (!data || !data.conversationId) return;
    socket.to(data.conversationId).emit('typing', {
      from: data.from || 'unknown',
      to: data.to || 'unknown',
      conversationId: data.conversationId,
    });
  });

  socket.on('disconnect', async () => {
    // Remove from online users and broadcast
    onlineUsers.delete(socket.id);
    broadcastRealtimeStats();
    console.log('User disconnected:', socket.id);
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
    for (const room of rooms) {
      // Get metadata before removing
      const roomMeta = consultationParticipants.get(room);
      const disconnectedUser = roomMeta?.get(socket.id);
      
      socket.to(room).emit('user-left', {
        id: socket.id,
        name: disconnectedUser?.name || 'Participant',
        role: disconnectedUser?.role || 'unknown',
        timestamp: new Date(),
      });

      // Clean up participant metadata
      if (roomMeta) {
        roomMeta.delete(socket.id);
        if (roomMeta.size === 0) {
          consultationParticipants.delete(room);
        }
      }

      try {
        const roomSockets = await io.in(room).allSockets();
        // Emit updated count to remaining participants
        socket.to(room).emit('participants-count', { count: roomSockets.size });

        if (roomSockets.size === 0) {
          await Appointment.findOneAndUpdate(
            { _id: room, endTime: { $exists: false } },
            { $set: { endTime: new Date() } },
            { new: true }
          );
        }
      } catch (err) {
        console.error('Error setting video call endTime:', err);
      }
    }
  });
});

// Error handling and 404
app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


// Start HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Unified Server running on port ${PORT}`);

  // Initialize RAG in background
  ragService.initialize().catch(err => {
    console.error('Failed to initialize RAG Service:', err);
  });
});

module.exports = app;
