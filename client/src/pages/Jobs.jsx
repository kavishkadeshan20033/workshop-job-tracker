import { useState, useEffect } from 'react';
import { jobAPI, customerAPI, technicianAPI, deviceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiPlus, HiSearch, HiOutlineDocumentText, HiChatAlt2, HiTrash, HiCheckCircle, HiBadgeCheck, HiXCircle, HiClipboardCheck, HiClock, HiUser, HiPhone } from 'react-icons/hi';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_COLORS = {
    pending: 'badge-warning',
    assigned: 'badge-info',
    in_progress: 'badge-primary',
    waiting_parts: 'badge-danger',
    done_pending_verification: 'badge-pending-verify',
    completed: 'badge-success',
    delivered: 'badge-success',
};

const STATUS_LABELS = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    waiting_parts: 'Waiting Parts',
    done_pending_verification: 'Done – Pending Verify',
    completed: 'Completed',
    delivered: 'Delivered',
};

const formatDateSafe = (dateVal, formatStr = 'MMM dd, yyyy') => {
    if (!dateVal) return '—';
    try {
        const d = new Date(typeof dateVal === 'string' ? dateVal.replace(' ', 'T') : dateVal);
        return isNaN(d.getTime()) ? '—' : format(d, formatStr);
    } catch {
        return '—';
    }
};

