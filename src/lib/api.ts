// src/lib/api.ts

import { resolveBackendApiBaseUrl } from "./backendConfig";


export const BASE_URL = resolveBackendApiBaseUrl();

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
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;

    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
}

export interface SaleResponse {
    id: string;
    leadId: string;
    leadName?: string;
    organizationId?: string;
    userId?: string;
    price?: number;
    currency: "TRY" | "USD" | "EUR" | "GBP";
    operationType?: string;
    operationDate?: string;
    hotel?: string;
    nights?: number;
    transfer?: string[];
    documentPath?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface SaleDocumentsUpload {
    passport?: File | null;
    flightTicket?: File | null;
}

export interface LeadResponse {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    pageId?: string | null;

    adInfo?: string | null;
    campaign?: { id: string; name: string } | null;
    campaignName?: string | null;
    adsetId?: string | null;
    adsetName?: string | null;
    adId?: string | null;
    adName?: string | null;
    status: LeadStatus;
    assignedToUser?: SimpleUser | null;
    createdAt: string;
    firstActionAt?: string | null;
    firstActionDelayMinutes?: number | null;
    lastSaleId?: string | null; // ✅ eklendi
    lastSale?: SaleResponse | null;
    fbCampaignName?: string | null;
    organic?: boolean | null;
}


export interface SimpleUser {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    active: boolean;
}

export interface LeadAction {
    id: string;
    actionType: "PHONE" | "WHATSAPP" | "MESSENGER" | "NOTE" | "EMAIL" | "OTHER";
    message: string;
    createdAt: string;
}

export interface LeadCallResult {
    callId: string;
    status: string;
    expiresAt?: string | null;
    dialUrl?: string | null;
}

export interface LeadWhatsAppMessageRequest {
    message: string;
    templateId?: string;
    languageCode?: string;
}

export interface LeadWhatsAppMessageResponse {
    messageId: string;
    status: string;
    deliveredAt?: string | null;
}

export interface LeadCreateRequest {
    name: string;
    email?: string | null;
    phone?: string | null;

    campaignId?: string | null;
    assignedUserId?: string | null;
    [key: string]: unknown;
}

export type LeadUpdateRequest = Partial<LeadCreateRequest> & {
    status?: LeadStatus;
    adName?: string; // 🔹 Editable ad name
};

export interface LeadReportResponse {
    timeline: { date: string; leads: number }[];
    statusBreakdown: { status: string; count: number }[];
    userPerformance: { userName: string; sales: number; total: number }[];
    totalLeads: number;
    totalSales: number;
    totalRevenue: Record<string, number>;
    conversionRate: number;
}

export interface AgentStatsResponse {
    userId: string;
    fullName: string;
    active: boolean;
    autoAssignEnabled: boolean;

    dailyCapacity: number;
    assignedToday: number;
    remainingCapacity: number;
    lastAssignedAt: string | null;
}



export interface Hotel {
    id: string;
    name?: string;
    starRating?: number | null;
    nightlyRate?: number | null;
    currency?: string | null;
    address?: string | null;
    [key: string]: unknown;
}

export interface HotelPayload {
    name: string;
    starRating?: number | null;
    nightlyRate?: number | null;
    currency?: string | null;
    address?: string | null;
}

export interface TransferRoute {
    id: string;
    name?: string;
    start?: string | null;
    stops?: string[] | null;
    final?: string | null;
    price?: number | null;
    currency?: string | null;
    [key: string]: unknown;
}

export interface TransferRoutePayload {
    start: string;
    final: string;
    stops?: string[];
    price?: number | null;
    currency?: string | null;
    /**
     * Existing backend expects a `name` field in some places. We continue to send
     * a composed value so the API remains backward compatible.
     */
    name?: string;
}

// ──────────────────────────────── HELPERS ────────────────────────────────
const getStoredItem = (key: string): string | null => {
    if (typeof window === "undefined") return null;

    return (
        window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    );
};

export const getAuthHeaders = (): Record<string, string> => {
    const token = getStoredItem("authToken");
    const tokenType = getStoredItem("tokenType") || "Bearer";

    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
    };
};

// Genel API yanıt tipi
export interface ApiResponse<T = unknown> {
    data?: T;
    message?: string;
    status: number;
}

