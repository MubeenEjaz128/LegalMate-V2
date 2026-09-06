
const express = require('express')
const { body, validationResult } = require('express-validator')
const { auth } = require('../middleware/auth')
const ChatMessage = require('../models/ChatMessage')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const router = express.Router()
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');
const { findConversationWithLogging, validateUserMembership } = require('../utils/conversationHelper');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Make sure the directory exists
    const uploadDir = path.join(__dirname, '../uploads/chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeFilename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, documents, and common file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'audio/webm',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, Word documents, Excel files, and text files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get socket.io instance (we'll pass it from server.js)
let io;
const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

// Serve chat attachment files with proper CORS headers
router.get('/file/:filename', (req, res) => {
  try {
    // Set CORS headers for file serving
    const origin = req.headers.origin;

    // Allow any origin on port 3000
    if (!origin ||
      origin === 'https://localhost:3000' ||
      origin === 'http://localhost:3000' ||
      /^https?:\/\/\d+\.\d+\.\d+\.\d+:3000$/.test(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');
      res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }

    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/chat', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache for images

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ message: 'Error serving file' });
  }
});

// Get all chat conversations for a user (for dashboard/chat list) - based on confirmed appointments
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all conversations where user is a member
    const conversations = await Conversation.find({
      members: { $in: [userId] },
      isGroup: false // Only 1-on-1 conversations
    })
      .populate('members', 'name role email profilePicture')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    let validChatPartners = [];

    for (let conversation of conversations) {
      // Find the other participant
      const otherMember = conversation.members.find(member => member._id.toString() !== userId);

      if (otherMember) {
        const partnerData = {
          _id: conversation._id.toString(),
          conversationId: conversation._id,
          lastMessage: conversation.lastMessage ? conversation.lastMessage.message : '',
          unreadCount: 0, // TODO: Calculate actual unread count
          isGroup: false,
          updatedAt: conversation.lastActivity || conversation.createdAt,
          otherUser: otherMember
        };

        if (currentUser.role === 'client' && otherMember.role === 'lawyer') {
          partnerData.lawyer = otherMember;
          partnerData.client = currentUser;
        } else if (currentUser.role === 'lawyer' && otherMember.role === 'client') {
          partnerData.client = otherMember;
          partnerData.lawyer = currentUser;
        }

        validChatPartners.push(partnerData);
      }
    }

    // Calculate unread count for each conversation
    for (let conv of validChatPartners) {
      if (conv.otherUser) {
        // Count unread messages from the other user
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: conv.conversationId.toString(),
          from: conv.otherUser._id,
          to: userId,
          isRead: false
        });
        conv.unreadCount = unreadCount;
      }
    }

    // Sort by last activity
    validChatPartners.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(validChatPartners);
  } catch (error) {
    console.error('Get chat history for user error:', error);
    res.status(500).json({ message: 'Error fetching chat history for user' });
  }
});

// Get chat history for lawyer with specific user/client - based on confirmed appointments
router.get('/history/lawyer/:lawyerId', auth, async (req, res) => {
  try {
    const { lawyerId } = req.params;
    console.log('Getting chat history for lawyer:', lawyerId);

    // Find all conversations where lawyer is a member
    const conversations = await Conversation.find({
      members: { $in: [lawyerId] },
      isGroup: false // Only 1-on-1 conversations
    })
      .populate('members', 'name role email profilePicture')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    const validConversations = [];

    for (let conversation of conversations) {
      // Find the client in this conversation
      const client = conversation.members.find(member =>
        member._id.toString() !== lawyerId && member.role === 'client'
      );

      if (client) {
        // Count unread messages from this client
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: conversation._id.toString(),
          from: client._id,
          to: lawyerId,
          isRead: false
        });

        validConversations.push({
          _id: conversation._id.toString(),
          conversationId: conversation._id,
          client: client,
          lawyer: { _id: lawyerId },
          lastMessage: conversation.lastMessage ? conversation.lastMessage.message : 'Start your conversation',
          unreadCount,
          isGroup: false,
          updatedAt: conversation.lastActivity || conversation.createdAt
        });
      }
    }

    // Sort by last activity
    validConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    console.log('Found valid conversations for lawyer:', validConversations.length);
    res.json(validConversations);
  } catch (error) {
    console.error('Get lawyer chat history error:', error);
    res.status(500).json({ message: 'Error fetching lawyer chat history' });
  }
});

