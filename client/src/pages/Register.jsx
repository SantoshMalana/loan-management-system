import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Delhi', 'Chandigarh', 'Puducherry', 'Jammu & Kashmir', 'Ladakh'
];

const Register = () => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        username: '', password: '', confirmPassword: '', fullName: '', email: '', phone: '',
        dateOfBirth: '', gender: '',
        aadhaarNumber: '', panNumber: '',
        'address.street': '', 'address.city': '', 'address.state': '', 'address.pincode': '',
        employmentType: '', employerName: '', monthlyIncome: '',
        bankName: '', bankAccountNumber: '', ifscCode: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const validateStep1 = () => {
        if (!form.fullName || !form.username || !form.email || !form.phone || !form.password) return 'All fields required';
        if (form.password !== form.confirmPassword) return 'Passwords do not match';
        if (form.password.length < 6) return 'Password must be at least 6 characters';
        if (!/^\d{10}$/.test(form.phone)) return 'Enter valid 10-digit phone number';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address';
        return null;
    };

    const validateStep2 = () => {
        if (!form.aadhaarNumber || !form.panNumber) return 'Aadhaar and PAN are required';
        if (!/^\d{12}$/.test(form.aadhaarNumber)) return 'Aadhaar must be 12 digits';
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) return 'Enter valid PAN (e.g., ABCDE1234F)';
        return null;
    };

    const nextStep = () => {
        let err = null;
        if (step === 1) err = validateStep1();
        if (step === 2) err = validateStep2();
        if (err) { setError(err); return; }
        setError('');
        setStep(s => s + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                username: form.username,
                password: form.password,
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
                dateOfBirth: form.dateOfBirth || undefined,
                gender: form.gender || undefined,
                aadhaarNumber: form.aadhaarNumber,
                panNumber: form.panNumber.toUpperCase(),
                address: {
                    street: form['address.street'],
                    city: form['address.city'],
                    state: form['address.state'],
                    pincode: form['address.pincode'],
                },
                employmentType: form.employmentType || undefined,
                employerName: form.employerName || undefined,
                monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
                bankName: form.bankName || undefined,
                bankAccountNumber: form.bankAccountNumber || undefined,
                ifscCode: form.ifscCode || undefined,
            };
            await register(payload);
            navigate('/login', { state: { msg: 'Account created! Please login.' } });
        } catch (err) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = ['Basic Info', 'KYC Details', 'Employment', 'Bank Details'];

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <h2>Open Your Account</h2>
                    <p>Complete your profile once and apply for any loan type instantly. Your information is secured with bank-grade encryption.</p>
                    <ul className="auth-features">
                        <li>Education Loans up to ₹75 Lakhs</li>
                        <li>Home Loans starting at 8.75%</li>
                        <li>Personal Loans up to ₹25 Lakhs</li>
                        <li>Quick 7-day processing</li>
                    </ul>
                </div>
            </div>
            <div className="auth-right" style={{ width: '520px', padding: '2rem 2.5rem', overflowY: 'auto' }}>
                <h2 className="auth-title">Create Account</h2>
                <p className="auth-sub">Step {step} of {steps.length} — {steps[step - 1]}</p>

                {/* Step Indicator */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: i < step ? 'var(--primary)' : 'var(--border)',
                            transition: 'background 0.3s'
                        }} />
                    ))}
                </div>

                {error && (
                    <div className="alert alert-danger">
                        <span className="alert-icon">⚠️</span>
                        <div className="alert-body"><p>{error}</p></div>
                    </div>
                )}

                <form onSubmit={step === 4 ? handleSubmit : e => { e.preventDefault(); nextStep(); }}>
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <>
                            <div className="form-group">
                                <label>Full Name (as per Aadhaar)<span className="required">*</span></label>
                                <input type="text" placeholder="Rajan Kumar Sharma" value={form.fullName} onChange={e => update('fullName', e.target.value)} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Username<span className="required">*</span></label>
                                    <input type="text" placeholder="rajan_sharma" value={form.username} onChange={e => update('username', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone<span className="required">*</span></label>
                                    <input type="tel" placeholder="9876543210" value={form.phone} onChange={e => update('phone', e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email Address<span className="required">*</span></label>
                                <input type="email" placeholder="rajan@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select value={form.gender} onChange={e => update('gender', e.target.value)}>
                                        <option value="">Select</option>
                                        <option>Male</option><option>Female</option><option>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Password<span className="required">*</span></label>
                                    <input type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Confirm Password<span className="required">*</span></label>
                                    <input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 2: KYC */}
                    {step === 2 && (
                        <>
                            <div className="alert alert-info">
                                <span className="alert-icon">ℹ️</span>
                                <div className="alert-body"><p>KYC documents are mandatory as per RBI guidelines. Your data is encrypted and secure.</p></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Aadhaar Number<span className="required">*</span></label>
                                    <input type="text" placeholder="1234 5678 9012" maxLength={12} value={form.aadhaarNumber} onChange={e => update('aadhaarNumber', e.target.value.replace(/\D/g, ''))} required />
                                    <span className="form-hint">12-digit Aadhaar number</span>
                                </div>
                                <div className="form-group">
                                    <label>PAN Number<span className="required">*</span></label>
                                    <input type="text" placeholder="ABCDE1234F" maxLength={10} value={form.panNumber} onChange={e => update('panNumber', e.target.value.toUpperCase())} required />
                                    <span className="form-hint">10-character PAN</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Street / House No / Area</label>
                                <input type="text" placeholder="Flat 4B, Shanti Nagar Colony" value={form['address.street']} onChange={e => update('address.street', e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input type="text" placeholder="Mumbai" value={form['address.city']} onChange={e => update('address.city', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Pincode</label>
                                    <input type="text" placeholder="400001" maxLength={6} value={form['address.pincode']} onChange={e => update('address.pincode', e.target.value.replace(/\D/g, ''))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <select value={form['address.state']} onChange={e => update('address.state', e.target.value)}>
                                    <option value="">Select State</option>
                                    {STATES.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Step 3: Employment */}
                    {step === 3 && (
                        <>
                            <div className="form-group">
                                <label>Employment Type</label>
                                <select value={form.employmentType} onChange={e => update('employmentType', e.target.value)}>
                                    <option value="">Select</option>
                                    <option>Salaried</option>
                                    <option>Self-Employed</option>
                                    <option>Business</option>
                                    <option>Student</option>
                                    <option>Unemployed</option>
                                </select>
                            </div>
                            {['Salaried', 'Self-Employed', 'Business'].includes(form.employmentType) && (
                                <>
                                    <div className="form-group">
                                        <label>Employer / Company Name</label>
                                        <input type="text" placeholder="Infosys Ltd." value={form.employerName} onChange={e => update('employerName', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Monthly Income (₹)</label>
                                        <input type="number" placeholder="50000" value={form.monthlyIncome} onChange={e => update('monthlyIncome', e.target.value)} />
                                        <span className="form-hint">Net monthly take-home salary</span>
                                    </div>
                                </>
                            )}
                            {form.employmentType === 'Student' && (
                                <div className="alert alert-info">
                                    <span className="alert-icon">🎓</span>
                                    <div className="alert-body">
                                        <strong>Student Applicant</strong>
                                        <p>As a student, a co-applicant (parent/guardian) income will be required during the loan application process.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 4: Bank */}
                    {step === 4 && (
                        <>
                            <div className="alert alert-info">
                                <span className="alert-icon">🏦</span>
                                <div className="alert-body"><p>Loan disbursements will be made directly to this bank account. Ensure details are accurate.</p></div>
                            </div>
                            <div className="form-group">
                                <label>Bank Name</label>
                                <input type="text" placeholder="State Bank of India" value={form.bankName} onChange={e => update('bankName', e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Account Number</label>
                                    <input type="text" placeholder="123456789012" value={form.bankAccountNumber} onChange={e => update('bankAccountNumber', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>IFSC Code</label>
                                    <input type="text" placeholder="SBIN0001234" maxLength={11} value={form.ifscCode} onChange={e => update('ifscCode', e.target.value.toUpperCase())} />
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {step > 1 && (
                            <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep(s => s - 1); }}>
                                ← Back
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {step === 4 ? (loading ? 'Creating Account...' : 'Create Account') : 'Next →'}
                        </button>
                    </div>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
