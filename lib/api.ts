import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export interface User {
    _id: string;
    username: string;
    email: string;
    role?: string;
    createdAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

export const authAPI = {
    login: async (credentials: LoginCredentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
    register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export const usersAPI = {
    getAll: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<User>(`/users/${id}`);
        return response.data;
    },
    create: async (data: Partial<User>) => {
        const response = await api.post<User>('/users', data);
        return response.data;
    },
    update: async (id: string, data: Partial<User>) => {
        const response = await api.put<User>(`/users/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },
};

export default api;