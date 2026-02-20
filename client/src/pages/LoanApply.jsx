import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const LOAN_CONFIGS = {
    Education: {
        emoji: '🎓', description: 'Study in India or abroad. RBI Model Education Loan Scheme.',
        maxAmount: 7500000, interestRate: 9.0,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'Admission Letter', 'Fee Structure', 'Income Proof of Co-applicant', 'Bank Statement (6 months)'],
    },
    Home: {
        emoji: '🏠', description: 'Purchase, construction, or renovation of residential property.',
        maxAmount: 50000000, interestRate: 8.75,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'Property Papers / Title Deed', 'NOC from Society', 'Income Proof', 'ITR (2 years)', 'Bank Statement (6 months)'],
    },
    Personal: {
        emoji: '💳', description: 'Instant credit for any personal financial need.',
        maxAmount: 2500000, interestRate: 13.5,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'Latest Salary Slips (3 months)', 'Bank Statement (6 months)'],
    },
    Business: {
        emoji: '🏭', description: 'Working capital, expansion, or equipment for your business.',
        maxAmount: 20000000, interestRate: 14.0,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'GST Registration', 'Business Proof', 'Balance Sheet (2 years)', 'ITR (2 years)', 'Bank Statement (12 months)'],
    },
    Vehicle: {
        emoji: '🚗', description: 'Two-wheelers, cars, or commercial vehicles.',
        maxAmount: 5000000, interestRate: 10.5,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'Income Proof', 'Vehicle Quotation', 'Bank Statement (3 months)'],
    },
    Gold: {
        emoji: '🥇', description: 'Instant loan against gold ornaments or coins.',
        maxAmount: 5000000, interestRate: 9.5,
        requiredDocs: ['Aadhaar', 'PAN', 'Photograph', 'Gold Purity Certificate (from bank appraiser)'],
    },
};

const calcEMI = (P, ratePA, n) => {
    const r = ratePA / 100 / 12;
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
};

const getCollateralInfo = (loanType, amount) => {
    if (loanType === 'Education') {
        if (amount <= 400000) return { required: false, guarantor: false, msg: null };
        if (amount <= 750000) return { required: false, guarantor: true, msg: '🔑 For education loans between ₹4L–₹7.5L, a third-party guarantor (parent/guardian) is required as per IBA guidelines.' };
        return { required: true, guarantor: true, msg: '📋 For education loans above ₹7.5L, tangible collateral (land, property, FD, NSC) + guarantor is required as per RBI/IBA scheme.' };
    }
    if (loanType === 'Home') return { required: true, guarantor: false, msg: '🏠 Property documents (title deed, NOC, sale agreement) must be submitted as collateral.' };
    if (loanType === 'Personal' && amount > 1500000) return { required: true, guarantor: false, msg: '💼 For personal loans above ₹15L, collateral security may be required.' };
    if (loanType === 'Business' && amount > 1000000) return { required: true, guarantor: true, msg: '🏭 Business loans above ₹10L require collateral and a guarantor.' };
    return { required: false, guarantor: false, msg: null };
};

const STEPS = ['Loan Type', 'Loan Details', 'Collateral & Guarantor', 'Documents', 'Review & Submit'];

