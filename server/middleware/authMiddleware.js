const jwt = require('jsonwebtoken');
const User = require('../models/User');

// verifyToken: validates JWT and always attaches fresh user data from DB.
// This makes it backward-compatible with old tokens that don't have a 'role' field.
const verifyToken = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Access denied: no token provided' });

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Access denied: empty token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Always fetch fresh from DB so role/officerBank changes take effect immediately
        // and so backward-compat with old tokens that lack the role field
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ error: 'User no longer exists. Please log in again.' });

        req.user = {
            id: user._id.toString(),
            role: user.role,
            officerBank: user.officerBank,
            fullName: user.fullName,
            username: user.username,
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token expired or invalid. Please log in again.' });
    }
};

const verifyAdmin = async (req, res, next) => {
    await verifyToken(req, res, async () => {
        if (req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Admin access required' });
        }
    });
};

const verifyOfficer = async (req, res, next) => {
    await verifyToken(req, res, async () => {
        const officerRoles = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];
        if (officerRoles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Officer access required' });
        }
    });
};

const verifyBranchManager = async (req, res, next) => {
    await verifyToken(req, res, async () => {
        const roles = ['branch_manager', 'general_manager', 'admin'];
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Branch Manager access required' });
        }
    });
};

const verifyGM = async (req, res, next) => {
    await verifyToken(req, res, async () => {
        const roles = ['general_manager', 'admin'];
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'General Manager access required' });
        }
    });
};

module.exports = { verifyToken, verifyAdmin, verifyOfficer, verifyBranchManager, verifyGM };
