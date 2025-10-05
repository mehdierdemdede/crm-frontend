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
    lastName: string;
    email: string;
    role: Role;
    supportedLanguages?: string[];  // örn: ["TR","EN"]
    dailyCapacity?: number;
    active?: boolean;
    autoAssignEnabled?: boolean;
    organizationId?: string;        // sadece SUPER_ADMIN için
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
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";

    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
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


export const getIntegrationLogs = async (platform?: string) => {
    const headers = getAuthHeaders();
    const url = platform
        ? `${BASE_URL}/integrations/logs?platform=${platform}`
        : `${BASE_URL}/integrations/logs`;

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Log kayıtları alınamadı.");

        const data = await response.json();
        return data as {
            id: string;
            organizationId: string;
            platform: "FACEBOOK" | "GOOGLE";
            totalFetched: number;
            newCreated: number;
            updated: number;
            errorMessage?: string;
            startedAt: string;
            finishedAt: string;
        }[];
    } catch (err) {
        console.error("Integration log fetch error:", err);
        return [];
    }
};

/**
 * Belirli bir lead'in durum geçmişini getirir
 */
export const getLeadStatusLogs = async (leadId: string) => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(`${BASE_URL}/leads/${leadId}/status-logs`, {
            method: "GET",
            headers,
        });

        if (response.status === 204) return []; // no content

        if (!response.ok) throw new Error("Durum geçmişi alınamadı.");

        const data = await response.json();
        return data as {
            id: string;
            leadId: string;
            oldStatus: string | null;
            newStatus: string;
            changedBy: string | null;
            createdAt: string;
        }[];
    } catch (err) {
        console.error("Status log fetch error:", err);
        return [];
    }
};



// ──────────────── LEADS API ─────────────────────────────

// Lead tipini types kısmında paylaşabilirsin:
export interface LeadResponse {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    language?: string;
    status: string;
    campaign?: {
        id: string;
        name: string;
    } | null;
    assignedToUser?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadLog {
    id: string;
    leadId: string;
    userId: string;
    actionType: "PHONE" | "WHATSAPP" | "MESSENGER" | "NOTE" | "EMAIL" | "OTHER";
    message: string;
    createdAt: string;
}

export interface LeadStatsResponse {
    totalLeads: number;
    contactedLeads: number;
    conversionRate: number;
    avgFirstResponseMinutes: number | null;
    statusBreakdown: { status: string; count: number }[];
    campaignBreakdown: { campaignName: string; count: number }[];
}



//
// 📌 Lead Servisleri
//
export const getLeads = async (): Promise<LeadResponse[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads`, { headers });
        if (!res.ok) throw new Error("Lead listesi alınamadı");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("getLeads error:", err);
        return [];
    }
};

export const getLeadById = async (leadId: string): Promise<LeadResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}`, { headers });
        if (!res.ok) throw new Error("Lead bulunamadı");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("getLeadById error:", err);
        return null;
    }
};

export const updateLeadStatus = async (leadId: string, status: string): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/status?status=${status}`, {
            method: "PATCH",
            headers,
        });
        if (!res.ok) throw new Error(await res.text());
        return true;
    } catch (err) {
        console.error("updateLeadStatus error:", err);
        return false;
    }
};

export const deleteLead = async (leadId: string): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}`, {
            method: "DELETE",
            headers,
        });
        return res.ok;
    } catch (err) {
        console.error("deleteLead error:", err);
        return false;
    }
};

/**
 * Tek lead’in durumunu günceller
 */
export const patchLeadStatus = async (leadId: string, status: string) => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/status?status=${status}`, {
            method: "PATCH",
            headers,
        });
        if (!res.ok) throw new Error("Lead durumu güncellenemedi");
        return true;
    } catch (err) {
        console.error("patchLeadStatus error:", err);
        return false;
    }
};

/**
 * Tek lead’i bir kullanıcıya atar
 */
export const patchLeadAssign = async (leadId: string, userId: string | null) => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/assign?userId=${userId ?? ""}`, {
            method: "PATCH",
            headers,
        });
        if (!res.ok) throw new Error("Lead ataması başarısız");
        return true;
    } catch (err) {
        console.error("patchLeadAssign error:", err);
        return false;
    }
};

/**
 * Toplu atama işlemi
 */
export const bulkAssignLeads = async (leadIds: string[], userId: string) => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/assign/bulk`, {
            method: "POST",
            headers,
            body: JSON.stringify({ leadIds, userId }),
        });
        if (!res.ok) throw new Error("Toplu atama başarısız");
        return true;
    } catch (err) {
        console.error("bulkAssignLeads error:", err);
        return false;
    }
};


//
// 📌 Lead Log Servisleri
//
export const getLeadLogs = async (leadId: string): Promise<LeadLog[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/logs`, { headers });
        if (!res.ok) throw new Error("Lead logları alınamadı");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("getLeadLogs error:", err);
        return [];
    }
};

export const addLeadLog = async (
    leadId: string,
    actionType: string,
    message: string
): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/logs`, {
            method: "POST",
            headers,
            body: JSON.stringify({ actionType, message }),
        });
        if (!res.ok) throw new Error(await res.text());
        return true;
    } catch (err) {
        console.error("addLeadLog error:", err);
        return false;
    }
};

//
// 📊 Dashboard Servisleri
//
export const getDashboardStats = async (): Promise<LeadStatsResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/stats`, { headers });
        if (!res.ok) throw new Error("Dashboard verisi alınamadı");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("getDashboardStats error:", err);
        return null;
    }
};

//
// 📈 Reports Servisleri (Hazırlık)
//
export const getLeadReports = async (
    startDate: string,
    endDate: string
): Promise<LeadReportResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(
            `${BASE_URL}/reports/lead-summary?start=${startDate}&end=${endDate}`,
            { headers }
        );
        if (!res.ok) throw new Error("Rapor verisi alınamadı");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("getLeadReports error:", err);
        return null;
    }
};

export interface LeadReportResponse {
    timeline: { date: string; leads: number }[];
    statusBreakdown: { status: string; count: number }[];
    userPerformance: { userName: string; sales: number; total: number }[];
}


