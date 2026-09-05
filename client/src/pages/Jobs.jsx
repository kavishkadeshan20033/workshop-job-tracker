import { useState, useEffect } from 'react';
import { jobAPI, customerAPI, technicianAPI, deviceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiPlus, HiSearch, HiOutlineDocumentText, HiChatAlt2, HiTrash, HiCheckCircle, HiBadgeCheck, HiXCircle, HiClipboardCheck } from 'react-icons/hi';
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

        if (!data.technician_id) delete data.technician_id;
        if (!data.device_id) delete data.device_id;

        try {
            await jobAPI.create(data);
            toast.success('Job created successfully');
            setIsCreateModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create job');
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
        setIsVerifyModalOpen(true);
    };

    const handleVerifyJob = async () => {
        if (!selectedJob) return;
        setIsVerifying(true);
        try {
            await jobAPI.verifyJob(selectedJob.id, verifyAction, verifyNote || undefined);
            if (verifyAction === 'approve') {
                toast.success('✅ Job verified and marked as completed! Invoice auto-generated.');
                setSelectedJob({ ...selectedJob, status: 'completed' });
            } else {
                toast.success('↩ Job rejected and sent back to In Progress.');
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

    const isPendingVerification = selectedJob?.status === 'done_pending_verification';
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
                <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Job #${selectedJob.id} Details`} size="large">
                    <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                        
                        {/* LEFT COLUMN: Details & Notes */}
                        <div>
                            <div className="card p-md mb-md" style={{ background: 'var(--bg-tertiary)' }}>
                                <div className="flex justify-between items-start mb-sm">
                                    <h3 className="font-semibold text-primary">{selectedJob.device_name}</h3>
                                    <span className={`badge ${STATUS_COLORS[selectedJob.status]}`}>
                                        {selectedJob.status === 'done_pending_verification' && '⏳ '}
                                        {STATUS_LABELS[selectedJob.status]}
                                    </span>
                                </div>
                                <p className="text-muted mb-sm">{selectedJob.problem_description}</p>
                                
                                <div className="grid grid-2 gap-md mt-md">
                                    <div>
                                        <small className="text-muted block">Customer</small>
                                        <span className="font-semibold">{selectedJob.customer_name}</span>
                                        <div className="text-sm">{selectedJob.customer_phone}</div>
                                    </div>
                                    <div>
                                        <small className="text-muted block">Technician</small>
                                        <span className="font-semibold">{selectedJob.technician_name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* NOTES SECTION */}
                            <h4 className="font-semibold mb-sm flex items-center gap-sm">
                                <HiChatAlt2 className="text-primary" /> Job Notes
                            </h4>
                            <div className="card p-md mb-md" style={{ background: 'var(--bg-tertiary)' }}>
                                {selectedJob.notes && selectedJob.notes.length > 0 ? (
                                    <div className="flex flex-col gap-sm mb-md">
                                        {selectedJob.notes.map(note => (
                                            <div key={note.id} style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                                                <div className="flex justify-between items-center mb-xs">
                                                    <span className="font-semibold text-sm text-primary">{note.author_name}</span>
                                                    <span className="text-xs text-muted">{formatDateSafe(note.created_at, 'MMM dd, HH:mm')}</span>
                                                </div>
                                                <p className="text-sm m-0">{note.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted text-sm text-center italic mb-md">No notes added yet.</p>
                                )}

                                <form onSubmit={handleAddNote} className="flex gap-sm">
                                    <input 
                                        type="text" 
                                        className="form-input flex-1" 
                                        placeholder="Type a new note..."
                                        value={noteDescription}
                                        onChange={(e) => setNoteDescription(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={!noteDescription.trim()}>Add Note</button>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions & Status */}
                        <div>

                            {/* ===== ADMIN: VERIFICATION SECTION (always visible) ===== */}
                            {isAdmin && (
                                <div className={`verify-banner mb-md ${isPendingVerification ? 'verify-banner-active' : 'verify-banner-inactive'}`}>
                                    <div className="verify-banner-icon">
                                        <HiClipboardCheck />
                                    </div>
                                    <div className="verify-banner-content">
                                        {isPendingVerification ? (
                                            <>
                                                <div className="font-semibold mb-xs" style={{ color: '#92400e' }}>⏳ Job Marked as Done — Needs Review</div>
                                                <p className="text-sm m-0 mb-md" style={{ color: '#78350f' }}>The technician has completed this job. Please review and take action.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-semibold mb-xs text-muted">Job Verification</div>
                                                <p className="text-sm m-0 mb-md text-muted">These actions become available once the technician marks the job as done.</p>
                                            </>
                                        )}
                                        <div className="flex gap-sm flex-col">
                                            <button
                                                id="verify-approve-btn"
                                                className="btn btn-verify-approve w-full"
                                                disabled={!isPendingVerification}
                                                onClick={() => openVerifyModal('approve')}
                                                title={!isPendingVerification ? 'Job must be marked as done first' : ''}
                                            >
                                                <HiBadgeCheck className="mr-sm" /> Verify &amp; Finish Job
                                            </button>
                                            <button
                                                id="verify-reject-btn"
                                                className="btn btn-verify-reject w-full"
                                                disabled={!isPendingVerification}
                                                onClick={() => openVerifyModal('reject')}
                                                title={!isPendingVerification ? 'Job must be marked as done first' : ''}
                                            >
                                                <HiXCircle className="mr-sm" /> Reject — Send Back
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== EMPLOYEE: MARK AS DONE BUTTON ===== */}
                            {!isAdmin && isActiveJob && (
                                <div className="mark-done-card mb-md">
                                    <HiClipboardCheck className="mark-done-icon" />
                                    <div className="font-semibold mb-xs">Finished the repair?</div>
                                    <p className="text-sm text-muted m-0 mb-md">Mark this job as done and it will be sent to the admin for verification.</p>
                                    <button
                                        id="mark-done-btn"
                                        className="btn btn-mark-done w-full"
                                        onClick={handleMarkDone}
                                    >
                                        <HiCheckCircle className="mr-sm" /> Mark as Done
                                    </button>
                                </div>
                            )}

                            {/* ===== EMPLOYEE: PENDING STATE INFO ===== */}
                            {!isAdmin && isPendingVerification && (
                                <div className="pending-info-card mb-md">
                                    <div className="text-center">
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                                        <div className="font-semibold mb-xs">Waiting for Admin</div>
                                        <p className="text-sm text-muted m-0">Your completion request has been submitted. The admin will review and verify this job.</p>
                                    </div>
                                </div>
                            )}

                            {/* ===== ADMIN: FULL STATUS PICKER (always visible for admin) ===== */}
                            {isAdmin && (
                                <div className="card p-md mb-md" style={{ background: 'var(--bg-tertiary)' }}>
                                    <h4 className="font-semibold mb-md">Update Status</h4>
                                    <div className="flex flex-col gap-sm">
                                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                            <button 
                                                key={val}
                                                className={`btn ${selectedJob.status === val ? 'btn-primary' : 'btn-secondary'} w-full text-left`}
                                                onClick={() => handleStatusChange(selectedJob.id, val)}
                                            >
                                                {selectedJob.status === val && <HiCheckCircle className="mr-sm" />}
                                                {val === 'done_pending_verification' ? '⏳ ' : ''}
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {isAdmin && (
                                <button className="btn btn-danger w-full mt-auto" onClick={() => handleDeleteJob(selectedJob.id)}>
                                    <HiTrash className="mr-sm" /> Delete Job
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
                title={verifyAction === 'approve' ? '✅ Verify & Complete Job' : '↩ Reject Job'}
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

                    <div className="form-group">
                        <label className="form-label">{verifyAction === 'approve' ? 'Approval Note (optional)' : 'Rejection Reason (optional)'}</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder={verifyAction === 'approve' ? 'e.g. Quality checked, all parts installed correctly.' : 'e.g. Screen replacement not aligned properly.'}
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
                            {isVerifying ? 'Processing...' : verifyAction === 'approve' ? '✅ Confirm & Complete' : '↩ Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
