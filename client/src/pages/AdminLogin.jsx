import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminLogin = () => {
    const { login, verifyOtp } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ username: '', password: '' });
    const [pending, setPending] = useState(null);
    const [otp, setOtp] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleCredentials = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password) {
            setError('Please enter your credentials.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await login(form.username, form.password, { portalType: 'admin' });
            setPending(data);
            setStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
        if (!secretCode.trim()) { setError('Please enter your secret code.'); return; }
        setLoading(true);
        setError('');
        try {
            await verifyOtp(pending.userId, otp, secretCode.trim());
            navigate('/officer');
        } catch (err) {
            setError(err?.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const dark = {
        min: '100vh',
        bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        card: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        text: 'white',
        muted: 'rgba(255,255,255,0.45)',
        accent: '#6366f1',
        inputBg: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(255,255,255,0.12)',
    };

    return (
        <div style={{ minHeight: dark.min, background: dark.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative rings */}
            <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.1)', top: -200, right: -150, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.08)', bottom: -100, left: -100, pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '20px', margin: '0 auto 1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>🏛️</div>
                    <h1 style={{ color: dark.text, fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.5px' }}>BharatLoan</h1>
                    <p style={{ color: dark.muted, fontSize: '0.85rem', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' }}>Administrator Portal</p>
                </div>

                {/* Card */}
                <div style={{ background: dark.card, backdropFilter: 'blur(20px)', border: `1px solid ${dark.border}`, borderRadius: 20, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                    {step === 1 ? (
                        <>
                            <h2 style={{ color: dark.text, fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Admin Sign In</h2>
                            <p style={{ color: dark.muted, fontSize: '0.82rem', marginBottom: '1.75rem' }}>Enter credentials — an OTP will be sent to your registered email.</p>

                            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.84rem' }}>⚠️ {error}</div>}

                            <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: dark.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Username</label>
                                    <input type="text" placeholder="admin" value={form.username} onChange={e => update('username', e.target.value)} autoComplete="username"
                                        style={{ width: '100%', boxSizing: 'border-box', background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, borderRadius: 10, padding: '0.75rem 1rem', color: dark.text, fontSize: '0.95rem', outline: 'none' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                        onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: dark.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="current-password"
                                            style={{ width: '100%', boxSizing: 'border-box', background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, borderRadius: 10, padding: '0.75rem 1rem', paddingRight: '3rem', color: dark.text, fontSize: '0.95rem', outline: 'none' }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                            onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                        <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: dark.muted, fontSize: '1.1rem' }}>
                                            {showPass ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} style={{ marginTop: '0.5rem', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, padding: '0.85rem', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
                                    {loading ? '⏳ Sending OTP…' : '🔐 Continue →'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 style={{ color: dark.text, fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Two-Factor Verification</h2>
                            <p style={{ color: dark.muted, fontSize: '0.82rem', marginBottom: '1.75rem' }}>OTP sent to <strong style={{ color: dark.text }}>{pending?.emailHint}</strong>. Enter it below along with your permanent secret code.</p>

                            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.84rem' }}>⚠️ {error}</div>}

                            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: dark.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>6-Digit OTP</label>
                                    <input type="text" inputMode="numeric" maxLength={6} placeholder="● ● ● ● ● ●" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus
                                        style={{ width: '100%', boxSizing: 'border-box', background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, borderRadius: 10, padding: '0.75rem 1rem', color: dark.text, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.6rem', textAlign: 'center', outline: 'none' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                        onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(251,191,36,0.7)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secret Code (from your welcome email)</label>
                                    <input type="text" placeholder="XXXX-XXXX" value={secretCode} onChange={e => setSecretCode(e.target.value.toUpperCase())}
                                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '0.75rem 1rem', color: 'rgb(253,230,138)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.3rem', textAlign: 'center', outline: 'none', fontFamily: 'monospace' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.6)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.2)'} />
                                </div>
                                <button type="submit" disabled={loading || otp.length !== 6 || !secretCode.trim()} style={{ marginTop: '0.5rem', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, padding: '0.85rem', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: (loading || otp.length !== 6 || !secretCode.trim()) ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
                                    {loading ? '⏳ Verifying…' : '✅ Sign In to Admin Portal'}
                                </button>
                            </form>
                            <p style={{ textAlign: 'center', marginTop: '1rem', color: dark.muted, fontSize: '0.82rem' }}>
                                <span style={{ cursor: 'pointer', color: 'rgba(99,102,241,0.7)' }} onClick={() => { setStep(1); setOtp(''); setSecretCode(''); setError(''); }}>← Back</span>
                            </p>
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>
                        Not an admin?{' '}
                        <Link to="/login" style={{ color: 'rgba(99,102,241,0.7)', textDecoration: 'none', fontWeight: 600 }}>Applicant Login →</Link>
                        {' · '}
                        <Link to="/bm-login" style={{ color: 'rgba(99,102,241,0.7)', textDecoration: 'none', fontWeight: 600 }}>Bank Manager →</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
