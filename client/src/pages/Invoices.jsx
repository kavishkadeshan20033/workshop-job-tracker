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
        const issueDate = new Date(fullInv.issued_at || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });

        let partsRowsHtml = '';
        if (fullInv.parts && fullInv.parts.length > 0) {
            partsRowsHtml = fullInv.parts.map((p, idx) => `
                <tr>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 12px;">${idx + 2}</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; font-size: 12px;">
                        <div style="font-weight: 700; color: #000;">${p.name}</div>
                        ${p.category ? `<div style="font-size: 10px; color: #555;">Category: ${p.category}</div>` : ''}
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 11px; color: #333;">${p.part_number || '8471.3010'}</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 12px;">${p.quantity_used}</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: right; font-size: 12px;">${Number(p.unit_price_at_time).toFixed(2)}</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: right; font-size: 12px; font-weight: 700;">${Number(p.line_total || (p.quantity_used * p.unit_price_at_time)).toFixed(2)}</td>
                </tr>
            `).join('');
        } else if (Number(fullInv.parts_total || 0) > 0) {
            partsRowsHtml = `
                <tr>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 12px;">2</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; font-size: 12px;">
                        <div style="font-weight: 700; color: #000;">Replacement Hardware &amp; Components</div>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 11px; color: #333;">8471.3010</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: center; font-size: 12px;">1</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: right; font-size: 12px;">${Number(fullInv.parts_total).toFixed(2)}</td>
                    <td style="padding: 7px 8px; border: 1px solid #000; text-align: right; font-size: 12px; font-weight: 700;">${Number(fullInv.parts_total).toFixed(2)}</td>
                </tr>
            `;
        }

        const subtotalVal = (Number(fullInv.labor_total || 0) + Number(fullInv.parts_total || 0)).toFixed(2);
        const taxVal = Number(fullInv.tax_amount || 0).toFixed(2);
        const totalVal = Number(fullInv.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const taxPct = (Number(fullInv.tax_rate || 0.10) * 100).toFixed(0);

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${invoiceNum} - TAX INVOICE</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 30px 40px;
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    }
                    .logo-box {
                        background: #333333;
                        color: #ffffff;
                        padding: 14px 22px;
                        border-radius: 4px;
                        display: inline-block;
                        text-align: center;
                    }
                    .logo-title {
                        font-size: 26px;
                        font-weight: 900;
                        letter-spacing: 2px;
                        line-height: 1;
                        font-family: 'Arial Black', Impact, sans-serif;
                    }
                    .logo-sub {
                        font-size: 14px;
                        font-weight: 600;
                        letter-spacing: 1px;
                        margin-top: 4px;
                    }
                    .store-info {
                        text-align: right;
                        font-size: 11px;
                        line-height: 1.35;
                        color: #222;
                        max-width: 320px;
                    }
                    .store-title {
                        font-weight: 700;
                        font-size: 12px;
                    }
                    .tax-invoice-heading {
                        text-align: center;
                        font-size: 14px;
                        font-weight: 800;
                        letter-spacing: 1.5px;
                        border-top: 1px solid #555;
                        border-bottom: 1px solid #555;
                        padding: 4px 0;
                        margin: 15px 0 20px 0;
                    }
                    .meta-grid {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }
                    .bill-to {
                        font-size: 12px;
                        line-height: 1.45;
                        width: 50%;
                    }
                    .bill-title {
                        font-weight: 700;
                        font-size: 13px;
                        margin-bottom: 2px;
                    }
                    .inv-meta {
                        text-align: right;
                        font-size: 12px;
                        line-height: 1.5;
                        width: 45%;
                    }
                    .inv-meta-row {
                        display: flex;
                        justify-content: flex-end;
                        gap: 20px;
                    }
                    .inv-meta-label {
                        font-weight: 700;
                    }
                    .supply-place {
                        font-size: 11px;
                        color: #333;
                        margin-top: 10px;
                    }
                    table.invoice-table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 1px solid #000;
                        margin-bottom: 10px;
                    }
                    table.invoice-table th {
                        background: #000;
                        color: #fff;
                        padding: 7px 8px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        border: 1px solid #000;
                    }
                    table.invoice-table td {
                        padding: 7px 8px;
                        border: 1px solid #000;
                        font-size: 12px;
                    }
                    .declaration {
                        font-size: 10.5px;
                        color: #222;
                        margin: 8px 0 16px 0;
                    }
                    .totals-container {
                        display: flex;
                        justify-content: flex-end;
                        margin-bottom: 25px;
                    }
                    .totals-table {
                        width: 320px;
                        font-size: 13px;
                    }
                    .totals-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                    }
                    .total-line {
                        border-top: 1px solid #000;
                        margin-top: 4px;
                    }
                    .final-total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 16px;
                        font-weight: 900;
                        padding: 8px 0;
                        border-bottom: 3px double #000;
                    }
                    .computer-generated {
                        text-align: center;
                        font-size: 11px;
                        color: #555;
                        margin-top: 50px;
                        padding-top: 15px;
                        border-top: 1px solid #ccc;
                    }
                    @media print {
                        body { padding: 15px 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-box">
                        <div class="logo-title">ASUS</div>
                        <div class="logo-sub">Exclusive Store</div>
                    </div>
                    <div class="store-info">
                        <div class="store-title">KavishkaLK Exclusive Store — Laptop Care Hub</div>
                        <div>Shop No 9, Ground Floor, High Level Road,</div>
                        <div>Boralesgamuwa, Colombo,</div>
                        <div>Western Province, Sri Lanka</div>
                        <div>GSTIN / VAT: 27AAUPM1756H1ZT / LK-88902</div>
                    </div>
                </div>

                <div class="tax-invoice-heading">TAX INVOICE</div>

                <div class="meta-grid">
                    <div class="bill-to">
                        <div class="bill-title">Bill To:</div>
                        <div style="font-weight: 700; font-size: 14px;">${fullInv.customer_name || 'Valued Customer'}</div>
                        ${fullInv.customer_address ? `<div>${fullInv.customer_address}</div>` : ''}
                        ${fullInv.customer_phone ? `<div>Phone: ${fullInv.customer_phone}</div>` : ''}
                        ${fullInv.customer_email ? `<div>Email: ${fullInv.customer_email}</div>` : ''}
                        <div>Sri Lanka</div>
                        <div class="supply-place">Place of Supply: Western Province, Sri Lanka</div>
                    </div>

                    <div class="inv-meta">
                        <div class="inv-meta-row">
                            <span class="inv-meta-label">Invoice#:</span>
                            <span style="font-weight: 800; font-family: monospace;">${invoiceNum}</span>
                        </div>
                        <div class="inv-meta-row">
                            <span class="inv-meta-label">Invoice Date:</span>
                            <span>${issueDate}</span>
                        </div>
                        <div class="inv-meta-row">
                            <span class="inv-meta-label">Job Reference:</span>
                            <span style="font-weight: 700;">#${fullInv.job_id}</span>
                        </div>
                        <div class="inv-meta-row">
                            <span class="inv-meta-label">Device:</span>
                            <span>${fullInv.device_name || 'Laptop'}</span>
                        </div>
                        <div class="inv-meta-row" style="margin-top: 6px;">
                            <span class="inv-meta-label">Status:</span>
                            <span style="font-weight: 700; text-transform: uppercase;">${(fullInv.payment_status || 'unpaid').toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th style="text-align: left;">Item Description</th>
                            <th style="width: 100px; text-align: center;">HSN/SAC</th>
                            <th style="width: 45px; text-align: center;">Qty</th>
                            <th style="width: 90px; text-align: right;">Rate (Rs.)</th>
                            <th style="width: 100px; text-align: right;">Amount (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align: center;">1</td>
                            <td>
                                <div style="font-weight: 700;">Laptop Diagnostics, Board Repair &amp; Service Charge</div>
                                <div style="font-size: 11px; color: #444;">${fullInv.job_description || 'General Laptop Service &amp; Diagnostics'}</div>
                            </td>
                            <td style="text-align: center; color: #444;">8471.3010</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;">${Number(fullInv.labor_total || 0).toFixed(2)}</td>
                            <td style="text-align: right; font-weight: 700;">${Number(fullInv.labor_total || 0).toFixed(2)}</td>
                        </tr>
                        ${partsRowsHtml}
                    </tbody>
                </table>

                <div class="declaration">
                    We declare that this invoice shows the actual price of the goods and services described and that all particulars are true and correct.
                </div>

                <div class="totals-container">
                    <div class="totals-table">
                        <div class="totals-row">
                            <span style="font-weight: 700;">Sub Total</span>
                            <span style="font-weight: 700;">${subtotalVal}</span>
                        </div>
                        <div class="totals-row">
                            <span>Sales Tax (${taxPct}%)</span>
                            <span>${taxVal}</span>
                        </div>
                        <div class="total-line"></div>
                        <div class="final-total-row">
                            <span>TOTAL</span>
                            <span>Rs. ${totalVal}</span>
                        </div>
                    </div>
                </div>

                <div class="computer-generated">
                    This is a computer generated invoice no signature required. Correction or modification is not allowed.
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
