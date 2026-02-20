import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'];

const AdminLogin = () => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ username: '', password: '', fullName: '', email: '', phone: '', role: 'loan_officer', officerBank: 'SBI', adminSecret: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ username: form.username, password: form.password, adminOnly: true });
            navigate('/officer');
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid credentials or not an officer account');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.fullName || !form.username || !form.email || !form.phone || !form.password) {
            setError('All fields are required'); return;
        }
        if (!form.adminSecret) {
            setError('Admin secret key is required to register as an officer'); return;
        }
        setLoading(true);
        try {
            await register({
                username: form.username,
                password: form.password,
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
                role: form.role,
                officerBank: form.officerBank,
                adminSecret: form.adminSecret,
            });
            setMode('login');
            setError('');
            setForm(f => ({ ...f, username: form.username, password: '' }));
        } catch (err) {
            setError(err?.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const roleLabel = {
        loan_officer: 'Loan Officer',
        branch_manager: 'Branch Manager',
        general_manager: 'General Manager',
        admin: 'System Admin',
    };

    return (
        <div className="auth-page">
            {/* Left Panel */}
            <div className="auth-left" style={{ background: 'linear-gradient(150deg, #0f2461 0%, #1e3a8a 50%, #1a56db 100%)' }}>
                <div className="auth-left-content">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                    <h2>Bank Officer Portal</h2>
                    <p>Authorized access for bank employees to manage loan applications from their institution.</p>
                    <ul className="auth-features">
                        <li>Bank-segregated loan queue</li>
                        <li>Multi-level approval workflow</li>
                        <li>Direct messaging with applicants</li>
                        <li>Payment alerts & fine notices</li>
                    </ul>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>🏦 Bank Assignment</div>
                        <p>Your account is linked to your bank. You will only see and manage loan applications submitted to your bank.</p>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Link to="/login">
                            <button className="btn btn-outline-white" style={{ width: '100%', justifyContent: 'center' }}>
                                ← Applicant Login
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="auth-right">
                {/* Toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '1.75rem' }}>
                    {['login', 'register'].map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { setMode(m); setError(''); }}
                            style={{
                                flex: 1, padding: '0.6rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                background: mode === m ? 'white' : 'transparent',
                                color: mode === m ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: 700, fontSize: '0.88rem',
                                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {m === 'login' ? '🔓 Sign In' : '📝 Register Officer'}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="alert alert-danger">
                        <span className="alert-icon">⚠️</span>
                        <div className="alert-body"><p>{error}</p></div>
                    </div>
                )}

                {/* Login Form */}
                {mode === 'login' && (
                    <>
                        <h2 className="auth-title">Officer Sign In</h2>
                        <p className="auth-sub">For Loan Officers, Branch Managers, and Admins</p>
                        <form onSubmit={handleLogin} autoComplete="off">
                            <div className="form-group">
                                <label>Username<span className="required">*</span></label>
                                <input type="text" name="admin-username" placeholder="officer_username" value={form.username} onChange={e => update('username', e.target.value)} autoComplete="off" required autoFocus />
                            </div>
                            <div className="form-group">
                                <label>Password<span className="required">*</span></label>
                                <input type="password" name="admin-password" placeholder="Enter password" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="new-password" required />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                {loading ? 'Signing in...' : '🔐 Sign In as Officer'}
                            </button>
                        </form>
                    </>
                )}

                {/* Register Form */}
                {mode === 'register' && (
                    <>
                        <h2 className="auth-title">Register as Officer</h2>
                        <p className="auth-sub">Requires admin authorization key from your bank</p>
                        <form onSubmit={handleRegister} autoComplete="off">
                            <div className="form-group">
                                <label>Full Name<span className="required">*</span></label>
                                <input type="text" placeholder="Rajesh Kumar Verma" value={form.fullName} onChange={e => update('fullName', e.target.value)} autoComplete="off" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Username<span className="required">*</span></label>
                                    <input type="text" placeholder="rajesh_sbi" value={form.username} onChange={e => update('username', e.target.value)} autoComplete="off" required />
                                </div>
                                <div className="form-group">
                                    <label>Phone<span className="required">*</span></label>
                                    <input type="tel" placeholder="9876543210" value={form.phone} onChange={e => update('phone', e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email<span className="required">*</span></label>
                                <input type="email" placeholder="rajesh@sbi.co.in" value={form.email} onChange={e => update('email', e.target.value)} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Role<span className="required">*</span></label>
                                    <select value={form.role} onChange={e => update('role', e.target.value)}>
                                        <option value="loan_officer">Loan Officer</option>
                                        <option value="branch_manager">Branch Manager</option>
                                        <option value="general_manager">General Manager</option>
                                        <option value="admin">System Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Bank<span className="required">*</span></label>
                                    <select value={form.officerBank} onChange={e => update('officerBank', e.target.value)}>
                                        {BANKS.map(b => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Password<span className="required">*</span></label>
                                <input type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="new-password" required />
                            </div>
                            <div className="form-group">
                                <label>Admin Authorization Key<span className="required">*</span></label>
                                <input type="password" placeholder="Provided by your bank IT admin" value={form.adminSecret} onChange={e => update('adminSecret', e.target.value)} autoComplete="new-password" required />
                                <span className="form-hint">Contact your bank's system administrator for this key</span>
                            </div>
                            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                {loading ? 'Registering...' : 'Register as Officer'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
