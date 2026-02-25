const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,   // App Password (16-char, no spaces)
        },
    });
};

/**
 * Send OTP email to user
 */
const sendOTP = async (toEmail, otp, fullName, currentSecretCode = null, isPasswordReset = false) => {
    const transporter = createTransporter();

    let secretCodeHtml = '';
    if (currentSecretCode) {
        secretCodeHtml = `
            <p style="color: #374151; margin-top: 24px;">Your temporary <strong>Secret Code</strong> for this session is:</p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #7c3aed; background: #f5f3ff; padding: 14px 24px; border-radius: 8px; display: inline-block;">${currentSecretCode}</span>
            </div>
            <p style="color: #dc2626; font-size: 13px;"><strong>⚠️ Note:</strong> This secret code replaces any previous codes and is required for this session.</p>
        `;
    }

    const actionText = isPasswordReset ? 'Password Reset Verification' : 'Secure Login Verification';
    const bodyActionText = isPasswordReset ? 'Your One-Time Password (OTP) to reset your password is:' : 'Your One-Time Password (OTP) for login is:';

    const mailOptions = {
        from: `"BharatLoan System" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: currentSecretCode ? `Your BharatLoan OTP & Secret Code: ${otp}` : `Your BharatLoan OTP: ${otp}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 10px;">
            <div style="text-align:center; margin-bottom: 20px;">
                <h2 style="color: #1d4ed8; margin: 0;">🏦 BharatLoan</h2>
                <p style="color: #6b7280; font-size: 13px;">${actionText}</p>
            </div>
            <p style="color: #374151;">Hello <strong>${fullName || 'User'}</strong>,</p>
            <p style="color: #374151;">${bodyActionText}</p>
            <div style="text-align: center; margin: 28px 0;">
                <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1d4ed8; background: #eff6ff; padding: 16px 28px; border-radius: 10px; display: inline-block;">${otp}</span>
            </div>
            ${secretCodeHtml}
            <p style="color: #374151; margin-top: 24px;">This OTP and session are valid for <strong>10 minutes</strong>. Do not share them with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you did not request this, please ignore this email.<br/>BharatLoan Management System</p>
        </div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent to ${toEmail} | MessageId: ${info.messageId}`);
    return info;
};

/**
 * Send welcome email to new Bank Manager with their secret code
 */
const sendStaffWelcome = async (toEmail, fullName, secretCode, role, bank) => {
    const transporter = createTransporter();
    const roleLabel = role === 'branch_manager' ? 'Bank Manager' : 'Applicant';
    const mailOptions = {
        from: `"BharatLoan System" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Welcome to BharatLoan — Your Staff Account`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 10px;">
            <div style="text-align:center; margin-bottom: 20px;">
                <h2 style="color: #1d4ed8; margin: 0;">🏦 BharatLoan</h2>
                <p style="color: #6b7280; font-size: 13px;">Staff Account Created</p>
            </div>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your <strong>${roleLabel}</strong> account has been created${bank ? ` for <strong>${bank}</strong>` : ''}.</p>
            <p><strong>Your permanent secret code:</strong></p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #7c3aed; background: #f5f3ff; padding: 14px 24px; border-radius: 8px; display: inline-block;">${secretCode}</span>
            </div>
            <p style="color: #dc2626;"><strong>⚠️ Keep this code safe and private.</strong> You will need it every time you log in, along with your OTP.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">BharatLoan Management System</p>
        </div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Welcome email sent to ${toEmail}`);
    return info;
};

module.exports = { sendOTP, sendStaffWelcome };