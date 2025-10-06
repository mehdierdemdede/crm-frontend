// src/lib/api.ts
const BASE_URL = "http://localhost:8080/api";

// ──────────────────────────────── TYPES ────────────────────────────────
export type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

export type LeadStatus =
    | "UNCONTACTED"
    | "HOT"
    | "SOLD"
    | "NOT_INTERESTED"
    | "BLOCKED"
    | "WRONG_INFO";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
}

export interface UserResponse {
    lastName: string;
    id: string;
    firstName: string;
    email: string;
    role: Role;
}

export interface LeadResponse {
    platform: string;
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    language?: string | null;
    status: LeadStatus;
    createdAt: string;
    campaign?: { id: string; name: string } | null;
    assignedToUser?: {
        id: string;
        firstName: string;
        lastName?: string | null;
    } | null;
}

export interface LeadAction {
    id: string;
    actionType: "PHONE" | "WHATSAPP" | "MESSENGER" | "NOTE" | "EMAIL" | "OTHER";
    message: string;
    createdAt: string;
}

export interface LeadReportResponse {
    timeline: { date: string; leads: number }[];
    statusBreakdown: { status: string; count: number }[];
    userPerformance: { userName: string; sales: number; total: number }[];
}

export interface AgentStatsResponse {
    userId: string;
    fullName: string;
    active: boolean;
    autoAssignEnabled: boolean;
    supportedLanguages: string[];
    dailyCapacity: number;
    assignedToday: number;
    remainingCapacity: number;
    lastAssignedAt: string | null;
}

// ──────────────────────────────── HELPERS ────────────────────────────────
export const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";

    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
    };
};

// Genel API yanıt tipi
export interface ApiResponse<T = any> {
    data?: T;
    message?: string;
    status: number;
}

// Ortak POST metodu (login, invite, vs için)
export const api = {
    post: async <T>(
        url: string,
        data: unknown,
        authenticated = false
    ): Promise<ApiResponse<T>> => {
        try {
            const headers = authenticated
                ? getAuthHeaders()
                : { "Content-Type": "application/json" };

            const response = await fetch(`${BASE_URL}${url}`, {
                method: "POST",
                headers,
                body: JSON.stringify(data),
            });

            let responseData: any;
            const contentType = response.headers.get("content-type");

            if (contentType?.includes("application/json")) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (response.ok) {
                return { data: responseData as T, status: response.status };
            } else {
                const errorMessage =
                    typeof responseData === "object" && responseData.message
                        ? responseData.message
                        : responseData;
                return {
                    message: errorMessage || "Bir hata oluştu.",
                    status: response.status,
                };
            }
        } catch (error) {
            return {
                message:
                    error instanceof Error ? error.message : "Ağ hatası oluştu.",
                status: 0,
            };
        }
    },
};



// ──────────────────────────────── LEADS API ────────────────────────────────

export const getLeads = async (): Promise<LeadResponse[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads`, { headers });
        if (!res.ok) throw new Error("Lead listesi alınamadı");
        return await res.json();
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
        return await res.json();
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
        return res.ok;
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
 * 🔹 Lead atama işlemi (tek lead)
 */
/**
 * 🔹 Lead atama (veya kaldırma)
 */
export const patchLeadAssign = async (leadId: string, userId: string | null): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/assign?userId=${userId ?? ""}`, {
            method: "PATCH",
            headers,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Lead atama işlemi başarısız");
        }
        return true;
    } catch (err) {
        console.error("patchLeadAssign error:", err);
        return false;
    }
};


// 🔹 Organizasyondaki kullanıcı listesini getirir
export interface SimpleUser {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    active: boolean;
}

export const getUsers = async (): Promise<SimpleUser[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/users`, { headers });
        if (!res.ok) throw new Error("Kullanıcı listesi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getUsers error:", err);
        return [];
    }
};



// ──────────────────────────────── LEAD ACTIONS (user actions) ────────────────────────────────

export const getLeadActions = async (leadId: string): Promise<LeadAction[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/actions`, { headers });
        if (res.status === 204) return [];
        if (!res.ok) throw new Error("Aksiyon geçmişi alınamadı.");
        return await res.json();
    } catch (err) {
        console.error("getLeadActions error:", err);
        return [];
    }
};

export const addLeadAction = async (
    leadId: string,
    actionType: string,
    message: string
): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/actions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ actionType, message }),
        });
        return res.ok;
    } catch (err) {
        console.error("addLeadAction error:", err);
        return false;
    }
};

// ──────────────────────────────── ACTIVITY LOGS (system logs) ────────────────────────────────

