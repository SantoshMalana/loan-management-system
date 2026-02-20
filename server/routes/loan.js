const router = require('express').Router();
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { verifyToken, verifyAdmin, verifyOfficer, verifyBranchManager, verifyGM } = require('../middleware/authMiddleware');

const APPLICANT_ROLES = ['user', 'applicant'];
const OFFICER_ROLES = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];

const isApplicant = (role) => APPLICANT_ROLES.includes(role);
const isOfficer = (role) => OFFICER_ROLES.includes(role);

// ─── Helper: check if officer's bank matches loan's bank ───
const bankMatches = async (userId, loanBankName) => {
    const officer = await User.findById(userId);
    if (!officer?.officerBank) return true; // no bank restriction if officerBank not set
    return officer.officerBank === loanBankName;
};

// ─── Helper: get bank filter for officer ───
const getBankFilter = async (userId) => {
    const officer = await User.findById(userId);
    if (officer?.officerBank) return { bankName: officer.officerBank };
    return {};
};

// ─────────────────────────────────────────────
// APPLICANT: Submit new loan application
// ─────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can submit loan applications' });
        }
        const newLoan = new Loan({
            user: req.user.id,
            ...req.body,
            workflowStage: 'submitted',
            status: 'pending',
            submittedAt: new Date()
        });
        const saved = await newLoan.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Failed to submit loan application' });
    }
});

