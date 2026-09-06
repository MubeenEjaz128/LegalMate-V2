const FAQ = require('../models/FAQ');

/**
 * Get active FAQs (public)
 */
const getFAQs = async (req, res) => {
  try {
    const { category } = req.query;

    const query = { isActive: true };
    if (category && category !== 'all') {
      query.category = category;
    }

    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select('-__v');

    return res.status(200).json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('Get FAQs error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching FAQs' 
    });
  }
};

/**
 * Get all FAQs (admin)
 */
const getAllFAQs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const faqs = await FAQ.find()
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FAQ.countDocuments();

    return res.status(200).json({
      success: true,
      faqs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all FAQs error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching FAQs' 
    });
  }
};

/**
 * Create FAQ (admin)
 */
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;

    const faq = await FAQ.create({
      question,
      answer,
      category: category || 'General',
      order: order || 0,
      createdBy: req.user.userId
    });

    return res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      faq
    });
  } catch (error) {
    console.error('Create FAQ error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error creating FAQ' 
    });
  }
};

/**
 * Update FAQ (admin)
 */
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({ 
        success: false,
        message: 'FAQ not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      faq
    });
  } catch (error) {
    console.error('Update FAQ error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating FAQ' 
    });
  }
};

/**
 * Delete FAQ (admin)
 */
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({ 
        success: false,
        message: 'FAQ not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting FAQ' 
    });
  }
};

module.exports = {
  getFAQs,
  getAllFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ
};