export const getLeadActivityLogs = async (leadId: string) => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/activity-logs`, { headers });
        if (!res.ok) throw new Error("Aktivite geçmişi alınamadı.");
        return await res.json();
    } catch (err) {
        console.error("getLeadActivityLogs error:", err);
        return [];
    }
};

// ──────────────────────────────── DASHBOARD & REPORTS ────────────────────────────────

// 🧭 Agent kapasite / auto-assign istatistikleri
export const getAgentStats = async (): Promise<AgentStatsResponse[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/auto-assign/stats`, { headers });
        if (!res.ok) throw new Error("Agent istatistikleri alınamadı.");
        return await res.json();
    } catch (err) {
        console.error("getAgentStats error:", err);
        return [];
    }
};

// 📈 Lead özet raporu
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
        return await res.json();
    } catch (err) {
        console.error("getLeadReports error:", err);
        return null;
    }
};

// 📩 Kullanıcı Davet Servisleri
export interface InviteUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    supportedLanguages?: string[];
    dailyCapacity?: number;
    active?: boolean;
    autoAssignEnabled?: boolean;
    organizationId?: string;
}


/**
 * Yeni kullanıcı daveti gönderir.
 * Sunucudan {status, data, message} döner, böylece frontend status kontrolü yapabilir.
 */
export const inviteUser = async (
    data: InviteUserRequest
): Promise<ApiResponse<UserResponse>> => {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${BASE_URL}/users/invite`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });

        let responseData: any;
        const contentType = res.headers.get("content-type");

        if (contentType?.includes("application/json")) {
            responseData = await res.json();
        } else {
            responseData = await res.text();
        }

        if (res.ok) {
            return { data: responseData as UserResponse, status: res.status };
        } else {
            const errorMessage =
                typeof responseData === "object" && responseData.message
                    ? responseData.message
                    : responseData;
            return {
                message: errorMessage || "Bir hata oluştu.",
                status: res.status,
            };
        }
    } catch (err) {
        return {
            message: err instanceof Error ? err.message : "Ağ hatası oluştu.",
            status: 0,
        };
    }
};
export const getAutoAssignStats = async () => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/auto-assign/stats`, { headers });
        if (!res.ok) throw new Error("Auto-assign istatistikleri alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getAutoAssignStats error:", err);
        return [];
    }
};

// ──────────────────────────────── DASHBOARD COMPOSITE STATS ────────────────────────────────
export interface DashboardStats {
    totalLeads: number;
    soldLeads: number;
    hotLeads: number;
    notInterested: number;
    blocked: number;
    wrongInfo: number;
    timeline: { date: string; leads: number }[];
    topAgents: { userName: string; total: number; sales: number }[];
}

export const getDashboardStats = async (): Promise<DashboardStats | null> => {
    const headers = getAuthHeaders();
    try {
        // 🔹 Son 14 gün raporlarını çekelim
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 14);

        const startIso = start.toISOString();
        const endIso = now.toISOString();

        const res = await fetch(
            `${BASE_URL}/reports/lead-summary?start=${startIso}&end=${endIso}`,
            { headers }
        );
        if (!res.ok) throw new Error("Dashboard verisi alınamadı");

        const data = await res.json();

        // Backend’den gelen veriden özet metrikleri çıkaralım
        const statusCounts = data.statusBreakdown || [];
        const findCount = (s: string) =>
            statusCounts.find((x: any) => x.status === s)?.count || 0;

        return {
            totalLeads: statusCounts.reduce((a: number, b: any) => a + b.count, 0),
            soldLeads: findCount("SOLD"),
            hotLeads: findCount("HOT"),
            notInterested: findCount("NOT_INTERESTED"),
            blocked: findCount("BLOCKED"),
            wrongInfo: findCount("WRONG_INFO"),
            timeline: data.timeline || [],
            topAgents: data.userPerformance || [],
        };
    } catch (err) {
        console.error("getDashboardStats error:", err);
        return null;
    }
};


// 📦 Satış oluşturma
export interface CreateSaleRequest {
    leadId: string;
    operationDate: string;
    operationType: string;
    price: number;
    currency: "TRY" | "USD" | "EUR" | "GBP";
    hotel: string;
    nights: number;
    transfer: string[];
}

export const createSale = async (
    data: CreateSaleRequest,
    passportFile?: File | null
): Promise<boolean> => {
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
        else formData.append(key, value.toString());
    });

    if (passportFile) formData.append("passportFile", passportFile);

    try {
        const res = await fetch(`${BASE_URL}/sales`, {
            method: "POST",
            headers: token ? { Authorization: `${tokenType} ${token}` } : undefined,
            body: formData,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Satış kaydı oluşturulamadı");
        }

        return true;
    } catch (err) {
        console.error("createSale error:", err);
        return false;
    }
};
