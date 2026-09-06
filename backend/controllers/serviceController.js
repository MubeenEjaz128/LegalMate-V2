const Service = require('../models/Service');
const SystemSettings = require('../models/SystemSettings');

/**
 * Get all active services (public)
 */
const getServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-__v');

    // Read global CTA link from System Settings (public consumption)
    let ctaUrl = '/search'; // default to Find Lawyer page
    try {
      const setting = await SystemSettings.findOne({ key: 'servicesGetStartedUrl' });
      if (setting && typeof setting.value === 'string' && setting.value.trim()) {
        ctaUrl = setting.value.trim();
      }
    } catch (e) {
      // Non-fatal; keep default
    }

    return res.status(200).json({
      success: true,
      services,
      ctaUrl
    });
  } catch (error) {
    console.error('Get services error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching services' 
    });
  }
};

/**
 * Get all services (admin)
 */
const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const services = await Service.find()
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments();

    return res.status(200).json({
      success: true,
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all services error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching services' 
    });
  }
};

/**
 * Get single service
 */
const getService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id)
      .populate('createdBy', 'name email');

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    return res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching service' 
    });
  }
};

/**
 * Create service (admin)
 */
const createService = async (req, res) => {
  try {
    const { title, description, icon, features, order } = req.body;

    const service = await Service.create({
      title,
      description,
      icon: icon || 'gavel',
      features: features || [],
      order: order || 0,
      createdBy: req.user.userId
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error creating service' 
    });
  }
};

/**
 * Update service (admin)
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating service' 
    });
  }
};

/**
 * Delete service (admin)
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ 
        success: false,
        message: 'Service not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error deleting service' 
    });
  }
};

module.exports = {
  getServices,
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService
};
