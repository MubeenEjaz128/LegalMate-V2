const User = require('../models/User');
const UserBalance = require('../models/UserBalance');

/**
 * Creates the default admin user only when ADMIN_PASSWORD is explicitly configured.
 * Never hard-codes or logs production credentials.
 */
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'legalmate.services@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      role: 'admin',
      email: adminEmail
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);

      const adminBalance = await UserBalance.findOne({ user: existingAdmin._id });
      if (!adminBalance) {
        console.log('💰 Creating admin balance...');
        await UserBalance.create({
          user: existingAdmin._id,
          balancePkr: 10000000,
          totalDeposited: 10000000,
          totalWithdrawn: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Admin balance created');
      }
      return;
    }

    // If any admin exists, do not create another one automatically
    const anyAdmin = await User.findOne({ role: 'admin' });
    if (anyAdmin) {
      console.log('✅ An admin user already exists');
      const adminBalance = await UserBalance.findOne({ user: anyAdmin._id });
      if (!adminBalance) {
        console.log('💰 Creating admin balance...');
        await UserBalance.create({
          user: anyAdmin._id,
          balancePkr: 10000000,
          totalDeposited: 10000000,
          totalWithdrawn: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Admin balance created');
      }
      return;
    }

    if (!adminPassword) {
      console.warn('⚠️ ADMIN_PASSWORD is not configured. Skipping automatic admin creation.');
      return;
    }

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
      verificationStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await adminUser.save();

    console.log('💰 Creating admin balance...');
    await UserBalance.create({
      user: adminUser._id,
      balancePkr: 10000000,
      totalDeposited: 10000000,
      totalWithdrawn: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('🎯 Default admin user created successfully');
    console.log('⚠️ Change the admin password after first login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message || error);

    if (error.code === 11000) {
      console.log('ℹ️ Admin user may already exist');
      return;
    }

    console.log('⚠️ Server will continue running without automatic admin seeding');
  }
};

module.exports = seedAdmin;
