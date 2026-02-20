const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/authMiddleware');

const APPLICANT_ROLES = ['user', 'applicant'];
const OFFICER_ROLES = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];

// ─── Register ───
router.post('/register', async (req, res) => {
    try {
        const { role, adminSecret, officerBank, ...rest } = req.body;

        // Officers/admins need the admin secret
        if (OFFICER_ROLES.includes(role)) {
            if (adminSecret !== process.env.ADMIN_SECRET) {
                return res.status(403).json({ message: 'Invalid admin/officer secret key' });
            }
        }

        // Check duplicates
        const existing = await User.findOne({
            $or: [{ username: rest.username }, { email: rest.email }]
        });
        if (existing) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rest.password, salt);

        const newUser = new User({
            ...rest,
            password: hashedPassword,
            role: role || 'applicant',
            officerBank: OFFICER_ROLES.includes(role) ? (officerBank || null) : undefined,
        });

        const saved = await newUser.save();
        const { password, ...others } = saved._doc;
        res.status(201).json(others);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error during registration' });
    }
});

// ─── Login ───
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

        // Admin-only login enforcement
        if (req.body.adminOnly === true) {
            if (!['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(user.role)) {
                return res.status(403).json({ message: 'This login is for bank officers and admins only' });
            }
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Get current user ───
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Admin: Get all users ───
router.get('/users', verifyToken, async (req, res) => {
    try {
        const requester = await User.findById(req.user.id);
        if (!['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(requester?.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const users = await User.find({ role: { $in: ['user', 'applicant'] } }).select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Update profile ───
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { password, role, ...updates } = req.body;
        const updated = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select('-password');
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
