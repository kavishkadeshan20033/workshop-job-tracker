import { useState, useEffect } from 'react';
import { technicianAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import Modal from '../components/Modal';

export default function Technicians() {
    const [technicians, setTechnicians] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTech, setEditingTech] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [techsRes, usersRes] = await Promise.all([technicianAPI.getAll(), userAPI.getAll()]);
            setTechnicians(techsRes.data);
            setUsers(usersRes.data.filter(u => u.role === 'employee'));
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Convert empty user_id string to null
        if (!data.user_id) data.user_id = null;

        try {
            if (editingTech) {
                await technicianAPI.update(editingTech.id, data);
                toast.success('Technician updated');
            } else {
                await technicianAPI.create(data);
                toast.success('Technician created');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save technician');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this technician?')) {
            try {
                await technicianAPI.delete(id);
                toast.success('Technician deleted');
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to delete');
            }
        }
    };

    const openModal = (tech = null) => {
        setEditingTech(tech);
        setIsModalOpen(true);
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Technicians</h1>
                    <p className="page-subtitle">Manage workshop technicians and link them to user accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <HiPlus /> Add Technician
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
                                    <th>Specialization</th>
                                    <th>Phone</th>
                                    <th>Linked User Account</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicians.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-xl">No technicians found.</td></tr>
                                ) : (
                                    technicians.map((tech) => (
                                        <tr key={tech.id}>
                                            <td className="font-semibold text-primary">{tech.name}</td>
                                            <td>{tech.specialization || '-'}</td>
                                            <td>{tech.phone || '-'}</td>
                                            <td>
                                                {tech.user_name ? (
                                                    <span className="badge badge-success">{tech.user_name} ({tech.email})</span>
                                                ) : (
                                                    <span className="badge badge-warning">Unlinked</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button className="btn btn-icon btn-ghost" onClick={() => openModal(tech)}><HiPencil /></button>
                                                <button className="btn btn-icon btn-danger" onClick={() => handleDelete(tech.id)}><HiTrash /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTech ? 'Edit Technician' : 'New Technician'}>
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" name="name" className="form-input" defaultValue={editingTech?.name} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Specialization</label>
                        <input type="text" name="specialization" className="form-input" defaultValue={editingTech?.specialization} placeholder="e.g. Hardware Diagnostics" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input type="text" name="phone" className="form-input" defaultValue={editingTech?.phone} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Link to User Account</label>
                        <select name="user_id" className="form-input" defaultValue={editingTech?.user_id || ''}>
                            <option value="">-- No linked account --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                            ))}
                        </select>
                        <small className="form-hint" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                            Linking to an employee account allows them to see their assigned jobs.
                        </small>
                    </div>
                    
                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Save Technician</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
