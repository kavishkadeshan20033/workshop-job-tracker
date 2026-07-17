import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobAPI, partAPI } from '../services/api';
import {
    HiOutlineBriefcase, HiOutlineClock, HiOutlineCheckCircle,
    HiOutlineExclamation, HiOutlineCalendar, HiOutlineArrowRight
} from 'react-icons/hi';
import { format } from 'date-fns';

const statusConfig = {
    completed: { badge: 'badge-success', label: 'Completed' },
    delivered:  { badge: 'badge-success', label: 'Delivered' },
    waiting_parts: { badge: 'badge-danger', label: 'Waiting Parts' },
    pending:    { badge: 'badge-warning', label: 'Pending' },
    in_progress:{ badge: 'badge-primary', label: 'In Progress' },
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentJobs, setRecentJobs] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [statsRes, jobsRes, stockRes] = await Promise.all([
                jobAPI.getStats(),
                jobAPI.getAll({ status: '' }),
                partAPI.getLowStock(),
            ]);
            setStats(statsRes.data);
            setRecentJobs(jobsRes.data.slice(0, 6));
            setLowStock(stockRes.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex-center" style={{ height: '100vh' }}>
            <div className="spinner" />
        </div>
    );

    const statCards = [
        {
            label: 'Total Jobs',
            value: stats?.total || 0,
            icon: <HiOutlineBriefcase size={24} />,
            color: '#1a1a1a',
            iconBg: '#f0f0f0',
            accent: 'linear-gradient(90deg, #1a1a1a, #444)',
        },
        {
            label: 'Pending',
            value: stats?.pending || 0,
            icon: <HiOutlineClock size={24} />,
            color: '#d97706',
            iconBg: '#fef3c7',
            accent: 'linear-gradient(90deg, #d97706, #f59e0b)',
        },
        {
            label: 'In Progress',
            value: stats?.in_progress || 0,
            icon: <HiOutlineCalendar size={24} />,
            color: '#2a6fdb',
            iconBg: '#dbeafe',
            accent: 'linear-gradient(90deg, #2a6fdb, #60a5fa)',
        },
        {
            label: 'Waiting Parts',
            value: stats?.waiting_parts || 0,
            icon: <HiOutlineExclamation size={24} />,
            color: '#e63946',
            iconBg: '#fee2e2',
            accent: 'linear-gradient(90deg, #e63946, #f87171)',
        },
        {
            label: 'Completed',
            value: stats?.completed || 0,
            icon: <HiOutlineCheckCircle size={24} />,
            color: '#16a34a',
            iconBg: '#dcfce7',
            accent: 'linear-gradient(90deg, #16a34a, #34d399)',
        },
    ];

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div style={{
                background: 'white',
                borderBottom: '1px solid var(--border-light)',
                padding: 'var(--spacing-xl) var(--spacing-2xl)',
            }}>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')} — Workshop overview at a glance.
                </p>
            </div>

            <div className="page-container">
                {/* Stat Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)',
                }}>
                    {statCards.map((s) => (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-card-accent" style={{ background: s.accent }} />
                            <div
                                className="stat-card-icon"
                                style={{ background: s.iconBg, color: s.color }}
                            >
                                {s.icon}
                            </div>
                            <div className="stat-card-value">{s.value}</div>
                            <div className="stat-card-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Content Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: 'var(--spacing-lg)',
                }}>
                    {/* Recent Jobs */}
                    <div className="card">
                        <div className="card-header">
                            <div className="section-accent">
                                <div className="section-accent-line" />
                                <span className="card-title">Recent Jobs</span>
                            </div>
                            <Link
                                to="/jobs"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: 'var(--accent-red)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-heading)',
                                    textDecoration: 'none',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                View All <HiOutlineArrowRight />
                            </Link>
                        </div>

                        {recentJobs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><HiOutlineBriefcase /></div>
                                <div className="empty-state-title">No jobs yet</div>
                                <div className="empty-state-text">Jobs will appear here once created.</div>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Device</th>
                                            <th>Customer</th>
                                            <th>Technician</th>
                                            <th>Status</th>
                                            <th>Date In</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentJobs.map((job) => {
                                            const sc = statusConfig[job.status] || { badge: 'badge-primary', label: job.status };
                                            return (
                                                <tr key={job.id}>
                                                    <td>
                                                        <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'var(--font-heading)' }}>
                                                            #{job.id}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                                                            {job.device_name}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-body)' }}>{job.customer_name}</td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        {job.technician_name || '—'}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${sc.badge}`}>{sc.label}</span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        {format(new Date(job.date_in), 'MMM dd, yyyy')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="card">
                        <div className="card-header">
                            <div className="section-accent">
                                <div className="section-accent-line" style={{ background: lowStock.length ? 'var(--danger)' : 'var(--success)' }} />
                                <span className="card-title">Stock Alerts</span>
                            </div>
                            {lowStock.length > 0 && (
                                <span className="badge badge-danger">{lowStock.length}</span>
                            )}
                        </div>

                        {lowStock.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon" style={{ color: 'var(--success)' }}>
                                    <HiOutlineCheckCircle />
                                </div>
                                <div className="empty-state-title">All Stocked Up</div>
                                <div className="empty-state-text">Inventory levels are healthy.</div>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Part Name</th>
                                            <th style={{ textAlign: 'right' }}>Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStock.map((part) => (
                                            <tr key={part.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{part.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Reorder at: {part.reorder_level}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className="badge badge-danger">{part.stock_qty}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
