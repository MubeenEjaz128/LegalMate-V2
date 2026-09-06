const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Feedback = require('../models/Feedback');

// Level mapping: 0=Fresher, 1=Junior, 2=Intermediate, 3=Senior
const LEVEL_LABELS = { 0: 'Fresher', 1: 'Junior', 2: 'Intermediate', 3: 'Senior' };

/**
 * GET /api/public/stats
 * Returns real-time platform statistics for the home page.
 * No authentication required — data is aggregated & safe to expose.
 */
router.get('/stats', async (req, res) => {
  try {
    // Run all queries in parallel for speed
    const [
      totalLawyers,
      totalClients,
      lawyersByLevel,
      completedAppointments,
      totalAppointments,
      feedbackAgg,
      topReviews,
      topLawyers,
      specializations,
    ] = await Promise.all([
      // 1. Total verified & active lawyers
      User.countDocuments({ role: 'lawyer', verificationStatus: 'approved', isActive: true }),

      // 2. Total clients
      User.countDocuments({ role: 'client', isActive: true }),

      // 3. Lawyers grouped by level (senior/intermediate/junior/fresher)
      User.aggregate([
        { $match: { role: 'lawyer', verificationStatus: 'approved', isActive: true } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),

      // 4. Successful (completed) appointments
      Appointment.countDocuments({ status: 'completed' }),

      // 5. Total appointments (all time)
      Appointment.countDocuments({}),

      // 6. Average rating & total reviews
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            fiveStarCount: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            fourPlusCount: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
          },
        },
      ]),

      // 7. Top reviews (latest 5-star and 4-star reviews with client name)
      Feedback.find({ rating: { $gte: 4 } })
        .sort({ rating: -1, createdAt: -1 })
        .limit(6)
        .populate('client', 'name role')
        .populate('lawyer', 'name specialization profilePicture')
        .lean(),

      // 8. Top rated lawyers (for hero showcase)
      User.find({
        role: 'lawyer',
        verificationStatus: 'approved',
        isActive: true,
        reviewCount: { $gt: 0 },
      })
        .sort({ averageRating: -1, reviewCount: -1 })
        .limit(3)
        .select('name specialization averageRating hourlyRate isAvailable profilePicture level')
        .lean(),

      // 9. Distinct specializations
      User.distinct('specialization', { role: 'lawyer', verificationStatus: 'approved', isActive: true }),
    ]);

    // Format lawyer levels
    const lawyerLevels = {};
    for (const key of [0, 1, 2, 3]) {
      const found = lawyersByLevel.find((l) => l._id === key);
      lawyerLevels[LEVEL_LABELS[key]] = found ? found.count : 0;
    }

    // Extract feedback aggregation
    const fbAgg = feedbackAgg[0] || { averageRating: 0, totalReviews: 0, fiveStarCount: 0, fourPlusCount: 0 };

    // Client satisfaction = % of 4+ star reviews
    const clientSatisfaction =
      fbAgg.totalReviews > 0
        ? Math.round((fbAgg.fourPlusCount / fbAgg.totalReviews) * 100)
        : 0;

    // Format top reviews for frontend
    const formattedReviews = topReviews.map((r) => ({
      id: r._id,
      clientName: r.client?.name || 'Anonymous',
      clientRole: r.client?.role || 'client',
      lawyerName: r.lawyer?.name || 'Unknown',
      lawyerSpecialization: r.lawyer?.specialization || '',
      rating: r.rating,
      comment: r.comment || '',
      date: r.createdAt,
    }));

    // Format top lawyers for hero showcase
    const formattedTopLawyers = topLawyers.map((l) => ({
      name: l.name,
      specialization: l.specialization,
      rating: l.averageRating?.toFixed(1) || '0.0',
      fee: `₨ ${l.hourlyRate?.toLocaleString() || '0'}`,
      available: l.isAvailable,
      level: LEVEL_LABELS[l.level] || 'Fresher',
      profilePicture: l.profilePicture,
    }));

    res.json({
      success: true,
      data: {
        totalLawyers,
        totalClients,
        lawyerLevels,
        completedAppointments,
        totalAppointments,
        averageRating: fbAgg.averageRating ? parseFloat(fbAgg.averageRating.toFixed(1)) : 0,
        totalReviews: fbAgg.totalReviews,
        clientSatisfaction,
        topReviews: formattedReviews,
        topLawyers: formattedTopLawyers,
        specializations: specializations.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('❌ Public stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load platform statistics' });
  }
});

module.exports = router;