const LoanApply = () => {
    const [step, setStep] = useState(0);
    const [selectedType, setSelectedType] = useState('');
    const [form, setForm] = useState({
        amount: '', termMonths: '', purpose: '', bankName: 'SBI',
        // Education
        'educationDetails.institutionName': '',
        'educationDetails.courseName': '',
        'educationDetails.courseDuration': '',
        'educationDetails.countryOfStudy': 'India',
        'educationDetails.feesPerYear': '',
        // Collateral
        'collateral.type': '', 'collateral.description': '', 'collateral.estimatedValue': '',
        // Guarantor
        'guarantor.name': '', 'guarantor.relationship': '', 'guarantor.phone': '',
        'guarantor.aadhaar': '', 'guarantor.monthlyIncome': '', 'guarantor.address': '',
        // Documents checklist
        'documents.aadhaarSubmitted': false,
        'documents.panSubmitted': false,
        'documents.photograph': false,
        'documents.incomeProof': false,
        'documents.bankStatement': false,
        'documents.admissionLetter': false,
        'documents.propertyPapers': false,
        'documents.itReturns': false,
        'documents.collateralDocs': false,
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const cfg = LOAN_CONFIGS[selectedType] || {};
    const amount = Number(form.amount) || 0;
    const emi = selectedType && amount && form.termMonths ? calcEMI(amount, cfg.interestRate, Number(form.termMonths)) : 0;
    const collInfo = getCollateralInfo(selectedType, amount);

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const nextStep = () => {
        setError('');
        if (step === 0 && !selectedType) { setError('Please select a loan type.'); return; }
        if (step === 1) {
            if (!form.amount || !form.termMonths) { setError('Please fill amount and tenure.'); return; }
            if (amount < 10000) { setError('Minimum loan amount is ₹10,000.'); return; }
            if (cfg.maxAmount && amount > cfg.maxAmount) { setError(`Maximum loan amount for ${selectedType} loan is ${fmt(cfg.maxAmount)}.`); return; }
        }
        setStep(s => s + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                loanType: selectedType,
                bankName: form.bankName,
                purpose: form.purpose,
                amount: Number(form.amount),
                termMonths: Number(form.termMonths),
                documents: {
                    aadhaarSubmitted: form['documents.aadhaarSubmitted'],
                    panSubmitted: form['documents.panSubmitted'],
                    photograph: form['documents.photograph'],
                    incomeProof: form['documents.incomeProof'],
                    bankStatement: form['documents.bankStatement'],
                    admissionLetter: form['documents.admissionLetter'],
                    propertyPapers: form['documents.propertyPapers'],
                    itReturns: form['documents.itReturns'],
                    collateralDocs: form['documents.collateralDocs'],
                },
            };
            if (selectedType === 'Education') {
                payload.educationDetails = {
                    institutionName: form['educationDetails.institutionName'],
                    courseName: form['educationDetails.courseName'],
                    courseDuration: Number(form['educationDetails.courseDuration']),
                    countryOfStudy: form['educationDetails.countryOfStudy'],
                    feesPerYear: Number(form['educationDetails.feesPerYear']),
                };
            }
            if (collInfo.required && form['collateral.type']) {
                payload.collateral = {
                    type: form['collateral.type'],
                    description: form['collateral.description'],
                    estimatedValue: Number(form['collateral.estimatedValue']),
                };
            }
            if (collInfo.guarantor && form['guarantor.name']) {
                payload.guarantor = {
                    name: form['guarantor.name'],
                    relationship: form['guarantor.relationship'],
                    phone: form['guarantor.phone'],
                    aadhaar: form['guarantor.aadhaar'],
                    monthlyIncome: Number(form['guarantor.monthlyIncome']),
                    address: form['guarantor.address'],
                };
            }
            await api.post('/loans', payload);
            navigate('/dashboard', { state: { success: true } });
        } catch (err) {
            setError(err?.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="anim-fade" style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>Loan Application</h2>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.88rem' }}>Application Reference will be generated upon submission.</p>

            {/* Officer guard — officers cannot apply for loans */}
            {user && ['loan_officer', 'branch_manager', 'general_manager', 'admin'].includes(user.role) && (
                <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛️</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#92400e', marginBottom: '0.5rem' }}>
                        You are logged in as a Bank Officer
                    </div>
                    <p style={{ color: '#78350f', fontSize: '0.88rem', marginBottom: '1rem' }}>
                        The loan application form is for applicants only. Officers review and approve applications but cannot submit new ones.
                    </p>
                    <a href="/officer" style={{ background: '#f59e0b', color: 'white', padding: '0.6rem 1.5rem', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
                        Go to Officer Panel →
                    </a>
                </div>
            )}

            {/* Step Progress */}
            <div style={{ display: 'flex', marginBottom: '2rem' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            {i > 0 && <div style={{ flex: 1, height: 2, background: i <= step ? 'var(--primary)' : 'var(--border)' }} />}
                            <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                background: i < step ? 'var(--success)' : i === step ? 'var(--primary)' : 'var(--border)',
                                color: i <= step ? 'white' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.78rem', fontWeight: 700,
                            }}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--success)' : 'var(--border)' }} />}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: i === step ? 'var(--primary)' : i < step ? 'var(--success)' : 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>{s}</div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-body"><p>{error}</p></div>
                </div>
            )}

            <div className="card">
                {/* Step 0: Loan Type */}
                {step === 0 && (
                    <>
                        <h3 style={{ marginBottom: '1.25rem' }}>Select Loan Type</h3>
                        <div className="loan-types-grid">
                            {Object.entries(LOAN_CONFIGS).map(([type, c]) => (
                                <div
                                    key={type}
                                    className="loan-type-card"
                                    onClick={() => { setSelectedType(type); setError(''); }}
                                    style={{ border: selectedType === type ? '2px solid var(--primary)' : undefined, background: selectedType === type ? 'var(--primary-light)' : undefined }}
                                >
                                    <div className="lt-icon">{c.emoji}</div>
                                    <h4>{type}</h4>
                                    <p>{c.description}</p>
                                    <div className="lt-rate">{c.interestRate}% p.a.</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Step 1: Loan Details */}
                {step === 1 && (
                    <>
                        <h3 style={{ marginBottom: '1.25rem' }}>{cfg.emoji} {selectedType} Loan Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Loan Amount (₹)<span className="required">*</span></label>
                                <input type="number" placeholder="e.g. 500000" value={form.amount} onChange={e => update('amount', e.target.value)} />
                                <span className="form-hint">Max: {fmt(cfg.maxAmount)}</span>
                            </div>
                            <div className="form-group">
                                <label>Repayment Tenure<span className="required">*</span></label>
                                <select value={form.termMonths} onChange={e => update('termMonths', e.target.value)}>
                                    <option value="">Select Tenure</option>
                                    {selectedType === 'Education' && [12, 24, 36, 48, 60, 72, 84].map(m => <option key={m} value={m}>{m} months ({m / 12} yr)</option>)}
                                    {selectedType === 'Home' && [60, 84, 120, 180, 240, 300, 360].map(m => <option key={m} value={m}>{m} months ({m / 12} yr)</option>)}
                                    {selectedType === 'Personal' && [12, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} months</option>)}
                                    {selectedType === 'Business' && [12, 24, 36, 48, 60, 84].map(m => <option key={m} value={m}>{m} months</option>)}
                                    {selectedType === 'Vehicle' && [12, 24, 36, 48, 60, 84].map(m => <option key={m} value={m}>{m} months</option>)}
                                    {selectedType === 'Gold' && [3, 6, 9, 12, 18, 24].map(m => <option key={m} value={m}>{m} months</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Select Bank<span className="required">*</span></label>
                            <select value={form.bankName} onChange={e => update('bankName', e.target.value)}>
                                {['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <span className="form-hint">Choose the bank you wish to apply to.</span>
                        </div>
                        <div className="form-group">
                            <label>Purpose / Reason for Loan</label>
                            <textarea placeholder="Briefly describe the purpose of this loan..." value={form.purpose} onChange={e => update('purpose', e.target.value)} style={{ minHeight: 80 }} />
                        </div>

                        {selectedType === 'Education' && (
                            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
                                <h4 style={{ marginBottom: '1rem', color: '#0369a1' }}>🎓 Education Details</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Institution Name</label>
                                        <input type="text" placeholder="IIT Bombay / Oxford University" value={form['educationDetails.institutionName']} onChange={e => update('educationDetails.institutionName', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Course Name</label>
                                        <input type="text" placeholder="B.Tech Computer Science" value={form['educationDetails.courseName']} onChange={e => update('educationDetails.courseName', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Country of Study</label>
                                        <select value={form['educationDetails.countryOfStudy']} onChange={e => update('educationDetails.countryOfStudy', e.target.value)}>
                                            <option>India</option><option>Abroad</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Annual Fees (₹)</label>
                                        <input type="number" placeholder="250000" value={form['educationDetails.feesPerYear']} onChange={e => update('educationDetails.feesPerYear', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {emi > 0 && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
                                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem' }}>📊 Estimated Loan Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                                    {[
                                        ['Loan Amount', fmt(form.amount)],
                                        ['Monthly EMI', fmt(emi)],
                                        ['Interest Rate', `${cfg.interestRate}% p.a.`],
                                        ['Tenure', `${form.termMonths} months`],
                                        ['Total Payable', fmt(emi * Number(form.termMonths))],
                                        ['Total Interest', fmt(emi * Number(form.termMonths) - Number(form.amount))],
                                    ].map(([l, v]) => (
                                        <div key={l} style={{ background: 'white', borderRadius: 8, padding: '0.75rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>{l}</div>
                                            <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.95rem' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Collateral & Guarantor */}
                {step === 2 && (
                    <>
                        <h3 style={{ marginBottom: '1.25rem' }}>Collateral & Guarantor</h3>

                        {collInfo.msg && (
                            <div className="collateral-notice">
                                <h4>⚠️ Security Requirement</h4>
                                <p>{collInfo.msg}</p>
                            </div>
                        )}

                        {!collInfo.required && !collInfo.guarantor && (
                            <div className="alert alert-success">
                                <span className="alert-icon">✅</span>
                                <div className="alert-body">
                                    <strong>No Collateral Required</strong>
                                    <p>Based on your loan type and amount, no security or guarantor is required for this application.</p>
                                </div>
                            </div>
                        )}

                        {collInfo.required && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1rem' }}>🏦 Collateral Details</h4>
                                <div className="form-group">
                                    <label>Type of Security<span className="required">*</span></label>
                                    <select value={form['collateral.type']} onChange={e => update('collateral.type', e.target.value)}>
                                        <option value="">Select Collateral Type</option>
                                        <option>Land</option>
                                        <option>Residential Property</option>
                                        <option>Commercial Property</option>
                                        <option>FD/NSC</option>
                                        <option>Gold</option>
                                        <option>Vehicle</option>
                                        <option>Insurance Policy</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea placeholder="e.g. Plot No. 42, Sector 5, Pune — 1500 sq ft residential land" value={form['collateral.description']} onChange={e => update('collateral.description', e.target.value)} style={{ minHeight: 70 }} />
                                </div>
                                <div className="form-group">
                                    <label>Estimated Market Value (₹)</label>
                                    <input type="number" placeholder="2000000" value={form['collateral.estimatedValue']} onChange={e => update('collateral.estimatedValue', e.target.value)} />
                                    <span className="form-hint">As per latest government circle rate or market valuation</span>
                                </div>
                            </div>
                        )}

                        {collInfo.guarantor && (
                            <div>
                                <h4 style={{ marginBottom: '1rem' }}>👤 Guarantor Details</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Guarantor Full Name</label>
                                        <input type="text" placeholder="Ramesh Kumar" value={form['guarantor.name']} onChange={e => update('guarantor.name', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Relationship with Applicant</label>
                                        <input type="text" placeholder="Father / Mother / Spouse" value={form['guarantor.relationship']} onChange={e => update('guarantor.relationship', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" placeholder="9876543210" value={form['guarantor.phone']} onChange={e => update('guarantor.phone', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Aadhaar Number</label>
                                        <input type="text" placeholder="123456789012" maxLength={12} value={form['guarantor.aadhaar']} onChange={e => update('guarantor.aadhaar', e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Monthly Income (₹)</label>
                                        <input type="number" placeholder="50000" value={form['guarantor.monthlyIncome']} onChange={e => update('guarantor.monthlyIncome', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input type="text" placeholder="Full address with pincode" value={form['guarantor.address']} onChange={e => update('guarantor.address', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Step 3: Documents */}
                {step === 3 && (
                    <>
                        <h3 style={{ marginBottom: '0.5rem' }}>Document Checklist</h3>
                        <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>Confirm which documents you have ready to submit at the branch. Physical copies will be verified during loan processing.</p>

                        <div className="alert alert-warning">
                            <span className="alert-icon">📌</span>
                            <div className="alert-body"><p>This is a digital declaration. Actual documents must be submitted physically at the branch. Originals + self-attested photocopies required.</p></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            {[
                                ['documents.aadhaarSubmitted', '🪪 Aadhaar Card (original + photocopy)', true],
                                ['documents.panSubmitted', '💳 PAN Card (original + photocopy)', true],
                                ['documents.photograph', '📸 Passport-size Photographs (3 copies)', true],
                                ['documents.incomeProof', '💰 Income Proof (salary slips / ITR)', selectedType !== 'Gold'],
                                ['documents.bankStatement', '🏦 Bank Statement (last 6 months)', selectedType !== 'Gold'],
                                ['documents.admissionLetter', '🎓 Admission Letter / Fee Structure', selectedType === 'Education'],
                                ['documents.propertyPapers', '📄 Property / Title Deed Documents', selectedType === 'Home'],
                                ['documents.itReturns', '📊 IT Returns (last 2 years)', ['Business', 'Home'].includes(selectedType)],
                                ['documents.collateralDocs', '🏛️ Collateral / Security Documents', collInfo.required],
                            ].filter(([, , show]) => show !== false).map(([key, label]) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: form[key] ? '#f0fdf4' : '#f9fafb', border: `1.5px solid ${form[key] ? '#86efac' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.88rem', fontWeight: 500 }}>
                                    <input
                                        type="checkbox"
                                        checked={form[key]}
                                        onChange={e => update(key, e.target.checked)}
                                        style={{ width: 18, height: 18, accentColor: 'var(--success)', flexShrink: 0, marginBottom: 0 }}
                                    />
                                    {label}
                                    {form[key] && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 700 }}>✓</span>}
                                </label>
                            ))}
                        </div>
                    </>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <form onSubmit={handleSubmit}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Review & Submit</h3>
                        <div className="alert alert-info">
                            <span className="alert-icon">ℹ️</span>
                            <div className="alert-body"><p>Please review your application before submitting. Once submitted, changes cannot be made without contacting the branch.</p></div>
                        </div>

                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loan Details</div>
                                {[
                                    ['Applicant', user?.fullName],
                                    ['Loan Type', selectedType],
                                    ['Amount', fmt(form.amount)],
                                    ['Tenure', `${form.termMonths} months`],
                                    ['Interest Rate', `${cfg.interestRate}% p.a.`],
                                    ['Monthly EMI', fmt(emi)],
                                ].map(([l, v]) => (
                                    <div key={l} className="detail-row">
                                        <span className="detail-label">{l}</span>
                                        <span className="detail-value">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Security Status</div>
                                {[
                                    ['Collateral Required', collInfo.required ? 'Yes' : 'No'],
                                    ['Guarantor Required', collInfo.guarantor ? 'Yes' : 'No'],
                                    ['Collateral Type', form['collateral.type'] || '—'],
                                    ['Guarantor Name', form['guarantor.name'] || '—'],
                                    ['Total Payable', fmt(emi * Number(form.termMonths))],
                                    ['Total Interest', fmt(emi * Number(form.termMonths) - Number(form.amount))],
                                ].map(([l, v]) => (
                                    <div key={l} className="detail-row">
                                        <span className="detail-label">{l}</span>
                                        <span className="detail-value">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="alert alert-warning">
                            <span className="alert-icon">⚖️</span>
                            <div className="alert-body">
                                <strong>Declaration</strong>
                                <p>I hereby declare that all information provided is true and accurate. I understand that submitting false information is an offence under the Indian Penal Code and Banking Regulation Act, 1949.</p>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting} style={{ marginTop: '1rem' }}>
                            {submitting ? '⏳ Submitting Application...' : '✅ Submit Application'}
                        </button>
                    </form>
                )}

                {/* Navigation Buttons */}
                {step < 4 && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        {step > 0 && (
                            <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep(s => s - 1); }}>
                                ← Back
                            </button>
                        )}
                        <button type="button" className="btn btn-primary btn-full" onClick={nextStep}>
                            {step === 3 ? 'Review Application →' : 'Continue →'}
                        </button>
                    </div>
                )}
                {step === 4 && (
                    <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep(3); }} style={{ marginTop: '0.75rem' }}>
                        ← Back to Documents
                    </button>
                )}
            </div>
        </div>
    );
};

export default LoanApply;
