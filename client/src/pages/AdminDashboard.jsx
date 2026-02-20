import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STAGE_LABELS = {
    submitted: 'Submitted', under_review: 'Officer Review', branch_review: 'Branch Review',
    gm_review: 'GM Review', sanctioned: 'Sanctioned', disbursed: 'Disbursed',
    rejected: 'Rejected', returned: 'Returned',
};

const STAGE_COLORS = {
    submitted: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    under_review: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    branch_review: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    gm_review: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    sanctioned: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    disbursed: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    returned: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};

const getCibilBadge = (score) => {
    if (!score) return { label: 'N/A', color: '#6b7280', bg: '#f9fafb' };
    if (score >= 750) return { label: `${score} — Excellent`, color: '#15803d', bg: '#f0fdf4' };
    if (score >= 700) return { label: `${score} — Good`, color: '#16a34a', bg: '#f0fdf4' };
    if (score >= 650) return { label: `${score} — Fair`, color: '#ca8a04', bg: '#fefce8' };
    return { label: `${score} — Poor`, color: '#dc2626', bg: '#fef2f2' };
};

const AdminDashboard = () => {
    const [loans, setLoans] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('queue');
    const [stageFilter, setStageFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [quickRemarks, setQuickRemarks] = useState({});
    const { user } = useContext(AuthContext);

    const fetchAll = async () => {
        try {
            const [loansRes, statsRes, usersRes] = await Promise.all([
                api.get('/loans'),
                api.get('/loans/stats'),
                api.get('/auth/users').catch(() => ({ data: [] })),
            ]);
            setLoans(loansRes.data);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) return <div className="spinner" />;

    const loanTypes = ['all', 'Education', 'Home', 'Personal', 'Business', 'Vehicle', 'Gold'];
    const stages = ['all', 'submitted', 'under_review', 'branch_review', 'gm_review', 'sanctioned', 'disbursed', 'rejected', 'returned'];

    // "My Queue" — loans awaiting this officer's specific action
    const getMyQueue = () => {
        if (user?.role === 'loan_officer') return loans.filter(l => ['submitted', 'under_review'].includes(l.workflowStage));
        if (user?.role === 'branch_manager') return loans.filter(l => l.workflowStage === 'branch_review');
        if (user?.role === 'general_manager') return loans.filter(l => l.workflowStage === 'gm_review');
        // admin sees submitted + under_review + branch_review
        return loans.filter(l => ['submitted', 'under_review', 'branch_review', 'gm_review'].includes(l.workflowStage));
    };
    const myQueue = getMyQueue();

    const filtered = loans.filter(l => {
        if (stageFilter !== 'all' && l.workflowStage !== stageFilter) return false;
        if (typeFilter !== 'all' && l.loanType !== typeFilter) return false;
        return true;
    });

    // Quick inline action from the queue
    const doQuickAction = async (loanId, endpoint, action, remarks) => {
        setActionLoading(loanId + action);
        try {
            await api.put(`/loans/${loanId}/${endpoint}`, { action, remarks: remarks || `${action} by ${user?.fullName}` });
            await fetchAll();
        } catch (err) {
            alert(err?.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const getQueueEndpoint = (stage) => {
        if (['submitted', 'under_review'].includes(stage)) return 'officer-review';
        if (stage === 'branch_review') return 'manager-review';
        if (stage === 'gm_review') return 'gm-review';
        return null;
    };

    const LoanTable = ({ data, showActions = false }) => (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>App. No.</th>
                            <th>Applicant</th>
                            <th>Bank</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>CIBIL</th>
                            <th>Stage</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr><td colSpan={9}>
                                <div className="empty-state">
                                    <div className="empty-icon">🎉</div>
                                    <h4>Queue is Clear!</h4>
                                    <p>No loans awaiting your review.</p>
                                </div>
                            </td></tr>
                        ) : data.map(loan => {
                            const cibil = getCibilBadge(loan.user?.cibilScore);
                            const sc = STAGE_COLORS[loan.workflowStage] || {};
                            const endpoint = getQueueEndpoint(loan.workflowStage);
                            const remarkVal = quickRemarks[loan._id] || '';
                            return (
                                <tr key={loan._id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {loan.applicationNumber || loan._id.slice(-8).toUpperCase()}
                                    </td>
                                    <td>
                                        <div className="td-main">{loan.user?.fullName || 'N/A'}</div>
                                        <div className="td-sub">{loan.user?.phone}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10 }}>
                                            {loan.bankName || 'SBI'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`loan-type-pill lt-${loan.loanType}`}>{loan.loanType}</span>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{fmt(loan.amount)}</td>
                                    <td>
                                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: cibil.color, background: cibil.bg, padding: '2px 8px', borderRadius: 10 }}>
                                            {cibil.label}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                                            background: sc.bg || '#f9fafb', color: sc.color || 'var(--text)',
                                            border: `1px solid ${sc.border || 'var(--border)'}`,
                                        }}>
                                            {STAGE_LABELS[loan.workflowStage] || loan.workflowStage}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 160 }}>
                                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                <Link to={`/loans/${loan._id}`}>
                                                    <button className="btn btn-primary btn-sm">Review</button>
                                                </Link>
                                                {loan.user?._id && (
                                                    <Link to={`/chat/${loan.user._id}`}>
                                                        <button className="btn btn-outline btn-sm">💬</button>
                                                    </Link>
                                                )}
                                            </div>
                                            {showActions && endpoint && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <input
                                                        placeholder="Quick remark (optional)..."
                                                        value={remarkVal}
                                                        onChange={e => setQuickRemarks(r => ({ ...r, [loan._id]: e.target.value }))}
                                                        style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', width: '100%' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                                            disabled={!!actionLoading}
                                                            onClick={() => doQuickAction(loan._id, endpoint, 'approved', remarkVal)}
                                                        >
                                                            {actionLoading === loan._id + 'approved' ? '...' : '✅ Approve'}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-warning"
                                                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                                            disabled={!!actionLoading}
                                                            onClick={() => doQuickAction(loan._id, endpoint, 'returned', remarkVal || 'Returned for correction')}
                                                        >
                                                            {actionLoading === loan._id + 'returned' ? '...' : '↩️'}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                                            disabled={!!actionLoading}
                                                            onClick={() => doQuickAction(loan._id, endpoint, 'rejected', remarkVal || 'Rejected')}
                                                        >
                                                            {actionLoading === loan._id + 'rejected' ? '...' : '❌'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const roleLabel = user?.role?.replace(/_/g, ' ');

    return (
        <div className="anim-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2>
                        {user?.officerBank ? `🏦 ${user.officerBank}` : '🏛️'} Officer Panel
                    </h2>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                        Role: <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{roleLabel}</strong>
                        {user?.officerBank && <> · Viewing <strong>{user.officerBank}</strong> loan applications only</>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to="/chat">
                        <button className="btn btn-outline">💬 Messages</button>
                    </Link>
                    {myQueue.length > 0 && (
                        <div style={{ background: '#dc2626', color: 'white', borderRadius: 20, padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ⚡ {myQueue.length} in queue
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid anim-up-1" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card blue">
                    <div className="stat-label">Total Loans</div>
                    <div className="stat-value">{stats.total || 0}</div>
                    <div className="stat-sub">All types</div>
                    <div className="stat-icon">📋</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-label">Awaiting Action</div>
                    <div className="stat-value">{stats.awaitingAction || 0}</div>
                    <div className="stat-sub">In your queue</div>
                    <div className="stat-icon">⏳</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-label">Sanctioned</div>
                    <div className="stat-value">{stats.approved || 0}</div>
                    <div className="stat-sub">Approved</div>
                    <div className="stat-icon">✅</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Disbursed</div>
                    <div className="stat-value">{stats.disbursed || 0}</div>
                    <div className="stat-sub">Active loans</div>
                    <div className="stat-icon">🏦</div>
                </div>
                <div className="stat-card red">
                    <div className="stat-label">Rejected</div>
                    <div className="stat-value">{stats.rejected || 0}</div>
                    <div className="stat-sub">Not approved</div>
                    <div className="stat-icon">❌</div>
                </div>
                <div className="stat-card blue">
                    <div className="stat-label">Portfolio Value</div>
                    <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmt(stats.totalAmount || 0)}</div>
                    <div className="stat-sub">Total loan value</div>
                    <div className="stat-icon">💰</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
                {[
                    { key: 'queue', label: `⚡ My Queue (${myQueue.length})` },
                    { key: 'loans', label: `📋 All Loans (${loans.length})` },
                    { key: 'applicants', label: `👥 Applicants (${users.length})` },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        background: 'none', border: 'none', padding: '0.6rem 1.25rem',
                        fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                        color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: tab === t.key ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                        marginBottom: '-2px',
                        ...(t.key === 'queue' && myQueue.length > 0 && tab !== 'queue' ? { color: '#dc2626' } : {})
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* My Queue Tab */}
            {tab === 'queue' && (
                <>
                    {myQueue.length > 0 && (
                        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                            <span className="alert-icon">⚡</span>
                            <div className="alert-body">
                                <strong>Action Required</strong>
                                <p>You have {myQueue.length} loan{myQueue.length > 1 ? 's' : ''} awaiting your review. Use inline buttons to approve/return/reject, or click "Review" for full details.</p>
                            </div>
                        </div>
                    )}
                    <LoanTable data={myQueue} showActions={true} />
                </>
            )}

            {/* All Loans Tab */}
            {tab === 'loans' && (
                <>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Stage:</span>
                        {stages.map(s => (
                            <button key={s} onClick={() => setStageFilter(s)} className={`btn btn-sm ${stageFilter === s ? 'btn-primary' : 'btn-outline'}`}>
                                {s === 'all' ? 'All' : STAGE_LABELS[s]}
                            </button>
                        ))}
                        <span style={{ margin: '0 0.25rem', color: 'var(--border)' }}>|</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type:</span>
                        {loanTypes.map(t => (
                            <button key={t} onClick={() => setTypeFilter(t)} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <LoanTable data={filtered} showActions={false} />
                </>
            )}

            {/* Applicants Tab */}
            {tab === 'applicants' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Email / Phone</th>
                                    <th>Employment</th>
                                    <th>Monthly Income</th>
                                    <th>CIBIL Score</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan={8}>
                                        <div className="empty-state">
                                            <div className="empty-icon">👥</div>
                                            <h4>No Applicants Found</h4>
                                        </div>
                                    </td></tr>
                                ) : users.map(u => {
                                    const cibil = getCibilBadge(u.cibilScore);
                                    return (
                                        <tr key={u._id}>
                                            <td><div className="td-main">{u.fullName}</div></td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>@{u.username}</td>
                                            <td>
                                                <div className="td-main" style={{ fontSize: '0.82rem' }}>{u.email}</div>
                                                <div className="td-sub">{u.phone}</div>
                                            </td>
                                            <td style={{ fontSize: '0.82rem' }}>{u.employmentType || '—'}</td>
                                            <td style={{ fontWeight: 700 }}>{u.monthlyIncome ? fmt(u.monthlyIncome) + '/mo' : '—'}</td>
                                            <td>
                                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: cibil.color, background: cibil.bg, padding: '2px 8px', borderRadius: 10 }}>
                                                    {cibil.label}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td>
                                                <Link to={`/chat/${u._id}`}>
                                                    <button className="btn btn-primary btn-sm">💬 Message</button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
