import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'];

const BankManagerLogin = () => {
    const { login, verifyOtp } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ username: '', password: '', bank: '' });
    const [pending, setPending] = useState(null);
    const [otp, setOtp] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleCredentials = async (e) => {
        e.preventDefault();
        if (!form.bank) { setError('Please select your assigned bank.'); return; }
        if (!form.username.trim() || !form.password) { setError('Please enter your credentials.'); return; }
        setLoading(true);
        setError('');
        try {
            const data = await login(form.username, form.password, { portalType: 'bm', bank: form.bank });
            setPending(data);
            setStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || 'Login failed. Check your credentials and bank selection.');
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
        bg: 'linear-gradient(135deg, #0c1a2e 0%, #1a3a5c 60%, #0c1a2e 100%)',
        card: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        muted: 'rgba(255,255,255,0.45)',
        accent: '#0ea5e9',
        inputBg: 'rgba(255,255,255,0.06)',
        inputBorder: 'rgba(255,255,255,0.12)',
    };

    const inputStyle = {
        width: '100%', boxSizing: 'border-box', background: dark.inputBg,
        border: `1px solid ${dark.inputBorder}`, borderRadius: 10,
        padding: '0.75rem 1rem', color: 'white', fontSize: '0.95rem', outline: 'none',
    };
    const labelStyle = {
        display: 'block', color: dark.muted, fontSize: '0.78rem',
        fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px',
    };

    return (
        <div style={{ minHeight: '100vh', background: dark.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(14,165,233,0.1)', top: -150, right: -100, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', border: '1px solid rgba(14,165,233,0.07)', bottom: -80, left: -80, pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '20px', margin: '0 auto 1rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 32px rgba(14,165,233,0.4)' }}>🏦</div>
                    <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.5px' }}>BharatLoan</h1>
                    <p style={{ color: dark.muted, fontSize: '0.85rem', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' }}>Bank Manager Portal</p>
                </div>

                {/* Card */}
                <div style={{ background: dark.card, backdropFilter: 'blur(20px)', border: `1px solid ${dark.border}`, borderRadius: 20, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                    {step === 1 ? (
                        <>
                            <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Bank Manager Sign In</h2>
                            <p style={{ color: dark.muted, fontSize: '0.82rem', marginBottom: '1.75rem' }}>Select your bank, enter credentials — an OTP will be sent to your email.</p>

                            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.84rem' }}>⚠️ {error}</div>}

                            <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Your Assigned Bank</label>
                                    <select value={form.bank} onChange={e => update('bank', e.target.value)} required
                                        style={{ ...inputStyle, cursor: 'pointer' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.6)'}
                                        onBlur={e => e.target.style.borderColor = dark.inputBorder}>
                                        <option value="" style={{ background: '#1e293b' }}>— Select Bank —</option>
                                        {BANKS.map(b => <option key={b} value={b} style={{ background: '#1e293b' }}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Employee ID / Username</label>
                                    <input type="text" placeholder="e.g. bm_sharma" value={form.username} onChange={e => update('username', e.target.value)} autoComplete="username"
                                        style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.6)'}
                                        onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="current-password"
                                            style={{ ...inputStyle, paddingRight: '3rem' }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.6)'}
                                            onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                        <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: dark.muted, fontSize: '1.1rem' }}>
                                            {showPass ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} style={{ marginTop: '0.5rem', background: loading ? 'rgba(14,165,233,0.4)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', borderRadius: 10, padding: '0.85rem', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(14,165,233,0.4)' }}>
                                    {loading ? '⏳ Sending OTP…' : '🏦 Continue →'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Two-Factor Verification</h2>
                            <p style={{ color: dark.muted, fontSize: '0.82rem', marginBottom: '1.75rem' }}>
                                OTP sent to <strong style={{ color: 'white' }}>{pending?.emailHint}</strong>. Enter it with your secret code.
                            </p>

                            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.84rem' }}>⚠️ {error}</div>}

                            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>6-Digit OTP</label>
                                    <input type="text" inputMode="numeric" maxLength={6} placeholder="● ● ● ● ● ●" value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus
                                        style={{ ...inputStyle, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.6rem', textAlign: 'center' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.6)'}
                                        onBlur={e => e.target.style.borderColor = dark.inputBorder} />
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, color: 'rgba(251,191,36,0.7)' }}>Secret Code (from your welcome email)</label>
                                    <input type="text" placeholder="XXXXXXXX" value={secretCode} onChange={e => setSecretCode(e.target.value.toUpperCase())}
                                        style={{ ...inputStyle, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgb(253,230,138)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.3rem', textAlign: 'center', fontFamily: 'monospace' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.6)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.2)'} />
                                </div>
                                <button type="submit" disabled={loading || otp.length !== 6 || !secretCode.trim()}
                                    style={{ marginTop: '0.5rem', background: (loading || otp.length !== 6) ? 'rgba(14,165,233,0.4)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', borderRadius: 10, padding: '0.85rem', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(14,165,233,0.4)' }}>
                                    {loading ? '⏳ Verifying…' : '✅ Sign In to BM Portal'}
                                </button>
                            </form>
                            <p style={{ textAlign: 'center', marginTop: '1rem', color: dark.muted, fontSize: '0.82rem' }}>
                                <span style={{ cursor: 'pointer', color: 'rgba(14,165,233,0.7)' }} onClick={() => { setStep(1); setOtp(''); setSecretCode(''); setError(''); }}>← Back</span>
                            </p>
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>
                        Not a bank manager?{' '}
                        <Link to="/login" style={{ color: 'rgba(14,165,233,0.7)', textDecoration: 'none', fontWeight: 600 }}>Applicant Login →</Link>
                        {' · '}
                        <Link to="/admin-login" style={{ color: 'rgba(14,165,233,0.7)', textDecoration: 'none', fontWeight: 600 }}>Admin →</Link>
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                        🔒 BM accounts are created by the system administrator.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BankManagerLogin;
