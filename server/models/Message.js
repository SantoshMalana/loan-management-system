const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    // The loan this message is related to (optional)
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },

    // Sender & Receiver
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Bank context
    bankName: { type: String }, // which bank's channel

    // Message content
    message: { type: String, required: true },

    // Type: general, payment_alert, delay_warning, fine_notice, approval_notice, rejection_notice, document_request
    type: {
        type: String,
        enum: ['general', 'payment_alert', 'delay_warning', 'fine_notice', 'approval_notice', 'rejection_notice', 'document_request', 'info'],
        default: 'general'
    },

    read: { type: Boolean, default: false },
    readAt: { type: Date },

}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
