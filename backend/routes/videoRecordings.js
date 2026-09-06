const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, requireAdmin } = require('../middleware/auth');
const VideoCallRecording = require('../models/VideoCallRecording');
const Appointment = require('../models/Appointment');

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, '..', 'uploads', 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Multer storage for recordings
const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `recording-${uniqueSuffix}.webm`);
  }
});

const recordingUpload = multer({
  storage: recordingStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only video/audio files are allowed'), false);
    }
  }
});

// POST /api/video-recordings/start - Start a new recording session
router.post('/start', auth, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify user is part of this appointment
    const userId = req.user._id.toString();
    const isClient = appointment.client.toString() === userId;
    const isLawyer = appointment.lawyer.toString() === userId;
    if (!isClient && !isLawyer) {
      return res.status(403).json({ message: 'Not authorized for this appointment' });
    }

    // Check for existing in-progress recording
    const existing = await VideoCallRecording.findOne({
      appointment: appointmentId,
      status: 'in-progress'
    });
    if (existing) {
      return res.json({ recording: existing, message: 'Recording already in progress' });
    }

    const recording = await VideoCallRecording.create({
      appointment: appointmentId,
      client: appointment.client,
      lawyer: appointment.lawyer,
      initiatedBy: req.user._id,
      initiatorRole: isClient ? 'client' : 'lawyer',
      callStartedAt: new Date(),
      status: 'in-progress'
    });

    res.status(201).json({ recording });
  } catch (error) {
    console.error('Error starting recording session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/video-recordings/:id/upload - Upload recording file
router.post('/:id/upload', auth, recordingUpload.single('recording'), async (req, res) => {
  try {
    const recording = await VideoCallRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording session not found' });
    }

    // Verify user is part of this recording
    const userId = req.user._id.toString();
    if (recording.client.toString() !== userId && recording.lawyer.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No recording file uploaded' });
    }

    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    recording.recordingUrl = recordingUrl;
    recording.recordingSize = req.file.size;
    recording.recordingFormat = 'webm';
    recording.callEndedAt = new Date();
    recording.status = 'completed';

    if (recording.callStartedAt) {
      recording.recordingDuration = Math.floor((recording.callEndedAt - recording.callStartedAt) / 1000);
    }

    if (req.body.endReason) {
      recording.endReason = req.body.endReason;
    }

    await recording.save();
    res.json({ recording, message: 'Recording uploaded successfully' });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/video-recordings/:id/chat - Save chat messages for a recording
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const recording = await VideoCallRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording session not found' });
    }

    const userId = req.user._id.toString();
    if (recording.client.toString() !== userId && recording.lawyer.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { messages } = req.body;
    if (Array.isArray(messages) && messages.length > 0) {
      recording.chatMessages = messages;
      await recording.save();
    }

    res.json({ message: 'Chat messages saved' });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/video-recordings/:id/end - Mark recording as ended (no file upload, e.g., recording failed)
router.post('/:id/end', auth, async (req, res) => {
  try {
    const recording = await VideoCallRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording session not found' });
    }

    recording.callEndedAt = new Date();
    recording.endReason = req.body.endReason || 'manual';
    recording.status = recording.recordingUrl ? 'completed' : 'failed';

    if (recording.callStartedAt) {
      recording.recordingDuration = Math.floor((recording.callEndedAt - recording.callStartedAt) / 1000);
    }

    await recording.save();
    res.json({ recording });
  } catch (error) {
    console.error('Error ending recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/video-recordings/admin/all - Admin: list all recordings
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;

    if (search) {
      // Search by appointment ID or user name - we'll search after populate
    }

    const recordings = await VideoCallRecording.find(filter)
      .populate('appointment', 'date time consultationType status amount')
      .populate('client', 'name email')
      .populate('lawyer', 'name email specialization')
      .populate('initiatedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await VideoCallRecording.countDocuments(filter);

    // Calculate stats
    const stats = await VideoCallRecording.aggregate([
      {
        $group: {
          _id: null,
          totalRecordings: { $sum: 1 },
          completedRecordings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalDuration: { $sum: '$recordingDuration' },
          totalSize: { $sum: '$recordingSize' },
          avgDuration: { $avg: '$recordingDuration' }
        }
      }
    ]);

    res.json({
      recordings,
      stats: stats[0] || { totalRecordings: 0, completedRecordings: 0, totalDuration: 0, totalSize: 0, avgDuration: 0 },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/video-recordings/admin/:id - Admin: get single recording detail
router.get('/admin/:id', auth, requireAdmin, async (req, res) => {
  try {
    const recording = await VideoCallRecording.findById(req.params.id)
      .populate('appointment', 'date time consultationType status amount duration')
      .populate('client', 'name email phone')
      .populate('lawyer', 'name email specialization phone')
      .populate('initiatedBy', 'name email role')
      .populate('chatMessages.sender', 'name email role');

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    res.json({ recording });
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/video-recordings/admin/:id - Admin: delete a recording
router.delete('/admin/:id', auth, requireAdmin, async (req, res) => {
  try {
    const recording = await VideoCallRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Delete file from disk
    if (recording.recordingUrl) {
      const filePath = path.join(__dirname, '..', recording.recordingUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await VideoCallRecording.findByIdAndDelete(req.params.id);
    res.json({ message: 'Recording deleted' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
