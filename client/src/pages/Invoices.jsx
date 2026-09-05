import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { invoiceAPI, jobAPI } from '../services/api';
import { HiPlus, HiTrash, HiEye, HiSearch, HiPencil, HiMail, HiPrinter } from 'react-icons/hi';
import toast from 'react-hot-toast';

const formatLKR = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Invoices() {
    const [invoices, setInvoices] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [detail, setDetail] = useState(null);
    const [form, setForm] = useState({ job_id: '', labor_total: '0', tax_rate: '0.10', notes: '' });
    const [editForm, setEditForm] = useState({ id: null, job_id: '', device_name: '', customer_name: '', labor_total: '0', parts_total: '0', tax_rate: '0.10', payment_status: 'unpaid', notes: '' });
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [search, setSearch] = useState('');

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

    const openEdit = (inv) => {
        setEditForm({
            id: inv.id,
            job_id: inv.job_id,
            device_name: inv.device_name,
            customer_name: inv.customer_name,
            labor_total: String(inv.labor_total || 0),
            parts_total: String(inv.parts_total || 0),
            tax_rate: String(inv.tax_rate !== undefined ? inv.tax_rate : 0.10),
            payment_status: inv.payment_status || 'unpaid',
            notes: inv.notes || ''
        });
        setShowEditModal(true);
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
        if (!form.job_id) { toast.error('Please select a completed job'); return; }
        try {
            await invoiceAPI.create({ 
                job_id: parseInt(form.job_id), 
                labor_total: parseFloat(form.labor_total) || 0,
                tax_rate: parseFloat(form.tax_rate) || 0.10, 
                notes: form.notes 
            });
            toast.success('Invoice created / updated successfully'); 
            setShowModal(false); 
            loadData();
        } catch (err) { 
            toast.error(err.response?.data?.error || 'Failed to create invoice'); 
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await invoiceAPI.update(editForm.id, {
                labor_total: parseFloat(editForm.labor_total) || 0,
                parts_total: parseFloat(editForm.parts_total) || 0,
                tax_rate: parseFloat(editForm.tax_rate) || 0.10,
                payment_status: editForm.payment_status,
                notes: editForm.notes
            });
            toast.success('Invoice updated successfully');
            setShowEditModal(false);
            loadData();
            if (detail && detail.id === editForm.id) {
                const { data } = await invoiceAPI.getById(editForm.id);
                setDetail(data);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update invoice');
        }
    };

    const handlePaymentUpdate = async (id, payment_status) => {
        try { 
            await invoiceAPI.update(id, { payment_status }); 
            toast.success('Payment status updated'); 
            loadData(); 
        } catch { 
            toast.error('Failed to update status'); 
        }
    };

    const handleSendEmail = async (inv) => {
        const email = inv.customer_email || prompt('Customer email address:', inv.customer_email || '');
        if (!email) return;
        setSendingEmailId(inv.id);
        try {
            await invoiceAPI.sendEmail(inv.id, email);
            toast.success(`Invoice emailed to ${email}!`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send invoice email');
        } finally {
            setSendingEmailId(null);
        }
    };

    const handlePrint = async (inv) => {
        let fullInv = inv;
        try {
            const { data } = await invoiceAPI.getById(inv.id);
            if (data) fullInv = data;
        } catch (err) {
            console.error('Could not fetch full invoice details', err);
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to print invoices');
            return;
        }

        const invoiceNum = `INV-${String(fullInv.id).padStart(4, '0')}`;
        const issueDate = new Date(fullInv.issued_at || Date.now()).toLocaleDateString();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${invoiceNum} - KavishkaLK Laptop Care</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
                    .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }
                    .sub { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-top: 2px; }
                    .address-line { font-size: 12px; color: #64748b; margin-top: 5px; }
                    .inv-badge { font-size: 20px; font-weight: 800; color: #0284c7; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
                    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; }
                    .box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                    th { text-align: left; padding: 12px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                    .total-section { margin-left: auto; width: 320px; text-align: right; }
                    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
                    .total-final { display: flex; justify-content: space-between; padding: 12px 0; font-size: 20px; font-weight: 800; border-top: 2px solid #0f172a; margin-top: 8px; }
                    .status-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
                    .paid { background: #dcfce7; color: #15803d; }
                    .unpaid { background: #fee2e2; color: #dc2626; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    @media print {
                        body { padding: 20px 30px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">KavishkaLK Laptop Care</div>
                        <div class="sub">Laptop Repair &amp; Service Management</div>
                        <div class="address-line">Kaluwella waththa, Thalaramba, Kamburugamuwa, Sri Lanka</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="inv-badge">${invoiceNum}</div>
                        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Date: ${issueDate}</div>
                    </div>
                </div>

                <div class="grid">
                    <div class="box">
                        <div class="box-title">Billed To (Customer)</div>
                        <div style="font-weight: 700; font-size: 16px;">${fullInv.customer_name || 'Valued Customer'}</div>
                        <div>Phone: ${fullInv.customer_phone || '—'}</div>
                        <div>Email: ${fullInv.customer_email || '—'}</div>
                        ${fullInv.customer_address ? `<div>Address: ${fullInv.customer_address}</div>` : ''}
                    </div>
                    <div class="box">
                        <div class="box-title">Device &amp; Job Info</div>
                        <div style="font-weight: 700; font-size: 16px;">${fullInv.device_name || 'Laptop'}</div>
                        <div>Job Reference: #${fullInv.job_id}</div>
                        <div>Service: ${fullInv.job_description || 'General Laptop Service'}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item &amp; Service Description</th>
                            <th style="text-align: right;">Cost (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div style="font-weight: 600;">Laptop Diagnostics &amp; Labor Charge</div>
                                ${fullInv.job_description ? `<div style="font-size: 12px; color: #64748b;">${fullInv.job_description}</div>` : ''}
                            </td>
                            <td style="text-align: right; font-weight: 600;">Rs. ${Number(fullInv.labor_total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ${fullInv.parts && fullInv.parts.length > 0 ? fullInv.parts.map(p => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${p.name}</div>
                                <div style="font-size: 12px; color: #64748b;">${p.quantity_used}x @ Rs. ${Number(p.unit_price_at_time).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${p.part_number ? ` &bull; Part #${p.part_number}` : ''}</div>
                            </td>
                            <td style="text-align: right; font-weight: 600;">Rs. ${Number(p.line_total || (p.quantity_used * p.unit_price_at_time)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        `).join('') : (Number(fullInv.parts_total || 0) > 0 ? `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">Replacement Hardware &amp; Components</div>
                            </td>
                            <td style="text-align: right; font-weight: 600;">Rs. ${Number(fullInv.parts_total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        ` : '')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-row"><span>Labor Subtotal:</span><span>Rs. ${Number(fullInv.labor_total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    ${Number(fullInv.parts_total || 0) > 0 ? `<div class="total-row"><span>Parts Subtotal:</span><span>Rs. ${Number(fullInv.parts_total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
                    <div class="total-row"><span>Sales Tax (${(Number(fullInv.tax_rate || 0.10) * 100).toFixed(0)}%):</span><span>Rs. ${Number(fullInv.tax_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="total-final">
                        <span>Total Due:</span>
                        <span>Rs. ${Number(fullInv.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style="margin-top: 10px;">
                        Status: <span class="status-pill ${fullInv.payment_status === 'paid' ? 'paid' : 'unpaid'}">${(fullInv.payment_status || 'unpaid').toUpperCase()}</span>
                    </div>
                </div>

                <div class="footer">
                    <div>Thank you for choosing KavishkaLK Laptop Care! For warranty support or inquiries, please contact our service desk.</div>
                    <div style="margin-top: 4px; font-weight: 600;">Kaluwella waththa, Thalaramba, Kamburugamuwa &bull; Sri Lanka</div>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this invoice?')) return;
        try { 
            await invoiceAPI.delete(id); 
            toast.success('Invoice deleted'); 
            loadData(); 
        } catch { 
            toast.error('Failed to delete invoice'); 
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            String(inv.id).includes(q) ||
            String(inv.job_id).includes(q) ||
            inv.customer_name?.toLowerCase().includes(q) ||
            inv.device_name?.toLowerCase().includes(q) ||
            inv.payment_status?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoices &amp; Billing</h1>
                    <p className="page-subtitle">Manage customer repair invoices, service fees, and payments</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><HiPlus /> Create Invoice</button>
            </div>

            {/* Search and Filters */}
            <div className="card mb-lg">
                <div className="p-md">
                    <div className="form-input-with-icon">
                        <HiSearch className="form-input-icon" />
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Search by Invoice #, Job #, Customer, or Device..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
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
                                {filteredInvoices.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-xl text-muted italic">No invoices match your search.</td></tr>
                                ) : filteredInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="font-semibold text-primary">INV-{String(inv.id).padStart(4, '0')}</td>
                                        <td><span className="badge badge-info">#{inv.job_id}</span></td>
                                        <td>
                                            <div className="font-semibold">{inv.customer_name}</div>
                                            {inv.customer_phone && <small className="text-muted">{inv.customer_phone}</small>}
                                        </td>
                                        <td>{inv.device_name || '—'}</td>
                                        <td className="font-bold text-success text-base">{formatLKR(inv.total_amount)}</td>
                                        <td>
                                            <select 
                                                className="form-input" 
                                                style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto', minWidth: '100px', fontWeight: 600 }} 
                                                value={inv.payment_status}
                                                onChange={(e) => handlePaymentUpdate(inv.id, e.target.value)}>
                                                <option value="unpaid">Unpaid</option>
                                                <option value="partial">Partial</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex gap-xs justify-end items-center">
                                                <button className="btn btn-icon btn-ghost" onClick={() => openDetail(inv.id)} title="View Detail"><HiEye /></button>
                                                <button className="btn btn-icon btn-ghost" onClick={() => openEdit(inv)} title="Edit Price &amp; Tax"><HiPencil /></button>
                                                <button 
                                                    className="btn btn-icon btn-ghost" 
                                                    onClick={() => handleSendEmail(inv)} 
                                                    title="Email Invoice to Customer"
                                                    disabled={sendingEmailId === inv.id}
                                                >
                                                    <HiMail />
                                                </button>
                                                <button className="btn btn-icon btn-ghost" onClick={() => handlePrint(inv)} title="Print / PDF"><HiPrinter /></button>
                                                <button className="btn btn-icon btn-danger" onClick={() => handleDelete(inv.id)} title="Delete"><HiTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE INVOICE MODAL */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
                <form onSubmit={handleCreate} className="form">
                    <div className="form-group">
                        <label className="form-label">Select Completed Job *</label>
                        <select 
                            className="form-input" 
                            value={form.job_id} 
                            onChange={(e) => {
                                const jId = e.target.value;
                                const matched = jobs.find(j => String(j.id) === String(jId));
                                setForm({ 
                                    ...form, 
                                    job_id: jId,
                                    labor_total: matched?.estimated_cost ? String(matched.estimated_cost) : form.labor_total
                                });
                            }} 
                            required
                        >
                            <option value="">-- Choose Completed Job --</option>
                            {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                    #{j.id} — {j.device_name} (Customer: {j.customer_name || 'N/A'}${j.estimated_cost ? ` • Est: Rs. ${Number(j.estimated_cost).toFixed(2)}` : ''})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Service / Labor Fee (Rs.) *</label>
                            <input className="form-input font-semibold" type="number" step="0.01" value={form.labor_total} onChange={(e) => setForm({ ...form, labor_total: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Rate (e.g. 0.10 for 10%)</label>
                            <input className="form-input" type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-input" rows="2" placeholder="e.g. Screen replacement labor, diagnostics completed." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-md mt-xl">
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Save Invoice</button>
                    </div>
                </form>
            </Modal>

            {/* EDIT INVOICE MODAL */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Invoice INV-${String(editForm.id).padStart(4, '0')}`}>
                <form onSubmit={handleEditSubmit} className="form">
                    <div className="card p-sm mb-md" style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="text-xs text-muted">CUSTOMER &amp; DEVICE</div>
                        <div className="font-bold text-sm">{editForm.customer_name} &bull; {editForm.device_name} (Job #{editForm.job_id})</div>
                    </div>

                    <div className="grid grid-3 gap-md">
                        <div className="form-group">
                            <label className="form-label">Service Fee (Rs.)</label>
                            <input 
                                className="form-input font-semibold" 
                                type="number" 
                                step="0.01" 
                                value={editForm.labor_total} 
                                onChange={(e) => setEditForm({ ...editForm, labor_total: e.target.value })} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Parts Total (Rs.)</label>
                            <input 
                                className="form-input font-semibold" 
                                type="number" 
                                step="0.01" 
                                value={editForm.parts_total} 
                                onChange={(e) => setEditForm({ ...editForm, parts_total: e.target.value })} 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Rate</label>
                            <input 
                                className="form-input" 
                                type="number" 
                                step="0.01" 
                                value={editForm.tax_rate} 
                                onChange={(e) => setEditForm({ ...editForm, tax_rate: e.target.value })} 
                            />
                        </div>
                    </div>

                    {/* Live Total Display */}
                    <div className="p-sm mb-md flex justify-between items-center" style={{ background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                        <span className="text-muted">Calculated Total:</span>
                        <span className="font-bold text-success text-base">
                            {formatLKR(((parseFloat(editForm.labor_total) || 0) + (parseFloat(editForm.parts_total) || 0)) * (1 + (parseFloat(editForm.tax_rate) || 0)))}
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Payment Status</label>
                        <select 
                            className="form-input" 
                            value={editForm.payment_status} 
                            onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea 
                            className="form-input" 
                            rows="2" 
                            value={editForm.notes} 
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} 
                        />
                    </div>

                    <div className="flex gap-md mt-xl">
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Update Invoice</button>
                    </div>
                </form>
            </Modal>

            {/* INVOICE DETAIL MODAL */}
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
                                <div className="text-xs text-muted">Job #{detail.job_id}</div>
                            </div>
                        </div>
                        <div className="mb-md">
                            <small className="text-muted block text-xs tracking-wider">PROBLEM DESCRIPTION</small>
                            <span className="text-sm">{detail.job_description || 'General repair & service'}</span>
                        </div>

                        {detail.parts && detail.parts.length > 0 && (
                            <div className="mb-md">
                                <small className="text-muted block text-xs tracking-wider mb-xs">INSTALLED PARTS &amp; HARDWARE</small>
                                <div style={{ background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '8px' }}>
                                    {detail.parts.map(p => (
                                        <div key={p.id} className="flex justify-between text-xs py-xs" style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                            <span>{p.name} {p.part_number ? `(${p.part_number})` : ''} &bull; {p.quantity_used}x</span>
                                            <span className="font-semibold">{formatLKR(p.line_total || (p.quantity_used * p.unit_price_at_time))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />
                        
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Labor / Service Total</span>
                            <span className="font-semibold">{formatLKR(detail.labor_total)}</span>
                        </div>
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Parts Total</span>
                            <span className="font-semibold">{formatLKR(detail.parts_total)}</span>
                        </div>
                        <div className="flex justify-between mb-sm text-sm">
                            <span>Tax ({(Number(detail.tax_rate || 0) * 100).toFixed(0)}%)</span>
                            <span>{formatLKR(detail.tax_amount)}</span>
                        </div>
                        
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />
                        
                        <div className="flex justify-between items-center mb-md">
                            <span className="font-bold text-lg">Total Amount</span>
                            <span className="font-bold text-2xl text-success">{formatLKR(detail.total_amount)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-md" style={{ borderTop: '1px solid var(--border-light)' }}>
                            <span className={`badge badge-${
                                detail.payment_status === 'paid' ? 'success' : 
                                detail.payment_status === 'partial' ? 'warning' : 'danger'
                            }`}>
                                {detail.payment_status.toUpperCase()}
                            </span>

                            <div className="flex gap-sm">
                                <button 
                                    className="btn btn-secondary btn-sm" 
                                    onClick={() => handleSendEmail(detail)}
                                    disabled={sendingEmailId === detail.id}
                                >
                                    <HiMail className="mr-xs" /> Send to Customer
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => handlePrint(detail)}>
                                    <HiPrinter className="mr-xs" /> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
