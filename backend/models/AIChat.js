const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // For anonymous users
  },
  userQuery: {
    type: String,
    required: true,
    trim: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  responseMetadata: {
    sources: [{
      file: String,
      preview: String,
      similarity: Number
    }],
    confidence: {
      type: Number,
      default: 0
    },
    mode: {
      type: String,
      enum: ['simple', 'rag_optimized', 'fallback', 'error', 'unknown', 'api_only', 'perplexity'],
      default: 'simple'
    },
    formatting: {
      has_bold_text: Boolean,
      has_bullet_points: Boolean,
      has_headings: Boolean,
      has_tables: Boolean
    }
  },
  conversationIndex: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  // Soft delete fields
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
aiChatSchema.index({ sessionId: 1, conversationIndex: 1 });
aiChatSchema.index({ userId: 1, timestamp: -1 });
aiChatSchema.index({ timestamp: -1 });

// Static method to get conversation history
aiChatSchema.statics.getConversationHistory = function(sessionId, limit = 10) {
  return this.find({ sessionId })
    .sort({ conversationIndex: 1 })
    .limit(limit)
    .select('userQuery aiResponse conversationIndex timestamp');
};

// Static method to get user's chat statistics
aiChatSchema.statics.getUserChatStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalChats: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        averageConfidence: { $avg: '$responseMetadata.confidence' },
        lastChat: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        _id: 0,
        totalChats: 1,
        uniqueSessions: { $size: '$uniqueSessions' },
        averageConfidence: { $round: ['$averageConfidence', 2] },
        lastChat: 1
      }
    }
  ]);
};

module.exports = mongoose.model('AiChat', aiChatSchema);
