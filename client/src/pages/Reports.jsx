import { useState } from 'react';
import Navbar from '../components/Navbar';
import { reportAPI } from '../services/api';
import { HiDownload, HiDocumentReport } from 'react-icons/hi';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

export default function Reports() {
    const [reportType, setReportType] = useState('daily');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'daily') {
                const { data } = await reportAPI.getDaily(date);
                setReport(data);
            } else {
                const { data } = await reportAPI.getMonthly(year, month);
                setReport(data);
            }
            toast.success('Report generated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to generate report');
        } finally { setLoading(false); }
    };

    const downloadCSV = () => {
        if (!report?.jobs?.length) { toast.error('No data to export'); return; }
        const csvData = report.jobs.map((j) => ({
            'Job ID': j.id,
            'Device': j.device_name,
            'Description': j.problem_description,
            'Customer': j.customer_name,
            'Technician': j.technician_name || 'Unassigned',
            'Status': j.status,
            'Priority': j.priority,
            'Date In': j.date_in,
            'Estimated Cost': j.estimated_cost || 0,
            'Final Cost': j.final_cost || 0,
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `workshop_${reportType}_report_${reportType === 'daily' ? date : `${year}-${month}`}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV downloaded!');
    };

    const downloadPDF = () => {
        if (!report?.jobs?.length) { toast.error('No data to export'); return; }
        const doc = new jsPDF();
        const title = reportType === 'daily'
            ? `Daily Report — ${date}`
            : `Monthly Report — ${year}/${String(month).padStart(2, '0')}`;

        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Workshop Job Tracker', 14, 20);
        doc.setFontSize(12);
        doc.text(title, 14, 30);

        // Summary
        doc.setFontSize(10);
        doc.text(`Total Jobs: ${report.summary.total_jobs}`, 14, 42);
        doc.text(`Completed: ${report.summary.completed}`, 14, 48);
        doc.text(`In Progress: ${report.summary.in_progress}`, 80, 42);
        doc.text(`Pending: ${report.summary.pending}`, 80, 48);
        doc.text(`Total Projected Value: $${report.summary.total_revenue.toFixed(2)}`, 140, 42);

        // Table
        doc.autoTable({
            startY: 55,
            head: [['ID', 'Device', 'Problem', 'Customer', 'Status', 'Cost']],
            body: report.jobs.map((j) => [
                j.id, 
                j.device_name?.substring(0, 20),
                j.problem_description?.substring(0, 30), 
                j.customer_name, 
                j.status.replace('_', ' '), 
                `$${(j.final_cost || j.estimated_cost || 0).toFixed(2)}`
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        doc.save(`workshop_${reportType}_report_${reportType === 'daily' ? date : `${year}-${month}`}.pdf`);
        toast.success('PDF downloaded!');
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Generate daily and monthly job reports</p>
                </div>
            </div>

            <div className="card mb-xl">
                <div className="card-body">
                    <div className="flex gap-md items-end flex-wrap">
                        <div className="form-group mb-0" style={{ minWidth: '200px' }}>
                            <label className="form-label">Report Type</label>
                            <select className="form-input" value={reportType} onChange={(e) => { setReportType(e.target.value); setReport(null); }}>
                                <option value="daily">Daily Report</option>
                                <option value="monthly">Monthly Report</option>
                            </select>
                        </div>

                        {reportType === 'daily' ? (
                            <div className="form-group mb-0" style={{ minWidth: '200px' }}>
                                <label className="form-label">Date</label>
                                <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                        ) : (
                            <>
                                <div className="form-group mb-0" style={{ minWidth: '150px' }}>
                                    <label className="form-label">Year</label>
                                    <input className="form-input" type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2020" max="2030" />
                                </div>
                                <div className="form-group mb-0" style={{ minWidth: '150px' }}>
                                    <label className="form-label">Month</label>
                                    <select className="form-input" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                                        {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        <button className="btn btn-primary" onClick={generateReport} disabled={loading} style={{ height: '42px' }}>
                            <HiDocumentReport /> {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </div>
            </div>

            {report && (
                <div className="fade-in">
                    <div className="grid grid-3 gap-md mb-xl" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        <div className="card text-center">
                            <div className="text-sm text-muted mb-xs">Total Jobs</div>
                            <div className="text-2xl font-bold">{report.summary.total_jobs}</div>
                        </div>
                        <div className="card text-center" style={{ borderTop: '3px solid #10b981' }}>
                            <div className="text-sm text-muted mb-xs">Completed</div>
                            <div className="text-2xl font-bold text-success">{report.summary.completed}</div>
                        </div>
                        <div className="card text-center" style={{ borderTop: '3px solid #3b82f6' }}>
                            <div className="text-sm text-muted mb-xs">In Progress</div>
                            <div className="text-2xl font-bold text-info">{report.summary.in_progress}</div>
                        </div>
                        <div className="card text-center" style={{ borderTop: '3px solid #f59e0b' }}>
                            <div className="text-sm text-muted mb-xs">Pending</div>
                            <div className="text-2xl font-bold text-warning">{report.summary.pending}</div>
                        </div>
                        <div className="card text-center" style={{ borderTop: '3px solid #6366f1' }}>
                            <div className="text-sm text-muted mb-xs">Projected Value</div>
                            <div className="text-2xl font-bold text-primary">${report.summary.total_revenue.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                {reportType === 'daily' ? `Jobs on ${date}` : `Jobs in ${monthNames[month - 1]} ${year}`}
                            </h3>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary btn-sm" onClick={downloadCSV}><HiDownload /> CSV</button>
                                <button className="btn btn-primary btn-sm" onClick={downloadPDF}><HiDownload /> PDF</button>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {report.jobs.length === 0 ? (
                                <div className="text-center p-xl text-muted">No jobs found for this period.</div>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Device</th>
                                                <th>Problem</th>
                                                <th>Customer</th>
                                                <th>Technician</th>
                                                <th>Status</th>
                                                <th>Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.jobs.map((j) => (
                                                <tr key={j.id}>
                                                    <td className="font-semibold">#{j.id}</td>
                                                    <td className="text-primary font-medium">{j.device_name}</td>
                                                    <td>{j.problem_description?.substring(0, 35)}{j.problem_description?.length > 35 ? '...' : ''}</td>
                                                    <td>{j.customer_name}</td>
                                                    <td>{j.technician_name || '—'}</td>
                                                    <td>
                                                        <span className={`badge badge-${
                                                            j.status === 'completed' || j.status === 'delivered' ? 'success' :
                                                            j.status === 'waiting_parts' ? 'danger' :
                                                            j.status === 'pending' ? 'warning' : 'primary'
                                                        }`}>
                                                            {j.status?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="font-semibold">${(j.final_cost || j.estimated_cost || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
