import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { deviceAPI, customerAPI } from '../services/api';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Devices() {
    const [devices, setDevices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, [search]);
    
    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const { data } = await customerAPI.getAll('');
                setCustomers(data);
            } catch {
                toast.error('Failed to load customers');
            }
        };
        loadCustomers();
    }, []);

    const loadData = async () => {
        try { 
            const { data } = await deviceAPI.getAll(); 
            // Filtering on the client side since backend doesn't have text search for devices yet
            const filtered = data.filter(d => 
                d.brand?.toLowerCase().includes(search.toLowerCase()) || 
                d.model?.toLowerCase().includes(search.toLowerCase()) ||
                d.device_type?.toLowerCase().includes(search.toLowerCase()) ||
                d.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
                d.customer_name?.toLowerCase().includes(search.toLowerCase())
            );
            setDevices(filtered); 
        }
        catch { toast.error('Failed to load devices'); }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setShowModal(true); };
    const openEdit = (d) => { setEditing(d); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const form = Object.fromEntries(formData.entries());

        if (!form.customer_id || !form.brand || !form.model) { toast.error('Customer, Brand, and Model required'); return; }
        
        try {
            if (editing) { await deviceAPI.update(editing.id, form); toast.success('Device updated'); }
            else { await deviceAPI.create(form); toast.success('Device created'); }
            setShowModal(false); loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this device?')) return;
        try { await deviceAPI.delete(id); toast.success('Device deleted'); loadData(); }
        catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Devices</h1><p className="page-subtitle">Manage customer devices</p></div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Add Device</button>
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md p-md">
                    <div className="flex-1 form-group mb-0">
                        <div className="form-input-with-icon">
                            <HiSearch className="form-input-icon" />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search devices..." 
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
                            <thead><tr><th>Brand & Model</th><th>Year</th><th>Type</th><th>Serial Number</th><th>Customer</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {devices.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center p-xl">No devices found.</td></tr>
                                ) : devices.map((d) => (
                                    <tr key={d.id}>
                                        <td className="font-semibold text-primary">{d.brand} {d.model}</td>
                                        <td>{d.year || '—'}</td>
                                        <td>{d.device_type || '—'}</td>
                                        <td>{d.serial_number || '—'}</td>
                                        <td>{d.customer_name || '—'}</td>
                                        <td className="text-right">
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(d)}><HiPencil /></button>
                                            <button className="btn btn-icon btn-danger" onClick={() => handleDelete(d.id)}><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Device' : 'Add Device'}>
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Customer *</label>
                        <select className="form-input" name="customer_id" defaultValue={editing?.customer_id} required>
                            <option value="">Select a customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group"><label className="form-label">Brand *</label><input className="form-input" name="brand" defaultValue={editing?.brand} required /></div>
                        <div className="form-group"><label className="form-label">Model *</label><input className="form-input" name="model" defaultValue={editing?.model} required /></div>
                    </div>
                    <div className="grid grid-3 gap-md">
                        <div className="form-group"><label className="form-label">Year</label><input className="form-input" type="number" name="year" defaultValue={editing?.year} /></div>
                        <div className="form-group"><label className="form-label">Type</label><input className="form-input" name="device_type" defaultValue={editing?.device_type} placeholder="e.g. Laptop" /></div>
                        <div className="form-group"><label className="form-label">Serial Number</label><input className="form-input" name="serial_number" defaultValue={editing?.serial_number} /></div>
                    </div>
                    
                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
