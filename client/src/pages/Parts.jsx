import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { partAPI } from '../services/api';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Parts() {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, [search]);

    const loadData = async () => {
        try { 
            const { data } = await partAPI.getAll(search); 
            setParts(data); 
        }
        catch { toast.error('Failed to load parts'); }
        finally { setLoading(false); }
    };

    const openCreate = () => { 
        setEditing(null); 
        setShowModal(true); 
    };
    const openEdit = (p) => { 
        setEditing(p); 
        setShowModal(true); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const form = Object.fromEntries(formData.entries());

        if (!form.name || !form.unit_price) { toast.error('Name and price required'); return; }
        try {
            const payload = { 
                ...form, 
                stock_qty: parseInt(form.stock_qty) || 0, 
                unit_price: parseFloat(form.unit_price), 
                reorder_level: parseInt(form.reorder_level) || 5 
            };
            if (editing) { await partAPI.update(editing.id, payload); toast.success('Part updated'); }
            else { await partAPI.create(payload); toast.success('Part added'); }
            setShowModal(false); loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this part?')) return;
        try { await partAPI.delete(id); toast.success('Part deleted'); loadData(); }
        catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Parts & Inventory</h1>
                    <p className="page-subtitle">Manage parts stock and suppliers</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Add Part</button>
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md p-md">
                    <div className="flex-1 form-group mb-0">
                        <div className="form-input-with-icon">
                            <HiSearch className="form-input-icon" />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search parts..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
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
                                    <th>Part #</th>
                                    <th>Supplier</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Price</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-xl">No parts found.</td></tr>
                                ) : parts.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-semibold text-primary">{p.name}</td>
                                        <td>{p.part_number || '—'}</td>
                                        <td>{p.supplier || '—'}</td>
                                        <td>{p.category || '—'}</td>
                                        <td>
                                            <span className={`badge ${p.stock_qty <= p.reorder_level ? 'badge-danger' : 'badge-success'}`}>
                                                {p.stock_qty} (Reorder: {p.reorder_level})
                                            </span>
                                        </td>
                                        <td>${Number(p.unit_price || 0).toFixed(2)}</td>
                                        <td className="text-right">
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(p)}><HiPencil /></button>
                                            <button className="btn btn-icon btn-danger" onClick={() => handleDelete(p.id)}><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Part' : 'Add Part'}>
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Name *</label>
                        <input className="form-input" name="name" defaultValue={editing?.name} required placeholder="Screen Replacement" />
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Part Number</label>
                            <input className="form-input" name="part_number" defaultValue={editing?.part_number} placeholder="SCR-1002" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Supplier</label>
                            <input className="form-input" name="supplier" defaultValue={editing?.supplier} placeholder="Global Parts Inc." />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <input className="form-input" name="category" defaultValue={editing?.category} placeholder="Displays" />
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Unit Price *</label>
                            <input className="form-input" name="unit_price" type="number" step="0.01" defaultValue={editing?.unit_price} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Stock Qty</label>
                            <input className="form-input" name="stock_qty" type="number" defaultValue={editing?.stock_qty || 0} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reorder Level</label>
                        <input className="form-input" name="reorder_level" type="number" defaultValue={editing?.reorder_level || 5} />
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
