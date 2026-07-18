import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth & Users
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/auth/profile'),
};

export const userAPI = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Customers
export const customerAPI = {
    getAll: (search) => api.get('/customers', { params: { search } }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
};

// Technicians
export const technicianAPI = {
    getAll: () => api.get('/technicians'),
    getById: (id) => api.get(`/technicians/${id}`),
    create: (data) => api.post('/technicians', data),
    update: (id, data) => api.put(`/technicians/${id}`, data),
    delete: (id) => api.delete(`/technicians/${id}`),
};

// Jobs
export const jobAPI = {
    getAll: (params) => api.get('/jobs', { params }),
    getById: (id) => api.get(`/jobs/${id}`),
    create: (data) => api.post('/jobs', data),
    update: (id, data) => api.put(`/jobs/${id}`, data),
    updateStatus: (id, status) => api.patch(`/jobs/${id}/status`, { status }),
    delete: (id) => api.delete(`/jobs/${id}`),
    getStats: () => api.get('/jobs/stats'),
    
    // Notes
    addNote: (jobId, data) => api.post(`/jobs/${jobId}/notes`, data),
    
    // Parts
    addPart: (jobId, data) => api.post(`/jobs/${jobId}/parts`, data),
    deletePart: (jobId, partId) => api.delete(`/jobs/${jobId}/parts/${partId}`),
};

// Parts
export const partAPI = {
    getAll: (search) => api.get('/parts', { params: { search } }),
    getById: (id) => api.get(`/parts/${id}`),
    create: (data) => api.post('/parts', data),
    update: (id, data) => api.put(`/parts/${id}`, data),
    delete: (id) => api.delete(`/parts/${id}`),
    getLowStock: () => api.get('/parts/low-stock'),
};

// Invoices
export const invoiceAPI = {
    getAll: () => api.get('/invoices'),
    getById: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    delete: (id) => api.delete(`/invoices/${id}`),
};

// Reports
export const reportAPI = {
    getDaily: (date) => api.get('/reports/daily', { params: { date } }),
    getMonthly: (year, month) => api.get('/reports/monthly', { params: { year, month } }),
};

export default api;