const extractResponseBody = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
        try {
            return await response.json();
        } catch (error) {
            console.warn("JSON parse error", error);
            return null;
        }
    }

    if (contentType?.includes("text/")) {
        return await response.text();
    }

    return null;
};

const resolveErrorMessage = (body: unknown, fallback = "Bir hata oluştu."): string => {
    if (typeof body === "string" && body.trim().length > 0) {
        return body;
    }

    if (
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message?: unknown }).message === "string"
    ) {
        return (body as { message: string }).message;
    }

    return fallback;
};

const unwrapApiData = <T>(body: unknown): T => {
    if (
        body &&
        typeof body === "object" &&
        "data" in body &&
        (body as { data?: unknown }).data !== undefined
    ) {
        return (body as { data: T }).data;
    }

    return body as T;
};



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

            let responseData: unknown;
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
                    typeof responseData === "object" && responseData !== null && "message" in responseData
                        ? (responseData as { message?: string }).message
                        : responseData;
                const normalizedMessage =
                    typeof errorMessage === "string" && errorMessage.trim().length > 0
                        ? errorMessage
                        : "Bir hata oluştu.";

                return {
                    message: normalizedMessage,
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

// ──────────────────────────────── INTEGRATIONS ────────────────────────────────

export type IntegrationPlatform = "FACEBOOK" | "GOOGLE" | string;

export type IntegrationConnectionStatus =
    | "CONNECTED"
    | "PENDING"
    | "DISCONNECTED"
    | "ERROR"
    | "EXPIRED";

export interface IntegrationStatus {
    platform: IntegrationPlatform;
    connected: boolean;
    connectedAt?: string | null;
    expiresAt?: string | null;
    lastSyncedAt?: string | null;
    platformPageId?: string | null;
    status?: IntegrationConnectionStatus;
    statusMessage?: string | null;
    lastErrorAt?: string | null;
    lastErrorMessage?: string | null;
    requiresAction?: boolean;
    pageId?: string | null;
    pageName?: string | null;
    syncFrequency?: SyncFrequency;
}

export type SyncFrequency = "MANUAL" | "HOURLY" | "DAILY" | "WEEKLY";

export const updateSyncFrequency = async (
    platform: IntegrationPlatform,
    frequency: SyncFrequency
): Promise<ApiResponse<IntegrationConfig>> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(
            `${BASE_URL}/integrations/${platform}/sync-frequency?frequency=${frequency}`,
            {
                method: "PUT",
                headers,
            }
        );
        const body = await extractResponseBody(res);
        if (res.ok) {
            return {
                status: res.status,
                data: body as IntegrationConfig,
            };
        }
        return {
            status: res.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export interface IntegrationConfig {
    id: string;
    organizationId: string;
    platform: IntegrationPlatform;
    connectionStatus: IntegrationConnectionStatus;
    syncFrequency?: SyncFrequency;
    [key: string]: any;
}

export interface FacebookLeadFetchSummary {
    fetched: number;
    created: number;
    updated: number;
}

export interface GoogleLeadFetchSummary {
    fetched: number;
    created: number;
    updated: number;
}

export const getIntegrationStatuses = async (): Promise<
    ApiResponse<IntegrationStatus[]>
> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(`${BASE_URL}/integrations/status`, {
            headers,
            cache: "no-store",
        });

        const body = await extractResponseBody(response);

        if (response.ok) {
            const data = Array.isArray(body) ? (body as IntegrationStatus[]) : [];

            return {
                status: response.status,
                data,
            };
        }

        return {
            status: response.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export const getFacebookOAuthUrl = async (): Promise<ApiResponse<{ url: string }>> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(
            `${BASE_URL}/integrations/oauth2/authorize/facebook`,
            {
                headers,
            }
        );

        const body = await extractResponseBody(response);

        if (response.ok) {
            const rawUrl =
                typeof body === "string"
                    ? body
                    : body && typeof body === "object" && "url" in body
                        ? (body as { url?: string }).url
                        : null;

            if (rawUrl && typeof rawUrl === "string") {
                return { status: response.status, data: { url: rawUrl } };
            }

            return {
                status: response.status,
                message: "Beklenmedik OAuth yanıtı alındı.",
            };
        }

        return {
            status: response.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export const triggerFacebookLeadFetch = async (): Promise<
    ApiResponse<FacebookLeadFetchSummary>
> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(
            `${BASE_URL}/integrations/fetch-leads/facebook`,
            {
                method: "POST",
                headers,
            }
        );

        const body = await extractResponseBody(response);

        if (response.ok) {
            return {
                status: response.status,
                data: body as FacebookLeadFetchSummary,
            };
        }

        return {
            status: response.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export const getGoogleOAuthUrl = async (): Promise<ApiResponse<{ url: string }>> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(`${BASE_URL}/integrations/oauth2/authorize/google`, {
            headers,
        });

        const body = await extractResponseBody(response);

        if (response.ok) {
            const rawUrl =
                typeof body === "string"
                    ? body
                    : body && typeof body === "object" && "url" in body
                        ? (body as { url?: string }).url
                        : null;

            if (rawUrl && typeof rawUrl === "string") {
                return { status: response.status, data: { url: rawUrl } };
            }

            return {
                status: response.status,
                message: "Beklenmedik OAuth yanıtı alındı.",
            };
        }

        return {
            status: response.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export const triggerGoogleLeadFetch = async (): Promise<
    ApiResponse<GoogleLeadFetchSummary>
> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(
            `${BASE_URL}/integrations/fetch-leads/google`,
            {
                method: "POST",
                headers,
            }
        );

        const body = await extractResponseBody(response);

        if (response.ok) {
            return {
                status: response.status,
                data: body as GoogleLeadFetchSummary,
            };
        }

        return {
            status: response.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export const importLeadsFromExcel = async (
    file: File,
    mapping: Record<string, string>
): Promise<ApiResponse<LeadSyncResult>> => {
    const headers = getAuthHeaders();
    delete (headers as any)["Content-Type"]; // Let browser set boundary for multipart

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mapping", JSON.stringify(mapping));

        const res = await fetch(`${BASE_URL}/integrations/excel/import`, {
            method: "POST",
            headers, // Do not set Content-Type
            body: formData,
        });

        const body = await extractResponseBody(res);
        if (res.ok) {
            return {
                status: res.status,
                data: body as LeadSyncResult,
            };
        }
        return {
            status: res.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export interface IntegrationLog {
    id: string;
    organizationId: string;
    platform: IntegrationPlatform;
    totalFetched: number;
    newCreated: number;
    updated: number;
    errorMessage?: string;
    startedAt: string;
    finishedAt?: string;
}

export const getIntegrationLogs = async (
    page = 0,
    size = 10,
    platform?: string
): Promise<ApiResponse<{ content: IntegrationLog[]; totalElements: number; totalPages: number }>> => {
    const headers = getAuthHeaders();
    try {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (platform) params.append("platform", platform);

        const res = await fetch(`${BASE_URL}/integrations/logs?${params.toString()}`, { headers });
        const body = await extractResponseBody(res);

        if (res.ok) {
            return {
                status: res.status,
                data: body as { content: IntegrationLog[]; totalElements: number; totalPages: number },
            };
        }
        return {
            status: res.status,
            message: resolveErrorMessage(body),
        };
    } catch (error) {
        return {
            status: 0,
            message: error instanceof Error ? error.message : "Ağ hatası oluştu.",
        };
    }
};

export interface LeadSyncResult {
    totalFetched: number;
    created: number;
    updated: number;
}

export const getIntegration = async (
    platform: IntegrationPlatform,
    organizationId?: string,
): Promise<IntegrationStatus | null> => {
    const headers = getAuthHeaders();
    try {
        const params = new URLSearchParams();
        if (organizationId) {
            params.append("organizationId", organizationId);
        }
        const query = params.toString();
        const res = await fetch(
            `${BASE_URL}/integrations/${platform}${query ? `?${query}` : ""}`,
            { headers },
        );
        if (res.status === 404) {
            return null;
        }
        if (!res.ok) {
            const body = await extractResponseBody(res);
            throw new Error(
                resolveErrorMessage(
                    body,
                    "Entegrasyon bilgisi alınırken bir hata oluştu.",
                ),
            );
        }
        return (await res.json()) as IntegrationStatus;
    } catch (error) {
        console.error("getIntegration error:", error);
        return null;
    }
};




// ──────────────────────────────── LEADS API ────────────────────────────────

export interface LeadPage {
    content: LeadResponse[];
    totalPages: number;
    totalElements: number;
    number: number; // current page index (0-based)
    size: number;
}

export interface LeadListParams {
    page?: number;
    size?: number;
    sort?: string;
    search?: string;
    statuses?: string[];

    campaignId?: string;
    assignedUserId?: string;
    unassigned?: boolean;
    dateFrom?: string;
    dateTo?: string;
    firstResponseMinMinutes?: number;
    firstResponseMaxMinutes?: number;
}

export const getLeads = async ({
    page = 0,
    size = 10,
    sort = "createdAt,desc",
    search,
    statuses,

    campaignId,
    assignedUserId,
    unassigned,
    dateFrom,
    dateTo,
    firstResponseMinMinutes,
    firstResponseMaxMinutes,
}: LeadListParams = {}): Promise<LeadPage | null> => {
    const headers = getAuthHeaders();
    try {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            sort,
        });

        if (search?.trim()) params.append("search", search.trim());
        if (Array.isArray(statuses) && statuses.length > 0) {
            statuses.forEach((status) => {
                if (status) params.append("status", status);
            });
        }

        if (campaignId) params.append("campaignId", campaignId);
        if (assignedUserId) params.append("assignedUserId", assignedUserId);
        if (unassigned) params.append("unassigned", "true");
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
        if (
            typeof firstResponseMinMinutes === "number" &&
            !Number.isNaN(firstResponseMinMinutes)
        ) {
            params.append(
                "firstResponseMinMinutes",
                String(firstResponseMinMinutes),
            );
        }
        if (
            typeof firstResponseMaxMinutes === "number" &&
            !Number.isNaN(firstResponseMaxMinutes)
        ) {
            params.append(
                "firstResponseMaxMinutes",
                String(firstResponseMaxMinutes),
            );
        }

        const query = params.toString();
        const res = await fetch(`${BASE_URL}/leads?${query}`, { headers });
        if (!res.ok) throw new Error("Lead listesi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getLeads error:", err);
        return null;
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

export const getSaleById = async (saleId: string): Promise<SaleResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/sales/${saleId}`, { headers });
        if (!res.ok) throw new Error("Satış bulunamadı");
        return await res.json();
    } catch (err) {
        console.error("getSaleById error:", err);
        return null;
    }
};

export const getSalesByDateRange = async (startDate: string, endDate: string, userId?: string): Promise<SaleResponse[]> => {
    const headers = getAuthHeaders();
    try {
        const params = new URLSearchParams({ startDate, endDate });
        if (userId) params.append("userId", userId);
        const query = params.toString();
        const res = await fetch(`${BASE_URL}/sales?${query}`, { headers });
        if (!res.ok) throw new Error("Satış listesi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getSalesByDateRange error:", err);
        return [];
    }
};

export const updateLeadStatus = async (leadId: string, status: string): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/status`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status }),
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

export const createLead = async (
    payload: LeadCreateRequest,
): Promise<LeadResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Lead oluşturulamadı");
        }
        return (await res.json()) as LeadResponse;
    } catch (err) {
        console.error("createLead error:", err);
        return null;
    }
};

export const updateLead = async (
    leadId: string,
    payload: LeadUpdateRequest,
): Promise<LeadResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Lead güncellenemedi");
        }
        return (await res.json()) as LeadResponse;
    } catch (err) {
        console.error("updateLead error:", err);
        return null;
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


export const getUsers = async (): Promise<UserResponse[]> => {
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

export const getUser = async (userId: string): Promise<UserResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/users/${userId}`, { headers });
        if (!res.ok) throw new Error("Kullanıcı bilgisi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getUser error:", err);
        return null;
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

export const initiateLeadCall = async (
    leadId: string,
): Promise<LeadCallResult | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/call`, {
            method: "POST",
            headers,
        });

        const body = await extractResponseBody(res);

        if (!res.ok) {
            throw new Error(
                resolveErrorMessage(body, "Arama başlatılamadı. Lütfen tekrar deneyin."),
            );
        }

        if (!body || typeof body !== "object") {
            throw new Error("Geçersiz arama yanıtı alındı.");
        }

        const data = body as Record<string, unknown>;
        const callIdRaw = data.callId ?? data.sessionId ?? data.id;
        const statusRaw = data.status ?? data.state ?? "QUEUED";

        const callId = typeof callIdRaw === "string" ? callIdRaw : String(callIdRaw ?? "");
        const status = typeof statusRaw === "string" ? statusRaw : String(statusRaw ?? "QUEUED");

        return {
            callId,
            status,
            expiresAt:
                typeof data.expiresAt === "string"
                    ? data.expiresAt
                    : typeof data.expireAt === "string"
                        ? data.expireAt
                        : null,
            dialUrl:
                typeof data.dialUrl === "string"
                    ? data.dialUrl
                    : typeof data.proxyUrl === "string"
                        ? data.proxyUrl
                        : null,
        };
    } catch (err) {
        console.error("initiateLeadCall error:", err);
        return null;
    }
};

export const sendLeadWhatsAppMessage = async (
    leadId: string,
    payload: LeadWhatsAppMessageRequest,
): Promise<LeadWhatsAppMessageResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/leads/${leadId}/whatsapp`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });

        const body = await extractResponseBody(res);

        if (!res.ok) {
            throw new Error(
                resolveErrorMessage(body, "Mesaj gönderilemedi. Lütfen tekrar deneyin."),
            );
        }

        if (!body || typeof body !== "object") {
            throw new Error("Geçersiz WhatsApp yanıtı alındı.");
        }

        const data = body as Record<string, unknown>;
        const messageIdRaw = data.messageId ?? data.id;
        const statusRaw = data.status ?? data.state ?? "SENT";

        return {
            messageId:
                typeof messageIdRaw === "string"
                    ? messageIdRaw
                    : String(messageIdRaw ?? ""),
            status:
                typeof statusRaw === "string"
                    ? statusRaw
                    : String(statusRaw ?? "SENT"),
            deliveredAt:
                typeof data.deliveredAt === "string"
                    ? data.deliveredAt
                    : typeof data.sentAt === "string"
                        ? data.sentAt
                        : null,
        };
    } catch (err) {
        console.error("sendLeadWhatsAppMessage error:", err);
        return null;
    }
};

// ──────────────────────────────── DASHBOARD & REPORTS ────────────────────────────────

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

// ──────────────────────────────── ORGANIZATION API ────────────────────────────────

export interface Organization {
    id: string;
    name: string;
}

export const getOrganizations = async (): Promise<Organization[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/organizations`, { headers });
        if (!res.ok) throw new Error("Organizasyon listesi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getOrganizations error:", err);
        return [];
    }
}

