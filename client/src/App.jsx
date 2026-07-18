import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Technicians from './pages/Technicians';
import Parts from './pages/Parts';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Vehicles from './pages/Vehicles';

function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner" style={{ height: '100vh', background: '#ffffff' }}><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content"><Outlet /></div>
        </div>
    );
}

function AdminRoute() {
    const { isAdmin } = useAuth();
    if (!isAdmin) return <Navigate to="/" replace />;
    return <Outlet />;
}

function PublicRoute() {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner" style={{ height: '100vh', background: '#ffffff' }}><div className="spinner" /></div>;
    if (user) return <Navigate to="/" replace />;
    return <Outlet />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-right" toastOptions={{
                    style: {
                        background: '#ffffff',
                        color: '#1a1a1a',
                        border: '1px solid #e8e8e8',
                        borderRadius: '0px',
                        fontFamily: "'Montserrat', 'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        boxShadow: '0 5px 30px rgba(0, 0, 0, 0.10)',
                    },
                    success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
                    error:   { iconTheme: { primary: '#e63946', secondary: '#ffffff' } },
                }} />
                <Routes>
                    <Route element={<PublicRoute />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/jobs" element={<Jobs />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route element={<AdminRoute />}>
                            <Route path="/users" element={<Users />} />
                            <Route path="/technicians" element={<Technicians />} />
                            <Route path="/parts" element={<Parts />} />
                            <Route path="/invoices" element={<Invoices />} />
                            <Route path="/reports" element={<Reports />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
