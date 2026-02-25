import { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STAGE_LABELS = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    branch_review: 'BM Review',
    gm_review: 'GM Review',
    sanctioned: 'Sanctioned',
    disbursed: 'Disbursed',
    rejected: 'Rejected',
    returned: 'Returned',
    closed: 'Closed',
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

const getCibilColor = (score) => {
    if (!score) return { color: '#6b7280', bg: '#f9fafb', label: 'N/A' };
    if (score >= 750) return { color: '#15803d', bg: '#f0fdf4', label: `${score} — Excellent` };
    if (score >= 700) return { color: '#16a34a', bg: '#f0fdf4', label: `${score} — Good` };
    if (score >= 650) return { color: '#ca8a04', bg: '#fefce8', label: `${score} — Fair` };
    return { color: '#dc2626', bg: '#fef2f2', label: `${score} — Poor` };
};

const REVIEWABLE_STAGES = ['submitted', 'under_review', 'branch_review', 'gm_review', 'returned'];
const LOAN_EMOJIS = { Education: '🎓', Home: '🏠', Personal: '💳', Business: '🏭', Vehicle: '🚗', Gold: '🥇' };

const OfficerPanel = () => {
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('queue');
    const [stageFilter, setStageFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [remarks, setRemarks] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState({ msg: '', type: '' });
    const [lastRefresh, setLastRefresh] = useState(null);
    const { user } = useContext(AuthContext);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: '' }), 4000);
    };

    // ── Fetch each endpoint independently so one failure doesn't block others ──
    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fetch loans — CRITICAL
            const loansRes = await api.get('/loans');
            setLoans(loansRes.data);
        } catch (err) {
            console.error('Failed to fetch loans:', err);
        }

        try {
            // Fetch stats — CRITICAL
            const statsRes = await api.get('/loans/stats');
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }

        try {
            // Fetch applicants list — OPTIONAL (fails silently)
            const usersRes = await api.get('/auth/users');
            setUsers(usersRes.data);
        } catch (err) {
            // Endpoint may not exist yet — silent fail, doesn't break the panel
        }

        setLastRefresh(new Date());
        if (!silent) setLoading(false);
    }, []);

    // Initial load
    useEffect(() => {
        fetchAll(false);
    }, [fetchAll]);

    // Auto-refresh every 15 seconds (real-time updates)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAll(true); // silent = no loading spinner
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    if (loading) return <div className="spinner" />;

    const queue = loans.filter(l => REVIEWABLE_STAGES.includes(l.workflowStage));
    const sanctionedLoans = loans.filter(l => l.workflowStage === 'sanctioned');

    const filtered = loans.filter(l => {
        if (stageFilter !== 'all' && l.workflowStage !== stageFilter) return false;
        if (typeFilter !== 'all' && l.loanType !== typeFilter) return false;
        return true;
    });

    // ── Actions ──────────────────────────────────────────────────────────────
    const doAction = async (loanId, action) => {
        const remark = remarks[loanId] || '';
        if (!remark && action !== 'approved') {
            showToast('Please enter remarks before returning or rejecting.', 'warning');
            return;
        }
        setActionLoading(loanId + action);
        try {
            await api.put(`/loans/${loanId}/bm-review`, {
                action,
                remarks: remark || `${action.charAt(0).toUpperCase() + action.slice(1)} by ${user?.fullName || user?.username}`,
            });
            setRemarks(r => { const n = { ...r }; delete n[loanId]; return n; });
            showToast(
                action === 'approved' ? '✅ Loan sanctioned successfully!' :
                    action === 'rejected' ? '❌ Loan rejected.' :
                        '↩️ Returned to applicant for corrections.',
                action === 'approved' ? 'success' : action === 'rejected' ? 'error' : 'warning'
            );
            await fetchAll(true);
        } catch (err) {
            showToast(err?.response?.data?.message || 'Action failed.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const doDisburse = async (loanId) => {
        setActionLoading(loanId + 'disburse');
        try {
            await api.put(`/loans/${loanId}/disburse`, {});
            showToast('🏦 Loan disbursed! EMI schedule generated.', 'success');
            await fetchAll(true);
        } catch (err) {
            showToast(err?.response?.data?.message || 'Disbursement failed.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const queueCount = queue.length + sanctionedLoans.length;

    // ── Loan Card ─────────────────────────────────────────────────────────────
    const LoanCard = ({ loan }) => {
        const sc = STAGE_COLORS[loan.workflowStage] || {};
        const cibil = getCibilColor(loan.user?.cibilScore);
        const remark = remarks[loan._id] || '';
        const isActing = actionLoading?.startsWith(loan._id);
        const canAct = REVIEWABLE_STAGES.includes(loan.workflowStage);
        const isBigLoan = loan.amount >= 5000000;
        const emiRatio = loan.emiAmount && loan.user?.monthlyIncome
            ? Math.round((loan.emiAmount / loan.user.monthlyIncome) * 100) : null;

        return (
            <div className="card" style={{
                padding: '1.25rem', marginBottom: '1rem',
                border: isBigLoan ? '2px solid #f59e0b' : '1px solid var(--border)',
            }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {loan.applicationNumber}
                            </span>
                            {isBigLoan && (
                                <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                                    ⚡ HIGH VALUE
                                </span>
                            )}
                            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.73rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                {STAGE_LABELS[loan.workflowStage] || loan.workflowStage}
                            </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {LOAN_EMOJIS[loan.loanType] || '📄'} {loan.loanType} Loan · {fmt(loan.amount)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Applied {new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {loan.bankName && <> · <strong>{loan.bankName}</strong></>}
                            {loan.termMonths && <> · {loan.termMonths} months</>}
                            {loan.interestRate && <> · {loan.interestRate}% p.a.</>}
                        </div>
                        {loan.emiAmount && (
                            <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                                EMI: <strong>{fmt(loan.emiAmount)}/month</strong>
                                {emiRatio !== null && (
                                    <span style={{ marginLeft: '0.5rem', color: emiRatio > 50 ? '#dc2626' : emiRatio > 35 ? '#ca8a04' : '#16a34a', fontWeight: 700 }}>
                                        ({emiRatio}% of income — {emiRatio > 50 ? 'High Risk' : emiRatio > 35 ? 'Moderate' : 'Healthy'})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <Link to={`/loans/${loan._id}`}>
                        <button className="btn btn-outline btn-sm">View Full Details →</button>
                    </Link>
                </div>

                {/* Applicant info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: '#f9fafb', borderRadius: 8, padding: '0.85rem', marginBottom: '1rem' }}>
                    <InfoCell label="Applicant" value={loan.user?.fullName || 'N/A'} sub={loan.user?.phone} />
                    <InfoCell label="CIBIL Score">
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: cibil.color, background: cibil.bg, padding: '2px 8px', borderRadius: 6 }}>
                            {cibil.label}
                        </span>
                    </InfoCell>
                    <InfoCell label="Monthly Income" value={loan.user?.monthlyIncome ? fmt(loan.user.monthlyIncome) : '—'} />
                    <InfoCell label="Employment" value={loan.user?.employmentType || '—'} />
                    <InfoCell label="Collateral">
                        {loan.collateralRequired
                            ? <span style={{ color: '#ca8a04', fontWeight: 700 }}>⚠️ Required</span>
                            : <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ Not Required</span>}
                    </InfoCell>
                    {loan.purpose && <InfoCell label="Purpose" value={loan.purpose} />}
                </div>

                {/* Previous remarks */}
                {loan.approvalChain?.length > 0 && (
                    <div style={{ marginBottom: '1rem', background: '#fffbeb', borderRadius: 6, padding: '0.75rem', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Previous Remarks
                        </div>
                        {loan.approvalChain.slice(-2).map((step, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', color: '#78350f', marginTop: i > 0 ? '0.25rem' : 0 }}>
                                <strong>{step.officerName}</strong> [{step.action}]: {step.remarks || '—'}
                            </div>
                        ))}
                    </div>
                )}

                {/* Action panel */}
                {canAct && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Remarks (required for Return / Reject)..."
                            value={remark}
                            onChange={e => setRemarks(r => ({ ...r, [loan._id]: e.target.value }))}
                            style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-success" disabled={isActing} onClick={() => doAction(loan._id, 'approved')}>
                                {actionLoading === loan._id + 'approved' ? '⏳ Processing...' : '✅ Sanction Loan'}
                            </button>
                            <button className="btn btn-warning" disabled={isActing} onClick={() => doAction(loan._id, 'returned')}>
                                {actionLoading === loan._id + 'returned' ? '⏳...' : '↩️ Return for Correction'}
                            </button>
                            <button className="btn btn-danger" disabled={isActing} onClick={() => doAction(loan._id, 'rejected')}>
                                {actionLoading === loan._id + 'rejected' ? '⏳...' : '❌ Reject'}
                            </button>
                            {loan.user?._id && (
                                <Link to={`/chat/${loan.user._id}`}>
                                    <button className="btn btn-outline">💬 Message Applicant</button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Disburse panel */}
                {loan.workflowStage === 'sanctioned' && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#15803d' }}>
                            ✅ Loan sanctioned — ready for disbursement. EMI schedule will be auto-generated on disbursement.
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" disabled={actionLoading === loan._id + 'disburse'} onClick={() => doDisburse(loan._id)}>
                                {actionLoading === loan._id + 'disburse' ? '⏳ Processing...' : '🏦 Disburse & Generate EMI Schedule'}
                            </button>
                            {loan.user?._id && (
                                <Link to={`/chat/${loan.user._id}`}>
                                    <button className="btn btn-outline">💬 Notify Applicant</button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Loan Row (All Loans table) ────────────────────────────────────────────
    const LoanRow = ({ loan }) => {
        const sc = STAGE_COLORS[loan.workflowStage] || {};
        const cibil = getCibilColor(loan.user?.cibilScore);
        return (
            <tr>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>
                    {loan.applicationNumber || loan._id.slice(-8).toUpperCase()}
                </td>
                <td>
                    <div className="td-main">{loan.user?.fullName || 'N/A'}</div>
                    <div className="td-sub">{loan.user?.phone}</div>
                </td>
                <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10 }}>
                        {loan.bankName || '—'}
                    </span>
                </td>
                <td>{LOAN_EMOJIS[loan.loanType]} {loan.loanType}</td>
                <td style={{ fontWeight: 700 }}>{fmt(loan.amount)}</td>
                <td>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: cibil.color, background: cibil.bg, padding: '2px 8px', borderRadius: 10 }}>
                        {cibil.label}
                    </span>
                </td>
                <td>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.73rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                        {STAGE_LABELS[loan.workflowStage] || loan.workflowStage}
                    </span>
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                    <Link to={`/loans/${loan._id}`}>
                        <button className="btn btn-primary btn-sm">Review →</button>
                    </Link>
                </td>
            </tr>
        );
    };

    return (
        <div className="anim-fade">
            {/* Toast */}
            {toast.msg && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#f59e0b',
                    color: 'white', padding: '0.75rem 1.25rem', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2>{user?.officerBank ? `🏦 ${user.officerBank}` : '🏦'} — Bank Manager Panel</h2>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                        Logged in as <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</strong>
                        {user?.officerBank && <> · Viewing <strong>{user.officerBank}</strong> loans only</>}
                        {lastRefresh && (
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem' }}>
                                · Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => fetchAll(false)}>🔄 Refresh</button>
                    <Link to="/chat">
                        <button className="btn btn-outline">💬 Messages</button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid anim-up-1" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Loans', value: stats.total || 0, sub: 'All applications', icon: '📋', cls: 'blue' },
                    { label: 'Awaiting Action', value: stats.awaitingAction || 0, sub: 'Need your review', icon: '⏳', cls: 'amber' },
                    { label: 'Sanctioned', value: stats.approved || 0, sub: 'Approved', icon: '✅', cls: 'green' },
                    { label: 'Disbursed', value: stats.disbursed || 0, sub: 'Active loans', icon: '🏦', cls: '' },
                    { label: 'Rejected', value: stats.rejected || 0, sub: 'Not approved', icon: '❌', cls: 'red' },
                    { label: 'Portfolio Value', value: fmt(stats.totalAmount || 0), sub: 'Total amount', icon: '💰', cls: 'blue', small: true },
                ].map(s => (
                    <div key={s.label} className={`stat-card ${s.cls}`}>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={s.small ? { fontSize: '1.1rem' } : {}}>{s.value}</div>
                        <div className="stat-sub">{s.sub}</div>
                        <div className="stat-icon">{s.icon}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
                {[
                    { key: 'queue', label: `⚡ Action Queue (${queueCount})`, alert: queueCount > 0 },
                    { key: 'all', label: `📋 All Loans (${loans.length})` },
                    { key: 'applicants', label: `👥 Applicants (${users.length})` },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        background: 'none', border: 'none', padding: '0.6rem 1.25rem',
                        fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                        color: tab === t.key ? 'var(--primary)' : (t.alert && tab !== t.key ? '#dc2626' : 'var(--text-muted)'),
                        borderBottom: tab === t.key ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                        marginBottom: '-2px',
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Queue Tab ── */}
            {tab === 'queue' && (
                <div>
                    {queueCount === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🎉</div>
                                <h4>All Clear!</h4>
                                <p>No loans awaiting review. Auto-refreshes every 15 seconds.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {sanctionedLoans.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', color: '#15803d' }}>✅ Sanctioned — Pending Disbursement ({sanctionedLoans.length})</h4>
                                    {sanctionedLoans.map(loan => <LoanCard key={loan._id} loan={loan} />)}
                                </div>
                            )}
                            {queue.length > 0 && (
                                <div>
                                    <h4 style={{ marginBottom: '0.75rem' }}>⏳ Pending Review ({queue.length})</h4>
                                    {queue.map(loan => <LoanCard key={loan._id} loan={loan} />)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── All Loans Tab ── */}
            {tab === 'all' && (
                <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Stage:</span>
                        {['all', ...Object.keys(STAGE_LABELS)].map(s => (
                            <button key={s} onClick={() => setStageFilter(s)} className={`btn btn-sm ${stageFilter === s ? 'btn-primary' : 'btn-outline'}`}>
                                {s === 'all' ? 'All' : STAGE_LABELS[s]}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type:</span>
                        {['all', 'Education', 'Home', 'Personal', 'Business', 'Vehicle', 'Gold'].map(t => (
                            <button key={t} onClick={() => setTypeFilter(t)} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>App. No.</th><th>Applicant</th><th>Bank</th><th>Type</th>
                                        <th>Amount</th><th>CIBIL</th><th>Stage</th><th>Date</th><th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9}>
                                            <div className="empty-state"><div className="empty-icon">📂</div><h4>No Loans Found</h4><p>Try changing your filters.</p></div>
                                        </td></tr>
                                    ) : filtered.map(loan => <LoanRow key={loan._id} loan={loan} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── Applicants Tab ── */}
            {tab === 'applicants' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {users.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div className="empty-icon">👥</div>
                            <h4>No Applicants Yet</h4>
                            <p style={{ fontSize: '0.82rem' }}>Applicant list requires the <code>/auth/users</code> endpoint in auth.js — see fix below.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Username</th><th>Email / Phone</th>
                                        <th>Employment</th><th>Monthly Income</th><th>CIBIL</th>
                                        <th>Registered</th><th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => {
                                        const cibil = getCibilColor(u.cibilScore);
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
                                                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                    )}
                </div>
            )}
        </div>
    );
};

const InfoCell = ({ label, value, sub, children }) => (
    <div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>{label}</div>
        {children || (
            <>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{value || '—'}</div>
                {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</div>}
            </>
        )}
    </div>
);

export default OfficerPanel;
