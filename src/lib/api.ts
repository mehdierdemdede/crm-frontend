// lib/api.ts

const BASE_URL = 'http://localhost:8080/api';

export type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

// --- MEVCUT INTERFACE'LER ---
export interface LoginRequest {
    email: string;
    password: string;
}


export interface LoginResponse {
    accessToken: string;
    tokenType: string;
}

export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    status: number;
}

// --- YENİ EKLENEN INTERFACE'LER ---
export interface InviteUserRequest {
    firstName: string;
    email: string;
    role: Role;
}

export interface AcceptInviteRequest {
    token: string;
    password: string;
}

// Örnek bir kullanıcı response tipi
export interface UserResponse {
    id: string;
    firstName: string;
    email: string;
    role: Role;
}

// --- YARDIMCI FONKSİYON (Değişiklik yok) ---
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


// --- GÜNCELLENMİŞ API OBJESİ ---
export const api = {
    /**
     * API'ye POST isteği gönderir.
     * @param url Endpoint URL'si (örn: /auth/login)
     * @param data Gönderilecek veri objesi
     * @param authenticated Bu isteğin kimlik doğrulaması gerektirip gerektirmediği
     */
    post: async <T>(url: string, data: unknown, authenticated: boolean = false): Promise<ApiResponse<T>> => {
        try {
            // Kimlik doğrulaması gerekiyorsa getAuthHeaders, gerekmiyorsa standart header kullan
            const headers = authenticated ? getAuthHeaders() : { 'Content-Type': 'application/json' };

            const response = await fetch(`${BASE_URL}${url}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
            });

            // Geri kalan response işleme mantığı aynı
            let responseData;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                // JSON değilse metin olarak oku (örn: hata mesajları)
                responseData = await response.text();
            }

            if (response.ok) {
                return { data: responseData as T, status: response.status };
            } else {
                // Hata mesajını JSON içindeki 'message' alanından veya text'ten al
                const errorMessage = typeof responseData === 'object' && responseData.message
                    ? responseData.message
                    : responseData;
                return { message: errorMessage || 'Bir hata oluştu.', status: response.status };
            }
        } catch (error) {
            return {
                message: error instanceof Error ? error.message : 'Ağ hatası oluştu.',
                status: 0,
            };
        }
    },
};

// --- YENİ SERVİS FONKSİYONLARI ---

/**
 * Yeni bir takım üyesini davet eder. Kimlik doğrulaması gerektirir.
 */
export const inviteUser = (data: InviteUserRequest) => {
    return api.post<UserResponse>('/users/invite', data, true);
};

/**
 * Kullanıcının daveti kabul edip şifre belirlemesini sağlar. Herkese açıktır.
 * NOT: Endpoint'i kendi backend rotanıza göre güncelleyin.
 */
export const acceptInvite = (data: AcceptInviteRequest) => {
    return api.post<any>('/users/invite/accept', data, false);
};