// 📩 Kullanıcı Davet Servisleri
export interface InviteUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;

    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
    organizationId?: string; // Sadece SUPER_ADMIN için
}

export interface AcceptInviteRequest {
    token: string;
    password: string;
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

        let responseData: unknown;
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
                typeof responseData === "object" && responseData !== null && "message" in responseData
                    ? (responseData as { message?: string }).message
                    : responseData;
            const normalizedMessage =
                typeof errorMessage === "string" && errorMessage.trim().length > 0
                    ? errorMessage
                    : "Bir hata oluştu.";
            return {
                message: normalizedMessage,
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

export const updateUser = async (
    userId: string,
    data: Partial<UserResponse>
): Promise<UserResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/users/${userId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(data),
        });

        const body = await extractResponseBody(res);
        if (!res.ok) {
            throw new Error(
                resolveErrorMessage(body, "Kullanıcı güncellenemedi."),
            );
        }

        return unwrapApiData<UserResponse>(body);
    } catch (error) {
        console.error("updateUser error:", error);
        return null;
    }
};

export const acceptInvite = async (
    data: AcceptInviteRequest
): Promise<ApiResponse<void>> => {
    return api.post<void>("/users/invite/accept", data);
};

// ──────────────────────────────── FACEBOOK LEAD DISTRIBUTION ────────────────────────────────

