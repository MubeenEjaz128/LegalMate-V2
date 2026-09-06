const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function resetAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legalmate');
    console.log('✅ Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@legalmate.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMeInProduction123!';

    // Delete existing admin user
    const deleteResult = await User.deleteOne({ email: adminEmail });
    console.log('🗑️  Deleted existing admin user:', deleteResult.deletedCount);

    // Create new admin user (password will be hashed by the model)
    const adminUser = new User({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      phone: '+92-300-0000000',
      address: 'LegalMate Admin Office, Pakistan',
      role: 'admin',
      adminLevel: 'super',
      isActive: true,
      isVerified: true,
      verificationStatus: 'approved'
    });

    await adminUser.save();
    console.log('🎯 New admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
    process.exit(1);
  }
}

resetAdmin();