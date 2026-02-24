const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { simulateCibil } = require('../utils/cibil');
const { sendOTP, sendStaffWelcome } = require('../utils/email');

const STAFF_ROLES = ['branch_manager', 'admin'];

// ── Helpers ────────────────────────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateSecretCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const maskEmail = (email) => {
    const [local, domain] = email.split('@');
    return local.slice(0, 2) + '***@' + domain;
};

// ── PUBLIC: Applicant self-registration ────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { fullName, username, email, phone, password, dateOfBirth, employmentType, monthlyIncome, ...rest } = req.body;

        if (STAFF_ROLES.includes(req.body.role)) {
            return res.status(403).json({ message: 'Staff accounts can only be created by an administrator.' });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username or email already exists' });

        if (!fullName || !username || !email || !phone || !password) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }
        if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cibilScore = simulateCibil({ employmentType, monthlyIncome, dateOfBirth });

        const newUser = new User({
            fullName, username, email, phone, dateOfBirth, employmentType, monthlyIncome, ...rest,
            password: hashedPassword, role: 'applicant', cibilScore,
        });
        const saved = await newUser.save();
        const userOut = saved.toObject();
        delete userOut.password;
        res.status(201).json(userOut);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Registration failed' });
    }
});

// ── STEP 1: Submit credentials → generate & send OTP ──────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password, bank, portalType } = req.body;

        const user = await User.findOne({ username }).select('+otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'Account not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'Incorrect password' });

        // Portal enforcement
        if (portalType === 'applicant' && STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'Staff accounts must use the Bank Staff Portal.' });
        }
        if (portalType === 'admin' && user.role !== 'admin') {
            return res.status(403).json({ message: 'This portal is for Administrators only.' });
        }
        if (portalType === 'bm' && user.role !== 'branch_manager') {
            return res.status(403).json({ message: 'This portal is for Bank Managers only.' });
        }

        // BM: validate bank selection
        if (user.role === 'branch_manager') {
            if (!bank) return res.status(400).json({ message: 'Please select your bank to continue.' });
            if (user.officerBank && user.officerBank !== bank) {
                return res.status(403).json({ message: `You are assigned to ${user.officerBank}, not ${bank}.` });
            }
        }

        // Generate OTP and store with expiry
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();

        // Always log OTP to server console (dev fallback if email fails)
        console.log(`[OTP] User: ${user.username} | OTP: ${otp} | Expires: ${user.otpExpiry.toLocaleTimeString('en-IN')}`);

        // Send OTP email (non-blocking)
        sendOTP(user.email, otp, user.fullName).catch(err =>
            console.error('OTP email failed:', err.message)
        );

        res.status(200).json({
            pending: true,
            userId: user._id,
            emailHint: maskEmail(user.email),
            role: user.role,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── STEP 2: Verify OTP (+ secret code for staff) ──────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { userId, otp, secretCode } = req.body;
        if (!userId || !otp) return res.status(400).json({ message: 'OTP and user ID are required' });

        const user = await User.findById(userId).select('+otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'Session expired. Please login again.' });

        // Validate OTP
        if (!user.otp || user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please login again.' });
        }

        // Staff: validate secret code
        if (STAFF_ROLES.includes(user.role)) {
            if (!secretCode) return res.status(400).json({ message: 'Secret code is required for staff login.' });
            if (!user.staffSecretCode) {
                return res.status(400).json({ message: 'No secret code on file. Please contact admin.' });
            }
            const codeValid = await bcrypt.compare(String(secretCode).trim(), user.staffSecretCode);
            if (!codeValid) return res.status(400).json({ message: 'Invalid secret code.' });
        }

        // Clear OTP
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        // Build clean response without sensitive fields
        const userOut = user.toObject();
        delete userOut.password;
        delete userOut.otp;
        delete userOut.otpExpiry;
        delete userOut.staffSecretCode;
        res.status(200).json({ ...userOut, token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── ADMIN ONLY: Create a Bank Manager account ──────────────────────────────
router.post('/create-officer', verifyAdmin, async (req, res) => {
    try {
        const { fullName, username, email, phone, password, officerBank, employeeId } = req.body;
        const role = 'branch_manager'; // Only BMs can be created via this endpoint

        if (!fullName || !username || !email || !phone || !password || !officerBank) {
            return res.status(400).json({ message: 'All fields including bank assignment are required' });
        }
        if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username or email already exists' });

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate permanent secret code for this staff member
        const secretCode = generateSecretCode();
        const hashedSecretCode = await bcrypt.hash(secretCode, 12);

        const newOfficer = new User({
            fullName, username, email, phone,
            password: hashedPassword, role,
            officerBank, employeeId: employeeId || null,
            staffSecretCode: hashedSecretCode,
        });
        const saved = await newOfficer.save();

        // Email the secret code to the new BM
        sendStaffWelcome(email, fullName, secretCode, role, officerBank).catch(err =>
            console.error('Welcome email failed:', err.message)
        );

        // Always log to console as fallback
        console.log(`[NEW BM] ${fullName} (${officerBank}) | SecretCode: ${secretCode}`);

        const bmOut = saved.toObject();
        delete bmOut.password;
        delete bmOut.staffSecretCode;
        // Return secretCode once (for admin to note, in case email fails)
        res.status(201).json({ ...bmOut, secretCodePreview: secretCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Failed to create Bank Manager account' });
    }
});

// ── Get current user ───────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -otp -otpExpiry -staffSecretCode');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get all applicants (staff only) ───────────────────────────────────────
router.get('/users', verifyToken, async (req, res) => {
    try {
        if (!STAFF_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const users = await User.find({ role: { $in: ['applicant', 'user'] } })
            .select('-password -otp -otpExpiry -staffSecretCode')
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: Get all staff ───────────────────────────────────────────────────
router.get('/staff', verifyAdmin, async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: STAFF_ROLES } })
            .select('-password -otp -otpExpiry -staffSecretCode')
            .sort({ createdAt: -1 });
        res.status(200).json(staff);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Update own profile ─────────────────────────────────────────────────────
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { password, role, staffSecretCode, otp, otpExpiry, ...updates } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.user.id, { $set: updates }, { new: true }
        ).select('-password -otp -otpExpiry -staffSecretCode');
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: Delete staff member ─────────────────────────────────────────────
router.delete('/staff/:id', verifyAdmin, async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).json({ message: 'Staff member not found' });
        if (target._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Staff account removed' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
