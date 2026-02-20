import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(form);
            // Redirect based on role
            const role = user?.role || '';
            if (['admin', 'loan_officer', 'branch_manager', 'general_manager'].includes(role)) {
                navigate('/officer');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid username or password');
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
                        <li>Instant EMI schedule generation</li>
                        <li>RBI-compliant loan processes</li>
                    </ul>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Are you a Bank Officer?</div>
                        <Link to="/admin-login">
                            <button className="btn btn-outline-white" style={{ width: '100%', justifyContent: 'center' }}>
                                🔐 Officer / Admin Login →
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="auth-right">
                <h2 className="auth-title">Applicant Sign In</h2>
                <p className="auth-sub">Enter your credentials to access your loan dashboard</p>

                {error && (
                    <div className="alert alert-danger">
                        <span className="alert-icon">⚠️</span>
                        <div className="alert-body"><p>{error}</p></div>
                    </div>
                )}

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label>Username<span className="required">*</span></label>
                        <input
                            type="text"
                            name="lms-username"
                            placeholder="Enter your username"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            autoComplete="off"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Password<span className="required">*</span></label>
                        <input
                            type="password"
                            name="lms-password"
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Account</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
