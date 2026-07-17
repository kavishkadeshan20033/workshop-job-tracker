import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaWrench } from 'react-icons/fa';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.username || !form.password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await login(form);
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container fade-in">
            {/* Left — Dark hero panel */}
            <div className="login-left">
                <div className="login-brand">
                    <div className="login-brand-icon">
                        <FaWrench />
                    </div>
                    <div>
                        <div className="login-brand-name">WorkshopTracker</div>
                        <div className="login-brand-tag">Job Management System</div>
                    </div>
                </div>

                <h1 className="login-hero-title">
                    Manage your<br />
                    <span>workshop</span><br />
                    with ease.
                </h1>

                <p className="login-hero-desc">
                    A complete job tracking solution for repair workshops.
                    Track jobs, manage inventory, generate invoices, and grow your business.
                </p>

                <div className="login-stats">
                    <div className="login-stat">
                        <span className="login-stat-value">100%</span>
                        <span className="login-stat-label">Uptime</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
                    <div className="login-stat">
                        <span className="login-stat-value">Real-time</span>
                        <span className="login-stat-label">Job Tracking</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
                    <div className="login-stat">
                        <span className="login-stat-value">Full</span>
                        <span className="login-stat-label">Reports Suite</span>
                    </div>
                </div>
            </div>

            {/* Right — White form panel */}
            <div className="login-right">
                <div className="login-form-title">Sign in</div>
                <div className="login-form-subtitle">
                    Enter your credentials to access the dashboard.
                </div>

                {error && (
                    <div className="login-error">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div className="form-input-with-icon">
                            <span className="form-input-icon"><HiOutlineUser /></span>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Enter your username"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                autoComplete="username"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="form-input-with-icon">
                            <span className="form-input-icon"><HiOutlineLockClosed /></span>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary w-full justify-center"
                        style={{ marginTop: '8px', padding: '13px 24px', fontSize: '0.95rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center mt-lg" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-red)', fontWeight: 600, textDecoration: 'none' }}>
                        Create one
                    </Link>
                </div>

                <div style={{
                    marginTop: 'auto',
                    paddingTop: 'var(--spacing-2xl)',
                    fontSize: '0.75rem',
                    color: 'var(--text-light)',
                    textAlign: 'center'
                }}>
                    © {new Date().getFullYear()} WorkshopTracker. All rights reserved.
                </div>
            </div>
        </div>
    );
}
