import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const STAGE_LABELS = {
    submitted: 'Submitted',
    under_review: 'Officer Review',
    branch_review: 'Branch Review',
    gm_review: 'GM Review',
    sanctioned: 'Sanctioned ✅',
    disbursed: 'Disbursed 🎉',
    rejected: 'Rejected',
    returned: 'Returned',
    draft: 'Draft',
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

const STAGE_MESSAGES = {
    submitted: 'Your application has been submitted and is waiting for a loan officer to review.',
    under_review: 'A loan officer is actively reviewing your application.',
    branch_review: 'The loan officer has approved your application and forwarded it to the Branch Manager.',
    gm_review: 'Your high-value loan is under review by the General Manager.',
    sanctioned: 'Great news! Your loan has been sanctioned. Disbursement will be processed shortly.',
    disbursed: 'Your loan amount has been credited to your account. Check your EMI schedule.',
    rejected: 'Your application was not approved. Please check the loan details for the rejection reason.',
    returned: 'The officer has returned your application for correction. Please review and resubmit.',
};

const OFFICER_ROLES = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];

const Dashboard = () => {
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const [loansRes, statsRes] = await Promise.all([
                api.get('/loans'),
                api.get('/loans/stats'),
            ]);
            setLoans(loansRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const isOfficer = OFFICER_ROLES.includes(user?.role);

    const filtered = filter === 'all' ? loans : loans.filter(l => l.workflowStage === filter || l.status === filter);

    // Most recent active loan for applicants
    const activeLoan = !isOfficer ? loans.find(l => !['rejected', 'disbursed', 'closed'].includes(l.workflowStage)) : null;
    const latestLoan = !isOfficer && loans.length > 0 ? loans[0] : null;

    if (loading) return <div className="spinner" />;

    return (
        <div className="anim-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2>Welcome, {user?.fullName?.split(' ')[0] || user?.username} 👋</h2>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                        {isOfficer
                            ? `${user?.officerBank ? `[${user.officerBank}]` : ''} Manage and review loan applications for your bank.`
                            : 'Track your loan applications and payments below.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {!isOfficer && (
                        <Link to="/apply">
                            <button className="btn btn-primary">+ Apply for Loan</button>
                        </Link>
                    )}
                    {isOfficer && (
                        <Link to="/admin">
                            <button className="btn btn-primary">🏛️ Admin Panel</button>
                        </Link>
                    )}
                </div>
            </div>

            {/* ── APPLICANT: Active Loan Status Banner ── */}
            {!isOfficer && activeLoan && (
                <div style={{
                    marginBottom: '1.5rem', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
                    background: STAGE_COLORS[activeLoan.workflowStage]?.bg || '#f9fafb',
                    border: `1.5px solid ${STAGE_COLORS[activeLoan.workflowStage]?.border || 'var(--border)'}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Your Active Application</span>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                                    background: STAGE_COLORS[activeLoan.workflowStage]?.color + '18',
                                    color: STAGE_COLORS[activeLoan.workflowStage]?.color,
                                    border: `1px solid ${STAGE_COLORS[activeLoan.workflowStage]?.border}`,
                                }}>
                                    {STAGE_LABELS[activeLoan.workflowStage]}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: STAGE_COLORS[activeLoan.workflowStage]?.color, fontWeight: 500, maxWidth: 500 }}>
                                {STAGE_MESSAGES[activeLoan.workflowStage]}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {activeLoan.loanType} Loan · {fmt(activeLoan.amount)} · {activeLoan.bankName} · {activeLoan.applicationNumber}
                            </div>
                        </div>
                        <Link to={`/loans/${activeLoan._id}`}>
                            <button className="btn btn-primary btn-sm">View Details →</button>
                        </Link>
                    </div>
                </div>
            )}

            {/* ── APPLICANT: Congratulations Banner ── */}
            {!isOfficer && latestLoan && ['sanctioned', 'disbursed'].includes(latestLoan.workflowStage) && !activeLoan && (
                <div style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                            🎉 Your {latestLoan.loanType} Loan has been {latestLoan.workflowStage}!
                        </div>
                        <div style={{ opacity: 0.9, fontSize: '0.88rem' }}>
                            {fmt(latestLoan.amount)} from {latestLoan.bankName} — {latestLoan.workflowStage === 'disbursed' ? 'Amount credited. EMI starts next month.' : 'Awaiting disbursement.'}
                        </div>
                    </div>
                    <Link to={`/loans/${latestLoan._id}`}>
                        <button className="btn" style={{ background: 'white', color: '#15803d', fontWeight: 700 }}>View Details →</button>
                    </Link>
                </div>
            )}

            {/* ── OFFICER: Awaiting Action Banner ── */}
            {isOfficer && stats.awaitingAction > 0 && (
                <div style={{ marginBottom: '1.5rem', background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 'var(--radius)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontWeight: 700, color: '#92400e' }}>⏳ {stats.awaitingAction} loan{stats.awaitingAction > 1 ? 's' : ''} awaiting your review</span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#78350f' }}>Click "Admin Panel" to review and take action.</span>
                    </div>
                    <Link to="/admin">
                        <button className="btn btn-sm" style={{ background: '#f59e0b', color: 'white', borderColor: '#f59e0b', fontWeight: 700 }}>Review Now →</button>
                    </Link>
                </div>
            )}

            {/* Stats */}
            <div className="stat-grid anim-up-1">
                <div className="stat-card blue">
                    <div className="stat-label">Total Applications</div>
                    <div className="stat-value">{stats.total || 0}</div>
                    <div className="stat-sub">All time</div>
                    <div className="stat-icon">📋</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-label">{isOfficer ? 'Pending Review' : 'In Progress'}</div>
                    <div className="stat-value">{stats.pending || 0}</div>
                    <div className="stat-sub">Awaiting action</div>
                    <div className="stat-icon">⏳</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-label">Sanctioned</div>
                    <div className="stat-value">{stats.approved || 0}</div>
                    <div className="stat-sub">{isOfficer ? 'Ready to disburse' : 'Approved'}</div>
                    <div className="stat-icon">✅</div>
                </div>
                <div className="stat-card red">
                    <div className="stat-label">Rejected</div>
                    <div className="stat-value">{stats.rejected || 0}</div>
                    <div className="stat-sub">Not approved</div>
                    <div className="stat-icon">❌</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Loan Value</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmt(stats.totalAmount || 0)}</div>
                    <div className="stat-sub">All loans combined</div>
                    <div className="stat-icon">💰</div>
                </div>
            </div>

            {/* Loans Table */}
            <div className="card anim-up-2" style={{ padding: 0, overflow: 'hidden', marginTop: '1.5rem' }}>
                <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <div className="card-title">Loan Applications</div>
                        <div className="card-subtitle">{loans.length} total record{loans.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['all', 'submitted', 'under_review', 'branch_review', 'sanctioned', 'disbursed', 'rejected', 'returned'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
                                {f === 'all' ? 'All' : STAGE_LABELS[f]?.replace(' ✅', '').replace(' 🎉', '') || f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Application No.</th>
                                {isOfficer && <th>Applicant</th>}
                                <th>Type</th>
                                <th>Bank</th>
                                <th>Amount</th>
                                <th>EMI</th>
                                <th>Status</th>
                                <th>Applied On</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={isOfficer ? 9 : 8}>
                                        <div className="empty-state">
                                            <div className="empty-icon">📂</div>
                                            <h4>No Applications Found</h4>
                                            <p>
                                                {!isOfficer ? (
                                                    <>No loans yet. <Link to="/apply" style={{ color: 'var(--primary)', fontWeight: 600 }}>Apply now →</Link></>
                                                ) : 'No applications match the current filter.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((loan) => {
                                const sc = STAGE_COLORS[loan.workflowStage] || {};
                                return (
                                    <tr key={loan._id}>
                                        <td>
                                            <div className="td-main" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                {loan.applicationNumber || loan._id.slice(-8).toUpperCase()}
                                            </div>
                                        </td>
                                        {isOfficer && (
                                            <td>
                                                <div className="td-main">{loan.user?.fullName || 'N/A'}</div>
                                                <div className="td-sub">{loan.user?.phone}</div>
                                            </td>
                                        )}
                                        <td>
                                            <span className={`loan-type-pill lt-${loan.loanType}`}>
                                                {{ Education: '🎓', Home: '🏠', Personal: '💳', Business: '🏭', Vehicle: '🚗', Gold: '🥇' }[loan.loanType]} {loan.loanType}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10 }}>
                                                {loan.bankName || 'SBI'}
                                            </span>
                                        </td>
                                        <td><span style={{ fontWeight: 700 }}>{fmt(loan.amount)}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{loan.emiAmount ? fmt(loan.emiAmount) + '/mo' : '—'}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                                                background: sc.bg || '#f9fafb', color: sc.color || 'var(--text)',
                                                border: `1px solid ${sc.border || 'var(--border)'}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {STAGE_LABELS[loan.workflowStage] || loan.status}
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            {new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <Link to={`/loans/${loan._id}`}>
                                                <button className="btn btn-outline btn-sm">
                                                    {isOfficer ? 'Review' : 'View'}
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick info for applicants */}
            {!isOfficer && loans.length === 0 && (
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
                    <h3>Ready to Apply for a Loan?</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 400, margin: '0.5rem auto 1.5rem' }}>
                        Apply for Education, Home, Personal, Business, Vehicle, or Gold loans from top Indian banks.
                    </p>
                    <Link to="/apply">
                        <button className="btn btn-primary btn-lg">Start Your Application →</button>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
