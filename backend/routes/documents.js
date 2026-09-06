const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${req.user.userId}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Upload document
router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    console.log('Document upload request from user:', req.user?.email)
    const { documentType } = req.body;
    
    if (!req.file) {
      console.log('No file uploaded in request')
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!documentType) {
      console.log('No document type provided')
      return res.status(400).json({ message: 'Document type is required' });
    }

    const allowedTypes = ['Law Degree Certificate', 'Bar Council License', 'Professional ID Card'];
    if (!allowedTypes.includes(documentType)) {
      console.log('Invalid document type:', documentType)
      return res.status(400).json({ 
        message: 'Invalid document type. Allowed types: ' + allowedTypes.join(', ')
      });
    }

    if (req.user.role !== 'lawyer') {
      console.log('Non-lawyer user attempted to upload documents:', req.user.role)
      return res.status(403).json({ message: 'Only lawyers can upload verification documents' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create document object
    const document = {
      id: Date.now().toString(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      documentType: documentType,
      uploadedAt: new Date(),
      status: 'pending'
    };

    // Initialize verificationDocuments array if it doesn't exist
    if (!user.verificationDocuments) {
      user.verificationDocuments = [];
    }

    // Check if document type already exists and replace it
    const existingDocIndex = user.verificationDocuments.findIndex(
      doc => doc.documentType === documentType
    );

    if (existingDocIndex !== -1) {
      // Delete old file
      const oldDoc = user.verificationDocuments[existingDocIndex];
      if (fs.existsSync(oldDoc.path)) {
        fs.unlinkSync(oldDoc.path);
      }
      // Replace with new document
      user.verificationDocuments[existingDocIndex] = document;
      console.log('Replaced existing document of type:', documentType);
    } else {
      // Add new document
      user.verificationDocuments.push(document);
      console.log('Added new document of type:', documentType);
    }

    await user.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        name: document.originalName,
        documentType: document.documentType,
        uploadedAt: document.uploadedAt,
        status: document.status
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Error uploading document' });
  }
});

// Get lawyer's documents
router.get('/lawyer', auth, async (req, res) => {
  try {
    console.log('Get lawyer documents request from user:', req.user?.email, 'role:', req.user?.role)
    
    if (req.user.role !== 'lawyer') {
      console.log('Non-lawyer user attempted to fetch lawyer documents:', req.user.role)
      return res.status(403).json({ message: 'Only lawyers can access this endpoint' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const documents = (user.verificationDocuments || []).map(doc => ({
      id: doc.id,
      name: doc.originalName,
      documentType: doc.documentType,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      url: `/api/documents/view/${doc.id}`
    }));

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// View/Download document
router.get('/view/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    let user;

    if (req.user.role === 'lawyer') {
      user = await User.findById(req.user.userId);
    } else if (req.user.role === 'admin') {
      // Admin can view any document, need to find which user owns it
      user = await User.findOne({ 
        'verificationDocuments.id': documentId 
      });
    } else {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const document = user.verificationDocuments?.find(doc => doc.id === documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if file exists
    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate content type with fallback
    let contentType = document.mimetype;
    if (!contentType) {
      // Fallback mimetype detection based on file extension
      const ext = path.extname(document.originalName || document.filename || '').toLowerCase();
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        default:
          contentType = 'application/octet-stream';
      }
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    
    // Send file
    res.sendFile(path.resolve(document.path));
  } catch (error) {
    console.error('View document error:', error);
    res.status(500).json({ message: 'Error viewing document' });
  }
});

// Delete document (for lawyers)
router.delete('/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    if (req.user.role !== 'lawyer') {
      return res.status(403).json({ message: 'Only lawyers can delete their documents' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const documentIndex = user.verificationDocuments?.findIndex(doc => doc.id === documentId);
    if (documentIndex === -1) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = user.verificationDocuments[documentIndex];

    // Delete file from filesystem
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Remove from database
    user.verificationDocuments.splice(documentIndex, 1);
    await user.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
});

// Admin routes
// Get all lawyers with documents for admin review
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const lawyers = await User.find({ 
      role: 'lawyer',
      verificationDocuments: { $exists: true, $ne: [] }
    }).select('name email verificationDocuments');

    const lawyersWithDocs = lawyers.map(lawyer => ({
      id: lawyer._id,
      name: lawyer.name,
      email: lawyer.email,
      documents: lawyer.verificationDocuments.map(doc => ({
        id: doc.id,
        name: doc.originalName,
        documentType: doc.documentType,
        uploadedAt: doc.uploadedAt,
        status: doc.status,
        url: `/api/documents/view/${doc.id}`
      }))
    }));

    res.json(lawyersWithDocs);
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Update document status (admin only)
router.patch('/admin/:documentId/status', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: pending, approved, or rejected' });
    }

    const user = await User.findOne({ 
      'verificationDocuments.id': documentId 
    });

    if (!user) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = user.verificationDocuments.find(doc => doc.id === documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.status = status;
    await user.save();

    res.json({ message: 'Document status updated successfully' });
  } catch (error) {
    console.error('Update document status error:', error);
    res.status(500).json({ message: 'Error updating document status' });
  }
});

module.exports = router;