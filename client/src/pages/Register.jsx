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
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon"><FaWrench /></div>
                    <div className="login-title">WorkshopTracker</div>
                    <div className="login-subtitle mt-xs">Create your account</div>
                </div>

                {error && (
                    <div className="p-sm mb-md text-sm text-center" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" type="text" placeholder="John Doe"
                            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group mb-0">
                            <label className="form-label">Username *</label>
                            <input className="form-input" type="text" placeholder="johndoe"
                                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Role</label>
                            <select className="form-input" value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
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
                    <button className="btn btn-primary w-full justify-center mt-sm" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="text-center mt-lg text-sm text-muted">
                    Already have an account? <Link to="/login" className="text-primary font-medium" style={{ textDecoration: 'none' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
