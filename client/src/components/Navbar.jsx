import { useAuth } from '../context/AuthContext';

export default function Navbar({ title }) {
    const { user } = useAuth();
    const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    return (
        <header className="navbar">
            <h1 className="navbar-title">{title}</h1>
            <div className="navbar-actions">
                <div className="navbar-user">
                    <div className="navbar-user-avatar">{initials}</div>
                    <div className="navbar-user-info">
                        <span className="navbar-user-name">{user?.full_name}</span>
                        <span className="navbar-user-role">{user?.role}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
