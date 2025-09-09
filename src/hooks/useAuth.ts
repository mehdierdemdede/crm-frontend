import { useState } from 'react';
import { api } from '../lib/api';

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email: string, password: string, rememberMe: boolean) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token);
                window.location.href = '/dashboard';
            } else {
                throw new Error('Giriş başarısız');
            }
        } catch (error) {
            alert('Giriş hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading };
}