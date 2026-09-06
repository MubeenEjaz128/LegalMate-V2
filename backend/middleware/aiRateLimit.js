/**
 * Per-user AI Chat Rate Limiter
 * 
 * Limits AI chatbot usage per user to control API costs.
 * Uses in-memory storage (resets on server restart).
 * 
 * Default limits:
 * - 30 messages per user per day
 * - 5 messages per user per minute (burst protection)
 */

// In-memory store for rate limiting
const userUsage = new Map();

// Configuration (can be overridden via env vars)
const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT) || 30;
const MINUTE_LIMIT = parseInt(process.env.AI_MINUTE_LIMIT) || 5;

function cleanupOldEntries() {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  for (const [userId, data] of userUsage.entries()) {
    // Remove entries older than 24 hours
    if (data.dayStart < oneDayAgo) {
      userUsage.delete(userId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldEntries, 60 * 60 * 1000);

function getUserUsage(userId) {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  if (!userUsage.has(userId)) {
    userUsage.set(userId, {
      dayStart: startOfDay,
      dayCount: 0,
      minuteTimestamps: []
    });
  }

  const data = userUsage.get(userId);

  // Reset daily counter if new day
  if (data.dayStart < startOfDay) {
    data.dayStart = startOfDay;
    data.dayCount = 0;
  }

  // Clean old minute timestamps (keep only last 60 seconds)
  const oneMinuteAgo = now - 60 * 1000;
  data.minuteTimestamps = data.minuteTimestamps.filter(ts => ts > oneMinuteAgo);

  return data;
}

const aiRateLimit = (req, res, next) => {
  const userId = req.user?.userId || req.user?._id;

  if (!userId) {
    // No authenticated user — let the auth middleware handle it
    return next();
  }

  const usage = getUserUsage(userId.toString());

  // Check daily limit
  if (usage.dayCount >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily AI message limit reached',
      message: `You have reached your daily limit of ${DAILY_LIMIT} AI messages. Please try again tomorrow.`,
      retryAfter: 'tomorrow',
      limit: DAILY_LIMIT,
      used: usage.dayCount
    });
  }

  // Check per-minute burst limit
  if (usage.minuteTimestamps.length >= MINUTE_LIMIT) {
    const oldestInWindow = usage.minuteTimestamps[0];
    const retryAfterMs = 60 * 1000 - (Date.now() - oldestInWindow);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return res.status(429).json({
      error: 'Too many AI messages',
      message: `Please wait ${retryAfterSec} seconds before sending another message. Limit: ${MINUTE_LIMIT} messages per minute.`,
      retryAfter: retryAfterSec,
      limit: MINUTE_LIMIT
    });
  }

  // Record this request
  usage.dayCount++;
  usage.minuteTimestamps.push(Date.now());

  // Add remaining info to response headers
  res.setHeader('X-AI-DailyLimit', DAILY_LIMIT);
  res.setHeader('X-AI-DailyRemaining', DAILY_LIMIT - usage.dayCount);
  res.setHeader('X-AI-MinuteLimit', MINUTE_LIMIT);

  next();
};

module.exports = { aiRateLimit };
