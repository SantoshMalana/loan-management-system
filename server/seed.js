/**
 * seed.js — Run ONCE to create the default admin account.
 * Usage: node server/seed.js
 * The admin can then create Bank Manager accounts from the dashboard.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@2026';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@bharatloan.in';
const ADMIN_FULLNAME = process.env.SEED_ADMIN_FULLNAME || 'System Administrator';

// Charset without ambiguous characters (0, O, I, l, 1)
const generateSecretCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await User.findOne({ username: ADMIN_USERNAME }).select('+staffSecretCode');
        if (existing) {
            console.log(`⚠️  Admin account "${ADMIN_USERNAME}" already exists. Skipping seed.`);
            console.log('   To reset, delete the admin user from MongoDB and re-run.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

        // Generate a permanent secret code for admin
        const secretCode = generateSecretCode();
        const hashedSecretCode = await bcrypt.hash(secretCode, 12);

        const admin = new User({
            username: ADMIN_USERNAME,
            password: hashedPassword,
            email: ADMIN_EMAIL,
            fullName: ADMIN_FULLNAME,
            role: 'admin',
            phone: '0000000000',
            staffSecretCode: hashedSecretCode,
        });

        await admin.save();

        console.log('');
        console.log('🎉 Admin account created successfully!');
        console.log('────────────────────────────────────────');
        console.log('   Username    :', ADMIN_USERNAME);
        console.log('   Password    :', ADMIN_PASSWORD);
        console.log('   Email       :', ADMIN_EMAIL);
        console.log('   Secret Code :', secretCode);
        console.log('────────────────────────────────────────');
        console.log('');
        console.log('⚠️  IMPORTANT: Save the SECRET CODE above — you need it at every admin login!');
        console.log('');
        console.log('👉  Login at /admin-login  →  Enter credentials → OTP (emailed) + Secret Code');
        console.log('👉  From admin dashboard → Users tab → "Add Bank Manager" to create BM accounts');
        console.log('');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
})();