export interface FacebookLeadAssignmentUser {
    userId: string;
    fullName: string;
    email?: string | null;
    active: boolean;
    autoAssignEnabled: boolean;
    frequency: number;
    position: number;
}

export interface FacebookLeadRule {
    id: string;
    pageId: string;
    pageName?: string | null;
    campaignId: string;
    campaignName?: string | null;
    adsetId: string;
    adsetName?: string | null;
    adId: string;
    adName?: string | null;
    assignments: FacebookLeadAssignmentUser[];
}

export interface FacebookLeadTreeAd {
    adId: string;
    adName?: string | null;
    rule: FacebookLeadRule | null;
}

export interface FacebookLeadTreeAdset {
    adsetId: string;
    adsetName?: string | null;
    ads: FacebookLeadTreeAd[];
}

export interface FacebookLeadTreeCampaign {
    campaignId: string;
    campaignName?: string | null;
    adsets: FacebookLeadTreeAdset[];
}

export interface FacebookLeadTreePage {
    pageId: string;
    pageName?: string | null;
    campaigns: FacebookLeadTreeCampaign[];
}

export interface FacebookLeadTreeResponse {
    pages: FacebookLeadTreePage[];
}

export interface SaveFacebookLeadRuleAssignmentRequest {
    userId: string;
    frequency: number;
    position: number;
}

