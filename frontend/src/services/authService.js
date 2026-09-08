import api from './api';

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },
    
    register: async (email, password, role) => {
        const response = await api.post('/auth/register', { email, password, role });
        return response.data;
    }
};
