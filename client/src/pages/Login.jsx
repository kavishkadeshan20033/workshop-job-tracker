import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineUser,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineMail,
    HiOutlineKey,
    HiOutlineArrowLeft,
    HiOutlineShieldCheck,
    HiOutlineCheckCircle
} from 'react-icons/hi';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
    // View state: 'login' | 'forgot' | 'reset'
    const [view, setView] = useState('login');

    // Login Form State
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Forgot / Reset Password Form State
    const [identifier, setIdentifier] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [devCode, setDevCode] = useState('');
    const [devNotice, setDevNotice] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Shared feedback & loading states
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Countdown timer for resending verification code
    useEffect(() => {
        let interval = null;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [resendTimer]);

    // Handle standard sign-in
    const handleLoginSubmit = async (e) => {
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

    // Open forgot password view
    const handleOpenForgot = () => {
        setError('');
        setIdentifier(form.username || '');
        setView('forgot');
    };

    // Send verification code (Step 1)
    const handleSendCode = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!identifier.trim()) {
            setError('Please enter your username or registered email address.');
            return;
        }

        setLoading(true);
        try {
            const res = await authAPI.forgotPassword({ identifier: identifier.trim() });
            setMaskedEmail(res.data.emailMasked || '');
            if (res.data.devCode) {
                setDevCode(res.data.devCode);
            }
            if (res.data.emailNote) {
                setDevNotice(res.data.emailNote);
            } else {
                setDevNotice('');
            }
            toast.success(res.data.message || 'Verification code sent!');
            setResendTimer(60); // 60s cooldown
            setView('reset');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code. Please check your username/email.');
        } finally {
            setLoading(false);
        }
    };

    // Reset password with code (Step 2)
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!code.trim()) {
            setError('Please enter the 6-digit verification code.');
            return;
        }
        if (!newPassword) {
            setError('Please enter a new password.');
            return;
        }
        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please re-enter.');
            return;
        }

        setLoading(true);
        try {
            const res = await authAPI.resetPassword({
                identifier: identifier.trim(),
                code: code.trim(),
                newPassword,
            });
            toast.success(res.data.message || 'Password reset successfully!');

            // Return to login with username prefilled
            setForm((prev) => ({
                ...prev,
                username: identifier.includes('@') ? prev.username : identifier.trim(),
                password: '',
            }));
            setView('login');
            setCode('');
            setNewPassword('');
            setConfirmPassword('');
            setDevCode('');
            setDevNotice('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please check your verification code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container fade-in">
            {/* Left — Dark hero panel */}
            <div className="login-left">
                <div className="login-brand">
                    <img src="/logo.png" alt="WorkshopTracker" className="login-brand-img" />
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

            {/* Right — Interactive form panel */}
            <div className="login-right">
                {/* 1. SIGN IN VIEW */}
                {view === 'login' && (
                    <div className="fade-in">
                        <div className="login-form-title">Sign in</div>
                        <div className="login-form-subtitle">
                            Enter your credentials to access the dashboard.
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleLoginSubmit} className="form">
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                                    <button
                                        type="button"
                                        className="forgot-password-link"
                                        onClick={handleOpenForgot}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="form-input-with-icon">
                                    <span className="form-input-icon"><HiOutlineLockClosed /></span>
                                    <input
                                        className="form-input has-toggle"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="form-input-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                    </button>
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
                    </div>
                )}

                {/* 2. FORGOT PASSWORD — STEP 1: REQUEST CODE */}
                {view === 'forgot' && (
                    <div className="fade-in">
                        <button
                            type="button"
                            className="login-back-btn"
                            onClick={() => { setView('login'); setError(''); }}
                        >
                            <HiOutlineArrowLeft /> Back to sign in
                        </button>

                        <div className="login-form-title">Forgot Password</div>
                        <div className="login-form-subtitle">
                            Enter your username or email address and we'll send a 6-digit verification code to reset your password.
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleSendCode} className="form">
                            <div className="form-group">
                                <label className="form-label">Username or Email</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-icon"><HiOutlineMail /></span>
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Enter your username or email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-full justify-center"
                                style={{ marginTop: '8px', padding: '13px 24px', fontSize: '0.95rem' }}
                                disabled={loading}
                            >
                                {loading ? 'Sending code...' : 'Send Verification Code'}
                            </button>
                        </form>

                        <div className="text-center mt-md">
                            <button
                                type="button"
                                className="forgot-password-link"
                                style={{ fontSize: '0.85rem' }}
                                onClick={() => { setView('reset'); setError(''); }}
                            >
                                Already have a verification code?
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. RESET PASSWORD — STEP 2: ENTER CODE & NEW PASSWORD */}
                {view === 'reset' && (
                    <div className="fade-in">
                        <button
                            type="button"
                            className="login-back-btn"
                            onClick={() => { setView('forgot'); setError(''); }}
                        >
                            <HiOutlineArrowLeft /> Change email / username
                        </button>

                        <div className="login-form-title">Reset Password</div>
                        <div className="login-form-subtitle">
                            Enter the 6-digit verification code sent to your account and choose a new password.
                        </div>

                        {maskedEmail && (
                            <div className="login-badge-info">
                                <HiOutlineShieldCheck style={{ fontSize: '1.25rem', flexShrink: 0 }} />
                                <span>Verification code sent to <strong>{maskedEmail}</strong></span>
                            </div>
                        )}

                        {devNotice && (
                            <div className="login-notice-warning">
                                <div>{devNotice}</div>
                                {devCode && (
                                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>Your code: <strong style={{ letterSpacing: '1px' }}>{devCode}</strong></span>
                                        <button
                                            type="button"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#b45309',
                                                fontWeight: 700,
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                            onClick={() => setCode(devCode)}
                                        >
                                            Auto-fill code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleResetSubmit} className="form">
                            <div className="form-group">
                                <label className="form-label">6-Digit Verification Code</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-icon"><HiOutlineKey /></span>
                                    <input
                                        className="form-input code-input-field"
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-icon"><HiOutlineLockClosed /></span>
                                    <input
                                        className="form-input has-toggle"
                                        type={showNewPassword ? 'text' : 'password'}
                                        placeholder="At least 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="form-input-toggle-btn"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        title={showNewPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showNewPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <div className="form-input-with-icon">
                                    <span className="form-input-icon"><HiOutlineLockClosed /></span>
                                    <input
                                        className="form-input has-toggle"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="form-input-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirmPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                                    </button>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-full justify-center"
                                style={{ marginTop: '8px', padding: '13px 24px', fontSize: '0.95rem' }}
                                disabled={loading}
                            >
                                {loading ? 'Updating Password...' : 'Reset Password'}
                            </button>
                        </form>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
                            <button
                                type="button"
                                className="login-back-btn"
                                style={{ margin: 0 }}
                                onClick={() => { setView('login'); setError(''); }}
                            >
                                Cancel
                            </button>

                            {resendTimer > 0 ? (
                                <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                                    Resend code in {resendTimer}s
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="forgot-password-link"
                                    onClick={handleSendCode}
                                >
                                    Resend code
                                </button>
                            )}
                        </div>
                    </div>
                )}

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
