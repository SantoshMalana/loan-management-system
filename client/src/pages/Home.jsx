import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const loanTypes = [
    { emoji: '🎓', name: 'Education Loan', rate: '9.00% p.a.', max: '₹75 Lakhs', desc: 'Study in India or abroad. No collateral up to ₹7.5L.' },
    { emoji: '🏠', name: 'Home Loan', rate: '8.75% p.a.', max: '₹5 Crores', desc: 'Bhuilt or under-construction property. 30-year tenure.' },
    { emoji: '💳', name: 'Personal Loan', rate: '13.50% p.a.', max: '₹25 Lakhs', desc: 'No collateral. Quick disbursement in 48 hours.' },
    { emoji: '🏭', name: 'Business Loan', rate: '14.00% p.a.', max: '₹2 Crores', desc: 'Capital for MSMEs, startups, and established businesses.' },
    { emoji: '🚗', name: 'Vehicle Loan', rate: '10.50% p.a.', max: '₹50 Lakhs', desc: 'For two-wheelers, cars, and commercial vehicles.' },
    { emoji: '🥇', name: 'Gold Loan', rate: '9.50% p.a.', max: '₹50 Lakhs', desc: 'Instant loan against gold ornaments or coins.' },
];

const process = [
    { num: '1', title: 'Fill Application', desc: 'Complete the digital application form with your details and loan requirement.' },
    { num: '2', title: 'Document Submission', desc: 'Upload KYC, income proof, and collateral documents (if applicable).' },
    { num: '3', title: 'Officer Review', desc: 'Our Loan Officer verifies your application and forwards to Branch Manager.' },
    { num: '4', title: 'Approval & Sanction', desc: 'Branch Manager approves and issues the Loan Sanction Letter.' },
    { num: '5', title: 'Disbursement', desc: 'Approved amount credited directly to your bank account.' },
];

const Home = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="anim-fade">
            {/* Hero */}
            <section className="hero">
                <div className="hero-content">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        🇮🇳 RBI-compliant Loan Management System
                    </div>
                    <h1>Smart Loans for Every Indian Dream</h1>
                    <p>
                        From education to homeownership — apply online, track your application in real-time, and get disbursed fast. Fully compliant with Indian banking regulations.
                    </p>
                    <div className="hero-cta">
                        {user ? (
                            <Link to="/apply"><button className="btn btn-white btn-lg">Apply for a Loan</button></Link>
                        ) : (
                            <>
                                <Link to="/register"><button className="btn btn-white btn-lg">Get Started — Free</button></Link>
                                <Link to="/emi-calculator"><button className="btn btn-outline-white btn-lg">EMI Calculator</button></Link>
                            </>
                        )}
                    </div>
                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
                        {[['₹500Cr+', 'Loans Disbursed'], ['50,000+', 'Happy Customers'], ['7 Days', 'Avg. Processing'], ['8.75%', 'Starting Rate']].map(([val, lbl]) => (
                            <div key={lbl} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>{val}</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{lbl}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Loan Types */}
            <section style={{ padding: '4rem 0', background: 'white' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2>Loan Products</h2>
                        <p style={{ marginTop: '0.5rem' }}>Competitive rates aligned with RBI guidelines. Choose the right loan for your needs.</p>
                    </div>
                    <div className="loan-types-grid">
                        {loanTypes.map(lt => (
                            <div key={lt.name} className="loan-type-card anim-up-1">
                                <div className="lt-icon">{lt.emoji}</div>
                                <h4>{lt.name}</h4>
                                <p>{lt.desc}</p>
                                <div className="lt-rate">{lt.rate} · Up to {lt.max}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Education Loan Highlight */}
            <section style={{ padding: '4rem 0', background: 'var(--bg)' }}>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '20px', marginBottom: '1rem' }}>
                                🎓 VIDYA LAKSHMI SCHEME
                            </div>
                            <h2>Education Loan — No Collateral Required up to ₹7.5 Lakh</h2>
                            <p style={{ marginTop: '0.75rem', marginBottom: '1.5rem', lineHeight: 1.8 }}>
                                As per RBI/IBA Model Education Loan Scheme, no security is required for education loans up to ₹7.5 lakhs. For loans above this amount, tangible collateral such as land, property, or FDs must be pledged.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    ['Up to ₹4 Lakh', 'No collateral, no guarantor required'],
                                    ['₹4 – ₹7.5 Lakh', 'Third-party guarantor required'],
                                    ['Above ₹7.5 Lakh', 'Tangible collateral + guarantor required'],
                                ].map(([range, desc]) => (
                                    <div key={range} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ background: 'var(--primary)', color: 'white', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{range}</div>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{desc}</span>
                                    </div>
                                ))}
                            </div>
                            <Link to={user ? '/apply' : '/register'} style={{ display: 'inline-block', marginTop: '1.75rem' }}>
                                <button className="btn btn-primary">Apply for Education Loan →</button>
                            </Link>
                        </div>
                        <div className="eligibility-box">
                            <h3 style={{ marginBottom: '0.25rem' }}>General Eligibility Criteria</h3>
                            <p style={{ fontSize: '0.85rem' }}>Basic requirements to apply for a loan in India</p>
                            <div className="eligibility-grid">
                                {[
                                    ['🎂', 'Age', '21 – 65 years at time of loan maturity'],
                                    ['📊', 'CIBIL Score', '700+ recommended for better rates'],
                                    ['💼', 'Employment', 'Salaried/Self-employed with stable income'],
                                    ['📋', 'KYC', 'Aadhaar, PAN, photograph required'],
                                    ['🏠', 'Residence', 'Indian resident or NRI with valid docs'],
                                    ['💰', 'Income', 'Minimum ₹15,000/month net income'],
                                ].map(([icon, title, desc]) => (
                                    <div key={title} className="elig-item">
                                        <div className="elig-icon">{icon}</div>
                                        <div className="elig-text">
                                            <h5>{title}</h5>
                                            <p>{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section style={{ padding: '4rem 0', background: 'white' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2>How the Process Works</h2>
                        <p style={{ marginTop: '0.5rem' }}>Transparent, fair, and fully compliant with Indian banking norms</p>
                    </div>
                    <div className="process-steps">
                        {process.map(p => (
                            <div key={p.num} className="process-step anim-up-1">
                                <div className="process-num">{p.num}</div>
                                <h4>{p.title}</h4>
                                <p>{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg, #0f2461, #1a56db)', textAlign: 'center' }}>
                <h2 style={{ color: 'white', marginBottom: '0.75rem' }}>Ready to Apply?</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>Get started in 5 minutes. No hidden fees, no surprises.</p>
                <Link to={user ? '/apply' : '/register'}>
                    <button className="btn btn-white btn-lg">Start Your Application</button>
                </Link>
            </section>
        </div>
    );
};

export default Home;
