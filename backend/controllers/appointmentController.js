const Appointment = require('../models/Appointment');

/**
 * Get all appointments with pagination and filters
 */
const getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lawyerId, clientId, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Lawyer filter
    if (lawyerId) {
      query.lawyer = lawyerId;
    }

    // Client filter
    if (clientId) {
      query.client = clientId;
    }

    const appointments = await Appointment.find(query)
      .populate('lawyer', 'name email specialization')
      .populate('client', 'name email')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    // Filter by search if provided
    let filteredAppointments = appointments;
    if (search) {
      filteredAppointments = appointments.filter(apt =>
        apt.lawyer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        apt.client?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return res.status(200).json({
      appointments: filteredAppointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    return res.status(500).json({ message: 'Error fetching appointments' });
  }
};

/**
 * Update appointment status
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    if (adminNote) {
      appointment.adminNote = adminNote;
    }

    await appointment.save();

    // If status is completed, update lawyer stats
    if (status === 'completed') {
      const { updateLawyerStats } = require('../services/lawyerLevelService');
      await updateLawyerStats(appointment.lawyer);
    }

    return res.status(200).json({
      message: 'Appointment status updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    return res.status(500).json({ message: 'Error updating appointment status' });
  }
};

/**
 * Delete appointment
 */
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Soft delete
    appointment.isDeleted = true;
    appointment.deletedAt = new Date();
    appointment.deletionReason = reason;
    await appointment.save();

    return res.status(200).json({
      message: 'Appointment deleted successfully',
      appointment
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return res.status(500).json({ message: 'Error deleting appointment' });
  }
};

module.exports = {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment
};
