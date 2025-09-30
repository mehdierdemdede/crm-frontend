import { useState } from 'react';
import { api, LoginResponse } from '../lib/api';

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const loginRequest = {
                email,
                password
            };

            const response = await api.post<LoginResponse>('/auth/login', loginRequest);

            if (response.status >= 200 && response.status < 300 && response.data) {
                localStorage.setItem('authToken', response.data.accessToken);
                localStorage.setItem('tokenType', response.data.tokenType || 'Bearer');
                return true;
            } else {
                throw new Error(response.message || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Giriş sırasında bir hata oluştu';
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading, error };
}