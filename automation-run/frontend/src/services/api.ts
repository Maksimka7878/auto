import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          useAuthStore.getState().setAuth({
            user,
            accessToken,
            refreshToken: newRefreshToken,
          });

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Users API
export const usersApi = {
  getMe: () => api.get('/users/me'),
  getStats: () => api.get('/users/me/stats'),
  updateMe: (data: { name?: string; settings?: any }) =>
    api.put('/users/me', data),
  deleteMe: () => api.delete('/users/me'),
};

// Workflows API
export const workflowsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/workflows', { params }),

  getById: (id: string) => api.get(`/workflows/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post('/workflows', data),

  update: (id: string, data: any) => api.put(`/workflows/${id}`, data),

  activate: (id: string) => api.post(`/workflows/${id}/activate`),

  deactivate: (id: string) => api.post(`/workflows/${id}/deactivate`),

  duplicate: (id: string) => api.post(`/workflows/${id}/duplicate`),

  delete: (id: string) => api.delete(`/workflows/${id}`),
};

// Executions API
export const executionsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    workflowId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/executions', { params }),

  getById: (id: string) => api.get(`/executions/${id}`),

  getStats: (workflowId?: string) =>
    api.get('/executions/stats', { params: { workflowId } }),

  getActivity: (days?: number) =>
    api.get('/executions/activity', { params: { days } }),

  cancel: (id: string) => api.post(`/executions/${id}/cancel`),
};

// Subscriptions API
export const subscriptionsApi = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrent: () => api.get('/subscriptions/current'),
  upgrade: (plan: string) => api.post('/subscriptions/upgrade', { plan }),
  cancel: (immediately?: boolean) =>
    api.post('/subscriptions/cancel', { immediately }),
};

// Payments API
export const paymentsApi = {
  createCheckout: (plan: string) =>
    api.post('/payments/checkout', { plan }),
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/payments/history', { params }),
  createPortal: () => api.post('/payments/portal'),
};

// Integrations API
export const integrationsApi = {
  getAvailable: () => api.get('/integrations/available'),
};

export default api;
