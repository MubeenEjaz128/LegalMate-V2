const { v4: uuidv4 } = require('uuid');
const AiChat = require('../models/AIChat');
const ChatSession = require('../models/ChatSession');
const ragService = require('../services/ragService');

exports.chat = async (req, res) => {
  try {
    // Support both 'question' (per spec) and 'message' (legacy/frontend)
    const question = req.body.question || req.body.message;
    const clientSessionId = req.body.sessionId;
    const userId = req.user ? (req.user.userId || req.user._id) : null; // Handle optional auth if needed

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('Chat Request:', { question });

    // Session Management (Optional but good for history)
    let sessionId = clientSessionId;
    if (userId) {
      if (!sessionId) {
        sessionId = uuidv4();
      }

      // Ensure session exists or create it
      const sessionUpdate = await ChatSession.findOneAndUpdate(
        { sessionId, userId },
        {
          updatedAt: Date.now(),
          $setOnInsert: {
            createdAt: Date.now(),
            title: question.substring(0, 30) + (question.length > 30 ? '...' : '')
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Get Chat History for Context
    let chatHistory = [];
    if (sessionId) {
      chatHistory = await AiChat.find({ sessionId })
        .sort({ timestamp: -1 }) // Get latest first
        .limit(5); // Limit context window

      chatHistory = chatHistory.reverse(); // Standard chronological order for LLM
    }

    // Get AI Response
    let answerResponse;
    try {
      answerResponse = await ragService.query(question, chatHistory);
    } catch (error) {
      console.error('RAG Error:', error);
      const status = error?.status || error?.response?.status;
      const code = error?.lc_error_code || error?.code;
      const isAuthError = status === 401 || code === 'MODEL_AUTHENTICATION';

      answerResponse = {
        answer: isAuthError
          ? "The AI service is temporarily unavailable because its provider authentication needs to be refreshed. Please try again shortly."
          : "I'm sorry, I encountered an error processing your request.",
        sources: []
      };
    }

    // Deconstruct response
    const answerText = typeof answerResponse === 'string' ? answerResponse : answerResponse.answer;
    const sources = answerResponse.sources || [];

    // Append sources to the answer text in a clean format
    let finalAnswer = answerText;
    if (sources.length > 0) {
      const uniqueSources = [...new Set(sources.map(s => `${s.file} ${s.section ? `(Section: ${s.section})` : ''}`))];
      // Clean formatting for sources section
      finalAnswer += "\n\n---\n\n**Sources Used:**\n\n" + uniqueSources.map(s => `${s}`).join("\n\n");
    }

    // Save Chat History if user is authenticated
    if (userId && sessionId) {
      const chat = new AiChat({
        sessionId,
        userId,
        userQuery: question,
        aiResponse: finalAnswer,
        timestamp: new Date(),
        responseMetadata: { sources: sources }
      });
      await chat.save();
    }

    // Return strictly formatted response as requested
    // But also include sessionId/chatId if the frontend needs it, 
    // but the prompt emphasized the structure: { "answer": "..." }
    // I will return the requested structure primarily.

    res.json({
      answer: finalAnswer,
      message: finalAnswer,
      response: finalAnswer,
      sessionId: sessionId,
      sources: sources
    });

  } catch (error) {
    console.error('Chat Controller Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Keep other methods for frontend compatibility
exports.getSessions = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const sessions = await ChatSession.find({ userId }).sort({ updatedAt: -1 }).lean();

    // Enrich with message counts using Promise.all
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
      const count = await AiChat.countDocuments({ sessionId: session.sessionId });
      // Get the last message for preview if needed also
      // const lastMsg = await AiChat.findOne({ sessionId: session.sessionId }).sort({ timestamp: -1 });
      return {
        ...session,
        lastActivity: session.updatedAt,
        messageCount: count,
        // preview: lastMsg ? lastMsg.userQuery : session.title
      };
    }));

    res.json({
      success: true,
      sessions: enrichedSessions
    });
  } catch (error) {
    console.error('Get Sessions Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId || req.user._id;

    // Verify ownership
    const session = await ChatSession.findOne({ sessionId, userId });
    // Note: If session is newly created via chat flow, it might verify correctly. 
    // If not found, we might still want to return messages if they exist for this user?
    // But strictly speaking, the session should exist.

    if (!session) {
      // Ideally return 404, but let's check for messages just in case session entry was missed
      const count = await AiChat.countDocuments({ sessionId, userId });
      if (count === 0) {
        // Return empty list instead of 404 for new sessions
        return res.json({
          success: true,
          messages: [],
          conversations: []
        });
      }
    }

    const messages = await AiChat.find({ sessionId }).sort({ timestamp: 1 });

    // Return 'conversations' key to match frontend expectation
    res.json({
      success: true,
      messages: messages,
      conversations: messages
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createSession = async (req, res) => {
  // ... implementation if needed
  res.json({ sessionId: uuidv4() });
};

exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId || req.user._id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Deleting session: ${sessionId} for user: ${userId}`);

    // Verify ownership and delete session
    const sessionResult = await ChatSession.deleteOne({ sessionId, userId });

    // Delete all messages associated with this session
    // We strictly filter by userId to ensure users can't delete others' data
    const messagesResult = await AiChat.deleteMany({ sessionId, userId });

    console.log(`Deleted ${messagesResult.deletedCount} messages and ${sessionResult.deletedCount} session records.`);

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getChatStats = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const totalSessions = await ChatSession.countDocuments({ userId });
    const totalMessages = await AiChat.countDocuments({ userId });
    res.json({
      success: true,
      stats: {
        totalSessions,
        totalMessages,
        dailyLimit: parseInt(process.env.AI_DAILY_LIMIT) || 30,
        minuteLimit: parseInt(process.env.AI_MINUTE_LIMIT) || 5,
      }
    });
  } catch (error) {
    console.error('Get Chat Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
