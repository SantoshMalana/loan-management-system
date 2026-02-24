const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    // 'user' kept for backward compat (treated as applicant)
    role: {
        type: String,
        enum: ['user', 'applicant', 'loan_officer', 'branch_manager', 'general_manager', 'admin'],
        default: 'applicant'
    },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },

    // Identity
    aadhaarNumber: { type: String },
    panNumber: { type: String },

    // Address
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },

    // Employment
    employmentType: { type: String, enum: ['Salaried', 'Self-Employed', 'Business', 'Student', 'Unemployed'] },
    employerName: { type: String },
    monthlyIncome: { type: Number },
    workExperienceYears: { type: Number },

    // Banking (applicant's account for disbursement)
    bankName: { type: String },
    bankAccountNumber: { type: String },
    ifscCode: { type: String },

    // Credit
    cibilScore: { type: Number, default: 0 },

    // For officers/admins: which bank they belong to
    officerBank: { type: String },
    employeeId: { type: String },

    // 2-Step Login: OTP (temp) + secret code (permanent, hashed)
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    staffSecretCode: { type: String, select: false }, // bcrypt-hashed, for admin & BM

    isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
