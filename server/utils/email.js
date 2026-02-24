const nodemailer = require('nodemailer');

const createTransporter = () =>
    nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

// OTP email for all users at login
const sendOTP = async (toEmail, otp, name = 'User') => {
    const t = createTransporter();
    await t.sendMail({
        from: `"BharatLoan 🏦" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'BharatLoan — Your Login OTP',
        html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:auto;padding:36px;
                    background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#1a56db;margin:0;">🏦 BharatLoan</h2>
          </div>
          <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
          <p style="color:#4b5563;">Your one-time login OTP (valid for <strong>10 minutes</strong>):</p>
          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;
                      padding:24px;text-align:center;margin:20px 0;">
            <div style="font-size:44px;font-weight:900;letter-spacing:12px;
                        color:#1d4ed8;font-family:monospace;">${otp}</div>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;">
            ⚠️ Never share this OTP. BharatLoan will never ask for it.
          </p>
        </div>`,
    });
};

// Welcome email sent ONCE when a BM/Admin account is created — contains the permanent secret code
const sendStaffWelcome = async (toEmail, name, secretCode, role, bank = '') => {
    const roleLabel = role === 'admin' ? 'System Administrator' : `Bank Manager${bank ? ' — ' + bank : ''}`;
    const t = createTransporter();
    await t.sendMail({
        from: `"BharatLoan 🏦" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'BharatLoan — Your Staff Account & Secret Code',
        html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:auto;padding:36px;
                    background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#1a56db;margin:0;">🏛️ BharatLoan — Staff Portal</h2>
            <p style="color:#6b7280;font-size:0.88rem;margin:4px 0 0;">${roleLabel}</p>
          </div>
          <p style="color:#374151;">Hi <strong>${name}</strong>,</p>
          <p style="color:#4b5563;">
            Your staff account has been created. Save the <strong>Secret Code</strong> below —
            you will need it at <u>every login</u> along with a one-time OTP.
          </p>
          <div style="background:#fef3c7;border:2px solid #fbbf24;border-radius:12px;
                      padding:20px;text-align:center;margin:20px 0;">
            <div style="font-size:12px;font-weight:700;color:#92400e;letter-spacing:1px;margin-bottom:8px;">
              YOUR PERMANENT SECRET CODE
            </div>
            <div style="font-size:30px;font-weight:900;letter-spacing:6px;
                        color:#78350f;font-family:monospace;">${secretCode}</div>
          </div>
          <p style="color:#dc2626;font-size:13px;font-weight:600;">
            ⚠️ Store this code safely. It cannot be recovered — contact your admin if lost.
          </p>
          <p style="color:#6b7280;font-size:12px;margin-top:12px;">
            Login flow: Enter credentials → receive OTP email → enter OTP + this Secret Code.
          </p>
        </div>`,
    });
};

module.exports = { sendOTP, sendStaffWelcome };
