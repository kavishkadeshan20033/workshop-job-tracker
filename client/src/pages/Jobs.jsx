import { useState, useEffect } from 'react';
import { jobAPI, customerAPI, technicianAPI, vehicleAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiPlus, HiSearch, HiOutlineDocumentText, HiChatAlt2, HiTrash, HiCheckCircle } from 'react-icons/hi';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_COLORS = {
    pending: 'badge-warning',
    assigned: 'badge-info',
    in_progress: 'badge-primary',
    waiting_parts: 'badge-danger',
    completed: 'badge-success',
    delivered: 'badge-success',
};

const STATUS_LABELS = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    waiting_parts: 'Waiting Parts',
    completed: 'Completed',
    delivered: 'Delivered',
};

export default function Jobs() {
    const { isAdmin, user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search & Filter
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createCustomerId, setCreateCustomerId] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Selected Job for View Modal
    const [selectedJob, setSelectedJob] = useState(null);
    const [noteDescription, setNoteDescription] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobsRes, custRes, techRes, vehRes] = await Promise.all([
                jobAPI.getAll({ search, status: statusFilter }),
                customerAPI.getAll(),
                technicianAPI.getAll(),
                vehicleAPI.getAll()
            ]);
            setJobs(jobsRes.data);
            setCustomers(custRes.data);
            setTechnicians(techRes.data);
            setVehicles(vehRes.data || []);
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
        if (!data.vehicle_id) delete data.vehicle_id;

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
            
            // Update local state if modal is open
            if (selectedJob && selectedJob.id === jobId) {
                setSelectedJob({ ...selectedJob, status: newStatus });
            }
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteDescription.trim()) return;
        
        try {
            await jobAPI.addNote(selectedJob.id, { description: noteDescription });
            toast.success('Note added');
            setNoteDescription('');
            
            // Refresh selected job
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
                                        <tr key={job.id}>
                                            <td className="font-semibold">#{job.id}</td>
                                            <td>{job.customer_name}</td>
                                            <td className="font-semibold text-primary">{job.device_name}</td>
                                            <td>{job.technician_name || <span className="text-muted">Unassigned</span>}</td>
                                            <td>
                                                <span className={`badge ${STATUS_COLORS[job.status]}`}>
                                                    {STATUS_LABELS[job.status]}
                                                </span>
                                            </td>
                                            <td>{format(new Date(job.date_in), 'MMM dd, yyyy')}</td>
                                            <td className="text-right">
                                                <button className="btn btn-sm btn-secondary" onClick={() => openViewModal(job.id)}>
                                                    View Details
                                                </button>
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
                        <label className="form-label">Vehicle</label>
                        <select name="vehicle_id" className="form-input" disabled={!createCustomerId}>
                            <option value="">-- Select a vehicle (Optional) --</option>
                            {vehicles.filter(v => v.customer_id.toString() === createCustomerId).map(v => (
                                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.license_plate}</option>
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
                                <h3 className="font-semibold text-primary mb-sm">{selectedJob.device_name}</h3>
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
                                                    <span className="text-xs text-muted">{format(new Date(note.created_at), 'MMM dd, HH:mm')}</span>
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
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {isAdmin && (
                                <button className="btn btn-danger w-full mt-auto" onClick={() => handleDeleteJob(selectedJob.id)}>
                                    <HiTrash className="mr-sm" /> Delete Job
                                </button>
                            )}
                        </div>

                    </div>
                </Modal>
            )}
        </div>
    );
}
