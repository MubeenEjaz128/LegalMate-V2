const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Feedback = require('../models/Feedback');

/**
 * Calculate lawyer level based on consultations and rating
 * @param {number} consultationCount 
 * @param {number} averageRating 
 * @returns {number} Level (0-3)
 */
const calculateLevel = (consultationCount, averageRating) => {
    if (consultationCount > 30 && averageRating >= 4.5) return 3; // Senior Lawyer
    if (consultationCount > 20 && averageRating >= 4.0) return 2; // Intermediate Lawyer
    if (consultationCount > 10 && averageRating >= 3.5) return 1; // Junior Lawyer
    return 0; // New Lawyer
};

/**
 * Update lawyer stats (consultation count, rating, level)
 * @param {string} lawyerId 
 */
const updateLawyerStats = async (lawyerId) => {
    try {
        // 1. Count completed consultations
        const consultationCount = await Appointment.countDocuments({
            lawyer: lawyerId,
            status: 'completed'
        });

        // 2. Calculate average rating
        const feedBackStats = await Feedback.aggregate([
            { $match: { lawyer: new mongoose.Types.ObjectId(lawyerId) } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const averageRating = feedBackStats.length > 0 ? feedBackStats[0].avgRating : 0;
        const reviewCount = feedBackStats.length > 0 ? feedBackStats[0].count : 0;

        // 3. Calculate new level
        const newLevel = calculateLevel(consultationCount, averageRating);

        // 4. Update User model
        await User.findByIdAndUpdate(lawyerId, {
            consultationCount,
            averageRating: parseFloat(averageRating.toFixed(2)),
            reviewCount,
            level: newLevel
        });

        console.log(`Updated stats for lawyer ${lawyerId}: Level ${newLevel}, Consultations ${consultationCount}, Rating ${averageRating}`);

        return { level: newLevel, consultationCount, averageRating };

    } catch (error) {
        console.error(`Error updating lawyer stats for ${lawyerId}:`, error);
        throw error;
    }
};

module.exports = {
    calculateLevel,
    updateLawyerStats
};
