import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaWrench } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', role: 'employee' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.email || !form.password || !form.full_name) {
            setError('Please fill in all required fields');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(form.email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await register(form);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
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
                    Join our<br />
                    <span>platform</span><br />
                    today.
                </h1>

                <p className="login-hero-desc">
                    Create an account to start tracking jobs, managing technicians, and generating invoices efficiently.
                </p>

                <div className="login-stats">
                    <div className="login-stat">
                        <span className="login-stat-value">Easy</span>
                        <span className="login-stat-label">Setup</span>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
                    <div className="login-stat">
                        <span className="login-stat-value">Secure</span>
                        <span className="login-stat-label">Data</span>
                    </div>
                </div>
            </div>

            {/* Right — White form panel */}
            <div className="login-right" style={{ overflowY: 'auto' }}>
                <div className="login-form-title">Create Account</div>
                <div className="login-form-subtitle">
                    Enter your details to get started.
                </div>

                {error && (
                    <div className="login-error">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" type="text" placeholder="John Doe"
                            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input className="form-input" type="text" placeholder="johndoe"
                            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input className="form-input" type="email" placeholder="john@workshop.com"
                            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password * (min 6 chars)</label>
                        <input className="form-input" type="password" placeholder="••••••••"
                            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    
                    <button
                        className="btn btn-primary w-full justify-center"
                        style={{ marginTop: '8px', padding: '13px 24px', fontSize: '0.95rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="text-center mt-lg" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-red)', fontWeight: 600, textDecoration: 'none' }}>
                        Sign in
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
