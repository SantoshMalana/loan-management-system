import { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
const STAFF_ROLES = ['branch_manager'];
const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [queueCount, setQueueCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path + '/');

    const isStaff = STAFF_ROLES.includes(user?.role);

    const fetchCounts = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/loans/stats');
            setQueueCount(res.data?.awaitingAction || 0);
        } catch { }
        try {
            const res = await api.get('/messages/unread-count');
            setUnreadCount(res.data?.count || 0);
        } catch { }
    }, [user]);

    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    // Real-time: poll every 15 seconds
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(fetchCounts, 15000);
        return () => clearInterval(interval);
    }, [fetchCounts, user]);

    const applicantLinks = [
        { to: '/dashboard', icon: '⊞', label: 'My Dashboard' },
        { to: '/apply', icon: '📝', label: 'Apply for Loan' },
        { to: '/chat', icon: '💬', label: 'Messages', badge: unreadCount > 0 ? unreadCount : null },
        { to: '/emi-calculator', icon: '🧮', label: 'EMI Calculator' },
    ];
    const staffLinks = [
        { to: '/officer', icon: '⚡', label: 'Loan Queue', badge: queueCount > 0 ? queueCount : null },
        { to: '/chat', icon: '💬', label: 'Messages', badge: unreadCount > 0 ? unreadCount : null },
        { to: '/emi-calculator', icon: '🧮', label: 'EMI Calculator' },
    ];
    const links = isStaff ? staffLinks : applicantLinks;

    const roleLabel = { applicant: 'Applicant', user: 'Applicant', branch_manager: 'Bank Manager' };
    const roleColor = { applicant: '#22c55e', user: '#22c55e', branch_manager: '#8b5cf6' };

    const color = roleColor[user?.role] || '#1a56db';
    const initials = (user?.fullName || user?.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="sidebar">
            <div style={{ padding: '0 1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', boxShadow: `0 0 0 3px ${color}30` }}>
                        {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.fullName || user?.username}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(199,210,243,0.65)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                            {roleLabel[user?.role] || user?.role}
                            {user?.officerBank && <span style={{ opacity: 0.7 }}> · {user.officerBank}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-label">Navigation</div>
                {links.map((link) => (
                    <Link key={link.to} to={link.to} className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}>
                        <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                        <span style={{ flex: 1 }}>{link.label}</span>
                        {link.badge && (
                            <span style={{ background: '#dc2626', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                                {link.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {isStaff && user?.officerBank && (
                <div style={{ margin: '1rem', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(199,210,243,0.5)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Your Bank</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>🏦 {user.officerBank}</div>
                    <div style={{ color: 'rgba(199,210,243,0.6)', fontSize: '0.72rem', marginTop: '2px' }}>{roleLabel[user?.role]}</div>
                </div>
            )}

            <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={logout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '0.75rem', color: 'rgba(199,210,243,0.7)' }}>
                    <span>🚪</span>
                    <span>Logout</span>
                </button>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(199,210,243,0.5)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Helpline</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>1800-180-1111</div>
                    <div style={{ color: 'rgba(199,210,243,0.6)', fontSize: '0.72rem', marginTop: '2px' }}>Mon–Sat, 9AM–6PM IST</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