// ─────────────────────────────────────────────
// APPLICANT: Resubmit a returned loan
// ─────────────────────────────────────────────
router.put('/:id/resubmit', verifyToken, async (req, res) => {
    try {
        if (!isApplicant(req.user.role)) {
            return res.status(403).json({ message: 'Only applicants can resubmit loan applications' });
        }
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (loan.workflowStage !== 'returned') {
            return res.status(400).json({ message: 'Only returned loans can be resubmitted' });
        }

        // Update any provided fields (e.g., updated documents, guarantor info)
        const allowedUpdates = ['purpose', 'documents', 'collateral', 'guarantor', 'educationDetails'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) loan[field] = req.body[field];
        });

        loan.workflowStage = 'submitted';
        loan.status = 'pending';
        loan.submittedAt = new Date();
        loan.approvalChain.push({
            stage: 'loan_officer',
            officerName: 'Applicant',
            action: 'resubmitted',
            remarks: req.body.remarks || 'Application resubmitted by applicant',
            actionDate: new Date()
        });

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// GET LOANS (role-based + bank-filtered)
// ─────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        const { stage, type } = req.query;
        let filter = {};
        if (type) filter.loanType = type;

        if (isApplicant(req.user.role)) {
            // Applicants see only their own loans
            filter.user = req.user.id;
            const loans = await Loan.find(filter).populate('user', '-password').sort({ createdAt: -1 });
            return res.status(200).json(loans);
        }

        // Officers/admins: filter by their bank
        const bankFilter = await getBankFilter(req.user.id);
        Object.assign(filter, bankFilter);

        // Stage filter based on role (only when not explicitly requested)
        if (stage) {
            filter.workflowStage = stage;
        } else {
            // Default: show loans relevant to this officer's role
            if (req.user.role === 'loan_officer') {
                filter.workflowStage = { $in: ['submitted', 'under_review', 'returned'] };
            } else if (req.user.role === 'branch_manager') {
                filter.workflowStage = { $in: ['branch_review', 'submitted', 'under_review'] };
            } else if (req.user.role === 'general_manager') {
                filter.workflowStage = { $in: ['gm_review'] };
            }
            // admin sees all
        }

        const loans = await Loan.find(filter)
            .populate('user', '-password')
            .populate('assignedLoanOfficer', 'fullName username')
            .populate('assignedBranchManager', 'fullName username')
            .sort({ createdAt: -1 });
        res.status(200).json(loans);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// Stats summary
// ─────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
    try {
        let matchFilter = {};
        if (isApplicant(req.user.role)) {
            matchFilter.user = new mongoose.Types.ObjectId(req.user.id);
        } else {
            const bankFilter = await getBankFilter(req.user.id);
            Object.assign(matchFilter, bankFilter);
        }

        const [total, pending, approved, rejected, disbursed, totalAmountData] = await Promise.all([
            Loan.countDocuments(matchFilter),
            Loan.countDocuments({ ...matchFilter, workflowStage: { $in: ['submitted', 'under_review', 'branch_review', 'gm_review'] } }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'sanctioned' }),
            Loan.countDocuments({ ...matchFilter, status: 'rejected' }),
            Loan.countDocuments({ ...matchFilter, workflowStage: 'disbursed' }),
            Loan.aggregate([{ $match: matchFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }])
        ]);

        // Officer-specific: count loans awaiting their action
        let awaitingAction = 0;
        if (req.user.role === 'loan_officer') {
            awaitingAction = await Loan.countDocuments({ ...matchFilter, workflowStage: { $in: ['submitted', 'under_review'] } });
        } else if (req.user.role === 'branch_manager') {
            awaitingAction = await Loan.countDocuments({ ...matchFilter, workflowStage: 'branch_review' });
        } else if (req.user.role === 'general_manager') {
            awaitingAction = await Loan.countDocuments({ ...matchFilter, workflowStage: 'gm_review' });
        } else if (req.user.role === 'admin') {
            awaitingAction = await Loan.countDocuments({ ...matchFilter, workflowStage: { $in: ['submitted', 'under_review', 'branch_review'] } });
        }

        res.status(200).json({
            total, pending, approved, rejected, disbursed, awaitingAction,
            totalAmount: totalAmountData[0]?.total || 0
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// Get single loan detail
// ─────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id)
            .populate('user', '-password')
            .populate('assignedLoanOfficer', 'fullName username')
            .populate('assignedBranchManager', 'fullName username');

        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        // Applicants: only their own
        if (isApplicant(req.user.role) && loan.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Officers: only their bank's loans
        if (isOfficer(req.user.role)) {
            const matches = await bankMatches(req.user.id, loan.bankName);
            if (!matches) {
                return res.status(403).json({ message: 'This loan belongs to a different bank' });
            }
        }

        res.status(200).json(loan);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// OFFICER REVIEW (loan_officer + admin)
// Stage: submitted / under_review → branch_review / rejected / returned
// ─────────────────────────────────────────────
router.put('/:id/officer-review', verifyToken, async (req, res) => {
    try {
        // Must be officer or admin
        if (!isOfficer(req.user.role)) {
            return res.status(403).json({ message: 'Officer access required' });
        }

        const { action, remarks } = req.body;
        if (!['approved', 'rejected', 'returned'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be approved, rejected, or returned' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        if (!['submitted', 'under_review'].includes(loan.workflowStage)) {
            return res.status(400).json({ message: `Loan is in "${loan.workflowStage}" stage — not awaiting officer review` });
        }

        // Bank check
        const matches = await bankMatches(req.user.id, loan.bankName);
        if (!matches) return res.status(403).json({ message: 'This loan belongs to a different bank' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'loan_officer',
            officerName: officer.fullName,
            action,
            remarks: remarks || '',
            actionDate: new Date()
        });
        loan.officerRemarks = remarks;
        loan.assignedLoanOfficer = req.user.id;

        if (action === 'approved') {
            // Large loans (>1Cr) go directly to GM, others to Branch Manager
            loan.workflowStage = loan.amount > 10000000 ? 'gm_review' : 'branch_review';
        } else if (action === 'rejected') {
            loan.workflowStage = 'rejected';
            loan.status = 'rejected';
            loan.rejectionReason = remarks || 'Rejected by Loan Officer';
        } else {
            // returned: send back to applicant with remarks
            loan.workflowStage = 'returned';
        }

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// BRANCH MANAGER REVIEW (branch_manager + admin)
// Stage: branch_review → sanctioned / gm_review / rejected / under_review
// ─────────────────────────────────────────────
router.put('/:id/manager-review', verifyToken, async (req, res) => {
    try {
        // Must be branch manager or admin
        if (!['branch_manager', 'general_manager', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Branch Manager or Admin access required' });
        }

        const { action, remarks } = req.body;
        if (!['approved', 'rejected', 'returned'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be approved, rejected, or returned' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        if (loan.workflowStage !== 'branch_review') {
            return res.status(400).json({ message: `Loan is in "${loan.workflowStage}" stage — not awaiting branch manager review` });
        }

        // Bank check
        const matches = await bankMatches(req.user.id, loan.bankName);
        if (!matches) return res.status(403).json({ message: 'This loan belongs to a different bank' });

        const mgr = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'branch_manager',
            officerName: mgr.fullName,
            action,
            remarks: remarks || '',
            actionDate: new Date()
        });
        loan.managerRemarks = remarks;
        loan.assignedBranchManager = req.user.id;

        if (action === 'approved') {
            if (loan.amount > 10000000) {
                loan.workflowStage = 'gm_review';
            } else {
                loan.workflowStage = 'sanctioned';
                loan.status = 'approved';
                loan.sanctionedAt = new Date();
            }
        } else if (action === 'rejected') {
            loan.workflowStage = 'rejected';
            loan.status = 'rejected';
            loan.rejectionReason = remarks || 'Rejected by Branch Manager';
        } else {
            // returned: send back to officer for re-review
            loan.workflowStage = 'under_review';
        }

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// GENERAL MANAGER REVIEW
// Stage: gm_review → sanctioned / rejected / branch_review
// ─────────────────────────────────────────────
router.put('/:id/gm-review', verifyGM, async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.workflowStage !== 'gm_review') {
            return res.status(400).json({ message: 'Not in GM review stage' });
        }

        const gm = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'general_manager',
            officerName: gm.fullName,
            action,
            remarks: remarks || '',
            actionDate: new Date()
        });
        loan.gmRemarks = remarks;

        if (action === 'approved') {
            loan.workflowStage = 'sanctioned';
            loan.status = 'approved';
            loan.sanctionedAt = new Date();
        } else if (action === 'rejected') {
            loan.workflowStage = 'rejected';
            loan.status = 'rejected';
            loan.rejectionReason = remarks || 'Rejected by General Manager';
        } else {
            loan.workflowStage = 'branch_review';
        }

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// DISBURSE (officer or admin)
// Stage: sanctioned → disbursed + EMI schedule generated
// ─────────────────────────────────────────────
router.put('/:id/disburse', verifyToken, async (req, res) => {
    try {
        if (!isOfficer(req.user.role)) {
            return res.status(403).json({ message: 'Officer access required' });
        }
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.workflowStage !== 'sanctioned') {
            return res.status(400).json({ message: 'Only sanctioned loans can be disbursed' });
        }

        const matches = await bankMatches(req.user.id, loan.bankName);
        if (!matches) return res.status(403).json({ message: 'This loan belongs to a different bank' });

        const disbDate = new Date();
        loan.workflowStage = 'disbursed';
        loan.disbursementDate = disbDate;
        if (req.body.disbursementAccount) loan.disbursementAccount = req.body.disbursementAccount;

        // Generate proper EMI amortization schedule
        const emiSchedule = [];
        const P = loan.amount;
        const r = (loan.interestRate / 100) / 12;
        const n = loan.termMonths;
        let balance = P;
        const emiAmt = loan.emiAmount || Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

        for (let i = 1; i <= n; i++) {
            const interest = Math.round(balance * r);
            const principal = Math.min(Math.round(emiAmt - interest), balance);
            balance -= principal;
            const dueDate = new Date(disbDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            emiSchedule.push({
                installmentNo: i,
                dueDate,
                principalAmount: principal,
                interestAmount: interest,
                totalAmount: principal + interest,
                status: 'pending'
            });
        }
        loan.emiSchedule = emiSchedule;

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: 'loan_officer',
            officerName: officer.fullName,
            action: 'disbursed',
            remarks: 'Loan amount disbursed to applicant account',
            actionDate: disbDate
        });

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// ADD INTERNAL NOTE (officer, does NOT change stage)
// ─────────────────────────────────────────────
router.put('/:id/note', verifyToken, async (req, res) => {
    try {
        if (!isOfficer(req.user.role)) {
            return res.status(403).json({ message: 'Officer access required' });
        }
        const { note } = req.body;
        if (!note) return res.status(400).json({ message: 'Note content is required' });

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        const officer = await User.findById(req.user.id);
        loan.approvalChain.push({
            stage: req.user.role,
            officerName: officer.fullName,
            action: 'note',
            remarks: note,
            actionDate: new Date()
        });

        const updated = await loan.save();
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─────────────────────────────────────────────
// ADMIN: Generic update (super admin only)
// ─────────────────────────────────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const updated = await Loan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.status(200).json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────
// ADMIN: Delete
// ─────────────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Loan.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Loan deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
