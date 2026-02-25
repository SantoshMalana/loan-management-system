require('dotenv').config();
const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const bm = await User.findOne({ username: 'rajesh_sbi' });
        if (!bm) { console.log('BM not found'); process.exit(1); }

        const bankFilter = bm.officerBank ? { bankName: bm.officerBank } : {};
        const stageFilter = { workflowStage: { $in: ['submitted', 'returned', 'under_review', 'branch_review', 'gm_review', 'sanctioned'] } };
        const filter = { ...bankFilter, ...stageFilter };

        console.log('BM filter:', JSON.stringify(filter));

        const loans = await Loan.find(filter)
            .populate('user', '-password -otp -otpExpiry -staffSecretCode')
            .populate('assignedBranchManager', 'fullName username');

        console.log(`Loans found for BM (${bm.officerBank}):`, loans.length);
        loans.forEach(l => console.log(' -', l.loanType, l.amount, l.workflowStage, l.bankName));

        const applicant = await User.findOne({ username: 'sbi_officer_test' });
        const appLoans = await Loan.find({ user: applicant._id })
            .populate('user', '-password -otp -otpExpiry -staffSecretCode')
            .populate('assignedBranchManager', 'fullName username');

        console.log(`Loans found for Applicant (${applicant.username}):`, appLoans.length);
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        mongoose.disconnect();
    }
});
