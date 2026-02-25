import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import BankManagerLogin from './pages/BankManagerLogin';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import LoanApply from './pages/LoanApply';
import LoanDetail from './pages/LoanDetail';
import EMICalculator from './pages/EMICalculator';
import OfficerPanel from './pages/OfficerPanel';
import ChatPage from './pages/ChatPage';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

const STAFF_ROLES = ['branch_manager'];
// Any logged-in user
const PrivateRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="spinner" />;
    return user ? children : <Navigate to="/login" replace />;
};

// Applicants only (staff get redirected to their panel)
const ApplicantRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="spinner" />;
    if (!user) return <Navigate to="/login" replace />;
    if (STAFF_ROLES.includes(user.role)) return <Navigate to="/officer" replace />;
    return children;
};

// Staff only (BM + Admin)
const StaffRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="spinner" />;
    if (!user) return <Navigate to="/login" replace />;
    if (!STAFF_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
};


function AppLayout({ children }) {
    const { user } = useContext(AuthContext);
    if (!user) return <>{children}</>;
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}

function App() {
    return (
        <div className="page-wrapper">
            <Navbar />
            <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/bm-login" element={<BankManagerLogin />} />
                <Route path="/register" element={<Register />} />
                <Route path="/emi-calculator" element={<EMICalculator />} />

                {/* Applicant routes */}
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <ApplicantRoute>
                            <AppLayout><Dashboard /></AppLayout>
                        </ApplicantRoute>
                    </PrivateRoute>
                } />
                <Route path="/apply" element={
                    <PrivateRoute>
                        <ApplicantRoute>
                            <AppLayout><LoanApply /></AppLayout>
                        </ApplicantRoute>
                    </PrivateRoute>
                } />
                <Route path="/loans/:id" element={
                    <PrivateRoute>
                        <AppLayout><LoanDetail /></AppLayout>
                    </PrivateRoute>
                } />
                <Route path="/chat" element={
                    <PrivateRoute>
                        <AppLayout><ChatPage /></AppLayout>
                    </PrivateRoute>
                } />
                <Route path="/chat/:userId" element={
                    <PrivateRoute>
                        <AppLayout><ChatPage /></AppLayout>
                    </PrivateRoute>
                } />

                {/* Staff routes — both BM and Admin land here */}
                <Route path="/officer" element={
                    <StaffRoute>
                        <AppLayout><OfficerPanel /></AppLayout>
                    </StaffRoute>
                } />

                {/* Redirects */}
                <Route path="/admin" element={<Navigate to="/officer" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