export default function Jobs() {
    const { isAdmin, user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search & Filter
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createCustomerId, setCreateCustomerId] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verifyAction, setVerifyAction] = useState('approve'); // 'approve' | 'reject'
    const [verifyNote, setVerifyNote] = useState('');
    const [verifyPrice, setVerifyPrice] = useState('');
    const [verifyTaxRate, setVerifyTaxRate] = useState('0.10');
    const [isVerifying, setIsVerifying] = useState(false);

    // Selected Job for View Modal
    const [selectedJob, setSelectedJob] = useState(null);
    const [noteDescription, setNoteDescription] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobsRes, custRes, techRes, devRes] = await Promise.all([
                jobAPI.getAll({ search, status: statusFilter }),
                customerAPI.getAll(),
                technicianAPI.getAll(),
                deviceAPI.getAll()
            ]);
            setJobs(jobsRes.data);
            setCustomers(custRes.data);
            setTechnicians(techRes.data);
            setDevices(devRes.data || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, statusFilter]);

    const handleCreateJob = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const hasTechnician = !!data.technician_id;
        if (!data.technician_id) delete data.technician_id;
        if (!data.device_id) delete data.device_id;

        try {
            await jobAPI.create(data);
            toast.success(hasTechnician ? 'Job created & email notification sent to technician!' : 'Job created successfully');
            setIsCreateModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create job');
        }
    };

    const handleAssignTechnician = async (jobId, technicianId) => {
        try {
            const techId = technicianId ? parseInt(technicianId) : null;
            await jobAPI.update(jobId, { technician_id: techId });
            
            const techObj = technicians.find(t => t.id === techId);
            if (techObj) {
                toast.success(`Assigned to ${techObj.name} — email notification sent!`);
            } else {
                toast.success('Job unassigned successfully.');
            }

            const updated = await jobAPI.getById(jobId);
            setSelectedJob(updated.data);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update technician assignment');
        }
    };

    const handleStatusChange = async (jobId, newStatus) => {
        try {
            await jobAPI.updateStatus(jobId, newStatus);
            toast.success('Status updated');
            
            if (selectedJob && selectedJob.id === jobId) {
                setSelectedJob({ ...selectedJob, status: newStatus });
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleMarkDone = async () => {
        if (!selectedJob) return;
        try {
            await jobAPI.markDone(selectedJob.id);
            toast.success('Job marked as done — waiting for admin verification');
            setSelectedJob({ ...selectedJob, status: 'done_pending_verification' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to mark job as done');
        }
    };

    const openVerifyModal = (action) => {
        setVerifyAction(action);
        setVerifyNote('');
        setVerifyPrice(selectedJob?.estimated_cost ? String(selectedJob.estimated_cost) : '');
        setVerifyTaxRate('0.10');
        setIsVerifyModalOpen(true);
    };

    const handleVerifyJob = async () => {
        if (!selectedJob) return;
        setIsVerifying(true);
        try {
            const extra = verifyAction === 'approve' ? {
                service_price: verifyPrice ? parseFloat(verifyPrice) : 0,
                tax_rate: verifyTaxRate ? parseFloat(verifyTaxRate) : 0.10,
            } : {};

            await jobAPI.verifyJob(selectedJob.id, verifyAction, verifyNote || undefined, extra);
            if (verifyAction === 'approve') {
                toast.success('✅ Job verified & completed! Invoice generated with pricing.');
                setSelectedJob({ ...selectedJob, status: 'completed' });
            } else {
                toast.success('↩ Job sent back to In Progress! Notification email sent.');
                setSelectedJob({ ...selectedJob, status: 'in_progress' });
            }
            setIsVerifyModalOpen(false);
            setVerifyNote('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Action failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteDescription.trim()) return;
        
        try {
            await jobAPI.addNote(selectedJob.id, { description: noteDescription });
            toast.success('Note added');
            setNoteDescription('');
            
            const { data } = await jobAPI.getById(selectedJob.id);
            setSelectedJob(data);
        } catch (error) {
            toast.error('Failed to add note');
        }
    };
    
    const handleDeleteJob = async (id) => {
        if (window.confirm('Delete this job?')) {
            try {
                await jobAPI.delete(id);
                toast.success('Job deleted');
                setIsViewModalOpen(false);
                fetchData();
            } catch (error) {
                toast.error('Failed to delete job');
            }
        }
    };

    const openViewModal = async (id) => {
        try {
            const { data } = await jobAPI.getById(id);
            setSelectedJob(data);
            setIsViewModalOpen(true);
        } catch (error) {
            toast.error('Failed to load job details');
        }
    };

    const isPendingVerification = selectedJob?.status === 'done_pending_verification' || selectedJob?.status === '';
    const isCompleted = selectedJob?.status === 'completed' || selectedJob?.status === 'delivered';
    const isActiveJob = selectedJob && ['pending', 'assigned', 'in_progress', 'waiting_parts'].includes(selectedJob.status);

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workshop Jobs</h1>
                    <p className="page-subtitle">Manage and track repair jobs</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <HiPlus /> New Job
                    </button>
                )}
            </div>

            <div className="card mb-lg">
                <div className="flex gap-md p-md">
                    <div className="flex-1 form-group mb-0">
                        <div className="form-input-with-icon">
                            <HiSearch className="form-input-icon" />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search by customer, device, or problem..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group mb-0" style={{ width: '200px' }}>
                        <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
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
                                    <th>ID</th>
                                    <th>Customer</th>
                                    <th>Device</th>
                                    <th>Technician</th>
                                    <th>Status</th>
                                    <th>Date In</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-xl">No jobs found.</td></tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.id} className={job.status === 'done_pending_verification' ? 'row-highlight-verify' : ''}>
                                            <td className="font-semibold">#{job.id}</td>
                                            <td>{job.customer_name}</td>
                                            <td className="font-semibold text-primary">{job.device_name}</td>
                                            <td>{job.technician_name || <span className="text-muted">Unassigned</span>}</td>
                                            <td>
                                                <span className={`badge ${STATUS_COLORS[job.status]}`}>
                                                    {job.status === 'done_pending_verification' && '⏳ '}
                                                    {STATUS_LABELS[job.status]}
                                                </span>
                                            </td>
                                            <td>{formatDateSafe(job.date_in || job.created_at)}</td>
                                            <td className="text-right">
                                                <button className="btn btn-sm btn-secondary" onClick={() => openViewModal(job.id)}>
                                                    View Details
                                                </button>
                                                {isAdmin && job.status === 'done_pending_verification' && (
                                                    <span className="badge badge-pending-verify ml-sm" style={{ fontSize: '10px' }}>Needs Review</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE JOB MODAL */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Job">
                <form onSubmit={handleCreateJob} className="form">
                    <div className="form-group">
                        <label className="form-label">Customer</label>
                        <select name="customer_id" className="form-input" required value={createCustomerId} onChange={(e) => setCreateCustomerId(e.target.value)}>
                            <option value="">Select a customer...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Device (Optional)</label>
                        <select name="device_id" className="form-input" disabled={!createCustomerId}>
                            <option value="">-- Select a device (Optional) --</option>
                            {devices.filter(d => d.customer_id.toString() === createCustomerId).map(d => (
                                <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.year}) - {d.serial_number}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Device Name / Model</label>
                        <input type="text" name="device_name" className="form-input" placeholder="e.g. Dell XPS 15, Samsung Galaxy S23" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Problem Description</label>
                        <textarea name="problem_description" className="form-input" rows="3" required></textarea>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Estimated Service Cost ($)</label>
                        <input type="number" step="0.01" name="estimated_cost" className="form-input" placeholder="e.g. 75.00 (Optional initial estimate)" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Assign Technician (Optional)</label>
                        <select name="technician_id" className="form-input">
                            <option value="">-- Unassigned --</option>
                            {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'General'})</option>)}
                        </select>
                    </div>
                    <div className="flex gap-md" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1">Create Job</button>
                    </div>
                </form>
            </Modal>

            {/* VIEW/EDIT JOB MODAL */}
            {selectedJob && (
                <Modal 
                    isOpen={isViewModalOpen} 
                    onClose={() => setIsViewModalOpen(false)} 
                    title={`Job #${selectedJob.id} Details`} 
                    size="large"
                >
                    {/* TOP SUMMARY BAR */}
                    <div className="flex justify-between items-center pb-md mb-lg" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <div className="flex items-center gap-md flex-wrap">
                            <h3 className="font-bold text-xl m-0 text-primary">{selectedJob.device_name}</h3>
                            <span className={`badge ${STATUS_COLORS[selectedJob.status]}`} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                {selectedJob.status === 'done_pending_verification' && <HiClock className="mr-xs" />}
                                {STATUS_LABELS[selectedJob.status]}
                            </span>
                        </div>
                        <div className="text-xs text-muted flex items-center gap-sm">
                            <span><strong>Received:</strong> {formatDateSafe(selectedJob.created_at)}</span>
                        </div>
                    </div>

                    {/* MAIN TWO-COLUMN GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: 'var(--spacing-lg)', alignItems: 'start' }}>
                        
                        {/* LEFT COLUMN: Details & Notes */}
                        <div className="flex flex-col gap-md" style={{ minWidth: 0 }}>
                            {/* Device Issue & Customer / Technician Information */}
                            <div className="card p-md" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                                <div className="mb-md">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-xs">Reported Issue / Fault</span>
                                    <div style={{ 
                                        background: 'var(--white)', 
                                        border: '1px solid var(--border-light)', 
                                        borderRadius: '8px', 
                                        padding: '10px 14px', 
                                        fontSize: '0.9rem',
                                        color: 'var(--text-body)',
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {selectedJob.problem_description || <em className="text-muted">No problem description provided.</em>}
                                    </div>
                                </div>

                                <div className="grid grid-2 gap-md pt-sm" style={{ borderTop: '1px solid var(--border-light)' }}>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-xs">Customer</span>
                                        <div className="flex items-center gap-xs font-semibold text-sm">
                                            <HiUser className="text-muted flex-shrink-0" />
                                            <span className="truncate">{selectedJob.customer_name}</span>
                                        </div>
                                        <div className="flex items-center gap-xs text-xs text-muted mt-xs">
                                            <HiPhone className="text-muted flex-shrink-0" />
                                            <a href={`tel:${selectedJob.customer_phone}`} className="text-muted hover:underline">
                                                {selectedJob.customer_phone}
                                            </a>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-xs">Assigned Technician</span>
                                        {isAdmin ? (
                                            <select
                                                className="form-input text-sm w-full"
                                                style={{ padding: '6px 10px', height: '36px' }}
                                                value={selectedJob.technician_id || ''}
                                                onChange={(e) => handleAssignTechnician(selectedJob.id, e.target.value)}
                                            >
                                                <option value="">-- Unassigned --</option>
                                                {technicians.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} ({t.specialization || 'General'})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-xs font-semibold text-sm" style={{ height: '36px' }}>
                                                <HiUser className="text-muted flex-shrink-0" />
                                                <span>{selectedJob.technician_name || 'Unassigned'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Job Notes Section */}
                            <div className="card p-md" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                                <div className="flex justify-between items-center mb-sm">
                                    <h4 className="font-bold text-sm flex items-center gap-xs m-0">
                                        <HiChatAlt2 className="text-primary" /> Job Activity & Notes
                                    </h4>
                                    <span className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                        {selectedJob.notes?.length || 0}
                                    </span>
                                </div>

                                {/* Notes Stream */}
                                {selectedJob.notes && selectedJob.notes.length > 0 ? (
                                    <div className="flex flex-col gap-xs mb-md" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {selectedJob.notes.map(note => (
                                            <div key={note.id} style={{ 
                                                background: 'var(--white)', 
                                                padding: '8px 12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid var(--border-light)' 
                                            }}>
                                                <div className="flex justify-between items-center mb-xs">
                                                    <span className="font-bold text-xs text-primary">{note.author_name}</span>
                                                    <span className="text-xs text-muted">{formatDateSafe(note.created_at, 'MMM dd, HH:mm')}</span>
                                                </div>
                                                <p className="text-sm m-0" style={{ wordBreak: 'break-word', color: 'var(--text-body)' }}>{note.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-md mb-sm" style={{ background: 'var(--white)', borderRadius: '8px', border: '1px dashed var(--border-medium)' }}>
                                        <p className="text-muted text-xs m-0 italic">No notes logged yet.</p>
                                    </div>
                                )}

                                {/* Add Note Input Form */}
                                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        className="form-input flex-1" 
                                        style={{ minWidth: 0, height: '38px', fontSize: '0.88rem' }}
                                        placeholder="Add a progress update or note..."
                                        value={noteDescription}
                                        onChange={(e) => setNoteDescription(e.target.value)}
                                    />
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ height: '38px', padding: '0 16px', whiteSpace: 'nowrap', flexShrink: 0 }}
                                        disabled={!noteDescription.trim()}
                                    >
                                        Add Note
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions & Status */}
                        <div className="flex flex-col gap-md" style={{ minWidth: 0 }}>

                            {/* ===== ADMIN: VERIFICATION SECTION ===== */}
                            {isAdmin && (
                                <div className={`verify-banner ${isPendingVerification ? 'verify-banner-active' : isCompleted ? 'verify-banner-inactive' : ''}`}>
                                    <div className="verify-banner-header">
                                        <div className="verify-banner-icon">
                                            {isPendingVerification ? <HiClock /> : isCompleted ? <HiCheckCircle style={{ color: '#059669' }} /> : <HiClipboardCheck />}
                                        </div>
                                        <div className="font-bold text-sm" style={{ color: isPendingVerification ? '#92400e' : isCompleted ? '#065f46' : 'var(--text-dark)' }}>
                                            {isPendingVerification 
                                                ? 'Completion Review Required' 
                                                : isCompleted 
                                                ? 'Job Verified & Completed' 
                                                : 'Verification & Final Sign-Off'}
                                        </div>
                                    </div>

                                    <p className="text-xs m-0 text-muted" style={{ lineHeight: 1.4 }}>
                                        {isPendingVerification 
                                            ? 'Technician marked this repair as done. Please review the work and either verify to finalize, or reject and send back.' 
                                            : isCompleted 
                                            ? 'This repair has been inspected and completed. The job is closed.' 
                                            : 'When the technician marks this repair as complete, you can review and verify it here.'}
                                    </p>

                                    <div className="flex flex-col gap-xs mt-xs">
                                        <button
                                            id="verify-approve-btn"
                                            className="btn btn-verify-approve w-full"
                                            disabled={isCompleted}
                                            onClick={() => openVerifyModal('approve')}
                                            title={isCompleted ? 'Job is already completed' : ''}
                                        >
                                            <HiBadgeCheck className="text-lg" /> Verify &amp; Finish Job
                                        </button>
                                        <button
                                            id="verify-reject-btn"
                                            className="btn btn-verify-reject w-full"
                                            disabled={isCompleted}
                                            onClick={() => openVerifyModal('reject')}
                                            title={isCompleted ? 'Job is already completed' : ''}
                                        >
                                            <HiXCircle className="text-lg" /> Reject — Send Back
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ===== EMPLOYEE: ACTIONS & STATUS ===== */}
                            {!isAdmin && (
                                <>
                                    {/* Active state: can mark as done */}
                                    {isActiveJob && (
                                        <div className="mark-done-card">
                                            <HiClipboardCheck className="mark-done-icon" />
                                            <div className="font-bold text-sm mb-xs">Finished the repair?</div>
                                            <p className="text-xs text-muted m-0 mb-md">
                                                Mark this job as done and it will be sent to the workshop administrator for verification.
                                            </p>
                                            <button
                                                id="mark-done-btn"
                                                className="btn btn-mark-done w-full"
                                                onClick={handleMarkDone}
                                            >
                                                <HiCheckCircle className="text-lg" /> Mark as Done
                                            </button>
                                        </div>
                                    )}

                                    {/* Pending verification: clean, calm waiting card */}
                                    {isPendingVerification && (
                                        <div className="pending-info-card">
                                            <div className="pending-info-icon-badge">
                                                <HiClock />
                                            </div>
                                            <div className="font-bold text-sm mb-xs" style={{ color: '#92400e' }}>
                                                Waiting for Admin Review
                                            </div>
                                            <p className="text-xs m-0" style={{ color: '#78350f', lineHeight: 1.4 }}>
                                                Your completion request has been submitted. The administrator will inspect and verify this job.
                                            </p>
                                        </div>
                                    )}

                                    {/* Completed state */}
                                    {isCompleted && (
                                        <div className="card p-md text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                            <HiBadgeCheck style={{ fontSize: '2rem', color: '#16a34a', margin: '0 auto 6px' }} />
                                            <div className="font-bold text-sm" style={{ color: '#166534' }}>Job Completed</div>
                                            <p className="text-xs text-muted m-0 mt-xs">This job has been verified and closed.</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ===== ADMIN: COMPACT STATUS SELECTOR ===== */}
                            {isAdmin && (
                                <div className="card p-md" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-xs">
                                        Change Status
                                    </label>
                                    <select 
                                        className="form-input text-sm w-full font-semibold"
                                        style={{ height: '38px', padding: '6px 12px' }}
                                        value={selectedJob.status}
                                        onChange={(e) => handleStatusChange(selectedJob.id, e.target.value)}
                                    >
                                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>
                                                {val === 'done_pending_verification' ? '⏳ ' : ''}{label}
                                            </option>
                                        ))}
                                    </select>
                                    <small className="text-muted block mt-xs" style={{ fontSize: '11px' }}>
                                        Direct status override for workshop tracking.
                                    </small>
                                </div>
                            )}
                            
                            {/* ===== ADMIN: DELETE ACTION ===== */}
                            {isAdmin && (
                                <button 
                                    className="btn btn-danger w-full" 
                                    style={{ height: '36px', fontSize: '0.85rem' }} 
                                    onClick={() => handleDeleteJob(selectedJob.id)}
                                >
                                    <HiTrash className="mr-xs" /> Delete Job
                                </button>
                            )}
                        </div>

                    </div>
                </Modal>
            )}

            {/* VERIFY JOB MODAL */}
            <Modal
                isOpen={isVerifyModalOpen}
                onClose={() => setIsVerifyModalOpen(false)}
                title={verifyAction === 'approve' ? 'Verify & Complete Job' : 'Reject Job Completion'}
            >
                <div>
                    {verifyAction === 'approve' ? (
                        <div className="verify-modal-info verify-approve-info mb-md">
                            <HiBadgeCheck className="verify-modal-icon" />
                            <div>
                                <div className="font-semibold mb-xs">Approve this job completion</div>
                                <p className="text-sm m-0">This will mark the job as <strong>Completed</strong> and automatically generate an invoice.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="verify-modal-info verify-reject-info mb-md">
                            <HiXCircle className="verify-modal-icon" />
                            <div>
                                <div className="font-semibold mb-xs">Reject this completion</div>
                                <p className="text-sm m-0">This will send the job back to <strong>In Progress</strong> for further work.</p>
                            </div>
                        </div>
                    )}

                    {verifyAction === 'approve' && (
                        <div className="grid grid-2 gap-md mb-md">
                            <div className="form-group mb-0">
                                <label className="form-label text-xs">Full Service / Repair Fee ($) *</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-input" 
                                    placeholder="0.00" 
                                    value={verifyPrice} 
                                    onChange={(e) => setVerifyPrice(e.target.value)} 
                                />
                                <small className="text-muted block mt-xs" style={{ fontSize: '11px' }}>
                                    Labor / service charge billed on invoice.
                                </small>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label text-xs">Tax Rate (e.g. 0.10 = 10%)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-input" 
                                    placeholder="0.10" 
                                    value={verifyTaxRate} 
                                    onChange={(e) => setVerifyTaxRate(e.target.value)} 
                                />
                                <small className="text-muted block mt-xs" style={{ fontSize: '11px' }}>
                                    Standard workshop sales tax.
                                </small>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{verifyAction === 'approve' ? 'Approval Note (optional)' : 'Rejection Reason (optional)'}</label>
                        <textarea
                            className="form-input"
                            rows="2"
                            placeholder={verifyAction === 'approve' ? 'e.g. Diagnostic complete, screen replaced and tested.' : 'e.g. Screen replacement not aligned properly.'}
                            value={verifyNote}
                            onChange={(e) => setVerifyNote(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-md mt-md">
                        <button className="btn btn-secondary flex-1" onClick={() => setIsVerifyModalOpen(false)} disabled={isVerifying}>
                            Cancel
                        </button>
                        <button
                            className={`btn flex-1 ${verifyAction === 'approve' ? 'btn-verify-approve' : 'btn-verify-reject'}`}
                            onClick={handleVerifyJob}
                            disabled={isVerifying}
                        >
                            {isVerifying ? 'Processing...' : verifyAction === 'approve' ? 'Confirm & Complete' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
