// src/lib/api.ts
import {SalesPayload} from "@/app/leads/[id]/SalesForm";

const DEFAULT_API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");


const normaliseBaseUrl = (url: string): string => {
    const trimmed = url.replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

export const BASE_URL = normaliseBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
);

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
    supportedLanguages: string[];
    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
}

export interface SaleResponse {
    id: string;
    leadId: string;
    operationDate?: string;
    operationType?: string;
    price?: number;
    currency?: "TRY" | "USD" | "EUR" | "GBP" | string;
    hotel?: string;
    nights?: number;
    transfer?: string[];
    documentPath?: string | null;
    createdAt?: string;
}

export interface LeadResponse {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    pageId?: string | null;
    language?: string;
    campaign?: { id: string; name: string } | null;
    status: LeadStatus;
    assignedToUser?: SimpleUser | null;
    createdAt: string;
    lastSaleId?: string | null; // ✅ eklendi
    lastSale?: SaleResponse | null;
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

export interface LanguageResponse {
    id: string;
    code: string;
    name: string;
    flagEmoji: string | null;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpsertLanguageRequest {
    code: string;
    name: string;
    flagEmoji: string | null;
    active: boolean;
}

export interface LanguageCatalogEntry {
    code: string;
    name: string;
    flagEmoji: string | null;
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

const ensureLanguageResponse = (language: unknown): LanguageResponse => {
    if (!language || typeof language !== "object") {
        throw new Error("Dil yanıtı beklenmeyen bir formatta alındı.");
    }

    const record = language as Record<string, unknown>;
    const { id, code, name } = record;

    if (id === null || id === undefined) {
        throw new Error("Dil yanıtında id alanı eksik.");
    }

    if (typeof code !== "string" || code.trim().length === 0) {
        throw new Error("Dil yanıtında code alanı eksik.");
    }

    if (typeof name !== "string" || name.trim().length === 0) {
        throw new Error("Dil yanıtında name alanı eksik.");
    }

    const rawFlag = record.flagEmoji;
    if (
        rawFlag !== null &&
        rawFlag !== undefined &&
        typeof rawFlag !== "string"
    ) {
        throw new Error("Dil yanıtında flagEmoji alanı beklenmeyen bir formatta.");
    }

    const rawActive = record.active;
    const active =
        typeof rawActive === "boolean"
            ? rawActive
            : rawActive == null
              ? true
              : Boolean(rawActive);

    return {
        id: String(id),
        code: code.trim(),
        name: name.trim(),
        flagEmoji:
            rawFlag === null || rawFlag === undefined || rawFlag === ""
                ? null
                : rawFlag,
        active,
        createdAt:
            typeof record.createdAt === "string" ? record.createdAt : undefined,
        updatedAt:
            typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    };
};

const ensureLanguageCatalogEntry = (entry: unknown): LanguageCatalogEntry => {
    if (!entry || typeof entry !== "object") {
        throw new Error("Dil kataloğu yanıtı beklenmeyen bir formatta alındı.");
    }

    const record = entry as Record<string, unknown>;

    const rawCode =
        typeof record.code === "string"
            ? record.code
            : typeof record.languageCode === "string"
              ? record.languageCode
              : null;

    if (!rawCode || rawCode.trim().length === 0) {
        throw new Error("Dil kataloğu kaydında code alanı eksik.");
    }

    const rawName =
        typeof record.name === "string"
            ? record.name
            : typeof record.languageName === "string"
              ? record.languageName
              : null;

    if (!rawName || rawName.trim().length === 0) {
        throw new Error("Dil kataloğu kaydında name alanı eksik.");
    }

    const rawFlag =
        typeof record.flagEmoji === "string"
            ? record.flagEmoji
            : typeof record.flag === "string"
              ? record.flag
              : null;

    return {
        code: rawCode.trim(),
        name: rawName.trim(),
        flagEmoji:
            rawFlag === null || rawFlag === undefined || rawFlag === ""
                ? null
                : rawFlag,
    };
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
    // Legacy fields kept for backward compatibility with older backend payloads
    pageId?: string | null;
    pageName?: string | null;
}

export type FacebookIntegrationStatus = Omit<IntegrationStatus, "platform">;

export interface FacebookLeadFetchSummary {
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

export const getFacebookIntegrationStatus = async (): Promise<
    ApiResponse<FacebookIntegrationStatus | null>
> => {
    const headers = getAuthHeaders();

    try {
        const response = await fetch(`${BASE_URL}/integrations/facebook`, {
            headers,
            cache: "no-store",
        });

        const body = await extractResponseBody(response);

        if (response.ok) {
            return {
                status: response.status,
                data: (body as FacebookIntegrationStatus) ?? null,
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

// ──────────────────────────────── LANGUAGES API ────────────────────────────────

export const getLanguages = async (): Promise<LanguageResponse[]> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/languages`, { headers });
        const body = await extractResponseBody(response);

        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Diller alınırken bir hata oluştu."),
            );
        }

        const payload = unwrapApiData<unknown>(body);

        if (!Array.isArray(payload)) {
            throw new Error("Dil listesi beklenen formatta değil.");
        }

        return payload.map(ensureLanguageResponse);
    } catch (err) {
        console.error("getLanguages error:", err);
        throw err instanceof Error
            ? err
            : new Error("Diller alınırken bir hata oluştu.");
    }
};

export const searchLanguageCatalog = async (
    query: string,
    signal?: AbortSignal
): Promise<LanguageCatalogEntry[]> => {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }

    const headers = getAuthHeaders();

    try {
        const params = new URLSearchParams({ query: trimmed });
        const response = await fetch(
            `${BASE_URL}/languages/catalog?${params.toString()}`,
            {
                headers,
                signal,
            }
        );

        const body = await extractResponseBody(response);

        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(
                    body,
                    "Dil kataloğu aranırken bir hata oluştu.",
                ),
            );
        }

        const payload = unwrapApiData<unknown>(body);

        if (!Array.isArray(payload)) {
            throw new Error("Dil kataloğu beklenen formatta değil.");
        }

        return payload.map(ensureLanguageCatalogEntry);
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
        }
        console.error("searchLanguageCatalog error:", error);
        throw error instanceof Error
            ? error
            : new Error("Dil kataloğu aranırken bir hata oluştu.");
    }
};

export const createLanguage = async (
    payload: UpsertLanguageRequest
): Promise<LanguageResponse> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/languages`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });

        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Dil oluşturulurken bir hata oluştu."),
            );
        }

