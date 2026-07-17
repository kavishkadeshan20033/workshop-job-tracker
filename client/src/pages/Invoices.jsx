import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { invoiceAPI, jobAPI } from '../services/api';
import { HiPlus, HiTrash, HiEye, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Invoices() {
    const [invoices, setInvoices] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [detail, setDetail] = useState(null);
    const [form, setForm] = useState({ job_id: '', labor_total: '0', tax_rate: '0.10', notes: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [invRes, jobsRes] = await Promise.all([
                invoiceAPI.getAll(), 
                jobAPI.getAll({ status: 'completed' })
            ]);
            setInvoices(invRes.data); 
            setJobs(jobsRes.data);
        } catch { 
            toast.error('Failed to load invoices'); 
        } finally { 
            setLoading(false); 
        }
    };

    const openCreate = () => { 
        setForm({ job_id: '', labor_total: '0', tax_rate: '0.10', notes: '' }); 
        setShowModal(true); 
    };

    const openDetail = async (id) => {
        try { 
            const { data } = await invoiceAPI.getById(id); 
            setDetail(data); 
            setShowDetail(true); 
        } catch { 
            toast.error('Failed to load invoice'); 
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.job_id) { toast.error('Select a job'); return; }
        try {
            await invoiceAPI.create({ 
                job_id: parseInt(form.job_id), 
                labor_total: parseFloat(form.labor_total) || 0,
                tax_rate: parseFloat(form.tax_rate) || 0.10, 
                notes: form.notes 
            });
            toast.success('Invoice created'); 
            setShowModal(false); 
            loadData();
        } catch (err) { 
            toast.error(err.response?.data?.error || 'Failed to create'); 
        }
    };

    const handlePaymentUpdate = async (id, payment_status) => {
        try { 
            await invoiceAPI.update(id, { payment_status }); 
            toast.success('Payment updated'); 
            loadData(); 
        } catch { 
            toast.error('Failed to update'); 
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this invoice?')) return;
        try { 
            await invoiceAPI.delete(id); 
            toast.success('Invoice deleted'); 
            loadData(); 
        } catch { 
            toast.error('Failed to delete'); 
        }
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">Manage billing and payments</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Create Invoice</button>
            </div>

            <div className="card">
                {loading ? <div className="flex-center p-xl"><div className="spinner" /></div> : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Job</th>
                                    <th>Customer</th>
                                    <th>Device</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-xl">No invoices found.</td></tr>
                                ) : invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="font-semibold text-primary">INV-{String(inv.id).padStart(4, '0')}</td>
                                        <td>#{inv.job_id}</td>
                                        <td>{inv.customer_name}</td>
                                        <td>{inv.device_name || '—'}</td>
                                        <td className="font-bold text-success">${inv.total_amount?.toFixed(2)}</td>
                                        <td>
                                            <select 
                                                className="form-input" 
                                                style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto', minWidth: '100px' }} 
                                                value={inv.payment_status}
                                                onChange={(e) => handlePaymentUpdate(inv.id, e.target.value)}>
                                                <option value="unpaid">Unpaid</option>
                                                <option value="partial">Partial</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </td>
                                        <td className="text-right">
                                            <button className="btn btn-icon btn-ghost" onClick={() => openDetail(inv.id)} title="View"><HiEye /></button>
                                            <button className="btn btn-icon btn-danger" onClick={() => handleDelete(inv.id)} title="Delete"><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
                <form onSubmit={handleCreate} className="form">
                    <div className="form-group">
                        <label className="form-label">Select Completed Job *</label>
                        <select className="form-input" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} required>
                            <option value="">Select job...</option>
                            {jobs.map((j) => <option key={j.id} value={j.id}>#{j.id} — {j.device_name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Labor Charge ($)</label>
                            <input className="form-input" type="number" step="0.01" value={form.labor_total} onChange={(e) => setForm({ ...form, labor_total: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Rate (e.g. 0.10 for 10%)</label>
                            <input className="form-input" type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-input" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-md mt-xl">
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Create Invoice</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Invoice INV-${String(detail?.id).padStart(4, '0')}`}>
                {detail && (
                    <div className="p-sm">
                        <div className="grid grid-2 gap-md mb-md">
                            <div>
                                <small className="text-muted block text-xs tracking-wider">CUSTOMER</small>
                                <span className="font-semibold">{detail.customer_name}</span>
                                <div className="text-sm text-muted">{detail.customer_email || detail.customer_phone}</div>
                            </div>
                            <div>
                                <small className="text-muted block text-xs tracking-wider">DEVICE</small>
                                <span className="font-semibold text-primary">{detail.device_name}</span>
                            </div>
                        </div>
                        <div className="mb-md">
                            <small className="text-muted block text-xs tracking-wider">PROBLEM DESCRIPTION</small>
                            <span className="text-sm">{detail.job_description}</span>
                        </div>
                        
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '16px 0' }} />
                        
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Labor Total</span>
                            <span>${detail.labor_total?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Parts Total</span>
                            <span>${detail.parts_total?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Tax ({(detail.tax_rate * 100).toFixed(0)}%)</span>
                            <span>${detail.tax_amount?.toFixed(2)}</span>
                        </div>
                        
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '16px 0' }} />
                        
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-lg">Total</span>
                            <span className="font-bold text-2xl text-success">${detail.total_amount?.toFixed(2)}</span>
                        </div>
                        
                        <div className="mt-md text-right">
                            <span className={`badge badge-${
                                detail.payment_status === 'paid' ? 'success' : 
                                detail.payment_status === 'partial' ? 'warning' : 'danger'
                            }`}>
                                {detail.payment_status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
