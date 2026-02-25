const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedBM() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/loan-management-system');
        console.log('Connected to MongoDB');

        const bmUsername = 'bm_sbi';
        const existing = await User.findOne({ username: bmUsername });
        if (existing) {
            console.log('Test BM already exists:', bmUsername);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123', salt);
        const hashedSecretCode = await bcrypt.hash('ALPHA123', 12);

        const bm = new User({
            fullName: 'Test Branch Manager',
            username: bmUsername,
            email: 'bm_sbi@test.com',
            phone: '8888888888',
            password: hashedPassword,
            role: 'branch_manager',
            officerBank: 'SBI',
            staffSecretCode: hashedSecretCode
        });

        await bm.save();
        console.log('✅ Default Bank Manager created successfully.');
        console.log(`\nUsername: ${bmUsername}\nPassword: Password123\nSecret Code: ALPHA123`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding BM:', error);
        process.exit(1);
    }
}

seedBM();
