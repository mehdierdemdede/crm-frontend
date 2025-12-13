// src/lib/api.ts
import { z, type ZodSchema, type ZodTypeDef } from "zod";

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
    language?: string;
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
    [key: string]: unknown;
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
    language?: string | null;
    campaignId?: string | null;
    assignedUserId?: string | null;
    [key: string]: unknown;
}

export type LeadUpdateRequest = Partial<LeadCreateRequest> & {
    status?: LeadStatus;
};

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
    statuses?: string[];
    language?: string;
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
    language,
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
        if (language) params.append("language", language);
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


