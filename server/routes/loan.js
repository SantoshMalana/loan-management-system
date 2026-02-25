const router = require('express').Router();
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

const APPLICANT_ROLES = ['user', 'applicant'];
const STAFF_ROLES = ['branch_manager'];
const isApplicant = (role) => APPLICANT_ROLES.includes(role);
const isStaff = (role) => STAFF_ROLES.includes(role);

// Get the bank filter for staff (BM sees only their bank)
const getBankFilter = async (userId, role) => {
    const officer = await User.findById(userId);
    return officer?.officerBank ? { bankName: officer.officerBank } : {};
};

const bankMatches = async (userId, role, loanBankName) => {
    const officer = await User.findById(userId);
    if (!officer?.officerBank) return true;
    return officer.officerBank === loanBankName;
};

// ── APPLICANT: Submit loan ─────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can submit loan applications.' });
        }
        const newLoan = new Loan({
            ...req.body,
            user: req.user.id,
            workflowStage: 'submitted',
            status: 'pending',
            submittedAt: new Date(),
        });
        const saved = await newLoan.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error('Loan submit error:', err);
        res.status(500).json({ message: err.message || 'Failed to submit loan application' });
    }
});

// ── APPLICANT: Resubmit a returned loan ───────────────────────────────────
router.put('/:id/resubmit', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can resubmit.' });
        }
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found.' });
        if (loan.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        if (loan.workflowStage !== 'returned') {
            return res.status(400).json({ message: 'Only returned loans can be resubmitted.' });
        }

        const allowedUpdates = ['purpose', 'documents', 'collateral', 'guarantor', 'educationDetails'];
        allowedUpdates.forEach(f => { if (req.body[f] !== undefined) loan[f] = req.body[f]; });

        loan.workflowStage = 'submitted';
        loan.status = 'pending';
        loan.submittedAt = new Date();
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: 'Applicant',
            action: 'resubmitted',
            remarks: req.body.remarks || 'Resubmitted by applicant',
            actionDate: new Date(),
        });
        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET LOANS (role-based) ─────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        const { stage, type } = req.query;
        let filter = {};
        if (type) filter.loanType = type;

        // Applicants only see their own loans
        if (isApplicant(req.user.role)) {
            filter.user = req.user.id;
            const loans = await Loan.find(filter)
                .populate('user', '-password -otp -otpExpiry -staffSecretCode')
                .sort({ createdAt: -1 });
            return res.status(200).json(loans);
        }

        // Staff: apply bank filter
        const bankFilter = await getBankFilter(req.user.id, req.user.role);
        Object.assign(filter, bankFilter);

        if (stage) {
            filter.workflowStage = stage;
        } else if (req.user.role === 'branch_manager') {
            // BM sees all non-final stages
            filter.workflowStage = { $in: ['submitted', 'returned', 'under_review', 'branch_review', 'gm_review', 'sanctioned'] };
        }

        const loans = await Loan.find(filter)
            .populate('user', '-password -otp -otpExpiry -staffSecretCode')
            .populate('assignedBranchManager', 'fullName username')
            .sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
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

        const IN_PROGRESS = ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'];

        const [total, pending, approved, rejected, disbursed, totalAmountData] = await Promise.all([
            Loan.countDocuments(matchFilter),
            Loan.countDocuments({ ...matchFilter, workflowStage: { $in: IN_PROGRESS } }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'sanctioned' }),
            Loan.countDocuments({ ...matchFilter, status: 'rejected' }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'disbursed' }),
            Loan.aggregate([{ $match: matchFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        ]);

        let awaitingAction = 0;
        if (req.user.role === 'branch_manager') {
            awaitingAction = await Loan.countDocuments({
                ...matchFilter,
                workflowStage: { $in: IN_PROGRESS },
            });
        } else {
            // applicant: loans actively in review
            awaitingAction = pending;
        }

        res.status(200).json({
            total,
            pending,
            approved,
            rejected,
            disbursed,
            awaitingAction,
            totalAmount: totalAmountData[0]?.total || 0,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET SINGLE LOAN ────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id)
            .populate('user', '-password -otp -otpExpiry -staffSecretCode')
            .populate('assignedBranchManager', 'fullName username');
        if (!loan) return res.status(404).json({ message: 'Loan not found.' });

        // Applicants can only see their own loans
        if (isApplicant(req.user.role) && loan.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        // Staff can only see loans from their bank
        if (isStaff(req.user.role)) {
            const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
            if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank.' });
        }
        res.status(200).json(loan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id/bm-review', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Bank Manager access required.' });
        }

        const { action, remarks } = req.body;
        if (!['approved', 'rejected', 'returned'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Use: approved, rejected, or returned.' });
        }
        if ((action === 'rejected' || action === 'returned') && !remarks) {
            return res.status(400).json({ message: 'Remarks are required when rejecting or returning a loan.' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found.' });

        const reviewableStages = ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'];
        if (!reviewableStages.includes(loan.workflowStage)) {
            return res.status(400).json({ message: `Loan is already "${loan.workflowStage}" and cannot be reviewed.` });
        }

        const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
        if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank.' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: officer.fullName,
            action,
            remarks: remarks || '',
            actionDate: new Date(),
        });
        loan.managerRemarks = remarks;
        loan.assignedBranchManager = req.user.id;

        if (action === 'approved') {
            loan.workflowStage = 'sanctioned';
            loan.status = 'approved';
            loan.sanctionedAt = new Date();
        } else if (action === 'rejected') {
            loan.workflowStage = 'rejected';
            loan.status = 'rejected';
            loan.rejectionReason = remarks || 'Rejected by Bank Manager';
        } else {
            // returned
            loan.workflowStage = 'returned';
            loan.status = 'pending';
        }

        const updated = await loan.save();
        const populated = await Loan.findById(updated._id)
            .populate('user', '-password -otp -otpExpiry -staffSecretCode');
        res.status(200).json(populated);
    } catch (err) {
        console.error('BM review error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── DISBURSE: sanctioned → disbursed ──────────────────────────────────────
router.put('/:id/disburse', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required.' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found.' });
        if (loan.workflowStage !== 'sanctioned') {
            return res.status(400).json({ message: 'Only sanctioned loans can be disbursed.' });
        }

        const ok = await bankMatches(req.user.id, req.user.role, loan.bankName);
        if (!ok) return res.status(403).json({ message: 'This loan belongs to a different bank.' });

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
            balance = Math.max(0, balance - principal);
            const dueDate = new Date(disbDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            emiSchedule.push({
                installmentNo: i,
                dueDate,
                principalAmount: principal,
                interestAmount: interest,
                totalAmount: principal + interest,
                status: 'pending',
            });
        }
        loan.emiSchedule = emiSchedule;

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: officer.fullName,
            action: 'disbursed',
            remarks: 'Loan amount disbursed to applicant account.',
            actionDate: disbDate,
        });

        const updated = await loan.save();
        const populated = await Loan.findById(updated._id)
            .populate('user', '-password -otp -otpExpiry -staffSecretCode');
        res.status(200).json(populated);
    } catch (err) {
        console.error('Disburse error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ── ADD INTERNAL NOTE ──────────────────────────────────────────────────────
router.put('/:id/note', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required.' });
        }
        const { note } = req.body;
        if (!note) return res.status(400).json({ message: 'Note content is required.' });

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found.' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: officer.fullName,
            action: 'note',
            remarks: note,
            actionDate: new Date(),
        });
        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── STAFF: Generic update ──────────────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required.' });
        }
        const updated = await Loan.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('user', '-password -otp -otpExpiry -staffSecretCode');
        if (!updated) return res.status(404).json({ message: 'Loan not found.' });
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── STAFF: Delete ──────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (!isStaff(req.user.role)) {
            return res.status(403).json({ message: 'Staff access required.' });
        }
        await Loan.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Loan deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;