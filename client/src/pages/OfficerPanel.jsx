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

const getCibilColor = (score) => {
    if (!score) return 'var(--text-muted)';
    if (score >= 750) return '#16a34a';
    if (score >= 650) return '#ca8a04';
    return '#dc2626';
};

const OFFICER_ROLES = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];

const OfficerPanel = () => {
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState('all');
    const [remarks, setRemarks] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState('');
    const { user } = useContext(AuthContext);

    const fetchData = async () => {
        try {
            const [loansRes, statsRes] = await Promise.all([
                api.get('/loans'),
                api.get('/loans/stats'),
            ]);
            setLoans(loansRes.data);
            setStats(statsRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <div className="spinner" />;

    // Determine which stages this role manages
    const roleStage = {
        loan_officer: ['submitted', 'under_review', 'returned'],
        branch_manager: ['branch_review'],
        general_manager: ['gm_review'],
        admin: ['submitted', 'under_review', 'branch_review', 'gm_review', 'sanctioned'],
    };

    const myStages = roleStage[user?.role] || ['submitted', 'under_review', 'branch_review', 'gm_review'];
    const myLoans = loans.filter(l => myStages.includes(l.workflowStage));
    const filtered = selectedStage === 'all' ? myLoans : myLoans.filter(l => l.workflowStage === selectedStage);

    const urgentLoans = myLoans.filter(l => l.amount >= 10000000);

    // Determine the endpoint based on loan's current stage
    const getEndpoint = (loanStage) => {
        if (['submitted', 'under_review'].includes(loanStage)) return 'officer-review';
        if (loanStage === 'branch_review') return 'manager-review';
        if (loanStage === 'gm_review') return 'gm-review';
        return null;
    };

    // Determine the approve button label based on loan's stage and amount
    const getApproveLabel = (loan) => {
        if (['submitted', 'under_review'].includes(loan.workflowStage)) {
            return loan.amount > 10000000 ? '✅ Approve → Send to GM' : '✅ Approve → Send to Branch Manager';
        }
        if (loan.workflowStage === 'branch_review') {
            return loan.amount > 10000000 ? '✅ Approve → Send to GM' : '✅ Sanction Loan';
        }
        if (loan.workflowStage === 'gm_review') return '✅ Final Approval — Sanction';
        return '✅ Approve';
    };

    const doAction = async (loanId, loanStage, action) => {
        const endpoint = getEndpoint(loanStage);
        if (!endpoint) return;
        const remark = remarks[loanId] || '';
        if (!remark && action !== 'approved') {
            setToast(`⚠️ Please enter remarks before returning or rejecting.`);
            setTimeout(() => setToast(''), 3000);
            return;
        }
        setActionLoading(loanId + action);
        try {
            await api.put(`/loans/${loanId}/${endpoint}`, {
                action,
                remarks: remark || `${action} by ${user?.fullName || user?.username}`
            });
            setToast(`✅ Loan ${action} successfully!`);
            setTimeout(() => setToast(''), 3000);
            setRemarks(r => { const n = { ...r }; delete n[loanId]; return n; });
            await fetchData();
        } catch (err) {
            setToast(`❌ ${err?.response?.data?.message || 'Action failed'}`);
            setTimeout(() => setToast(''), 4000);
        } finally {
            setActionLoading(null);
        }
    };

    const doDisburse = async (loanId) => {
        setActionLoading(loanId + 'disburse');
        try {
            await api.put(`/loans/${loanId}/disburse`, {});
            setToast('✅ Loan disbursed and EMI schedule generated!');
            setTimeout(() => setToast(''), 3000);
            await fetchData();
        } catch (err) {
            setToast(`❌ ${err?.response?.data?.message || 'Disbursement failed'}`);
            setTimeout(() => setToast(''), 4000);
        } finally {
            setActionLoading(null);
        }
    };

    const roleTitle = {
        loan_officer: '🔍 Loan Officer Panel',
        branch_manager: '🏦 Branch Manager Panel',
        general_manager: '👔 General Manager Panel',
        admin: '🏛️ Admin Panel',
    };

    return (
        <div className="anim-fade">
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: toast.startsWith('✅') ? '#16a34a' : toast.startsWith('⚠️') ? '#f59e0b' : '#dc2626',
                    color: 'white', padding: '0.75rem 1.25rem', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    maxWidth: 340
                }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2>{roleTitle[user?.role] || '🏛️ Officer Panel'}</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Role: <strong style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{user?.role?.replace(/_/g, ' ')}</strong>
                    {user?.officerBank && <> · <strong>{user.officerBank}</strong> bank loans only</>}
                    {' · '}{myLoans.length} loan{myLoans.length !== 1 ? 's' : ''} in your queue
                </p>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card amber">
                    <div className="stat-label">In My Queue</div>
                    <div className="stat-value">{myLoans.length}</div>
                    <div className="stat-sub">Awaiting your action</div>
                    <div className="stat-icon">📋</div>
                </div>
                <div className="stat-card red">
                    <div className="stat-label">High-Value (≥₹1Cr)</div>
                    <div className="stat-value">{urgentLoans.length}</div>
                    <div className="stat-sub">Needs GM review</div>
                    <div className="stat-icon">⚡</div>
                </div>
                <div className="stat-card blue">
                    <div className="stat-label">Total Applications</div>
                    <div className="stat-value">{stats.total || 0}</div>
                    <div className="stat-sub">All time</div>
                    <div className="stat-icon">📊</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-label">Sanctioned</div>
                    <div className="stat-value">{stats.approved || 0}</div>
                    <div className="stat-sub">Approved loans</div>
                    <div className="stat-icon">✅</div>
                </div>
            </div>

            {/* Urgent Notice */}
            {urgentLoans.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
                    <span className="alert-icon">⚡</span>
                    <div className="alert-body">
                        <strong>High-Value Loans Require Special Attention</strong>
                        <p>{urgentLoans.length} loan(s) above ₹1 Crore require General Manager approval as per banking policy.</p>
                    </div>
                </div>
            )}

            {/* Stage Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter:</span>
                <button className={`btn btn-sm ${selectedStage === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedStage('all')}>
                    All ({myLoans.length})
                </button>
                {myStages.map(s => {
                    const count = myLoans.filter(l => l.workflowStage === s).length;
                    return (
                        <button key={s} className={`btn btn-sm ${selectedStage === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedStage(s)}>
                            {STAGE_LABELS[s]} {count > 0 && `(${count})`}
                        </button>
                    );
                })}
            </div>

            {/* Loans with Inline Actions */}
            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <h4>Queue is Clear!</h4>
                        <p>All loans in your queue have been processed.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map(loan => {
                        const sc = STAGE_COLORS[loan.workflowStage] || {};
                        const endpoint = getEndpoint(loan.workflowStage);
                        const remarkVal = remarks[loan._id] || '';
                        const isActing = actionLoading !== null && actionLoading.startsWith(loan._id);

                        return (
                            <div key={loan._id} className="card" style={{
                                padding: '1.25rem',
                                border: loan.amount >= 10000000 ? '2px solid #f59e0b' : '1px solid var(--border)',
                            }}>
                                {/* Top Row: Loan Info */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                {loan.applicationNumber}
                                            </span>
                                            {loan.amount >= 10000000 && (
                                                <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>⚡ HIGH VALUE</span>
                                            )}
                                            <span style={{
                                                padding: '2px 10px', borderRadius: 12, fontSize: '0.73rem', fontWeight: 700,
                                                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                            }}>
                                                {STAGE_LABELS[loan.workflowStage]}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                                            {{ Education: '🎓', Home: '🏠', Personal: '💳', Business: '🏭', Vehicle: '🚗', Gold: '🥇' }[loan.loanType]} {loan.loanType} Loan · {fmt(loan.amount)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            Applied: {new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            {loan.bankName && <> · Bank: <strong>{loan.bankName}</strong></>}
                                        </div>
                                    </div>
                                    <Link to={`/loans/${loan._id}`}>
                                        <button className="btn btn-outline btn-sm">View Full Details →</button>
                                    </Link>
                                </div>

                                {/* Applicant Info Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem', background: '#f9fafb', borderRadius: 8, padding: '0.85rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Applicant</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{loan.user?.fullName || 'N/A'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{loan.user?.phone}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>CIBIL Score</div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: getCibilColor(loan.user?.cibilScore) }}>
                                            {loan.user?.cibilScore || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Monthly Income</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{loan.user?.monthlyIncome ? fmt(loan.user.monthlyIncome) : '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>EMI / Income</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                            {loan.emiAmount && loan.user?.monthlyIncome
                                                ? `${Math.round((loan.emiAmount / loan.user.monthlyIncome) * 100)}%`
                                                : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Employment</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{loan.user?.employmentType || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Collateral</div>
                                        <div>
                                            {loan.collateralRequired
                                                ? <span style={{ fontWeight: 700, color: '#ca8a04' }}>⚠️ Required</span>
                                                : <span style={{ fontWeight: 700, color: '#16a34a' }}>✅ Not Required</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Panel — only for actionable stages */}
                                {endpoint && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <input
                                                placeholder="Remarks (required for Return / Reject)..."
                                                value={remarkVal}
                                                onChange={e => setRemarks(r => ({ ...r, [loan._id]: e.target.value }))}
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-success"
                                                disabled={isActing}
                                                onClick={() => doAction(loan._id, loan.workflowStage, 'approved')}
                                            >
                                                {actionLoading === loan._id + 'approved' ? '⏳ Processing...' : getApproveLabel(loan)}
                                            </button>
                                            <button
                                                className="btn btn-warning"
                                                disabled={isActing}
                                                onClick={() => doAction(loan._id, loan.workflowStage, 'returned')}
                                            >
                                                {actionLoading === loan._id + 'returned' ? '⏳...' : '↩️ Return for Correction'}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                disabled={isActing}
                                                onClick={() => doAction(loan._id, loan.workflowStage, 'rejected')}
                                            >
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

                                {/* Disburse for sanctioned loans */}
                                {loan.workflowStage === 'sanctioned' && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                        <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>
                                            <span>✅</span>
                                            <div className="alert-body"><p>This loan has been <strong>sanctioned</strong>. You can now disburse the amount to the applicant's account.</p></div>
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            disabled={actionLoading === loan._id + 'disburse'}
                                            onClick={() => doDisburse(loan._id)}
                                        >
                                            {actionLoading === loan._id + 'disburse' ? '⏳ Processing...' : '🏦 Mark as Disbursed & Generate EMI Schedule'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Workflow Reference */}
            <div className="card" style={{ marginTop: '1.5rem', background: '#f8fafc' }}>
                <h4 style={{ marginBottom: '1rem' }}>📌 Approval Workflow Reference</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                    {[
                        { role: '🔍 Loan Officer', duty: 'Verify KYC, income & credit score. Approve to forward to Branch Manager, or return/reject.' },
                        { role: '🏦 Branch Manager', duty: 'Evaluate collateral & sanction loans up to ₹1 Crore. Forward high-value loans to GM.' },
                        { role: '👔 General Manager', duty: 'Final approval for loans above ₹1 Crore. Risk assessment and final sanction.' },
                        { role: '💸 Disbursement', duty: "After sanction, loan is disbursed to the applicant's bank account and EMI schedule is generated." },
                    ].map(({ role, duty }) => (
                        <div key={role} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '0.85rem', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>{role}</div>
                            <p style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{duty}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OfficerPanel;
