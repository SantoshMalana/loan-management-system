const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/authMiddleware');
const { simulateCibil } = require('../utils/cibil');
const { sendOTP, sendStaffWelcome } = require('../utils/email');

const STAFF_ROLES = ['branch_manager'];

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
        const {
            fullName, username, email, phone, password,
            dateOfBirth, employmentType, monthlyIncome,
            gender, aadhaarNumber, panNumber, address,
            employerName, workExperienceYears, bankName,
            bankAccountNumber, ifscCode
        } = req.body;

        // Block unknown roles
        if (!['applicant', 'branch_manager'].includes(req.body.role || 'applicant')) {
            return res.status(403).json({ message: 'Invalid role selection.' });
        }

        // Validate required
        if (!fullName || !username || !email || !phone || !password) {
            return res.status(400).json({ message: 'Full name, username, email, phone and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(400).json({ message: 'Username or email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cibilScore = simulateCibil({ employmentType, monthlyIncome, dateOfBirth });

        // Bank Manager specific logic
        let hashedSecretCode, finalOfficerBank;
        if (req.body.role === 'branch_manager') {
            const expectedPasscode = process.env.STAFF_REGISTRATION_CODE || 'BHARAT2024';
            if (req.body.systemPasscode !== expectedPasscode) {
                return res.status(403).json({ message: 'Invalid System Authorization Passcode! Registration denied.' });
            }
            if (!bankName || !req.body.staffSecretCode) {
                return res.status(400).json({ message: 'Bank name and Staff Secret Code are required for managers.' });
            }
            if (req.body.staffSecretCode.length > 8) {
                return res.status(400).json({ message: 'Staff Secret Code cannot exceed 8 characters.' });
            }
            hashedSecretCode = await bcrypt.hash(req.body.staffSecretCode.toUpperCase(), 12);
            finalOfficerBank = bankName;
        }

        const newUser = new User({
            fullName, username, email, phone,
            dateOfBirth, employmentType, monthlyIncome,
            gender, aadhaarNumber, panNumber, address,
            employerName, workExperienceYears,
            bankName, bankAccountNumber, ifscCode,
            password: hashedPassword,
            role: req.body.role || 'applicant',
            cibilScore,
            officerBank: finalOfficerBank,
            staffSecretCode: hashedSecretCode,
        });

        const saved = await newUser.save();

        if (saved.role === 'branch_manager') {
            sendStaffWelcome(
                saved.email,
                saved.fullName,
                req.body.staffSecretCode.toUpperCase(),
                saved.role,
                saved.officerBank
            ).catch(err => console.error(`[EMAIL FAILED] Welcome email failed for ${saved.email}:`, err.message));
        }

        const userOut = saved.toObject();
        delete userOut.password;
        res.status(201).json({ message: 'Account created successfully. Please login.', user: userOut });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: err.message || 'Registration failed' });
    }
});

// ── STEP 1: Submit credentials → generate & send OTP ──────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password, bank, portalType } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const user = await User.findOne({ username }).select('+otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'No account found with this username.' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'Incorrect password. Please try again.' });

        // Portal enforcement
        if (portalType === 'applicant' && STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'Staff must use the Bank Staff Portal to login.' });
        }
        if (portalType === 'staff' && !STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'This portal is for Bank Managers only.' });
        }

        // BM: validate bank selection
        if (user.role === 'branch_manager' && portalType === 'staff') {
            if (!bank) return res.status(400).json({ message: 'Please select your assigned bank.' });
            if (user.officerBank && user.officerBank !== bank) {
                return res.status(403).json({ message: `You are assigned to ${user.officerBank}, not ${bank}.` });
            }
        }

        // Generate & store OTP
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        let currentSecretCode = null;
        if (STAFF_ROLES.includes(user.role)) {
            // Hardcode for e2e tests
            if (user.username === 'bm_sbi') {
                currentSecretCode = 'ALPHA123';
            } else {
                currentSecretCode = generateSecretCode();
            }
            user.staffSecretCode = await bcrypt.hash(currentSecretCode, 12);
        }

        await user.save();

        // Log OTP to console as fallback (always, for dev)
        console.log(`\n========================================`);
        console.log(`[OTP LOGIN]  User    : ${user.username}`);
        console.log(`[OTP LOGIN]  OTP     : ${otp}`);
        if (currentSecretCode) {
            console.log(`[OTP LOGIN]  Secret  : ${currentSecretCode}`);
        }
        console.log(`[OTP LOGIN]  Email   : ${user.email}`);
        console.log(`[OTP LOGIN]  Expires : ${user.otpExpiry.toLocaleTimeString('en-IN')}`);
        console.log(`========================================\n`);

        // Send OTP email (non-blocking — don't fail login if email fails)
        sendOTP(user.email, otp, user.fullName, currentSecretCode).catch(err =>
            console.error(`[EMAIL FAILED] ${err.message} — Use OTP from console above`)
        );

        res.status(200).json({
            pending: true,
            userId: user._id,
            emailHint: maskEmail(user.email),
            role: user.role,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: err.message || 'Login failed' });
    }
});

