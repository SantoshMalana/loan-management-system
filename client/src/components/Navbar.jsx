import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const roleLabel = {
        applicant: 'Applicant',
        loan_officer: 'Loan Officer',
        branch_manager: 'Branch Manager',
        general_manager: 'General Manager',
        admin: 'Admin'
    };

    const getInitials = (name = '') =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <Link to="/" className="nav-logo">
                    BharatLoan<span>MS</span>
                </Link>
                <span className="nav-badge">INDIA</span>
            </div>

            <div className="nav-links">
                {!user && (
                    <>
                        <Link to="/emi-calculator">EMI Calculator</Link>
                        <Link to="/login">Login</Link>
                        <Link to="/register">
                            <button className="btn btn-primary btn-sm">Get Started</button>
                        </Link>
                    </>
                )}
            </div>

            {user && (
                <div className="nav-user">
                    <div className="nav-avatar">{getInitials(user.fullName || user.username)}</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                            {user.fullName || user.username}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {roleLabel[user.role] || user.role}
                        </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