export interface SaveFacebookLeadRuleRequest {
    pageId: string;
    pageName?: string;
    campaignId: string;
    campaignName?: string;
    adsetId: string;
    adsetName?: string;
    adId: string;
    adName?: string;
    assignments: SaveFacebookLeadRuleAssignmentRequest[];
}

export const getFacebookLeadTree = async (): Promise<FacebookLeadTreeResponse | null> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/lead-distribution/facebook/tree`, {
            headers,
        });
        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Facebook lead ağacı alınırken bir hata oluştu."),
            );
        }
        return (body ?? null) as FacebookLeadTreeResponse | null;
    } catch (error) {
        console.error("getFacebookLeadTree error:", error);
        return null;
    }
};

export const getFacebookLeadRules = async (): Promise<FacebookLeadRule[] | null> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/lead-distribution/facebook/rules`, {
            headers,
        });
        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Facebook lead kuralları alınırken bir hata oluştu."),
            );
        }
        return (body ?? []) as FacebookLeadRule[];
    } catch (error) {
        console.error("getFacebookLeadRules error:", error);
        return null;
    }
};

export const saveFacebookLeadRule = async (
    payload: SaveFacebookLeadRuleRequest,
): Promise<FacebookLeadRule> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/lead-distribution/facebook/rules`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Lead dağıtım kuralı kaydedilirken bir hata oluştu."),
            );
        }
        return (body ?? null) as FacebookLeadRule;
    } catch (error) {
        console.error("saveFacebookLeadRule error:", error);
        throw error instanceof Error
            ? error
            : new Error("Lead dağıtım kuralı kaydedilirken bir hata oluştu.");
    }
};

export const updateFacebookLeadRule = async (
    ruleId: string,
    payload: SaveFacebookLeadRuleRequest,
): Promise<FacebookLeadRule> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(
            `${BASE_URL}/lead-distribution/facebook/rules/${ruleId}`,
            {
                method: "PUT",
                headers,
                body: JSON.stringify(payload),
            },
        );
        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Lead dağıtım kuralı güncellenirken bir hata oluştu."),
            );
        }
        return (body ?? null) as FacebookLeadRule;
    } catch (error) {
        console.error("updateFacebookLeadRule error:", error);
        throw error instanceof Error
            ? error
            : new Error("Lead dağıtım kuralı güncellenirken bir hata oluştu.");
    }
};

export const deleteFacebookLeadRule = async (ruleId: string): Promise<void> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(
            `${BASE_URL}/lead-distribution/facebook/rules/${ruleId}`,
            {
                method: "DELETE",
                headers,
            },
        );
        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Lead dağıtım kuralı silinirken bir hata oluştu."),
            );
        }
    } catch (error) {
        console.error("deleteFacebookLeadRule error:", error);
        throw error instanceof Error
            ? error
            : new Error("Lead dağıtım kuralı silinirken bir hata oluştu.");
    }
};

export const getAutoAssignStats = async (): Promise<AgentStatsResponse[]> => {
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


// 📦 Satış oluşturma
export interface SalesPayload {
    leadId: string;
    operationDate: string;
    operationType: string;
    price: number;
    currency: "TRY" | "USD" | "EUR" | "GBP";
    hotel: string;
    nights: number;
    transfer: string[];
    transferPreference: "YES" | "NO";
}

export const createSale = async (
    payload: SalesPayload,
    documents?: SaleDocumentsUpload,
): Promise<{ success: boolean; sale?: SaleResponse | null; saleId?: string | null; message?: string }> => {
    const headers = getAuthHeaders();
    delete headers["Content-Type"]; // FormData kendi Content-Type'ını belirler

    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    if (documents?.passport) formData.append("passport", documents.passport);
    if (documents?.flightTicket) {
        formData.append("flightTicket", documents.flightTicket);
    }

    try {
        const res = await fetch(`${BASE_URL}/sales`, {
            method: "POST",
            headers,
            body: formData,
        });

        if (!res.ok) {
            const text = await res.text();
            let errorMessage = text;
            try {
                const json = JSON.parse(text);
                if (json.message) errorMessage = json.message;
            } catch {
                // Ignore JSON parse error, use text as is
            }
            throw new Error(errorMessage || "Lead için satış zaten mevcut veya bir hata oluştu.");
        }
        const data = (await res.json()) as SaleResponse | null;
        return { success: true, sale: data, saleId: data?.id ?? null };
    } catch (err) {
        console.error("createSale error:", err);
        return {
            success: false,
            sale: null,
            saleId: null,
            message: err instanceof Error ? err.message : "Satış oluşturulurken bir hata oluştu."
        };
    }
};


// ──────────────────────────────── HOTELS API ────────────────────────────────

export const getHotels = async (): Promise<Hotel[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/hotels`, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Otel listesi alınamadı.");
        }
        const body = await extractResponseBody(res);
        const unwrapped = unwrapApiData<unknown>(body);
        return Array.isArray(unwrapped)
            ? (unwrapped as Hotel[])
            : [];
    } catch (error) {
        console.error("getHotels error:", error);
        return [];
    }
};

