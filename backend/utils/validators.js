// Add this file to backend/utils/validators.js

const mongoose = require('mongoose');

/**
 * Validates that a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validates custom conversation ID format (e.g., "userId1_userId2")
 * @param {string} conversationId - The conversation ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidCustomConversationId(conversationId) {
  if (!conversationId || typeof conversationId !== 'string') {
    return false;
  }
  
  // Check if format is userId1_userId2
  if (!conversationId.includes('_')) {
    return false;
  }
  
  const parts = conversationId.split('_');
  if (parts.length !== 2) {
    return false;
  }
  
  // Check if both parts are valid ObjectIds
  return isValidObjectId(parts[0]) && isValidObjectId(parts[1]);
}

/**
 * Try to normalize a conversation ID to a consistent format
 * @param {string} conversationId - The conversation ID to normalize
 * @returns {string|null} - Normalized ID or null if invalid
 */
function normalizeConversationId(conversationId) {
  if (isValidObjectId(conversationId)) {
    return conversationId;
  }
  
  if (isValidCustomConversationId(conversationId)) {
    // If it's a custom ID (userId1_userId2), sort the IDs to ensure consistency
    const [id1, id2] = conversationId.split('_');
    return [id1, id2].sort().join('_');
  }
  
  return null;
}

module.exports = {
  isValidObjectId,
  isValidCustomConversationId,
  normalizeConversationId
};