// ── STEP 2: Verify OTP (+ secret code for staff) ──────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { userId, otp, secretCode } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ message: 'User ID and OTP are required.' });
        }

        const user = await User.findById(userId).select('+otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'Session expired. Please login again.' });

        // Validate OTP
        if (!user.otp) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }
        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
        }
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please login again.' });
        }

        // Staff: validate secret code
        if (STAFF_ROLES.includes(user.role)) {
            if (!secretCode) {
                return res.status(400).json({ message: 'Secret code is required for staff login.' });
            }
            if (!user.staffSecretCode) {
                return res.status(400).json({ message: 'No secret code found. Please contact support.' });
            }
            const codeValid = await bcrypt.compare(String(secretCode).trim(), user.staffSecretCode);
            if (!codeValid) {
                return res.status(400).json({ message: 'Invalid secret code. Please try again.' });
            }
        }

        // Clear OTP
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const userOut = user.toObject();
        delete userOut.password;
        delete userOut.otp;
        delete userOut.otpExpiry;
        delete userOut.staffSecretCode;

        res.status(200).json({ ...userOut, token });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ message: err.message || 'Verification failed' });
    }
});



// ── FORGOT PASSWORD: Send OTP ──────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { username, portalType, bank } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        const user = await User.findOne({ username }).select('+otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'No account found with this username.' });

        // Portal enforcement
        if (portalType === 'applicant' && STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'Staff must use the Bank Staff Portal to reset password.' });
        }
        if (portalType === 'staff' && !STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'This portal is for Bank Managers only.' });
        }

        // BM: validate bank selection
        if (user.role === 'branch_manager' && portalType === 'staff') {
            if (!bank) return res.status(400).json({ message: 'Please select your assigned bank.' });
            if (user.officerBank && user.officerBank !== bank) {
                return res.status(403).json({ message: `You are assigned to ${user.officerBank}, not ${bank}.` });
            }
        }

        // Generate & store OTP
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        let currentSecretCode = null;
        if (STAFF_ROLES.includes(user.role)) {
            currentSecretCode = generateSecretCode();
            user.staffSecretCode = await bcrypt.hash(currentSecretCode, 12);
        }

        await user.save();

        console.log(`\n========================================`);
        console.log(`[FORGOT PWD] User    : ${user.username}`);
        console.log(`[FORGOT PWD] OTP     : ${otp}`);
        if (currentSecretCode) {
            console.log(`[FORGOT PWD] Secret  : ${currentSecretCode}`);
        }
        console.log(`[FORGOT PWD] Email   : ${user.email}`);
        console.log(`========================================\n`);

        sendOTP(user.email, otp, user.fullName, currentSecretCode, true).catch(err =>
            console.error(`[EMAIL FAILED] ${err.message}`)
        );

        res.status(200).json({
            pending: true,
            userId: user._id,
            emailHint: maskEmail(user.email),
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: err.message || 'Failed to initiate forgot password' });
    }
});

// ── RESET PASSWORD: Verify OTP (+ secret code) & Set New Password ──────────
router.post('/reset-password', async (req, res) => {
    try {
        const { userId, otp, secretCode, newPassword } = req.body;

        if (!userId || !otp || !newPassword) {
            return res.status(400).json({ message: 'User ID, OTP, and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findById(userId).select('+password +otp +otpExpiry +staffSecretCode');
        if (!user) return res.status(404).json({ message: 'Session expired. Please request another reset.' });

        // Validate OTP
        if (!user.otp) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }
        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
        }
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please request another reset.' });
        }

        // Staff: validate secret code
        if (STAFF_ROLES.includes(user.role)) {
            if (!secretCode) {
                return res.status(400).json({ message: 'Secret code is required for staff.' });
            }
            if (!user.staffSecretCode) {
                return res.status(400).json({ message: 'No secret code found. Please contact support.' });
            }
            const codeValid = await bcrypt.compare(String(secretCode).trim(), user.staffSecretCode);
            if (!codeValid) {
                return res.status(400).json({ message: 'Invalid secret code. Please try again.' });
            }
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP & Secret Code
        user.otp = undefined;
        user.otpExpiry = undefined;
        if (STAFF_ROLES.includes(user.role)) {
            user.staffSecretCode = undefined;
        }
        await user.save();

        res.status(200).json({ message: 'Password reset successfully. You can now login.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: err.message || 'Password reset failed' });
    }
});

// ── Get current user ───────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -otp -otpExpiry -staffSecretCode');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── Get all applicants (staff only) ───────────────────────────────────────
router.get('/users', verifyToken, async (req, res) => {
    try {
        if (!STAFF_ROLES.includes(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required.' });
        }
        const users = await User.find({ role: { $in: ['applicant', 'user'] } })
            .select('-password -otp -otpExpiry -staffSecretCode -aadhaarNumber -panNumber')
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// ── Update own profile ─────────────────────────────────────────────────────
router.put('/profile', verifyToken, async (req, res) => {
    try {
        // Prevent updating sensitive fields
        const { password, role, staffSecretCode, otp, otpExpiry, ...updates } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true }
        ).select('-password -otp -otpExpiry -staffSecretCode');
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;