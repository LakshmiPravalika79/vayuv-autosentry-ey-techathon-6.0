import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

// Production API URL - hardcoded for Render deployment
const PRODUCTION_API_URL = 'https://vayuv-autosentry-ey-techathon-6-0.onrender.com/api/v1';
const API_BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          const user = useAuthStore.getState().user;

          if (user) {
            useAuthStore.getState().setAuth(user, token, newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get('/auth/profile'),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/vehicles', { params }),
  
  getById: (id: string) => api.get(`/vehicles/${id}`),
  
  create: (data: Partial<{ vin: string; make: string; model: string; year: number; mileage: number }>) =>
    api.post('/vehicles', data),
  
  update: (id: string, data: Partial<{ mileage: number; status: string }>) =>
    api.patch(`/vehicles/${id}`, data),
  
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

// Telemetry API
export const telemetryAPI = {
  ingest: (vehicleId: string, data: Record<string, number>) =>
    api.post('/telemetry/ingest', { vehicleId, data }),
  
  getByVehicle: (vehicleId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/telemetry/vehicle/${vehicleId}`, { params }),
};

// Predictions API
export const predictionsAPI = {
  getByVehicle: (vehicleId: string, params?: { acknowledged?: boolean }) =>
    api.get(`/predictions/${vehicleId}`, { params }),
  
  acknowledge: (id: string) => api.post(`/predictions/${id}/acknowledge`),
  
  trigger: (vehicleId: string) => api.post(`/predictions/trigger/${vehicleId}`),
};

// Appointments API
export const appointmentsAPI = {
  getAll: (params?: { status?: string; vehicleId?: string }) =>
    api.get('/appointments', { params }),
  
  getById: (id: string) => api.get(`/appointments/${id}`),
  
  create: (data: { vehicleId: string; serviceType: string; scheduledDate: string; notes?: string }) =>
    api.post('/appointments', data),
  
  update: (id: string, data: Partial<{ scheduledDate: string; status: string; notes: string }>) =>
    api.patch(`/appointments/${id}`, data),
  
  cancel: (id: string, reason?: string) =>
    api.post(`/appointments/${id}/cancel`, { reason }),
  
  getAvailability: (date: string, serviceType: string) =>
    api.get('/appointments/availability', { params: { date, serviceType } }),
};

// Feedback API
export const feedbackAPI = {
  getAll: () => api.get('/feedback'),
  
  getById: (id: string) => api.get(`/feedback/${id}`),
  
  submit: (data: {
    appointmentId: string;
    rating: number;
    comment?: string;
    categories?: Record<string, number>;
    wouldRecommend?: boolean;
  }) => api.post('/feedback', data),
  
  getStats: () => api.get('/feedback/stats'),
};

// Alerts API
export const alertsAPI = {
  getAll: (params?: { type?: string; read?: boolean; vehicleId?: string }) =>
    api.get('/alerts', { params }),
  
  markAsRead: (id: string) => api.post(`/alerts/${id}/read`),
  
  markAllAsRead: () => api.post('/alerts/read-all'),
  
  delete: (id: string) => api.delete(`/alerts/${id}`),
  
  getStats: () => api.get('/alerts/stats'),
  
  getUEBA: () => api.get('/alerts/ueba'),
};

// Agents API
export const agentsAPI = {
  getStatus: () => api.get('/agents/status'),
  
  trigger: (agentType: string, vehicleId?: string, payload?: Record<string, unknown>) =>
    api.post('/agents/trigger', { agentType, vehicleId, payload }),
  
  analyzeVehicle: (vehicleId: string) => api.post(`/agents/analyze/${vehicleId}`),
  
  createRCACapa: (data: {
    vehicleId: string;
    issueDescription: string;
    severity: string;
    category: string;
  }) => api.post('/agents/rca-capa', data),
  
  getRCACapaRecords: (params?: { vehicleId?: string; status?: string; severity?: string }) =>
    api.get('/agents/rca-capa', { params }),
  
  getRCACapaById: (id: string) => api.get(`/agents/rca-capa/${id}`),
  
  updateRCACapa: (id: string, data: Partial<{
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
    status: string;
  }>) => api.patch(`/agents/rca-capa/${id}`, data),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  
  getVehicleDashboard: (vehicleId: string) => api.get(`/dashboard/vehicle/${vehicleId}`),
  
  getAnalytics: () => api.get('/dashboard/analytics'),
  
  getHealth: () => api.get('/dashboard/health'),
};
