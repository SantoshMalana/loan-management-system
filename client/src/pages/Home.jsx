import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const STAFF_ROLES = ['branch_manager'];

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const LOAN_TYPES = [
    { emoji: '🏠', type: 'Home Loan', rate: '8.75% p.a.', max: '₹5 Crore', tenure: 'Up to 30 years', desc: 'Purchase, construct or renovate your home.' },
    { emoji: '🎓', type: 'Education Loan', rate: '9.0% p.a.', max: '₹75 Lakh', tenure: 'Up to 7 years', desc: 'Study in India or abroad. IBA model scheme.' },
    { emoji: '💳', type: 'Personal Loan', rate: '13.5% p.a.', max: '₹25 Lakh', tenure: 'Up to 5 years', desc: 'Instant credit for any personal need.' },
    { emoji: '🏭', type: 'Business Loan', rate: '14.0% p.a.', max: '₹2 Crore', tenure: 'Up to 7 years', desc: 'Working capital, expansion or equipment.' },
    { emoji: '🚗', type: 'Vehicle Loan', rate: '10.5% p.a.', max: '₹50 Lakh', tenure: 'Up to 7 years', desc: 'Two-wheelers, cars or commercial vehicles.' },
    { emoji: '🥇', type: 'Gold Loan', rate: '9.5% p.a.', max: '₹50 Lakh', tenure: 'Up to 2 years', desc: 'Instant loan against gold ornaments or coins.' },
];

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Kotak Mahindra', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'Yes Bank'];

const STEPS = [
    { icon: '📝', title: 'Register & Apply', desc: 'Create your account, fill in your profile and submit a loan application in minutes.' },
    { icon: '🏦', title: 'Bank Manager Reviews', desc: 'Your assigned bank manager verifies your CIBIL score, income and documents.' },
    { icon: '✅', title: 'Sanction & Disburse', desc: 'Once approved, the loan is sanctioned and amount credited to your bank account.' },
    { icon: '📅', title: 'Repay via EMI', desc: 'A detailed EMI schedule is generated. Repay comfortably every month.' },
];

const Home = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Redirect logged-in users to their dashboard
    if (user) {
        if (STAFF_ROLES.includes(user.role)) {
            navigate('/officer', { replace: true });
        } else {
            navigate('/dashboard', { replace: true });
        }
        return null;
    }

    return (
        <div style={{ overflowX: 'hidden' }}>

            {/* ── Hero ── */}
            <section style={{
                background: 'linear-gradient(135deg, #0c1445 0%, #1a3a8f 50%, #0c1445 100%)',
                color: 'white', padding: '5rem 2rem 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
                {/* Background pattern */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 40%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.15)' }}>
                        🇮🇳 RBI-Compliant · Indian Banking System
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                        Apply for a Loan from<br />
                        <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Top Indian Banks
                        </span>
                    </h1>
                    <p style={{ fontSize: '1.05rem', opacity: 0.8, maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.6 }}>
                        Education, Home, Personal, Business, Vehicle and Gold loans — processed by real Bank Managers with full transparency at every stage.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register">
                            <button style={{ background: 'white', color: '#1a3a8f', fontWeight: 800, fontSize: '0.95rem', padding: '0.85rem 2rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer' }}>
                                Apply Now →
                            </button>
                        </Link>
                        <Link to="/emi-calculator">
                            <button style={{ background: 'transparent', color: 'white', fontWeight: 700, fontSize: '0.95rem', padding: '0.85rem 2rem', borderRadius: 'var(--radius)', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                                🧮 EMI Calculator
                            </button>
                        </Link>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
                        {[
                            { value: '10', label: 'Partner Banks' },
                            { value: '6', label: 'Loan Types' },
                            { value: '8.75%', label: 'Starting Rate' },
                            { value: '₹5 Cr', label: 'Max Loan' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#93c5fd' }}>{s.value}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Bank Logos ── */}
            <section style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                        Partner Banks
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {BANKS.map(b => (
                            <span key={b} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {b}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Loan Types ── */}
            <section style={{ padding: '4rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>Loan Products</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Competitive rates aligned with RBI and IBA guidelines</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {LOAN_TYPES.map(loan => (
                        <div key={loan.type} style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', transition: 'all 0.2s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,86,219,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{loan.emoji}</div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.35rem' }}>{loan.type}</h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>{loan.desc}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {[
                                    ['Rate', loan.rate],
                                    ['Max Amount', loan.max],
                                    ['Tenure', loan.tenure],
                                ].map(([l, v]) => (
                                    <div key={l} style={{ background: '#f8fafc', borderRadius: 6, padding: '0.5rem 0.6rem' }}>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>{l}</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link to="/register">
                        <button className="btn btn-primary btn-lg">Get Started — Apply Now →</button>
                    </Link>
                </div>
            </section>

            {/* ── How it Works ── */}
            <section style={{ background: '#f0f7ff', padding: '4rem 2rem' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>How It Works</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Simple 4-step process, full transparency at every stage</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {STEPS.map((step, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.5rem', textAlign: 'center', border: '1px solid var(--border)', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>
                                    {i + 1}
                                </div>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem', marginTop: '0.5rem' }}>{step.icon}</div>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{step.title}</h4>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Staff Portals ── */}
            <section style={{ padding: '4rem 2rem', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Bank Staff Access</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Secure portal for Bank Managers
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', maxWidth: 300, margin: '0 auto' }}>
                    <Link to="/bm-login" style={{ textDecoration: 'none', width: '100%' }}>
                        <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 'var(--radius)', padding: '1.5rem', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#8b5cf6'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd6fe'}
                        >
                            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🏦</div>
                            <div style={{ fontWeight: 700, color: '#6d28d9', marginBottom: '0.25rem' }}>Bank Manager</div>
                            <div style={{ fontSize: '0.78rem', color: '#7c3aed' }}>Review & sanction loans</div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ background: '#0c1445', color: 'rgba(255,255,255,0.6)', padding: '2rem', textAlign: 'center', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.4rem', fontSize: '1rem' }}>🏦 BharatLoanMS</div>
                <p style={{ margin: '0 0 0.5rem' }}>RBI-compliant Loan Management System · India</p>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>
                    Helpline: <strong style={{ color: 'white' }}>1800-180-1111</strong> · Mon–Sat, 9AM–6PM IST
                </p>
            </footer>
        </div>
    );
};

export default Home;
