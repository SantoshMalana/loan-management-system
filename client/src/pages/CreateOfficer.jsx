import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'];

const CreateOfficer = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '', username: '', email: '', phone: '',
        password: '', officerBank: 'SBI', employeeId: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null); // { name, bank, secretCode }
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // Guard: only admin
    if (user?.role !== 'admin') {
        return (
            <div className="card" style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
                <h3>Access Denied</h3>
                <p style={{ color: 'var(--text-muted)' }}>Only system administrators can create Bank Manager accounts.</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/officer')}>← Back</button>
            </div>
        );
    }

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(null);

        if (!form.fullName || !form.username || !form.email || !form.phone || !form.password) {
            return setError('All fields are required.');
        }
        if (form.password.length < 8) return setError('Password must be at least 8 characters.');
        if (!/^\d{10}$/.test(form.phone)) return setError('Enter a valid 10-digit phone number.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email address.');

        setLoading(true);
        try {
            const res = await api.post('/auth/create-officer', { ...form, role: 'branch_manager' });
            setSuccess({
                name: form.fullName,
                bank: form.officerBank,
                secretCode: res.data.secretCodePreview,
                email: form.email,
            });
            setForm({ fullName: '', username: '', email: '', phone: '', password: '', officerBank: 'SBI', employeeId: '' });
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="anim-fade" style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/officer')}>← Back</button>
                <div>
                    <h2 style={{ margin: 0 }}>Add Bank Manager</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Create a Bank Manager account — they can review and sanction loans for their assigned bank.
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #0c4a6e, #0369a1)',
                borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
                marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}>
                <span style={{ fontSize: '1.5rem' }}>🔐</span>
                <div>
                    <div style={{ fontWeight: 700, color: '#bae6fd', fontSize: '0.9rem' }}>How it works</div>
                    <p style={{ margin: 0, color: '#7dd3fc', fontSize: '0.82rem' }}>
                        A unique <strong style={{ color: '#bae6fd' }}>Secret Code</strong> is auto-generated for each BM and emailed to them.
                        They'll need this code + an OTP at every login via <strong style={{ color: '#bae6fd' }}>/bm-login</strong>.
                        The code will also be shown here once after creation.
                    </p>
                </div>
            </div>

            {/* Success */}
            {success && (
                <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #86efac',
                    borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>✅</span>
                        <strong style={{ color: '#15803d', fontSize: '1rem' }}>Bank Manager Account Created!</strong>
                    </div>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#166534' }}>
                        <b>{success.name}</b> assigned to <b>{success.bank}</b>. Login credentials sent to <b>{success.email}</b>.
                    </p>
                    <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 8, padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: '4px', letterSpacing: '1px' }}>
                            PERMANENT SECRET CODE (emailed, save this as backup)
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.4rem', color: '#78350f' }}>
                            {success.secretCode}
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#b45309' }}>
                            ⚠️ Share this securely. The BM needs it at every login along with their OTP.
                        </p>
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={() => setSuccess(null)}>
                        + Add Another Bank Manager
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-body"><p>{error}</p></div>
                </div>
            )}

            {!success && (
                <form onSubmit={handleSubmit}>
                    {/* Personal Details */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Bank Manager Details</h4>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name<span className="required">*</span></label>
                                <input type="text" placeholder="Rajesh Kumar" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Employee ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                <input type="text" placeholder="EMP-2026-001" value={form.employeeId} onChange={e => update('employeeId', e.target.value)} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Username / Login ID<span className="required">*</span></label>
                                <input type="text" placeholder="bm_raj" value={form.username}
                                    onChange={e => update('username', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
                                <span className="form-hint">Used at /bm-login</span>
                            </div>
                            <div className="form-group">
                                <label>Phone<span className="required">*</span></label>
                                <input type="tel" placeholder="9876543210" maxLength={10} value={form.phone}
                                    onChange={e => update('phone', e.target.value.replace(/\D/g, ''))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email (receives Secret Code + OTPs)<span className="required">*</span></label>
                            <input type="email" placeholder="rajesh.kumar@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>Temporary Password<span className="required">*</span></label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPass ? 'text' : 'password'} placeholder="Minimum 8 characters"
                                    value={form.password} onChange={e => update('password', e.target.value)}
                                    style={{ paddingRight: '2.5rem' }} />
                                <button type="button" onClick={() => setShowPass(s => !s)}
                                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bank Assignment */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>Bank Assignment</h4>
                        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            The BM will only see and act on loans for the assigned bank.
                        </p>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Assigned Bank<span className="required">*</span></label>
                            <select value={form.officerBank} onChange={e => update('officerBank', e.target.value)}>
                                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? '⏳ Creating Account & Sending Credentials…' : '🏦 Create Bank Manager Account'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default CreateOfficer;
