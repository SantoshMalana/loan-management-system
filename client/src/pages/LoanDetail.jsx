import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STAGE_WORKFLOW = [
    { key: 'submitted', label: 'Submitted', desc: 'Application received', icon: '📋', days: '1–2 working days' },
    { key: 'under_review', label: 'Officer Review', desc: 'Loan Officer is verifying', icon: '🔍', days: '2–3 working days' },
    { key: 'branch_review', label: 'Branch Manager', desc: 'Awaiting BM approval', icon: '🏦', days: '3–5 working days' },
    { key: 'gm_review', label: 'GM Review', desc: 'General Manager reviewing', icon: '👔', days: '5–7 working days' },
    { key: 'sanctioned', label: 'Sanctioned', desc: 'Loan approved & sanctioned', icon: '✅', days: '' },
    { key: 'disbursed', label: 'Disbursed', desc: 'Amount credited to account', icon: '🎉', days: '' },
];

const OFFICER_ROLES = ['loan_officer', 'branch_manager', 'general_manager', 'admin'];

const getCibilColor = (score) => {
    if (!score) return 'var(--text-muted)';
    if (score >= 750) return '#16a34a';
    if (score >= 650) return '#ca8a04';
    return '#dc2626';
};

const getCibilLabel = (score) => {
    if (!score) return 'N/A';
    if (score >= 750) return `${score} — Excellent`;
    if (score >= 700) return `${score} — Good`;
    if (score >= 650) return `${score} — Fair`;
    return `${score} — Poor`;
};

const LoanDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remarks, setRemarks] = useState('');
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [tab, setTab] = useState('overview');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const fetchLoan = async () => {
        try {
            const res = await api.get(`/loans/${id}`);
            setLoan(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLoan(); }, [id]);

    if (loading) return <div className="spinner" />;
    if (!loan) return <div className="empty-state"><h4>Loan not found</h4></div>;

    const isRejected = ['rejected'].includes(loan.workflowStage);
    const isReturned = loan.workflowStage === 'returned';
    const isSanctioned = loan.workflowStage === 'sanctioned';
    const isDisbursed = loan.workflowStage === 'disbursed';
    const isApplicant = !OFFICER_ROLES.includes(user?.role);
    const isOfficerUser = OFFICER_ROLES.includes(user?.role);

    const currentStageIdx = STAGE_WORKFLOW.findIndex(s => s.key === loan.workflowStage);

    // Determine what action the current officer can take
    const canDoOfficerReview = isOfficerUser && ['submitted', 'under_review'].includes(loan.workflowStage);
    const canDoManagerReview = ['branch_manager', 'general_manager', 'admin'].includes(user?.role) && loan.workflowStage === 'branch_review';
    const canDoGMReview = ['general_manager', 'admin'].includes(user?.role) && loan.workflowStage === 'gm_review';
    const canDisburse = isOfficerUser && loan.workflowStage === 'sanctioned';
    const canResubmit = isApplicant && isReturned;

    const doAction = async (endpoint, action) => {
        if (!remarks.trim() && action !== 'approved') {
            setError('Please enter remarks before taking action.');
            return;
        }
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.put(`/loans/${id}/${endpoint}`, { action, remarks });
            setSuccess(`Action "${action}" completed successfully.`);
            setRemarks('');
            await fetchLoan();
        } catch (err) {
            setError(err?.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const doDisburse = async () => {
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.put(`/loans/${id}/disburse`, {});
            setSuccess('Loan disbursed successfully! EMI schedule has been generated.');
            await fetchLoan();
        } catch (err) {
            setError(err?.response?.data?.message || 'Disbursement failed');
        } finally {
            setActionLoading(false);
        }
    };

    const doResubmit = async () => {
        setActionLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.put(`/loans/${id}/resubmit`, { remarks: remarks || 'Applicant has addressed the concerns and resubmitted.' });
            setSuccess('Application resubmitted successfully! It will be reviewed by the loan officer.');
            setRemarks('');
            await fetchLoan();
        } catch (err) {
            setError(err?.response?.data?.message || 'Resubmission failed');
        } finally {
            setActionLoading(false);
        }
    };

    const addNote = async () => {
        if (!note.trim()) return;
        setActionLoading(true);
        try {
            await api.put(`/loans/${id}/note`, { note });
            setNote('');
            setSuccess('Note added.');
            await fetchLoan();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to add note');
        } finally {
            setActionLoading(false);
        }
    };

    const loanTypeEmoji = { Education: '🎓', Home: '🏠', Personal: '💳', Business: '🏭', Vehicle: '🚗', Gold: '🥇' };

    const stageBadgeColor = {
        submitted: '#3b82f6',
        under_review: '#f59e0b',
        branch_review: '#f97316',
        gm_review: '#8b5cf6',
        sanctioned: '#16a34a',
        disbursed: '#0891b2',
        rejected: '#dc2626',
        returned: '#6b7280',
    };

    // Income-to-EMI risk ratio
    const income = loan.user?.monthlyIncome;
    const emi = loan.emiAmount;
    const emiRatio = income && emi ? Math.round((emi / income) * 100) : null;
    const emiRatioColor = emiRatio === null ? 'var(--text-muted)' : emiRatio <= 30 ? '#16a34a' : emiRatio <= 50 ? '#ca8a04' : '#dc2626';
    const emiRatioLabel = emiRatio === null ? 'N/A' : emiRatio <= 30 ? `${emiRatio}% — Healthy` : emiRatio <= 50 ? `${emiRatio}% — Moderate` : `${emiRatio}% — High Risk`;

    const stageColor = stageBadgeColor[loan.workflowStage] || '#6b7280';

    return (
        <div className="anim-fade">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
                <div style={{ flex: 1 }}>
                    <h2>{loanTypeEmoji[loan.loanType]} {loan.loanType} Loan — {loan.applicationNumber}</h2>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                        Applied on {new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {loan.bankName && <> · <strong>{loan.bankName}</strong></>}
                    </p>
                </div>
                <span style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
                    background: stageColor + '18', color: stageColor, border: `1.5px solid ${stageColor}40`,
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                    {loan.workflowStage?.replace(/_/g, ' ')}
                </span>
            </div>

            {/* Success/Error messages */}
            {success && (
                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon">✅</span>
                    <div className="alert-body"><p>{success}</p></div>
                    <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', fontSize: '1.2rem' }}>×</button>
                </div>
            )}
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-body"><p>{error}</p></div>
                    <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', fontSize: '1.2rem' }}>×</button>
                </div>
            )}

            {/* Status banners for applicants */}
            {isApplicant && (isSanctioned || isDisbursed) && (
                <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🎉</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                            {isDisbursed ? 'Congratulations! Your loan has been disbursed.' : 'Congratulations! Your loan has been sanctioned!'}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
                            {isDisbursed
                                ? `₹${Number(loan.amount).toLocaleString('en-IN')} has been credited to your account. EMI of ${fmt(loan.emiAmount)} starts next month.`
                                : `Your ${loan.loanType} Loan of ${fmt(loan.amount)} from ${loan.bankName} has been approved. Disbursement will be processed shortly.`
                            }
                        </div>
                    </div>
                </div>
            )}

            {isApplicant && isRejected && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">❌</span>
                    <div className="alert-body">
                        <strong>Application Rejected</strong>
                        <p>{loan.rejectionReason || 'Your application has been rejected. Please contact your branch for further details.'}</p>
                    </div>
                </div>
            )}

            {isApplicant && isReturned && (
                <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>⚠️ Application Returned — Action Required</div>
                    <p style={{ color: '#78350f', fontSize: '0.88rem', margin: 0 }}>
                        The loan officer has returned your application with remarks. Please review the officer's notes below and resubmit once you have addressed the concerns.
                    </p>
                    {loan.officerRemarks && (
                        <div style={{ marginTop: '0.75rem', background: 'white', borderRadius: 8, padding: '0.75rem', borderLeft: '3px solid #f59e0b', fontSize: '0.85rem' }}>
                            <strong>Officer Remarks:</strong> {loan.officerRemarks}
                        </div>
                    )}
                </div>
            )}

            {/* Workflow Tracker */}
            {!isRejected && !isReturned && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application Status</h4>
                    <div className="workflow-track">
                        {STAGE_WORKFLOW.map((stage, i) => {
                            const status = i < currentStageIdx ? 'completed' : i === currentStageIdx ? 'active' : 'pending';
                            return (
                                <div key={stage.key} className={`wf-step ${status}`}>
                                    <div className="wf-dot">{status === 'completed' ? '✓' : stage.icon}</div>
                                    <div className="wf-label">{stage.label}</div>
                                    <div style={{ fontSize: '0.62rem', color: status === 'active' ? stageColor : 'var(--text-muted)', textAlign: 'center', marginTop: '2px', maxWidth: 80 }}>
                                        {status === 'active' && stage.days ? stage.days : stage.desc}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isRejected && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">❌</span>
                    <div className="alert-body">
                        <strong>Application Rejected</strong>
                        <p>{loan.rejectionReason || 'Please contact your branch for more details.'}</p>
                    </div>
                </div>
            )}
            {isReturned && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">↩️</span>
                    <div className="alert-body">
                        <strong>Application Returned for Correction</strong>
                        <p>Reason: {loan.officerRemarks || 'Please check remarks from the officer.'}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
                {['overview', 'documents', 'collateral', 'emi', 'timeline', ...(isOfficerUser ? ['risk'] : [])].map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: 'none', border: 'none', padding: '0.6rem 1rem',
                        fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                        color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                        marginBottom: '-2px', textTransform: 'capitalize', borderRadius: 0,
                    }}>
                        {t === 'emi' ? 'EMI Schedule' : t === 'risk' ? '📊 Risk Assessment' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>💰 Loan Details</h4>
                        {[
                            ['Application No.', loan.applicationNumber],
                            ['Bank', loan.bankName],
                            ['Loan Type', loan.loanType],
                            ['Amount', fmt(loan.amount)],
                            ['Tenure', `${loan.termMonths} months`],
                            ['Interest Rate', `${loan.interestRate}% p.a.`],
                            ['Monthly EMI', fmt(loan.emiAmount)],
                            ['Processing Fee', fmt(loan.processingFee)],
                            ['Total Payable', fmt(loan.emiAmount * loan.termMonths)],
                            ['Total Interest', fmt(loan.emiAmount * loan.termMonths - loan.amount)],
                        ].map(([l, v]) => (
                            <div key={l} className="detail-row">
                                <span className="detail-label">{l}</span>
                                <span className="detail-value">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>👤 Applicant</h4>
                        {[
                            ['Name', loan.user?.fullName],
                            ['Username', loan.user?.username],
                            ['Email', loan.user?.email],
                            ['Phone', loan.user?.phone],
                            ['Employment', loan.user?.employmentType || 'N/A'],
                            ['Monthly Income', loan.user?.monthlyIncome ? fmt(loan.user.monthlyIncome) : 'N/A'],
                            ['CIBIL Score', getCibilLabel(loan.user?.cibilScore)],
                            ['Purpose', loan.purpose || 'Not specified'],
                        ].map(([l, v]) => (
                            <div key={l} className="detail-row">
                                <span className="detail-label">{l}</span>
                                <span className="detail-value" style={l === 'CIBIL Score' ? { color: getCibilColor(loan.user?.cibilScore), fontWeight: 700 } : {}}>
                                    {v || '—'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {loan.educationDetails?.institutionName && (
                        <div className="card">
                            <h4 style={{ marginBottom: '1rem' }}>🎓 Education Details</h4>
                            {[
                                ['Institution', loan.educationDetails.institutionName],
                                ['Course', loan.educationDetails.courseName],
                                ['Country', loan.educationDetails.countryOfStudy],
                                ['Course Duration', loan.educationDetails.courseDuration ? `${loan.educationDetails.courseDuration} years` : '—'],
                                ['Annual Fees', loan.educationDetails.feesPerYear ? fmt(loan.educationDetails.feesPerYear) : '—'],
                            ].map(([l, v]) => (
                                <div key={l} className="detail-row">
                                    <span className="detail-label">{l}</span>
                                    <span className="detail-value">{v || '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {isDisbursed && (
                        <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                            <h4 style={{ color: 'var(--success)', marginBottom: '1rem' }}>✅ Disbursement Info</h4>
                            {[
                                ['Disbursed On', loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString('en-IN') : '—'],
                                ['Account', loan.disbursementAccount || loan.user?.bankAccountNumber || 'On File'],
                                ['Sanctioned On', loan.sanctionedAt ? new Date(loan.sanctionedAt).toLocaleDateString('en-IN') : '—'],
                            ].map(([l, v]) => (
                                <div key={l} className="detail-row">
                                    <span className="detail-label">{l}</span>
                                    <span className="detail-value">{v}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Sanction Letter (for applicant once sanctioned) */}
                    {isApplicant && (isSanctioned || isDisbursed) && (
                        <div className="card" style={{ gridColumn: '1 / -1', border: '2px dashed #16a34a30', background: '#f0fdf4' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h4 style={{ color: '#15803d' }}>🏛️ Sanction Letter</h4>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Sanctioned: {loan.sanctionedAt ? new Date(loan.sanctionedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text)' }}>
                                <p>Dear <strong>{loan.user?.fullName}</strong>,</p>
                                <p>We are pleased to inform you that your <strong>{loan.loanType} Loan</strong> application
                                    reference <strong>{loan.applicationNumber}</strong> has been <strong>sanctioned</strong> by
                                    <strong> {loan.bankName}</strong>.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', margin: '1rem 0', background: 'white', padding: '1rem', borderRadius: 'var(--radius)' }}>
                                    {[
                                        ['Sanctioned Amount', fmt(loan.amount)],
                                        ['Interest Rate', `${loan.interestRate}% p.a.`],
                                        ['Tenure', `${loan.termMonths} months`],
                                        ['Monthly EMI', fmt(loan.emiAmount)],
                                        ['Processing Fee', fmt(loan.processingFee)],
                                        ['Total Payable', fmt(loan.emiAmount * loan.termMonths)],
                                    ].map(([l, v]) => (
                                        <div key={l} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{l}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#15803d' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    This is a digital sanction confirmation. Please visit your branch for the physical copy and further disbursement formalities.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {tab === 'documents' && (
                <div className="card">
                    <h4 style={{ marginBottom: '1.25rem' }}>📄 Document Submission Status</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {[
                            ['aadhaarSubmitted', '🪪 Aadhaar Card'],
                            ['panSubmitted', '💳 PAN Card'],
                            ['photograph', '📸 Photographs'],
                            ['incomeProof', '💰 Income Proof'],
                            ['bankStatement', '🏦 Bank Statement'],
                            ['admissionLetter', '🎓 Admission Letter'],
                            ['propertyPapers', '📄 Property Papers'],
                            ['itReturns', '📊 IT Returns'],
                            ['collateralDocs', '🏛️ Collateral Documents'],
                        ].map(([key, label]) => (
                            <div key={key} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem', borderRadius: 'var(--radius)',
                                background: loan.documents?.[key] ? '#f0fdf4' : '#fafafa',
                                border: `1px solid ${loan.documents?.[key] ? '#86efac' : 'var(--border)'}`,
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>{loan.documents?.[key] ? '✅' : '⬜'}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: loan.documents?.[key] ? '#16a34a' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {loan.documents?.[key] ? 'Submitted' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Collateral Tab */}
            {tab === 'collateral' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>🏦 Collateral</h4>
                        {loan.collateralRequired ? (
                            loan.collateral?.type ? (
                                [
                                    ['Type', loan.collateral.type],
                                    ['Description', loan.collateral.description || '—'],
                                    ['Estimated Value', fmt(loan.collateral.estimatedValue)],
                                    ['Docs Submitted', loan.collateral.documentSubmitted ? 'Yes' : 'Pending'],
                                ].map(([l, v]) => (
                                    <div key={l} className="detail-row">
                                        <span className="detail-label">{l}</span>
                                        <span className="detail-value">{v}</span>
                                    </div>
                                ))
                            ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Collateral required but not yet submitted.</p>
                        ) : <div className="alert alert-success"><span>✅</span><div className="alert-body"><p>No collateral required for this loan.</p></div></div>}
                    </div>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>👤 Guarantor</h4>
                        {loan.guarantorRequired ? (
                            loan.guarantor?.name ? (
                                [
                                    ['Name', loan.guarantor.name],
                                    ['Relationship', loan.guarantor.relationship || '—'],
                                    ['Phone', loan.guarantor.phone || '—'],
                                    ['Monthly Income', loan.guarantor.monthlyIncome ? fmt(loan.guarantor.monthlyIncome) : '—'],
                                    ['Address', loan.guarantor.address || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="detail-row">
                                        <span className="detail-label">{l}</span>
                                        <span className="detail-value">{v}</span>
                                    </div>
                                ))
                            ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Guarantor required but details not yet submitted.</p>
                        ) : <div className="alert alert-success"><span>✅</span><div className="alert-body"><p>No guarantor required for this loan.</p></div></div>}
                    </div>
                </div>
            )}

            {/* EMI Tab */}
            {tab === 'emi' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {loan.emiSchedule?.length > 0 ? (
                        <>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                                <h4>EMI Repayment Schedule</h4>
                                <p style={{ fontSize: '0.83rem', marginTop: '0.25rem' }}>Monthly EMI: <strong>{fmt(loan.emiAmount)}</strong> · Total: {loan.termMonths} installments</p>
                            </div>
                            <div className="table-wrapper">
                                <table className="emi-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Due Date</th>
                                            <th>Principal</th>
                                            <th>Interest</th>
                                            <th>EMI Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loan.emiSchedule.map(emi => (
                                            <tr key={emi.installmentNo} className={emi.status === 'paid' ? 'emi-paid' : emi.status === 'overdue' ? 'emi-overdue' : ''}>
                                                <td>{emi.installmentNo}</td>
                                                <td>{new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td>{fmt(emi.principalAmount)}</td>
                                                <td>{fmt(emi.interestAmount)}</td>
                                                <td style={{ fontWeight: 700 }}>{fmt(emi.totalAmount)}</td>
                                                <td>
                                                    <span className={`badge badge-${emi.status === 'paid' ? 'success' : emi.status === 'overdue' ? 'danger' : 'pending'}`}>
                                                        {emi.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📅</div>
                            <h4>EMI Schedule Not Yet Generated</h4>
                            <p>The EMI schedule will be generated once the loan is disbursed.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Timeline Tab */}
            {tab === 'timeline' && (
                <div className="card">
                    <h4 style={{ marginBottom: '1.25rem' }}>📋 Approval Timeline</h4>
                    {loan.approvalChain?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loan.approvalChain.map((step, i) => {
                                const actionColors = {
                                    approved: '#16a34a', rejected: '#dc2626', returned: '#f59e0b',
                                    note: '#6b7280', resubmitted: '#3b82f6', disbursed: '#0891b2'
                                };
                                const actionIcons = {
                                    approved: '✅', rejected: '❌', returned: '↩️',
                                    note: '📝', resubmitted: '🔄', disbursed: '🏦'
                                };
                                const color = actionColors[step.action] || '#6b7280';
                                return (
                                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                            background: color + '15', border: `2px solid ${color}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                                        }}>
                                            {actionIcons[step.action] || '📌'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                    {step.officerName} —
                                                    <span style={{ color, textTransform: 'capitalize', marginLeft: '0.3rem' }}>{step.action}</span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(step.actionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {step.stage?.replace(/_/g, ' ')}
                                            </div>
                                            {step.remarks && (
                                                <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', background: '#f9fafb', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${color}` }}>
                                                    "{step.remarks}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div className="empty-icon" style={{ fontSize: '2rem' }}>⏳</div>
                            <h4>Awaiting First Review</h4>
                            <p>No actions taken yet by officers.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Risk Assessment Tab (Officers only) */}
            {tab === 'risk' && isOfficerUser && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>📊 Credit Risk Assessment</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>CIBIL Score</div>
                                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: getCibilColor(loan.user?.cibilScore) }}>
                                    {getCibilLabel(loan.user?.cibilScore)}
                                </div>
                                <div style={{ marginTop: '0.5rem', height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(((loan.user?.cibilScore || 0) - 300) / 600 * 100, 100)}%`, background: getCibilColor(loan.user?.cibilScore), borderRadius: 4 }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    <span>300 (Poor)</span><span>900 (Excellent)</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>EMI-to-Income Ratio</div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: emiRatioColor }}>{emiRatioLabel}</div>
                                {emiRatio !== null && (
                                    <>
                                        <div style={{ marginTop: '0.5rem', height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(emiRatio, 100)}%`, background: emiRatioColor, borderRadius: 4 }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            <span>0%</span><span style={{ color: '#16a34a' }}>30% (Safe)</span><span style={{ color: '#ca8a04' }}>50%</span><span style={{ color: '#dc2626' }}>100%</span>
                                        </div>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Monthly EMI {fmt(emi)} on income of {fmt(income)}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>🎯 Eligibility Summary</h4>
                        {[
                            { label: 'Loan Amount', value: fmt(loan.amount), ok: true },
                            { label: 'CIBIL Score', value: getCibilLabel(loan.user?.cibilScore), ok: (loan.user?.cibilScore || 0) >= 650 },
                            { label: 'Income-to-EMI', value: emiRatioLabel, ok: emiRatio !== null && emiRatio <= 50 },
                            { label: 'Collateral', value: loan.collateralRequired ? (loan.collateral?.type || 'Required — Not Submitted') : 'Not Required', ok: !loan.collateralRequired || !!loan.collateral?.type },
                            { label: 'Guarantor', value: loan.guarantorRequired ? (loan.guarantor?.name || 'Required — Not Submitted') : 'Not Required', ok: !loan.guarantorRequired || !!loan.guarantor?.name },
                            { label: 'Documents', value: Object.values(loan.documents || {}).filter(Boolean).length + ' / 9 submitted', ok: Object.values(loan.documents || {}).filter(Boolean).length >= 3 },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.value}</span>
                                    <span>{item.ok ? '✅' : '⚠️'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── APPLICANT: Resubmit Panel ─── */}
            {canResubmit && (
                <div style={{ marginTop: '1.5rem', border: '2px solid #fbbf24', borderRadius: 'var(--radius)', padding: '1.5rem', background: '#fffbeb' }}>
                    <h4 style={{ marginBottom: '0.75rem', color: '#92400e' }}>🔄 Resubmit Application</h4>
                    <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '1rem' }}>
                        Address the officer's concerns and resubmit your application. Add a note explaining what you've corrected.
                    </p>
                    <textarea
                        placeholder="Explain what you've corrected or updated (e.g. 'Updated guarantor details and resubmitted income proof')..."
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        style={{ minHeight: 80, marginBottom: '0.75rem', width: '100%', borderColor: '#fbbf24' }}
                    />
                    <button
                        className="btn btn-primary"
                        disabled={actionLoading}
                        onClick={doResubmit}
                        style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                    >
                        {actionLoading ? '⏳ Resubmitting...' : '🔄 Resubmit Application'}
                    </button>
                </div>
            )}

            {/* ─── OFFICER ACTION PANEL ─── */}
            {isOfficerUser && (
                <div style={{ marginTop: '1.5rem', border: '2px solid var(--primary)', borderRadius: 'var(--radius)', padding: '1.5rem', background: 'var(--primary-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>⚡ Officer Action Panel</h4>
                        <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 12, background: 'var(--primary)', color: 'white', fontWeight: 700, textTransform: 'capitalize' }}>
                            {user?.role?.replace(/_/g, ' ')} — {loan.bankName}
                        </span>
                    </div>

                    {/* Internal Notes */}
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>📝 Add Internal Note (visible only to officers)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                placeholder="Add a note without changing the loan status..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                style={{ flex: 1 }}
                                onKeyDown={e => e.key === 'Enter' && addNote()}
                            />
                            <button className="btn btn-outline btn-sm" disabled={actionLoading || !note.trim()} onClick={addNote}>Add Note</button>
                        </div>
                    </div>

                    {/* Action Remarks */}
                    {(canDoOfficerReview || canDoManagerReview || canDoGMReview || canDisburse) && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Remarks (required for Return/Reject)</label>
                            <textarea
                                placeholder="Enter your decision remarks..."
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                style={{ minHeight: 70, marginBottom: 0 }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {/* Loan Officer actions */}
                        {canDoOfficerReview && (
                            <>
                                <button className="btn btn-success" disabled={actionLoading} onClick={() => doAction('officer-review', 'approved')}>
                                    ✅ Approve → Send to Branch Manager
                                </button>
                                <button className="btn btn-warning" disabled={actionLoading} onClick={() => doAction('officer-review', 'returned')}>
                                    ↩️ Return to Applicant
                                </button>
                                <button className="btn btn-danger" disabled={actionLoading} onClick={() => doAction('officer-review', 'rejected')}>
                                    ❌ Reject Application
                                </button>
                            </>
                        )}

                        {/* Branch Manager actions */}
                        {canDoManagerReview && (
                            <>
                                <button className="btn btn-success" disabled={actionLoading} onClick={() => doAction('manager-review', 'approved')}>
                                    {loan.amount > 10000000 ? '✅ Approve → Send to GM' : '✅ Sanction Loan'}
                                </button>
                                <button className="btn btn-warning" disabled={actionLoading} onClick={() => doAction('manager-review', 'returned')}>
                                    ↩️ Return to Loan Officer
                                </button>
                                <button className="btn btn-danger" disabled={actionLoading} onClick={() => doAction('manager-review', 'rejected')}>
                                    ❌ Reject Application
                                </button>
                            </>
                        )}

                        {/* GM actions */}
                        {canDoGMReview && (
                            <>
                                <button className="btn btn-success" disabled={actionLoading} onClick={() => doAction('gm-review', 'approved')}>
                                    ✅ Final Approval — Sanction Loan
                                </button>
                                <button className="btn btn-warning" disabled={actionLoading} onClick={() => doAction('gm-review', 'returned')}>
                                    ↩️ Return to Branch Manager
                                </button>
                                <button className="btn btn-danger" disabled={actionLoading} onClick={() => doAction('gm-review', 'rejected')}>
                                    ❌ Reject Application
                                </button>
                            </>
                        )}

                        {/* Disburse */}
                        {canDisburse && (
                            <button className="btn btn-primary" disabled={actionLoading} onClick={doDisburse}>
                                🏦 Mark as Disbursed & Generate EMI Schedule
                            </button>
                        )}

                        {/* No action available */}
                        {!canDoOfficerReview && !canDoManagerReview && !canDoGMReview && !canDisburse && (
                            <div className="alert alert-info" style={{ width: '100%', margin: 0 }}>
                                <span>ℹ️</span>
                                <div className="alert-body">
                                    <p>
                                        {loan.workflowStage === 'rejected' && 'This loan has been rejected. No further actions available.'}
                                        {loan.workflowStage === 'disbursed' && 'This loan has been fully disbursed.'}
                                        {loan.workflowStage === 'returned' && 'This loan is awaiting applicant resubmission.'}
                                        {!['rejected', 'disbursed', 'returned'].includes(loan.workflowStage) && `This loan is in "${loan.workflowStage?.replace(/_/g, ' ')}" stage — not in your review queue.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanDetail;
