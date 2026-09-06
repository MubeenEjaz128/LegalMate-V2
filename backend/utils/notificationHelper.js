/**
 * Notification Helper — creates notifications and emits via Socket.IO
 * Usage:  const { createNotification } = require('./notificationHelper');
 *         createNotification(io, { type, title, message, referenceId, referenceModel, metadata });
 */
const Notification = require('../models/Notification');

/**
 * Create a notification, save to DB, and push via socket to admin room
 */
async function createNotification(io, data) {
  try {
    const notification = await Notification.create({
      type: data.type,
      title: data.title,
      message: data.message,
      referenceId: data.referenceId || undefined,
      referenceModel: data.referenceModel || undefined,
      metadata: data.metadata || {}
    });

    // Emit to all admins in the 'admin-notifications' room
    if (io) {
      io.to('admin-notifications').emit('admin-notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        read: false,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

module.exports = { createNotification };