export const createHotel = async (payload: HotelPayload): Promise<Hotel | null> => {
    const headers = getAuthHeaders();
    const { currency, ...apiPayload } = payload;
    const bodyPayload =
        currency === undefined ? apiPayload : { ...apiPayload, currency };
    try {
        const res = await fetch(`${BASE_URL}/hotels`, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Otel oluşturulamadı.");
        }
        const data = (await res.json()) as Hotel;
        return { ...data, currency: currency ?? data.currency ?? null };
    } catch (error) {
        console.error("createHotel error:", error);
        return null;
    }
};

export const updateHotel = async (
    hotelId: string,
    payload: HotelPayload,
): Promise<Hotel | null> => {
    const headers = getAuthHeaders();
    const { currency, ...apiPayload } = payload;
    const bodyPayload =
        currency === undefined ? apiPayload : { ...apiPayload, currency };
    try {
        const res = await fetch(`${BASE_URL}/hotels/${hotelId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Otel güncellenemedi.");
        }
        const data = (await res.json()) as Hotel;
        return { ...data, currency: currency ?? data.currency ?? null };
    } catch (error) {
        console.error("updateHotel error:", error);
        return null;
    }
};

export const deleteHotel = async (hotelId: string): Promise<boolean> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/hotels/${hotelId}`, {
            method: "DELETE",
            headers,
        });

        const body = await extractResponseBody(res);
        if (!res.ok) {
            throw new Error(resolveErrorMessage(body, "Otel silinemedi."));
        }

        return true;
    } catch (error) {
        console.error("deleteHotel error:", error);
        throw error instanceof Error
            ? error
            : new Error("Otel silme işleminde bir sorun oluştu.");
    }
};


// ──────────────────────────────── TRANSFER ROUTES API ────────────────────────────────

export const getTransferRoutes = async (): Promise<TransferRoute[]> => {
    const headers = getAuthHeaders();
    try {
        const res = await fetch(`${BASE_URL}/transfer-routes`, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Transfer listesi alınamadı.");
        }
        const body = await extractResponseBody(res);
        const unwrapped = unwrapApiData<unknown>(body);
        return Array.isArray(unwrapped)
            ? (unwrapped as TransferRoute[])
            : [];
    } catch (error) {
        console.error("getTransferRoutes error:", error);
        return [];
    }
};

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    organizationId?: string;
}

/** Giriş yapan kullanıcı bilgisi */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
    try {
        const res = await fetch(`${BASE_URL}/users/me`, {
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error("Kullanıcı bilgisi alınamadı");
        return await res.json();
    } catch (err) {
        console.error("getCurrentUser error:", err);
        return null;
    }
};


