import { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [queueCount, setQueueCount] = useState(0);

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const isApplicantRole = ['user', 'applicant'].includes(user?.role);
    const isOfficerRole = ['loan_officer', 'branch_manager', 'general_manager', 'admin'].includes(user?.role);

    // Fetch awaiting action count for officers
    useEffect(() => {
        if (isOfficerRole) {
            api.get('/loans/stats').then(res => {
                setQueueCount(res.data?.awaitingAction || 0);
            }).catch(() => { });
        }
    }, [isOfficerRole]);

    const applicantLinks = [
        { to: '/dashboard', icon: '⊞', label: 'My Dashboard' },
        { to: '/apply', icon: '📝', label: 'Apply for Loan' },
        { to: '/chat', icon: '💬', label: 'Messages' },
        { to: '/emi-calculator', icon: '🧮', label: 'EMI Calculator' },
    ];

    const officerLinks = [
        { to: '/officer', icon: '⚡', label: 'Loan Queue', badge: queueCount > 0 ? queueCount : null },
        { to: '/admin', icon: '🏛️', label: 'Admin Panel' },
        { to: '/chat', icon: '💬', label: 'Messages' },
        { to: '/emi-calculator', icon: '🧮', label: 'EMI Calculator' },
    ];

    const links = isOfficerRole ? officerLinks : applicantLinks;

    const roleColorMap = {
        applicant: '#22c55e', user: '#22c55e',
        loan_officer: '#f59e0b',
        branch_manager: '#8b5cf6',
        general_manager: '#ef4444',
        admin: '#ec4899',
    };

    const roleLabel = {
        applicant: 'Applicant', user: 'Applicant',
        loan_officer: 'Loan Officer',
        branch_manager: 'Branch Manager',
        general_manager: 'General Manager',
        admin: 'System Admin',
    };

    const roleColor = roleColorMap[user?.role] || '#1a56db';
    const initials = (user?.fullName || user?.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="sidebar">
            {/* User Info */}
            <div style={{ padding: '0 1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '50%', background: roleColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                        boxShadow: `0 0 0 3px ${roleColor}30`
                    }}>
                        {initials}
                    </div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>
                            {user?.fullName || user?.username}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(199,210,243,0.65)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, display: 'inline-block' }} />
                            {roleLabel[user?.role] || user?.role}
                            {user?.officerBank && <span style={{ opacity: 0.7 }}> · {user.officerBank}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav Links */}
            <div className="sidebar-section">
                <div className="sidebar-label">Navigation</div>
                {links.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
                    >
                        <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                        <span style={{ flex: 1 }}>{link.label}</span>
                        {link.badge && (
                            <span style={{
                                background: '#dc2626', color: 'white', borderRadius: 10,
                                padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
                                minWidth: 18, textAlign: 'center',
                            }}>
                                {link.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Bank Info for officers */}
            {isOfficerRole && user?.officerBank && (
                <div style={{ margin: '1rem', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(199,210,243,0.5)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Your Bank</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>🏦 {user.officerBank}</div>
                    <div style={{ color: 'rgba(199,210,243,0.6)', fontSize: '0.72rem', marginTop: '2px', textTransform: 'capitalize' }}>{roleLabel[user?.role]}</div>
                </div>
            )}

            {/* Bottom Helpline */}
            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(199,210,243,0.5)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BharatLoanMS Helpline</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>1800-180-1111</div>
                    <div style={{ color: 'rgba(199,210,243,0.6)', fontSize: '0.72rem', marginTop: '2px' }}>Mon–Sat, 9AM–6PM IST</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
