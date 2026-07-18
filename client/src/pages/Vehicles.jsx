import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { vehicleAPI, customerAPI } from '../services/api';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Vehicles() {
    const [vehicles, setVehicles] = useState([]);
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
            const { data } = await vehicleAPI.getAll(); 
            // Filtering on the client side since backend doesn't have text search for vehicles yet
            const filtered = data.filter(v => 
                v.make?.toLowerCase().includes(search.toLowerCase()) || 
                v.model?.toLowerCase().includes(search.toLowerCase()) ||
                v.license_plate?.toLowerCase().includes(search.toLowerCase()) ||
                v.customer_name?.toLowerCase().includes(search.toLowerCase())
            );
            setVehicles(filtered); 
        }
        catch { toast.error('Failed to load vehicles'); }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditing(null); setShowModal(true); };
    const openEdit = (v) => { setEditing(v); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const form = Object.fromEntries(formData.entries());

        if (!form.customer_id || !form.make || !form.model) { toast.error('Customer, Make, and Model required'); return; }
        
        try {
            if (editing) { await vehicleAPI.update(editing.id, form); toast.success('Vehicle updated'); }
            else { await vehicleAPI.create(form); toast.success('Vehicle created'); }
            setShowModal(false); loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this vehicle?')) return;
        try { await vehicleAPI.delete(id); toast.success('Vehicle deleted'); loadData(); }
        catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div><h1 className="page-title">Vehicles</h1><p className="page-subtitle">Manage customer vehicles</p></div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Add Vehicle</button>
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md p-md">
                    <div className="flex-1 form-group mb-0">
                        <div className="form-input-with-icon">
                            <HiSearch className="form-input-icon" />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search vehicles..." 
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
                            <thead><tr><th>Make & Model</th><th>Year</th><th>License Plate</th><th>VIN</th><th>Customer</th><th className="text-right">Actions</th></tr></thead>
                            <tbody>
                                {vehicles.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center p-xl">No vehicles found.</td></tr>
                                ) : vehicles.map((v) => (
                                    <tr key={v.id}>
                                        <td className="font-semibold text-primary">{v.make} {v.model}</td>
                                        <td>{v.year || '—'}</td>
                                        <td>{v.license_plate || '—'}</td>
                                        <td>{v.vin || '—'}</td>
                                        <td>{v.customer_name || '—'}</td>
                                        <td className="text-right">
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(v)}><HiPencil /></button>
                                            <button className="btn btn-icon btn-danger" onClick={() => handleDelete(v.id)}><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
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
                        <div className="form-group"><label className="form-label">Make *</label><input className="form-input" name="make" defaultValue={editing?.make} required /></div>
                        <div className="form-group"><label className="form-label">Model *</label><input className="form-input" name="model" defaultValue={editing?.model} required /></div>
                    </div>
                    <div className="grid grid-3 gap-md">
                        <div className="form-group"><label className="form-label">Year</label><input className="form-input" type="number" name="year" defaultValue={editing?.year} /></div>
                        <div className="form-group"><label className="form-label">License Plate</label><input className="form-input" name="license_plate" defaultValue={editing?.license_plate} /></div>
                        <div className="form-group"><label className="form-label">VIN</label><input className="form-input" name="vin" defaultValue={editing?.vin} /></div>
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