        const responsePayload = unwrapApiData<unknown>(body);
        return ensureLanguageResponse(responsePayload);
    } catch (error) {
        console.error("createLanguage error:", error);
        throw error instanceof Error
            ? error
            : new Error("Dil oluşturulurken bir hata oluştu.");
    }
};

export const updateLanguage = async (
    languageId: string,
    payload: UpsertLanguageRequest
): Promise<LanguageResponse> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/languages/${languageId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
        });

        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Dil güncellenirken bir hata oluştu."),
            );
        }

        const responsePayload = unwrapApiData<unknown>(body);
        return ensureLanguageResponse(responsePayload);
    } catch (error) {
        console.error("updateLanguage error:", error);
        throw error instanceof Error
            ? error
            : new Error("Dil güncellenirken bir hata oluştu.");
    }
};

export const deleteLanguage = async (languageId: string): Promise<void> => {
    const headers = getAuthHeaders();
    try {
        const response = await fetch(`${BASE_URL}/languages/${languageId}`, {
            method: "DELETE",
            headers,
        });

        const body = await extractResponseBody(response);
        if (!response.ok) {
            throw new Error(
                resolveErrorMessage(body, "Dil silinirken bir hata oluştu."),
            );
        }
    } catch (error) {
        console.error("deleteLanguage error:", error);
        throw error instanceof Error
            ? error
            : new Error("Dil silinirken bir hata oluştu.");
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
    status?: string;
    language?: string;
    campaignId?: string;
    assignedUserId?: string;
    unassigned?: boolean;
}

export const getLeads = async ({
    page = 0,
    size = 10,
    sort = "createdAt,desc",
    search,
    status,
    language,
    campaignId,
    assignedUserId,
    unassigned,
}: LeadListParams = {}): Promise<LeadPage | null> => {
    const headers = getAuthHeaders();
    try {
        const params = new URLSearchParams({
            page: String(page),
            size: String(size),
            sort,
        });

        if (search?.trim()) params.append("search", search.trim());
        if (status) params.append("status", status);
        if (language) params.append("language", language);
        if (campaignId) params.append("campaignId", campaignId);
        if (assignedUserId) params.append("assignedUserId", assignedUserId);
        if (unassigned) params.append("unassigned", "true");

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
    supportedLanguages: string[];
    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
    organizationId?: string;
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

        const data: LeadReportResponse = await res.json();

        // Backend’den gelen veriden özet metrikleri çıkaralım
        const statusCounts: LeadReportResponse["statusBreakdown"] =
            data.statusBreakdown || [];
        const findCount = (s: string) =>
            statusCounts.find((x) => x.status === s)?.count || 0;

        return {
            totalLeads: statusCounts.reduce(
                (total, breakdown) => total + breakdown.count,
                0
            ),
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
    payload: SalesPayload,
    file?: File | null
): Promise<{ success: boolean; sale?: SaleResponse | null; saleId?: string | null }> => {
    const headers = getAuthHeaders();
    delete headers["Content-Type"]; // FormData kendi Content-Type'ını belirler

    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    if (file) formData.append("file", file);

    try {
        const res = await fetch(`${BASE_URL}/sales`, {
            method: "POST",
            headers,
            body: formData,
        });

        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as SaleResponse | null;
        return { success: true, sale: data, saleId: data?.id ?? null };
    } catch (err) {
        console.error("createSale error:", err);
        return { success: false, sale: null, saleId: null };
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
