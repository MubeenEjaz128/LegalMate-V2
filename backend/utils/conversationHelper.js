const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const mongoose = require('mongoose');
const { isValidObjectId, isValidCustomConversationId, normalizeConversationId } = require('./validators');

/**
 * Create or get existing conversation between client and lawyer
 * @param {ObjectId} clientId - Client user ID
 * @param {ObjectId} lawyerId - Lawyer user ID
 * @param {Object} appointmentData - Appointment details for welcome message
 * @returns {Promise<Object>} Conversation object with success status
 */
async function createOrGetConversation(clientId, lawyerId, appointmentData = null) {
  try {
    // Check if conversation already exists between client and lawyer
    let conversation = await Conversation.findOne({
      $and: [
        { members: { $in: [clientId] } },
        { members: { $in: [lawyerId] } },
        { isGroup: false }
      ]
    });

    let isNewConversation = false;
    
    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        members: [clientId, lawyerId],
        participants: [clientId, lawyerId],
        isGroup: false,
        createdBy: lawyerId,
        lastActivity: new Date()
      });
      
      await conversation.save();
      isNewConversation = true;
      console.log(`✅ Created new conversation ${conversation._id} between client ${clientId} and lawyer ${lawyerId}`);
    }

    // Send welcome/confirmation message if appointment data provided
    if (appointmentData) {
      const { clientName, date, time, isNewAppointment = true } = appointmentData;
      
      let messageText;
      if (isNewConversation) {
        messageText = `Hello ${clientName}! Your appointment has been confirmed for ${new Date(date).toLocaleDateString()} at ${time}. Feel free to ask any questions regarding your consultation.`;
      } else if (isNewAppointment) {
        messageText = `Your appointment for ${new Date(date).toLocaleDateString()} at ${time} has been confirmed. Looking forward to our consultation!`;
      } else {
        messageText = `Great news! Your appointment for ${new Date(date).toLocaleDateString()} at ${time} has been approved and confirmed. Looking forward to our consultation!`;
      }

      const welcomeMessage = new ChatMessage({
        conversationId: conversation._id.toString(),
        from: lawyerId,
        to: clientId,
        message: messageText,
        timestamp: new Date(),
        isRead: false
      });

      await welcomeMessage.save();

      // Update conversation with last message
      conversation.lastMessage = welcomeMessage._id;
      conversation.lastActivity = new Date();
      await conversation.save();

      console.log(`✅ Sent ${isNewConversation ? 'welcome' : 'confirmation'} message to conversation ${conversation._id}`);
    }

    return {
      success: true,
      conversation,
      isNewConversation
    };

  } catch (error) {
    console.error('Error in createOrGetConversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send system message to existing conversation
 * @param {string} conversationId - Conversation ID
 * @param {ObjectId} fromUserId - Sender user ID
 * @param {ObjectId} toUserId - Recipient user ID
 * @param {string} message - Message text
 * @returns {Promise<Object>} Success status
 */
async function sendSystemMessage(conversationId, fromUserId, toUserId, message) {
  try {
    const systemMessage = new ChatMessage({
      conversationId: conversationId,
      from: fromUserId,
      to: toUserId,
      message: message,
      timestamp: new Date(),
      isRead: false
    });

    await systemMessage.save();

    // Update conversation last activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: systemMessage._id,
      lastActivity: new Date()
    });

    console.log(`✅ Sent system message to conversation ${conversationId}`);
    
    return {
      success: true,
      message: systemMessage
    };

  } catch (error) {
    console.error('Error sending system message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find a conversation by ID with enhanced error logging and format handling
 * @param {string} conversationId - The ID of the conversation to find
 * @returns {Promise<Object>} - The conversation document or null if not found
 */
async function findConversationWithLogging(conversationId) {
  console.log(`🔍 Looking for conversation with ID: ${conversationId} (type: ${typeof conversationId})`);
  
  // Try both native ObjectId and string formats
  let conversation;
  try {
    if (mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findById(conversationId);
      console.log(`✅ Found conversation by ID: ${conversation ? conversation._id : 'Not found'}`);
    } else {
      console.log(`⚠️ Invalid ObjectId format: ${conversationId}`);
      
      // If this is a custom format ID (e.g., "user1_user2"), try alternative lookup methods
      if (conversationId.includes('_')) {
        console.log('🔄 Attempting to find conversation by custom ID format');
        const [userId1, userId2] = conversationId.split('_');
        
        if (mongoose.Types.ObjectId.isValid(userId1) && mongoose.Types.ObjectId.isValid(userId2)) {
          // Find conversation where both users are members
          conversation = await Conversation.findOne({
            members: { 
              $all: [
                new mongoose.Types.ObjectId(userId1), 
                new mongoose.Types.ObjectId(userId2)
              ] 
            },
            isGroup: false
          });
          
          console.log(`${conversation ? '✅ Found' : '❌ Not found'} conversation by custom format (${userId1}_${userId2})`);
        }
      }
    }
  } catch (err) {
    console.error(`⚠️ Error finding conversation: ${err.message}`);
  }
  
  if (!conversation) {
    console.error(`❌ Conversation not found: ${conversationId}`);
  }
  
  return conversation;
}

/**
 * Validate user membership in a conversation with enhanced logging
 * @param {string} userId - The user ID to check
 * @param {Object} conversation - The conversation document
 * @returns {boolean} - True if user is a member, false otherwise
 */
function validateUserMembership(userId, conversation) {
  if (!conversation || !userId) {
    console.error('❌ Invalid parameters for membership validation');
    return false;
  }
  
  const memberStrings = conversation.members.map(id => id.toString());
  const isMember = memberStrings.includes(userId.toString());
  
  console.log(`🔐 User ${userId} membership check in conversation ${conversation._id}: ${isMember ? 'Member' : 'Not a member'}`);
  if (!isMember) {
    console.log(`🔐 Available members: ${memberStrings.join(', ')}`);
  }
  
  return isMember;
}

module.exports = {
  createOrGetConversation,
  sendSystemMessage,
  findConversationWithLogging,
  validateUserMembership
};