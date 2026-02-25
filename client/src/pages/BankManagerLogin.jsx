import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'];

const BankManagerLogin = () => {
    const { login, verifyOtp, forgotPassword, resetPassword } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP, 3 = Forgot Username, 4 = Forgot OTP/Secret, 5 = Success
    const [form, setForm] = useState({ username: '', password: '', bank: '' });
    const [pending, setPending] = useState(null);
    const [otp, setOtp] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotBank, setForgotBank] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCredentials = async (e) => {
        e.preventDefault();
        if (!form.bank) { setError('Please select your bank.'); return; }
        setError('');
        setLoading(true);
        try {
            const data = await login(form.username, form.password, { portalType: 'staff', bank: form.bank });
            setPending(data);
            setStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid credentials or unauthorized.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
        if (!secretCode.trim()) { setError('Please enter your Secret Code.'); return; }

        setError('');
        setLoading(true);
        try {
            await verifyOtp(pending.userId, otp, secretCode);
            navigate('/dashboard');
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid verification details.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotUsername.trim()) { setError('Please enter your username.'); return; }
        if (!forgotBank) { setError('Please select your bank.'); return; }
        setError('');
        setLoading(true);
        try {
            const data = await forgotPassword(forgotUsername, { portalType: 'staff', bank: forgotBank });
            setPending(data);
            setStep(4);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to initiate password reset.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
        if (!secretCode.trim()) { setError('Please enter your Secret Code.'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setError('');
        setLoading(true);
        try {
            await resetPassword(pending.userId, otp, newPassword, secretCode);
            setStep(5);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
                    <h2>Bank Manager Portal</h2>
                    <p>Secure two-factor login for Bank Managers. Review, sanction, and disburse loan applications.</p>
                    <ul className="auth-features">
                        <li>Review pending loan applications</li>
                        <li>Verify CIBIL scores and income eligibility</li>
                        <li>Sanction or reject loans with remarks</li>
                        <li>Disburse sanctioned loans & generate EMI</li>
                    </ul>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Other Portals</div>
                        <Link to="/login">
                            <button className="btn btn-outline-white" style={{ width: '100%', justifyContent: 'center' }}>
                                👤 Applicant Login →
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                {step === 1 ? (
                    <>
                        <h2 className="auth-title">Bank Manager Sign In</h2>
                        <p className="auth-sub">Two-factor authentication — OTP + Secret Code required</p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleCredentials} autoComplete="off">
                            <div className="form-group">
                                <label>Your Bank <span className="required">*</span></label>
                                <select
                                    value={form.bank}
                                    onChange={e => setForm({ ...form, bank: e.target.value })}
                                    required
                                >
                                    <option value="">— Select your assigned bank —</option>
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Username <span className="required">*</span></label>
                                <input
                                    type="text" name="bm-username"
                                    placeholder="Enter your username"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    autoComplete="off" required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password <span className="required">*</span></label>
                                <input
                                    type="password" name="bm-password"
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    autoComplete="new-password" required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                {loading ? 'Sending OTP…' : 'Continue →'}
                            </button>
                        </form>
                    </>
                ) : step === 2 ? (
                    <>
                        <h2 className="auth-title">Two-Factor Verification</h2>
                        <p className="auth-sub">
                            Enter the OTP and Secret Code sent to <strong>{pending?.emailHint}</strong>.
                        </p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleOtp}>
                            <div className="form-group">
                                <label>One-Time Password (OTP) <span className="required">*</span></label>
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    style={{ fontSize: '1.4rem', letterSpacing: '0.4rem', textAlign: 'center' }}
                                    required autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Secret Code <span className="required">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter your 8-character secret code"
                                    value={secretCode}
                                    onChange={e => setSecretCode(e.target.value.toUpperCase())}
                                    style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.2rem', textAlign: 'center' }}
                                    maxLength={8}
                                    required
                                />
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    This was sent to your email along with the OTP.
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary btn-full btn-lg"
                                disabled={loading || otp.length !== 6 || !secretCode.trim()}
                            >
                                {loading ? 'Verifying…' : '🔒 Verify & Login'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }} onClick={() => { setStep(3); setError(''); setForgotUsername(''); setForgotBank(''); }}>
                                Forgot Password?
                            </span>
                        </p>
                        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setStep(1); setOtp(''); setSecretCode(''); setError(''); }}>
                                ← Back
                            </span>
                        </p>
                    </>
                ) : step === 3 ? (
                    <>
                        <h2 className="auth-title">Reset Password</h2>
                        <p className="auth-sub">Select your bank and enter your username</p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleForgotPassword} autoComplete="off">
                            <div className="form-group">
                                <label>Your Bank <span className="required">*</span></label>
                                <select
                                    value={forgotBank}
                                    onChange={e => setForgotBank(e.target.value)}
                                    required
                                >
                                    <option value="">— Select your assigned bank —</option>
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Username<span className="required">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={forgotUsername}
                                    onChange={e => setForgotUsername(e.target.value)}
                                    autoComplete="off" required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                {loading ? 'Sending OTP…' : 'Send OTP & Secret →'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setStep(1); setError(''); }}>
                                ← Back to login
                            </span>
                        </p>
                    </>
                ) : step === 4 ? (
                    <>
                        <h2 className="auth-title">Set New Password</h2>
                        <p className="auth-sub" style={{ fontSize: '0.88rem' }}>
                            Enter the OTP and Secret Code sent to <strong>{pending?.emailHint}</strong>, along with your new password.
                        </p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>One-Time Password (OTP)<span className="required">*</span></label>
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    style={{ fontSize: '1.4rem', letterSpacing: '0.4rem', textAlign: 'center' }}
                                    required autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Secret Code <span className="required">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter 8-character code"
                                    value={secretCode}
                                    onChange={e => setSecretCode(e.target.value.toUpperCase())}
                                    style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.2rem', textAlign: 'center' }}
                                    maxLength={8}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password<span className="required">*</span></label>
                                <input
                                    type="password"
                                    placeholder="Enter new password (min 6 chars)"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    style={{ fontSize: '1.1rem', padding: '0.75rem' }}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || otp.length !== 6 || !secretCode.trim() || newPassword.length < 6}>
                                {loading ? 'Resetting…' : '🔒 Update Password'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setStep(3); setOtp(''); setSecretCode(''); setNewPassword(''); setError(''); }}>
                                ← Back
                            </span>
                        </p>
                    </>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                            <h2 className="auth-title">Password Reset!</h2>
                            <p className="auth-sub">Your staff password has been changed successfully.</p>
                            <button
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: '2rem' }}
                                onClick={() => {
                                    setStep(1);
                                    setForm({ username: '', password: '', bank: '' });
                                    setOtp('');
                                    setSecretCode('');
                                    setForgotUsername('');
                                    setForgotBank('');
                                    setNewPassword('');
                                    setPending(null);
                                    setError('');
                                }}
                            >
                                Login Now →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BankManagerLogin;
