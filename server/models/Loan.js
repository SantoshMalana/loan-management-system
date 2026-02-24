const mongoose = require('mongoose');

// Sub-schemas
const CollateralSchema = new mongoose.Schema({
    type: { type: String, enum: ['Land', 'Residential Property', 'Commercial Property', 'FD/NSC', 'Gold', 'Vehicle', 'Insurance Policy', 'Other'] },
    description: String,
    estimatedValue: Number,
    documentSubmitted: { type: Boolean, default: false }
}, { _id: false });

const GuarantorSchema = new mongoose.Schema({
    name: String,
    relationship: String,
    phone: String,
    aadhaar: String,
    pan: String,
    monthlyIncome: Number,
    address: String
}, { _id: false });

const ApprovalStepSchema = new mongoose.Schema({
    stage: { type: String, enum: ['loan_officer', 'branch_manager', 'general_manager', 'admin'] },
    officerName: String,
    action: { type: String, enum: ['pending', 'approved', 'rejected', 'returned', 'resubmitted', 'disbursed', 'note'] },
    remarks: String,
    actionDate: Date
}, { _id: false });

const EMISchema = new mongoose.Schema({
    installmentNo: Number,
    dueDate: Date,
    principalAmount: Number,
    interestAmount: Number,
    totalAmount: Number,
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    paidDate: Date
}, { _id: false });

const LoanSchema = new mongoose.Schema({
    applicationNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Bank handling this loan (determines which bank admin can see/approve it)
    bankName: {
        type: String,
        enum: ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'],
        default: 'SBI'
    },
    bankBranch: { type: String },

    // Loan Type & Purpose
    loanType: {
        type: String,
        enum: ['Education', 'Home', 'Personal', 'Business', 'Vehicle', 'Gold'],
        required: true
    },
    purpose: { type: String },

    // For Education Loans
    educationDetails: {
        institutionName: String,
        courseName: String,
        courseDuration: Number, // in years
        countryOfStudy: { type: String, enum: ['India', 'Abroad'] },
        admissionConfirmed: Boolean,
        feesPerYear: Number
    },

    // For Home Loans
    propertyDetails: {
        propertyType: String,
        propertyAddress: String,
        propertyValue: Number,
        builderName: String
    },

    // Amount & Terms
    amount: { type: Number, required: true },
    termMonths: { type: Number, required: true },
    interestRate: { type: Number }, // Annual % - auto-set based on loan type
    emiAmount: { type: Number },
    processingFee: { type: Number },

    // Collateral (required for education >7.5L, home loan, etc.)
    collateralRequired: { type: Boolean, default: false },
    collateral: CollateralSchema,

    // Guarantor (required for education loans between 4L-7.5L)
    guarantorRequired: { type: Boolean, default: false },
    guarantor: GuarantorSchema,

    // Documents
    documents: {
        aadhaarSubmitted: { type: Boolean, default: false },
        panSubmitted: { type: Boolean, default: false },
        photograph: { type: Boolean, default: false },
        incomeProof: { type: Boolean, default: false },
        bankStatement: { type: Boolean, default: false },
        admissionLetter: { type: Boolean, default: false },  // education
        propertyPapers: { type: Boolean, default: false },   // home
        itReturns: { type: Boolean, default: false },
        collateralDocs: { type: Boolean, default: false }
    },

    // Workflow
    // Stages: draft → submitted → under_review → branch_review → gm_review → sanctioned → disbursed → rejected → closed
    workflowStage: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'branch_review', 'gm_review', 'sanctioned', 'disbursed', 'rejected', 'returned', 'closed'],
        default: 'submitted'
    },

    // Legacy status field for backward compatiblity
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    approvalChain: [ApprovalStepSchema],

    // Assigned Officers
    assignedLoanOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBranchManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Remarks
    officerRemarks: String,
    managerRemarks: String,
    gmRemarks: String,
    rejectionReason: String,

    // Disbursement
    disbursementDate: Date,
    disbursementAccount: String,

    // EMI Schedule
    emiSchedule: [EMISchema],

    // Dates
    submittedAt: { type: Date, default: Date.now },
    sanctionedAt: Date,
    closedAt: Date,

}, { timestamps: true });

// Auto-generate application number
LoanSchema.pre('save', async function () {
    if (!this.applicationNumber) {
        const count = await mongoose.model('Loan').countDocuments();
        const year = new Date().getFullYear();
        this.applicationNumber = `LMS${year}${String(count + 1).padStart(6, '0')}`;
    }

    // Auto-set interest rate based on loan type (RBI/bank average rates 2024)
    if (!this.interestRate) {
        const rates = {
            'Education': 9.0,
            'Home': 8.75,
            'Personal': 13.5,
            'Business': 14.0,
            'Vehicle': 10.5,
            'Gold': 9.5
        };
        this.interestRate = rates[this.loanType] || 12.0;
    }

    // Calculate EMI: P*r*(1+r)^n / ((1+r)^n - 1)
    if (this.amount && this.termMonths && this.interestRate) {
        const P = this.amount;
        const r = (this.interestRate / 100) / 12; // monthly rate
        const n = this.termMonths;
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        this.emiAmount = Math.round(emi);
    }

    // Processing fee (typically 0.5-1% of loan amount)
    if (!this.processingFee) {
        this.processingFee = Math.round(this.amount * 0.005);
    }

    // Collateral / Guarantor logic
    if (this.loanType === 'Education') {
        if (this.amount <= 400000) {
            this.collateralRequired = false;
            this.guarantorRequired = false;
        } else if (this.amount <= 750000) {
            this.collateralRequired = false;
            this.guarantorRequired = true; // Need a guarantor (third-party guarantee)
        } else {
            this.collateralRequired = true;
            this.guarantorRequired = true;
        }
    } else if (this.loanType === 'Home') {
        this.collateralRequired = true;
    } else if (this.loanType === 'Personal') {
        this.collateralRequired = this.amount > 1500000;
    } else if (this.loanType === 'Business') {
        this.collateralRequired = this.amount > 1000000;
    } else if (this.loanType === 'Vehicle') {
        // Vehicle itself acts as collateral
        this.collateralRequired = false;
    } else if (this.loanType === 'Gold') {
        this.collateralRequired = false; // gold itself is pledged
    }
});

module.exports = mongoose.model('Loan', LoanSchema);
