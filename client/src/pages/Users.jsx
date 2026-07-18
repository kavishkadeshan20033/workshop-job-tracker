import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiSearch, HiX, HiShieldCheck } from 'react-icons/hi';
import Modal from '../components/Modal';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await userAPI.getAll();
            setUsers(data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            if (editingUser) {
                // If editing and password is empty, remove it so it's not updated
                if (!data.password) delete data.password;
                await userAPI.update(editingUser.id, data);
                toast.success('User updated successfully');
            } else {
                await userAPI.create(data);
                toast.success('User created successfully');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save user');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await userAPI.delete(id);
                toast.success('User deleted');
                fetchUsers();
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to delete user');
            }
        }
    };

    const openModal = (user = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">Manage system access and roles</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <HiPlus /> Add User
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex-center p-xl"><div className="spinner"></div></div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-xl">No users found.</td></tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="font-semibold">{user.full_name}</td>
                                            <td>{user.username}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-warning'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button className="btn btn-icon btn-ghost" onClick={() => openModal(user)}><HiPencil /></button>
                                                <button className="btn btn-icon btn-danger" onClick={() => handleDelete(user.id)}><HiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User' : 'New User'}>
                <form onSubmit={handleSubmit} className="form">
                    {!editingUser && (
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input type="text" name="username" className="form-input" required placeholder="johndoe" />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" name="full_name" className="form-input" defaultValue={editingUser?.full_name} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" name="email" className="form-input" defaultValue={editingUser?.email} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input type="text" name="phone" className="form-input" defaultValue={editingUser?.phone} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select name="role" className="form-input" defaultValue={editingUser?.role || 'employee'} required>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {!editingUser && (
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" name="password" className="form-input" required />
                        </div>
                    )}
                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Save User</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
