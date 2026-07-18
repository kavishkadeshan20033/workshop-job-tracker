import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineViewGrid, HiOutlineBriefcase, HiOutlineUsers,
    HiOutlineCube, HiOutlineDocumentText, HiOutlineChartBar,
    HiOutlineLogout, HiOutlineUserGroup, HiOutlineIdentification,
    HiOutlineTruck
} from 'react-icons/hi';
import { FaWrench } from 'react-icons/fa';

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();

    const navItems = [
        { path: '/', icon: <HiOutlineViewGrid />, label: 'Dashboard' },
        { path: '/jobs', icon: <HiOutlineBriefcase />, label: 'Jobs' },
        { path: '/customers', icon: <HiOutlineUsers />, label: 'Customers' },
        { path: '/vehicles', icon: <HiOutlineTruck />, label: 'Vehicles' },
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

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <FaWrench />
                    </div>
                    <div className="sidebar-logo-text">
                        <span className="sidebar-logo-title">WorkshopTracker</span>
                        <span className="sidebar-logo-subtitle">Job Management</span>
                    </div>
                </div>
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
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </>
                )}

                <div className="sidebar-section-title">Account</div>
                <button className="sidebar-link" onClick={logout}>
                    <span className="sidebar-link-icon"><HiOutlineLogout /></span>
                    Sign Out
                </button>
            </nav>

            {/* User Profile */}
            <div className="sidebar-user">
                <div className="sidebar-user-avatar">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-user-name">{user?.username || 'User'}</div>
                    <div className="sidebar-user-role">{user?.role || 'technician'}</div>
                </div>
            </div>
        </aside>
    );
}
