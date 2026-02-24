import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const { login, verifyOtp } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP
    const [form, setForm] = useState({ username: '', password: '' });
    const [pending, setPending] = useState(null); // { userId, emailHint }
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCredentials = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(form.username, form.password, { portalType: 'applicant' });
            setPending(data);
            setStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
        setError('');
        setLoading(true);
        try {
            await verifyOtp(pending.userId, otp);
            navigate('/dashboard');
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
                    <h2>Welcome Back</h2>
                    <p>Manage your loan applications, track approvals, and view your EMI schedule — all in one place.</p>
                    <ul className="auth-features">
                        <li>Real-time loan application tracking</li>
                        <li>Multi-stage approval transparency</li>
                        <li>Instant EMI schedule on disbursement</li>
                        <li>RBI-compliant loan processes</li>
                    </ul>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Bank Staff Portals</div>
                        <Link to="/bm-login">
                            <button className="btn btn-outline-white" style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                🏦 Bank Manager Login →
                            </button>
                        </Link>
                        <Link to="/admin-login">
                            <button className="btn btn-outline-white" style={{ width: '100%', justifyContent: 'center' }}>
                                🔐 Admin Login →
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                {step === 1 ? (
                    <>
                        <h2 className="auth-title">Applicant Sign In</h2>
                        <p className="auth-sub">Enter your credentials — we'll send an OTP to your email</p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleCredentials} autoComplete="off">
                            <div className="form-group">
                                <label>Username<span className="required">*</span></label>
                                <input
                                    type="text" name="lms-username"
                                    placeholder="Enter your username"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    autoComplete="off" required autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Password<span className="required">*</span></label>
                                <input
                                    type="password" name="lms-password"
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

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            Don't have an account?{' '}
                            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Account</Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="auth-title">Verify Your Identity</h2>
                        <p className="auth-sub">
                            A 6-digit OTP was sent to <strong>{pending?.emailHint}</strong>
                        </p>

                        {error && (
                            <div className="alert alert-danger">
                                <span className="alert-icon">⚠️</span>
                                <div className="alert-body"><p>{error}</p></div>
                            </div>
                        )}

                        <form onSubmit={handleOtp}>
                            <div className="form-group">
                                <label>One-Time Password (OTP)<span className="required">*</span></label>
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
                                    required autoFocus
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || otp.length !== 6}>
                                {loading ? 'Verifying…' : '✅ Verify & Login'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                                ← Back to login
                            </span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
