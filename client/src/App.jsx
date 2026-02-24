import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import BankManagerLogin from './pages/BankManagerLogin';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import LoanApply from './pages/LoanApply';
import LoanDetail from './pages/LoanDetail';
import EMICalculator from './pages/EMICalculator';
import OfficerPanel from './pages/OfficerPanel';
import AdminDashboard from './pages/AdminDashboard';
import CreateOfficer from './pages/CreateOfficer';
import ChatPage from './pages/ChatPage';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

const STAFF_ROLES = ['branch_manager', 'admin'];

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="spinner" />;
  return user ? children : <Navigate to="/login" replace />;
};

// Officers trying to reach applicant-only routes → redirect to officer panel
const ApplicantRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return !STAFF_ROLES.includes(user.role) ? children : <Navigate to="/officer" replace />;
};

// Non-staff trying to reach officer routes → redirect to dashboard
const StaffRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="spinner" />;
  return user && STAFF_ROLES.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
};

// Admin-only routes
const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="spinner" />;
  return user?.role === 'admin' ? children : <Navigate to="/officer" replace />;
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
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/bm-login" element={<BankManagerLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/emi-calculator" element={<EMICalculator />} />

        {/* Applicant routes */}
        <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
        <Route path="/apply" element={
          <PrivateRoute>
            <ApplicantRoute>
              <AppLayout><LoanApply /></AppLayout>
            </ApplicantRoute>
          </PrivateRoute>
        } />
        <Route path="/loans/:id" element={<PrivateRoute><AppLayout><LoanDetail /></AppLayout></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><AppLayout><ChatPage /></AppLayout></PrivateRoute>} />
        <Route path="/chat/:userId" element={<PrivateRoute><AppLayout><ChatPage /></AppLayout></PrivateRoute>} />

        {/* Staff routes (BM + Admin) */}
        <Route path="/officer" element={<StaffRoute><AppLayout><OfficerPanel /></AppLayout></StaffRoute>} />
        <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />
        <Route path="/admin/create-officer" element={<AdminRoute><AppLayout><CreateOfficer /></AppLayout></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