// Send message - general endpoint (Moved up to prevent 404 shadowing)
router.post('/message', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { to, message, conversationId, clientMessageId } = req.body;
    const from = req.user.userId;

    console.log('🚀 General message request received:', {
      conversationId,
      conversationIdType: typeof conversationId,
      from,
      to,
      hasMessage: !!message,
      hasAttachment: !!req.file,
      clientMessageId
    });

    if (!conversationId) {
      return res.status(400).json({ message: 'Missing required field: conversationId' });
    }

    // For text messages, ensure message is not empty
    // For attachments, message can be empty (we'll generate a default)
    if (!req.file && (!message || !message.trim())) {
      return res.status(400).json({ message: 'Message or attachment is required' });
    }

    // Find the conversation and verify user is a member using enhanced helper
    const conversation = await findConversationWithLogging(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        debug: { conversationId, idType: typeof conversationId }
      });
    }

    // Verify sender is a member of the conversation using enhanced helper
    if (!validateUserMembership(from, conversation)) {
      return res.status(403).json({
        message: 'Access denied. You are not a member of this conversation.',
        debug: {
          from,
          conversationId,
          members: conversation.members.map(id => id.toString())
        }
      });
    }

    // Get member strings for additional checks
    const memberStrings = conversation.members.map(id => id.toString());

    if (!memberStrings.includes(from)) {
      return res.status(403).json({
        message: 'Access denied. You are not a member of this conversation.',
        debug: {
          from,
          conversationId,
          members: memberStrings
        }
      });
    }

    // If 'to' is provided, verify recipient is also a member
    if (to && !memberStrings.includes(to)) {
      return res.status(400).json({
        message: 'Recipient is not a member of this conversation',
        debug: { to, members: memberStrings }
      });
    }

    // Prepare message data
    let messageData = {
      conversationId,
      from,
      to: to || (memberStrings.find(id => id !== from) || null),
      message: message && message.trim() ? message.trim() : '',
      clientMessageId: req.body.clientMessageId || Date.now() + '-' + Math.random(), // Add unique ID
      type: 'text'
    };

    // Handle attachment if present
    if (req.file) {
      messageData.attachmentUrl = `/uploads/chat/${req.file.filename}`;
      messageData.attachmentName = req.file.originalname;
      messageData.attachmentType = req.file.mimetype;

      if (req.file.mimetype.startsWith('image/')) {
        messageData.type = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        messageData.type = 'audio';
      } else {
        messageData.type = 'file';
      }

      // If no message provided with attachment, create default message
      if (!messageData.message) {
        messageData.message = `📎 ${req.file.originalname}`;
      }
    }

    // Create chat message
    const chatMessage = new ChatMessage(messageData);
    await chatMessage.save();

    // Populate sender and receiver info
    await chatMessage.populate('from', 'name role');
    await chatMessage.populate('to', 'name role');

    // Emit real-time message to all conversation participants
    if (io) {
      io.to(conversationId).emit('receive-chat-message', chatMessage);
    }

    console.log('✅ Message saved and emitted successfully');
    res.json({
      success: true,
      message: chatMessage,
      debug: {
        conversationId,
        from,
        to: messageData.to
      }
    });
  } catch (error) {
    console.error('❌ Send message CRITICAL failure:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error sending message',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



// Get chat history for consultation
router.get('/:consultationId', auth, async (req, res) => {
  try {
    const { consultationId } = req.params
    const userId = req.user.userId

    // Verify user has access to this consultation
    // For now, allow access if user is authenticated
    const messages = await ChatMessage.find({ conversationId: consultationId })
      .populate('from', 'name')
      .populate('to', 'name')
      .sort({ timestamp: 1 })

    res.json(messages)
  } catch (error) {
    console.error('Get chat history error:', error)
    res.status(500).json({ message: 'Error fetching chat history' })
  }
})

// Send message to specific conversation
router.post('/:conversationId/message', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, to } = req.body;
    const from = req.user.userId;

    console.log('🚀 Direct message request received:', {
      conversationId,
      conversationIdType: typeof conversationId,
      from,
      to,
      hasMessage: !!message,
      hasAttachment: !!req.file
    });

    // For text messages, ensure message is not empty
    // For attachments, message can be empty (we'll generate a default)
    if (!req.file && (!message || !message.trim())) {
      return res.status(400).json({ message: 'Message or attachment is required' });
    }

    // Find the conversation and verify user is a member using enhanced helper
    const conversation = await findConversationWithLogging(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        debug: { conversationId, idType: typeof conversationId }
      });
    }

    // Verify sender is a member of the conversation using enhanced helper
    if (!validateUserMembership(from, conversation)) {
      return res.status(403).json({
        message: 'Access denied. You are not a member of this conversation.',
        debug: {
          from,
          conversationId,
          members: conversation.members.map(id => id.toString())
        }
      });
    }

    // Determine recipient if not provided
    const memberStrings = conversation.members.map(id => id.toString());
    const recipient = to || memberStrings.find(id => id !== from);

    // Prepare message data
    let messageData = {
      conversationId,
      from,
      to: recipient,
      message: message && message.trim() ? message.trim() : '',
      clientMessageId: req.body.clientMessageId || Date.now() + '-' + Math.random(),
      type: 'text'
    };

    // Handle attachment if present
    if (req.file) {
      messageData.attachmentUrl = `/uploads/chat/${req.file.filename}`;
      messageData.attachmentName = req.file.originalname;
      messageData.attachmentType = req.file.mimetype;

      if (req.file.mimetype.startsWith('image/')) {
        messageData.type = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        messageData.type = 'audio';
      } else {
        messageData.type = 'file';
      }

      // If no message provided with attachment, create default message
      if (!messageData.message) {
        messageData.message = `📎 ${req.file.originalname}`;
      }
    }

    // Create chat message
    const chatMessage = new ChatMessage(messageData);
    await chatMessage.save();

    // Populate sender and receiver info
    await chatMessage.populate('from', 'name role');
    if (chatMessage.to) {
      await chatMessage.populate('to', 'name role');
    }

    // Update conversation with last message and activity
    conversation.lastMessage = chatMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Emit real-time message to all conversation participants
    if (io) {
      io.to(conversationId).emit('receive-chat-message', chatMessage);
    }

    res.json({
      success: true,
      message: chatMessage,
      debug: {
        conversationId,
        from,
        to: messageData.to
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// Send message - general endpoint

// Upload attachment
router.post('/:consultationId/attachment', auth, upload.single('file'), async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { from, to, message } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/chat/${req.file.filename}`;

    // Ensure we have a message - either provided or default for attachment
    const messageText = message && message.trim() ? message.trim() : `📎 ${req.file.originalname}`;

    const chatMessage = new ChatMessage({
      conversationId: consultationId,
      from,
      to,
      message: messageText,
      attachmentUrl: fileUrl,
      attachmentName: req.file.originalname,
      attachmentType: req.file.mimetype
    });
    await chatMessage.save();
    await chatMessage.populate('from', 'name');
    await chatMessage.populate('to', 'name');
    res.json(chatMessage);
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ message: 'Error uploading attachment' });
  }
});

// Get specific conversation details
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Parse conversationId to get client and lawyer IDs
    const [clientId, lawyerId] = conversationId.split('_');

    // Verify user has access to this conversation (either client or lawyer)
    const userId = req.user.userId;
    if (userId !== clientId && userId !== lawyerId) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Check if payment exists between these users
    const paymentExists = await Transaction.findOne({
      $or: [
        { payer: clientId, payee: lawyerId, status: 'approved' },
        { payer: lawyerId, payee: clientId, status: 'approved' }
      ]
    });

    if (!paymentExists) {
      return res.status(403).json({ message: 'No approved payment found for this conversation' });
    }

    // Get conversation participants
    const client = await User.findById(clientId).select('name role email profilePicture');
    const lawyer = await User.findById(lawyerId).select('name role email profilePicture');

    const conversation = {
      _id: conversationId,
      client,
      lawyer,
      participants: [client, lawyer],
      isGroup: false,
      paymentVerified: true
    };

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Error fetching conversation' });
  }
});



// Mark messages as read in a conversation
router.patch('/:consultationId/read', auth, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user.userId;
    // Mark all messages sent to this user as read
    const result = await ChatMessage.updateMany(
      { conversationId: consultationId, to: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ updated: result.nModified || result.modifiedCount });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

// Get consultation participants
router.get('/:consultationId/participants', auth, async (req, res) => {
  try {
    const { consultationId } = req.params
    const userId = req.user.userId

    // TODO: Implement participant retrieval
    // Verify user has access to this consultation
    // Return participant list

    res.json([])
  } catch (error) {
    console.error('Get participants error:', error)
    res.status(500).json({ message: 'Error fetching participants' })
  }
})

// Create group conversation
router.post('/group', auth, async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name || !Array.isArray(members) || members.length < 2) {
      return res.status(400).json({ message: 'Group name and at least 2 members required' });
    }
    const conversation = new Conversation({
      name,
      members,
      isGroup: true,
      createdBy: req.user.userId
    });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
});

// List user conversations (including groups)
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversations = await Conversation.find({ members: userId })
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ message: 'Error listing conversations' });
  }
});

// Add member to group
router.post('/group/:id/add', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.members.includes(memberId)) {
      conversation.members.push(memberId);
      await conversation.save();
    }
    res.json(conversation);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Error adding member' });
  }
});

// Remove member from group
router.post('/group/:id/remove', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    conversation.members = conversation.members.filter(m => m.toString() !== memberId);
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

// Send group message
router.post('/:conversationId/group-message', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const from = req.user.userId;

    // Verify group exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify user is a member of the group
    if (!conversation.members.includes(from)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // For text messages, ensure message is not empty
    // For attachments, message can be empty (we'll generate a default)
    if (!req.file && (!message || !message.trim())) {
      return res.status(400).json({ message: 'Message or attachment is required' });
    }

    // Prepare message data
    let messageData = {
      conversationId,
      from,
      message: message && message.trim() ? message.trim() : '',
      isGroup: true,
      clientMessageId: req.body.clientMessageId || Date.now() + '-' + Math.random(), // Add unique ID
      type: 'text'
    };

    // Handle attachment if present
    if (req.file) {
      messageData.attachmentUrl = `/uploads/chat/${req.file.filename}`;
      messageData.attachmentName = req.file.originalname;
      messageData.attachmentType = req.file.mimetype;

      if (req.file.mimetype.startsWith('image/')) {
        messageData.type = 'image';
      } else if (req.file.mimetype.startsWith('audio/')) {
        messageData.type = 'audio';
      } else {
        messageData.type = 'file';
      }

      // If no message provided with attachment, create default message
      if (!messageData.message) {
        messageData.message = `📎 ${req.file.originalname}`;
      }
    }

    const chatMessage = new ChatMessage(messageData);
    await chatMessage.save();
    await chatMessage.populate('from', 'name');

    // Emit real-time message to all group participants
    if (io) {
      io.to(conversationId).emit('receive-chat-message', chatMessage);
    }

    res.json(chatMessage);
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ message: 'Error sending group message' });
  }
});

// Update group avatar
router.post('/group/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No avatar uploaded' });
    const avatarUrl = `/uploads/chat/${req.file.filename}`;
    const conversation = await Conversation.findByIdAndUpdate(id, { groupAvatar: avatarUrl }, { new: true });
    res.json(conversation);
  } catch (error) {
    console.error('Update group avatar error:', error);
    res.status(500).json({ message: 'Error updating group avatar' });
  }
});

// Add admin to group
router.post('/group/:id/add-admin', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!conversation.admin.includes(adminId)) {
      conversation.admin.push(adminId);
      await conversation.save();
    }
    res.json(conversation);
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({ message: 'Error adding admin' });
  }
});

// Remove admin from group
router.post('/group/:id/remove-admin', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    conversation.admin = conversation.admin.filter(a => a.toString() !== adminId);
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ message: 'Error removing admin' });
  }
});

// Delete conversation/group
router.delete('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    console.log('Deleting conversation:', conversationId, 'by user:', userId);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of conversation or is admin for groups
    const isParticipant = conversation.members.includes(userId);
    const isAdmin = conversation.isGroup && conversation.admin.includes(userId);

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this conversation' });
    }

    // For groups, only admin can delete
    if (conversation.isGroup && !isAdmin) {
      return res.status(403).json({ message: 'Only group admin can delete this group' });
    }

    // Delete all messages in this conversation
    await ChatMessage.deleteMany({ conversationId: conversationId });
    console.log('Deleted messages for conversation:', conversationId);

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);
    console.log('Deleted conversation:', conversationId);

    res.json({
      message: conversation.isGroup ? 'Group deleted successfully' : 'Conversation deleted successfully',
      conversationId: conversationId
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Error deleting conversation' });
  }
});

module.exports = router;
module.exports.setSocketIO = setSocketIO; 