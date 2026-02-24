const router = require('express').Router();
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const APPLICANT_ROLES = ['user', 'applicant'];
const STAFF_ROLES = ['branch_manager', 'admin'];

const isApplicant = (role) => APPLICANT_ROLES.includes(role);
const isStaff = (role) => STAFF_ROLES.includes(role);

// Bank filter for BM (admin sees all)
const getBankFilter = async (userId, role) => {
    if (role === 'admin') return {};
    const officer = await User.findById(userId);
    return officer?.officerBank ? { bankName: officer.officerBank } : {};
};

const bankMatches = async (userId, role, loanBankName) => {
    if (role === 'admin') return true;
    const officer = await User.findById(userId);
    if (!officer?.officerBank) return true;
    return officer.officerBank === loanBankName;
};

// ── APPLICANT: Submit loan ─────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can submit loan applications' });
        }
        const newLoan = new Loan({
            user: req.user.id, ...req.body,
            workflowStage: 'submitted', status: 'pending', submittedAt: new Date()
        });
        const saved = await newLoan.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message || 'Failed to submit loan application' });
    }
});

// ── APPLICANT: Resubmit a returned loan ───────────────────────────────────
router.put('/:id/resubmit', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can resubmit' });
        }
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (loan.workflowStage !== 'returned') {
            return res.status(400).json({ message: 'Only returned loans can be resubmitted' });
        }

        const allowedUpdates = ['purpose', 'documents', 'collateral', 'guarantor', 'educationDetails'];
        allowedUpdates.forEach(f => { if (req.body[f] !== undefined) loan[f] = req.body[f]; });

        loan.workflowStage = 'submitted';
        loan.status = 'pending';
        loan.submittedAt = new Date();
        loan.approvalChain.push({
            stage: 'branch_manager', officerName: 'Applicant',
            action: 'resubmitted',
            remarks: req.body.remarks || 'Application resubmitted by applicant',
            actionDate: new Date()
        });
        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET LOANS (role-based) ─────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        const { stage, type } = req.query;
        let filter = {};
        if (type) filter.loanType = type;

        if (isApplicant(req.user.role)) {
            filter.user = req.user.id;
            const loans = await Loan.find(filter).populate('user', '-password').sort({ createdAt: -1 });
            return res.status(200).json(loans);
        }

        const bankFilter = await getBankFilter(req.user.id, req.user.role);
        Object.assign(filter, bankFilter);

        if (stage) {
            filter.workflowStage = stage;
        } else {
            // Default view per role
            if (req.user.role === 'branch_manager') {
                // BM sees loans that need review
                filter.workflowStage = { $in: ['submitted', 'returned', 'under_review', 'branch_review', 'gm_review'] };
            }
            // admin sees all stages → no filter
        }

        const loans = await Loan.find(filter)
            .populate('user', '-password')
            .populate('assignedOfficer', 'fullName username')
            .sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── STATS ──────────────────────────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
    try {
        let matchFilter = {};
        if (isApplicant(req.user.role)) {
            matchFilter.user = new mongoose.Types.ObjectId(req.user.id);
        } else {
            const bankFilter = await getBankFilter(req.user.id, req.user.role);
            Object.assign(matchFilter, bankFilter);
        }

        const [total, pending, approved, rejected, disbursed, totalAmountData] = await Promise.all([
            Loan.countDocuments(matchFilter),
            Loan.countDocuments({ ...matchFilter, workflowStage: { $in: ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'] } }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'sanctioned' }),
            Loan.countDocuments({ ...matchFilter, status: 'rejected' }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'disbursed' }),
            Loan.aggregate([{ $match: matchFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }])
        ]);

        let awaitingAction = 0;
        if (req.user.role === 'branch_manager') {
            awaitingAction = await Loan.countDocuments({
                ...matchFilter,
                workflowStage: { $in: ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'] }
            });
        } else if (req.user.role === 'admin') {
            awaitingAction = await Loan.countDocuments({ ...matchFilter, workflowStage: 'sanctioned' });
        }

        res.status(200).json({ total, pending, approved, rejected, disbursed, awaitingAction, totalAmount: totalAmountData[0]?.total || 0 });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET SINGLE LOAN ────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id)
            .populate('user', '-password')
            .populate('assignedOfficer', 'fullName username');
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        if (isApplicant(req.user.role) && loan.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (isStaff(req.user.role)) {
            const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
            if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank' });
        }
        res.status(200).json(loan);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── BM REVIEW: submitted/returned → sanctioned / rejected / returned ───────
// Used by: branch_manager and admin
router.put('/:id/bm-review', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Bank Manager or Admin access required' });
        }
        const { action, remarks } = req.body;
        if (!['approved', 'rejected', 'returned'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be: approved, rejected, or returned' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        // Accept loans in any "pending review" stage (including legacy stages)
        const reviewableStages = ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'];
        if (!reviewableStages.includes(loan.workflowStage)) {
            return res.status(400).json({ message: `Loan is in "${loan.workflowStage}" — not awaiting review` });
        }

        const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
        if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: officer.fullName,
            action, remarks: remarks || '',
            actionDate: new Date()
        });
        loan.managerRemarks = remarks;
        loan.assignedOfficer = req.user.id;

        if (action === 'approved') {
            loan.workflowStage = 'sanctioned';
            loan.status = 'approved';
            loan.sanctionedAt = new Date();
        } else if (action === 'rejected') {
            loan.workflowStage = 'rejected';
            loan.status = 'rejected';
            loan.rejectionReason = remarks || 'Rejected by Bank Manager';
        } else {
            loan.workflowStage = 'returned';
        }

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DISBURSE: sanctioned → disbursed (staff only) ─────────────────────────
router.put('/:id/disburse', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required' });
        }
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.workflowStage !== 'sanctioned') {
            return res.status(400).json({ message: 'Only sanctioned loans can be disbursed' });
        }
        const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
        if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank' });

        const disbDate = new Date();
        loan.workflowStage = 'disbursed';
        loan.disbursementDate = disbDate;
        if (req.body.disbursementAccount) loan.disbursementAccount = req.body.disbursementAccount;

        // Generate EMI schedule
        const P = loan.amount;
        const r = (loan.interestRate / 100) / 12;
        const n = loan.termMonths;
        const emiAmt = loan.emiAmount || Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        let balance = P;
        const emiSchedule = [];

        for (let i = 1; i <= n; i++) {
            const interest = Math.round(balance * r);
            const principal = Math.min(Math.round(emiAmt - interest), balance);
            balance -= principal;
            const dueDate = new Date(disbDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            emiSchedule.push({ installmentNo: i, dueDate, principalAmount: principal, interestAmount: interest, totalAmount: principal + interest, status: 'pending' });
        }
        loan.emiSchedule = emiSchedule;

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager', officerName: officer.fullName,
            action: 'disbursed', remarks: 'Loan disbursed to applicant account', actionDate: disbDate
        });

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADD INTERNAL NOTE ──────────────────────────────────────────────────────
router.put('/:id/note', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) return res.status(403).json({ message: 'Staff access required' });
        const { note } = req.body;
        if (!note) return res.status(400).json({ message: 'Note content is required' });

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager', officerName: officer.fullName,
            action: 'note', remarks: note, actionDate: new Date()
        });
        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Generic update ──────────────────────────────────────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const updated = await Loan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Delete ──────────────────────────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Loan.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Loan deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
