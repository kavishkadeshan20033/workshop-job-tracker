import { useState } from 'react';
import { authAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineKey, HiOutlineCheckCircle } from 'react-icons/hi';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ isOpen, onClose, targetUser = null, onSuccess }) {
    const { user: currentUser } = useAuth();

    // If targetUser is null or targetUser.id === currentUser.id, it's a self-change
    const isSelf = !targetUser || (currentUser && targetUser.id === currentUser.id);

    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setError('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isSelf && !form.currentPassword) {
            setError('Please enter your current password.');
            return;
        }

        if (!form.newPassword) {
            setError('Please enter a new password.');
            return;
        }

        if (form.newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (isSelf && form.currentPassword === form.newPassword) {
            setError('New password must be different from current password.');
            return;
        }

        setLoading(true);
        try {
            if (isSelf) {
                await authAPI.changePassword({
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword,
                });
                toast.success('Your password has been changed successfully!');
            } else {
                await userAPI.changePassword(targetUser.id, {
                    password: form.newPassword,
                });
                toast.success(`Password for ${targetUser.username} updated successfully!`);
            }

            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const title = isSelf
        ? 'Change Your Password'
        : `Change Password for @${targetUser?.username || 'User'}`;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            {error && (
                <div style={{
                    padding: '10px 14px',
                    marginBottom: '16px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="form">
                {isSelf && (
                    <div className="form-group">
                        <label className="form-label">Current Password *</label>
                        <div className="form-input-with-icon">
                            <span className="form-input-icon"><HiOutlineKey /></span>
                            <input
                                className="form-input has-toggle"
                                type={showCurrent ? 'text' : 'password'}
                                placeholder="Enter your current password"
                                value={form.currentPassword}
                                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="form-input-toggle-btn"
                                onClick={() => setShowCurrent(!showCurrent)}
                                title={showCurrent ? 'Hide password' : 'Show password'}
                            >
                                {showCurrent ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                            </button>
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">New Password *</label>
                    <div className="form-input-with-icon">
                        <span className="form-input-icon"><HiOutlineLockClosed /></span>
                        <input
                            className="form-input has-toggle"
                            type={showNew ? 'text' : 'password'}
                            placeholder="At least 6 characters"
                            value={form.newPassword}
                            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />
                        <button
                            type="button"
                            className="form-input-toggle-btn"
                            onClick={() => setShowNew(!showNew)}
                            title={showNew ? 'Hide password' : 'Show password'}
                        >
                            {showNew ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Confirm New Password *</label>
                    <div className="form-input-with-icon">
                        <span className="form-input-icon"><HiOutlineLockClosed /></span>
                        <input
                            className="form-input has-toggle"
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Re-enter new password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />
                        <button
                            type="button"
                            className="form-input-toggle-btn"
                            onClick={() => setShowConfirm(!showConfirm)}
                            title={showConfirm ? 'Hide password' : 'Show password'}
                        >
                            {showConfirm ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                        </button>
                    </div>
                    {form.newPassword && form.confirmPassword && (
                        <div style={{
                            fontSize: '0.75rem',
                            marginTop: '4px',
                            color: form.newPassword === form.confirmPassword ? '#16a34a' : '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            {form.newPassword === form.confirmPassword
                                ? <><HiOutlineCheckCircle /> Passwords match</>
                                : 'Passwords do not match'}
                        </div>
                    )}
                </div>

                <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                    <button
                        type="button"
                        className="btn btn-secondary flex-1"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary flex-1"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Update Password'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
