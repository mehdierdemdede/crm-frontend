const BASE_URL = 'http://localhost:8080/api';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    tokenType: string;
}

// Generic response interface for better type safety
export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    status: number;
}

export const api = {
    post: async <T>(url: string, data: unknown): Promise<ApiResponse<T>> => {
        try {
            const response = await fetch(`${BASE_URL}${url}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            let responseData;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (response.ok) {
                return {
                    data: responseData as T,
                    status: response.status,
                };
            } else {
                return {
                    message: typeof responseData === 'string' ? responseData : 'An error occurred',
                    status: response.status,
                };
            }
        } catch (error) {
            return {
                message: error instanceof Error ? error.message : 'Network error occurred',
                status: 0,
            };
        }
    },
};

// Auth headers için yardımcı fonksiyon
export const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken');
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';

    if (token) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `${tokenType} ${token}`,
        };
    }

    return {
        'Content-Type': 'application/json',
    };
};