import { useState } from 'react';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const LOAN_RATES = {
    Education: 9.0,
    Home: 8.75,
    Personal: 13.5,
    Business: 14.0,
    Vehicle: 10.5,
    Gold: 9.5,
};

const EMICalculator = () => {
    const [form, setForm] = useState({ loanType: 'Personal', principal: '', rate: '13.5', tenure: '', tenureType: 'months' });
    const [result, setResult] = useState(null);

    const update = (k, v) => {
        const newForm = { ...form, [k]: v };
        if (k === 'loanType') newForm.rate = LOAN_RATES[v] || '';
        setForm(newForm);
        setResult(null);
    };

    const calculate = (e) => {
        e.preventDefault();
        const P = Number(form.principal);
        const ratePA = Number(form.rate);
        const n = form.tenureType === 'years' ? Number(form.tenure) * 12 : Number(form.tenure);

        if (!P || !ratePA || !n) return;

        const r = ratePA / 100 / 12;
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayable = emi * n;
        const totalInterest = totalPayable - P;

        // Generate amortization schedule
        let balance = P;
        const schedule = [];
        for (let i = 1; i <= Math.min(n, 12); i++) {
            const interest = balance * r;
            const principal = emi - interest;
            balance -= principal;
            schedule.push({
                month: i,
                emi: Math.round(emi),
                principal: Math.round(principal),
                interest: Math.round(interest),
                balance: Math.max(0, Math.round(balance)),
            });
        }

        setResult({ emi: Math.round(emi), totalPayable: Math.round(totalPayable), totalInterest: Math.round(totalInterest), P, n, schedule, ratePA });
    };

    return (
        <div className="anim-fade" style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2>🧮 EMI Calculator</h2>
                <p>Calculate your Equated Monthly Instalment (EMI) before applying for a loan.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="card">
                    <h4 style={{ marginBottom: '1.25rem' }}>Loan Parameters</h4>
                    <form onSubmit={calculate}>
                        <div className="form-group">
                            <label>Loan Type</label>
                            <select value={form.loanType} onChange={e => update('loanType', e.target.value)}>
                                {Object.keys(LOAN_RATES).map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Principal Amount (₹)<span className="required">*</span></label>
                            <input type="number" placeholder="e.g. 500000" value={form.principal} onChange={e => update('principal', e.target.value)} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Annual Interest Rate (%)</label>
                                <input type="number" step="0.01" placeholder="12.5" value={form.rate} onChange={e => update('rate', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Tenure Type</label>
                                <select value={form.tenureType} onChange={e => update('tenureType', e.target.value)}>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Loan Tenure ({form.tenureType})<span className="required">*</span></label>
                            <input type="number" placeholder={form.tenureType === 'years' ? 'e.g. 5' : 'e.g. 60'} value={form.tenure} onChange={e => update('tenure', e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full">Calculate EMI</button>
                    </form>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>📋 Standard Rates (Approx.)</div>
                        {Object.entries(LOAN_RATES).map(([t, r]) => (
                            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #e0f2fe' }}>
                                <span>{t} Loan</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{r}% p.a.</span>
                            </div>
                        ))}
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.75rem' }}>*Rates are indicative. Actual rates depend on credit profile.</div>
                    </div>
                </div>

                {result && (
                    <div>
                        {/* Summary */}
                        <div className="card" style={{ marginBottom: '1.25rem', background: 'linear-gradient(135deg, #0f2461, #1a56db)' }}>
                            <h4 style={{ color: 'white', marginBottom: '1.25rem' }}>📊 EMI Summary</h4>
                            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Monthly EMI</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginTop: '0.25rem' }}>{fmt(result.emi)}</div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>per month for {result.n} months</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                {[
                                    ['Principal', fmt(result.P)],
                                    ['Total Interest', fmt(result.totalInterest)],
                                    ['Total Payable', fmt(result.totalPayable)],
                                ].map(([l, v]) => (
                                    <div key={l} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.35rem' }}>{l}</div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pie-like visual */}
                        <div className="card" style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Loan Breakdown</h4>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ flex: result.P / result.totalPayable, height: 14, background: 'var(--primary)', borderRadius: '7px 0 0 7px' }} title={`Principal: ${fmt(result.P)}`} />
                                <div style={{ flex: result.totalInterest / result.totalPayable, height: 14, background: '#f59e0b', borderRadius: '0 7px 7px 0' }} title={`Interest: ${fmt(result.totalInterest)}`} />
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)' }} />
                                    <span>Principal ({Math.round(result.P / result.totalPayable * 100)}%)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
                                    <span>Interest ({Math.round(result.totalInterest / result.totalPayable * 100)}%)</span>
                                </div>
                            </div>
                        </div>

                        {/* First 12 months */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
                                First 12 Months Breakdown
                            </div>
                            <div className="table-wrapper">
                                <table className="emi-table">
                                    <thead>
                                        <tr><th>Mo.</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
                                    </thead>
                                    <tbody>
                                        {result.schedule.map(row => (
                                            <tr key={row.month}>
                                                <td>{row.month}</td>
                                                <td style={{ fontWeight: 600 }}>{fmt(row.emi)}</td>
                                                <td style={{ color: 'var(--success)' }}>{fmt(row.principal)}</td>
                                                <td style={{ color: 'var(--warning)' }}>{fmt(row.interest)}</td>
                                                <td>{fmt(row.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EMICalculator;
