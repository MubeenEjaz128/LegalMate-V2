const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserBalance = require('../models/UserBalance');

/**
 * Creates default admin user if no admin exists
 * Admin credentials: legalmate.services@gmail.com / 123456
 */
const seedAdmin = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      role: 'admin',
      email: 'legalmate.services@gmail.com' 
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      
      // Check if admin has balance, if not create it
      const adminBalance = await UserBalance.findOne({ user: existingAdmin._id });
      if (!adminBalance) {
        console.log('💰 Creating admin balance...');
        await UserBalance.create({
          user: existingAdmin._id,
          balancePkr: 10000000, // 10 million PKR
          totalDeposited: 10000000,
          totalWithdrawn: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Admin balance created: 10,000,000 PKR');
      } else {
        console.log('✅ Admin balance already exists:', adminBalance.balancePkr, 'PKR');
      }
      return;
    }

    // Check if any admin exists
    const anyAdmin = await User.findOne({ role: 'admin' });
    if (anyAdmin) {
      console.log('✅ Admin user already exists with different email:', anyAdmin.email);
      
      // Check if admin has balance, if not create it
      const adminBalance = await UserBalance.findOne({ user: anyAdmin._id });
      if (!adminBalance) {
        console.log('💰 Creating admin balance...');
        await UserBalance.create({
          user: anyAdmin._id,
          balancePkr: 10000000, // 10 million PKR
          totalDeposited: 10000000,
          totalWithdrawn: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Admin balance created: 10,000,000 PKR');
      } else {
        console.log('✅ Admin balance already exists:', adminBalance.balancePkr, 'PKR');
      }
      return;
    }

    // Create default admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'legalmate.services@gmail.com',
      password: 'Legal@12', // Let the User model hash this in pre-save middleware
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
    
    // Create admin balance
    console.log('💰 Creating admin balance...');
    await UserBalance.create({
      user: adminUser._id,
      balancePkr: 10000000, // 10 million PKR
      totalDeposited: 10000000,
      totalWithdrawn: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('🎯 Default admin user created successfully!');
    console.log('📧 Email: legalmate.services@gmail.com');
    console.log('🔑 Password: Legal@12');
    console.log('💰 Initial Balance: 10,000,000 PKR');
    console.log('⚠️  Please change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    // If it's a duplicate key error, admin might exist with different case
    if (error.code === 11000) {
      console.log('ℹ️  Admin user might already exist with different email case');
      return;
    }
    
    // Don't crash the server for admin seeding errors
    console.log('⚠️  Server will continue running without default admin');
  }
};

module.exports = seedAdmin;