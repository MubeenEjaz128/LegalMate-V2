const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/legalmate';

// Import all models
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Feedback = require('./models/Feedback');
const Conversation = require('./models/Conversation');
const ChatMessage = require('./models/ChatMessage');
const ChatSession = require('./models/ChatSession');
const AIChat = require('./models/AIChat');
const Blog = require('./models/Blog');
const FAQ = require('./models/FAQ');
const Service = require('./models/Service');
const Page = require('./models/Page');
const ContactMessage = require('./models/ContactMessage');
const Transaction = require('./models/Transaction');
const WalletTransaction = require('./models/WalletTransaction');
const WithdrawRequest = require('./models/WithdrawRequest');
const BuyBalanceRequest = require('./models/BuyBalanceRequest');
const CreditPurchase = require('./models/CreditPurchase');
const UserBalance = require('./models/UserBalance');
const PaymentMethod = require('./models/PaymentMethod');
const PayoutPolicy = require('./models/PayoutPolicy');
const LawyerPayoutProfile = require('./models/LawyerPayoutProfile');
const SystemSettings = require('./models/SystemSettings');
const AuditLog = require('./models/AuditLog');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

const resetDatabase = async () => {
    try {
        console.log('\n⚠️  WARNING: This will delete ALL data from the database!');
        console.log(`Database: ${MONGODB_URI}\n`);

        const answer = await askQuestion('Are you sure you want to reset the database? (yes/no): ');

        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Database reset cancelled.');
            rl.close();
            process.exit(0);
        }

        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n🗑️  Deleting all collections...');

        // Delete all documents from each collection
        await User.deleteMany({});
        console.log('  ✓ Users deleted');

        await Appointment.deleteMany({});
        console.log('  ✓ Appointments deleted');

        await Feedback.deleteMany({});
        console.log('  ✓ Feedback deleted');

        await Conversation.deleteMany({});
        console.log('  ✓ Conversations deleted');

        await ChatMessage.deleteMany({});
        console.log('  ✓ Chat Messages deleted');

        await ChatSession.deleteMany({});
        console.log('  ✓ Chat Sessions deleted');

        await AIChat.deleteMany({});
        console.log('  ✓ AI Chats deleted');

        await Blog.deleteMany({});
        console.log('  ✓ Blogs deleted');

        await FAQ.deleteMany({});
        console.log('  ✓ FAQs deleted');

        await Service.deleteMany({});
        console.log('  ✓ Services deleted');

        await Page.deleteMany({});
        console.log('  ✓ Pages deleted');

        await ContactMessage.deleteMany({});
        console.log('  ✓ Contact Messages deleted');

        await Transaction.deleteMany({});
        console.log('  ✓ Transactions deleted');

        await WalletTransaction.deleteMany({});
        console.log('  ✓ Wallet Transactions deleted');

        await WithdrawRequest.deleteMany({});
        console.log('  ✓ Withdraw Requests deleted');

        await BuyBalanceRequest.deleteMany({});
        console.log('  ✓ Buy Balance Requests deleted');

        await CreditPurchase.deleteMany({});
        console.log('  ✓ Credit Purchases deleted');

        await UserBalance.deleteMany({});
        console.log('  ✓ User Balances deleted');

        await PaymentMethod.deleteMany({});
        console.log('  ✓ Payment Methods deleted');

        await PayoutPolicy.deleteMany({});
        console.log('  ✓ Payout Policies deleted');

        await LawyerPayoutProfile.deleteMany({});
        console.log('  ✓ Lawyer Payout Profiles deleted');

        await SystemSettings.deleteMany({});
        console.log('  ✓ System Settings deleted');

        await AuditLog.deleteMany({});
        console.log('  ✓ Audit Logs deleted');

        console.log('\n✅ Database reset successfully!');
        console.log('\n💡 To seed the database with sample data, run:');
        console.log('   node seedData.js\n');

        rl.close();
        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error resetting database:', error);
        rl.close();
        process.exit(1);
    }
};

resetDatabase();
