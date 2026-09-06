const ContactMessage = require('../models/ContactMessage');

/**
 * Create contact message (public)
 */
const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
      user: req.user?.userId || null
    });

    // Notify admin
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(req.app.get('io'), {
        type: 'contact_message',
        title: 'New Contact Message',
        message: `${name} sent a message: ${subject || 'No subject'}`,
        referenceId: contactMessage._id,
        referenceModel: 'ContactMessage',
        metadata: { userName: name, userEmail: email, extra: subject }
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully. We will get back to you soon!',
      contactMessage
    });
  } catch (error) {
    console.error('Create contact message error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error sending message' 
    });
  }
};

/**
 * Get all contact messages (admin)
 */
const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const messages = await ContactMessage.find(query)
      .populate('user', 'name email')
      .populate('reply.repliedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(query);

    return res.status(200).json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching messages' 
    });
  }
};

/**
 * Get single contact message (admin)
 */
const getContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findById(id)
      .populate('user', 'name email')
      .populate('reply.repliedBy', 'name email');

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Mark as read
    if (message.status === 'unread') {
      message.status = 'read';
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Get contact message error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching message' 
    });
  }
};

/**
 * Reply to contact message (admin)
 */
const replyContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;

    const message = await ContactMessage.findById(id);

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    message.reply = {
      message: replyMessage,
      repliedBy: req.user.userId,
      repliedAt: new Date()
    };
    message.status = 'replied';

    await message.save();

    return res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      contactMessage: message
    });
  } catch (error) {
    console.error('Reply contact message error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error sending reply' 
    });
  }
};

/**
 * Delete contact message (admin)
 */
const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting message' 
    });
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
  getContactMessage,
  replyContactMessage,
  deleteContactMessage
};
