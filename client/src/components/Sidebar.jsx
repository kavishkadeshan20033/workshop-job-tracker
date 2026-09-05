import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineViewGrid, HiOutlineBriefcase, HiOutlineUsers,
    HiOutlineCube, HiOutlineDocumentText, HiOutlineChartBar,
    HiOutlineLogout, HiOutlineUserGroup, HiOutlineIdentification,
    HiOutlineDesktopComputer, HiOutlineMenu, HiOutlineX,
    HiOutlineKey
} from 'react-icons/hi';
import ChangePasswordModal from './ChangePasswordModal';

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const navItems = [
        { path: '/', icon: <HiOutlineViewGrid />, label: 'Dashboard' },
        { path: '/jobs', icon: <HiOutlineBriefcase />, label: 'Jobs' },
        { path: '/customers', icon: <HiOutlineUsers />, label: 'Customers' },
        { path: '/devices', icon: <HiOutlineDesktopComputer />, label: 'Devices' },
    ];

    const adminItems = [
        { path: '/technicians', icon: <HiOutlineIdentification />, label: 'Technicians' },
        { path: '/users', icon: <HiOutlineUserGroup />, label: 'Users' },
        { path: '/parts', icon: <HiOutlineCube />, label: 'Parts & Inventory' },
        { path: '/invoices', icon: <HiOutlineDocumentText />, label: 'Invoices' },
        { path: '/reports', icon: <HiOutlineChartBar />, label: 'Reports' },
    ];

    const initials = user?.username
        ? user.username.slice(0, 2).toUpperCase()
        : 'U';

    const closeMobile = () => setMobileOpen(false);

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="/logo.png" alt="KavishkaLK Laptop Care" className="sidebar-logo-img" />
                    <div className="sidebar-logo-text">
                        <span className="sidebar-logo-title">KavishkaLK</span>
                        <span className="sidebar-logo-subtitle">Laptop Care &bull; Service</span>
                    </div>
                </div>
                {/* Mobile close button */}
                <button className="sidebar-mobile-close" onClick={closeMobile}>
                    <HiOutlineX />
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-title">Main Menu</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}

                {isAdmin && (
                    <>
                        <div className="sidebar-section-title">Administration</div>
                        {adminItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={closeMobile}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </>
                )}

                <div className="sidebar-section-title">Account</div>
                <button className="sidebar-link" onClick={() => { setIsPasswordModalOpen(true); closeMobile(); }}>
                    <span className="sidebar-link-icon"><HiOutlineKey /></span>
                    Change Password
                </button>
                <button className="sidebar-link" onClick={() => { logout(); closeMobile(); }}>
                    <span className="sidebar-link-icon"><HiOutlineLogout /></span>
                    Sign Out
                </button>
            </nav>

            {/* User Profile */}
            <div 
                className="sidebar-user" 
                onClick={() => setIsPasswordModalOpen(true)}
                style={{ cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                title="Click to change your password"
            >
                <div className="sidebar-user-avatar">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-user-name">{user?.username || 'User'}</div>
                    <div className="sidebar-user-role">{user?.role || 'technician'}</div>
                </div>
                <span style={{ color: 'var(--text-light)', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
                    <HiOutlineKey />
                </span>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="mobile-topbar">
                <div className="mobile-topbar-brand">
                    <img src="/logo.png" alt="KavishkaLK" className="mobile-topbar-logo-img" />
                    <span className="sidebar-logo-title">KavishkaLK</span>
                </div>
                <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                    <HiOutlineMenu />
                </button>
            </div>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={closeMobile} />
            )}

            {/* Desktop sidebar */}
            <aside className="sidebar sidebar-desktop">
                <SidebarContent />
            </aside>

            {/* Mobile drawer */}
            <aside className={`sidebar sidebar-mobile-drawer ${mobileOpen ? 'open' : ''}`}>
                <SidebarContent />
            </aside>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </>
    );
}
