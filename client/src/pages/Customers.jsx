import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { customerAPI } from '../services/api';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, [search]);

    const loadData = async () => {
        try { const { data } = await customerAPI.getAll(search); setCustomers(data); }
        catch { toast.error('Failed to load customers'); }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setShowModal(true); };
    const openEdit = (c) => { setEditing(c); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const form = Object.fromEntries(formData.entries());

        if (!form.first_name || !form.last_name) { toast.error('First and last name required'); return; }
        try {
            if (editing) { await customerAPI.update(editing.id, form); toast.success('Customer updated'); }
            else { await customerAPI.create(form); toast.success('Customer created'); }
            setShowModal(false); loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer? This will also delete all their jobs.')) return;
        try { await customerAPI.delete(id); toast.success('Customer deleted'); loadData(); }
        catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Customers</h1><p className="page-subtitle">Manage workshop clients</p></div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Add Customer</button>
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md p-md">
                    <div className="flex-1 form-group mb-0">
                        <div className="form-input-with-icon">
                            <HiSearch className="form-input-icon" />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search customers..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="flex-center p-xl"><div className="spinner" /></div> : (
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {customers.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-xl">No customers found.</td></tr>
                                ) : customers.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-semibold text-primary">{c.first_name} {c.last_name}</td>
                                        <td>{c.phone || '—'}</td>
                                        <td>{c.email || '—'}</td>
                                        <td>{c.address || '—'}</td>
                                        <td className="text-right">
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(c)}><HiPencil /></button>
                                            <button className="btn btn-icon btn-danger" onClick={() => handleDelete(c.id)}><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
                <form onSubmit={handleSubmit} className="form">
                    <div className="grid grid-2 gap-md">
                        <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" name="first_name" defaultValue={editing?.first_name} required /></div>
                        <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" name="last_name" defaultValue={editing?.last_name} required /></div>
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" name="phone" defaultValue={editing?.phone} /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" name="email" defaultValue={editing?.email} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" name="address" defaultValue={editing?.address} rows="2" /></div>
                    
                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
