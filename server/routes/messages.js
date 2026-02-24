const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

const APPLICANT_ROLES = ['user', 'applicant'];

// Send a message (admin/officer → applicant or vice versa)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { receiverId, loanId, message, type } = req.body;
        if (!receiverId || !message) return res.status(400).json({ message: 'receiver and message are required' });

        const sender = await User.findById(req.user.id);
        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

        const msg = new Message({
            sender: req.user.id,
            receiver: receiverId,
            loan: loanId || undefined,
            bankName: sender?.officerBank || receiver?.officerBank || undefined,
            message,
            type: type || 'general',
        });
        const saved = await msg.save();
        const populated = await Message.findById(saved._id)
            .populate('sender', 'fullName username role officerBank')
            .populate('receiver', 'fullName username role')
            .populate('loan', 'applicationNumber loanType amount');
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get conversation between current user and another user
router.get('/conversation/:userId', verifyToken, async (req, res) => {
    try {
        const msgs = await Message.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id }
            ]
        })
            .populate('sender', 'fullName username role officerBank')
            .populate('receiver', 'fullName username role')
            .populate('loan', 'applicationNumber loanType amount workflowStage')
            .sort({ createdAt: 1 });

        // Mark incoming messages as read
        await Message.updateMany(
            { sender: req.params.userId, receiver: req.user.id, read: false },
            { read: true, readAt: new Date() }
        );

        res.status(200).json(msgs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all conversations for current user (list of unique people they've messaged)
router.get('/inbox', verifyToken, async (req, res) => {
    try {
        // Get all messages involving this user
        const msgs = await Message.find({
            $or: [{ sender: req.user.id }, { receiver: req.user.id }]
        })
            .populate('sender', 'fullName username role officerBank')
            .populate('receiver', 'fullName username role officerBank')
            .sort({ createdAt: -1 });

        // Build unique conversations
        const seen = new Set();
        const conversations = [];
        for (const m of msgs) {
            const otherId = m.sender._id.toString() === req.user.id ? m.receiver._id.toString() : m.sender._id.toString();
            if (!seen.has(otherId)) {
                seen.add(otherId);
                const other = m.sender._id.toString() === req.user.id ? m.receiver : m.sender;
                const unread = await Message.countDocuments({ sender: otherId, receiver: req.user.id, read: false });
                conversations.push({ user: other, lastMessage: m, unreadCount: unread });
            }
        }
        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all applicants for admin/officer (so they can initiate a chat)
router.get('/applicants', verifyToken, async (req, res) => {
    try {
        const sender = await User.findById(req.user.id);
        if (APPLICANT_ROLES.includes(sender?.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const applicants = await User.find({ role: { $in: APPLICANT_ROLES } }).select('fullName username email phone bankName');
        res.status(200).json(applicants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Unread count for current user
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await Message.countDocuments({ receiver: req.user.id, read: false });
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
