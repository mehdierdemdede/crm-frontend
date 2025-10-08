const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const isWindowsFilesystemPath = (value: string) => /^[a-zA-Z]:\//.test(value);

const buildAuthHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {} as Record<string, string>;

    const token = window.localStorage.getItem("authToken");
    const tokenType = window.localStorage.getItem("tokenType") || "Bearer";

    return token ? { Authorization: `${tokenType} ${token}` } : {};
};

const getFileNameFromContentDisposition = (header: string | null) => {
    if (!header) return null;

    const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch (err) {
            console.warn("decodeURIComponent failed for filename", err);
        }
    }

    const asciiMatch = header.match(/filename="?([^";]+)"?/i);
    if (asciiMatch?.[1]) {
        return asciiMatch[1];
    }

    return null;
};

const DEFAULT_FILE_NAME = "satis-belgesi.pdf";

export const inferDocumentFileName = (documentPath?: string | null) => {
    if (!documentPath) return DEFAULT_FILE_NAME;

    const normalised = documentPath.replace(/\\/g, "/");
    const lastSegment = normalised.split("/").pop();
    if (!lastSegment || /^[a-zA-Z]:$/.test(lastSegment)) {
        return DEFAULT_FILE_NAME;
    }

    try {
        return decodeURIComponent(lastSegment);
    } catch (error) {
        console.warn("decodeURIComponent failed for inferred filename", error);
        return lastSegment;
    }
};

/**
 * Backend sales documents can store different path formats depending on the platform.
 * This helper normalises those paths into a browser-friendly URL.
 */
export const resolveDocumentUrl = (
    documentPath?: string | null,
    saleId?: string | null
): string | null => {
    if (documentPath) {
        const normalised = documentPath.replace(/\\/g, "/");

        if (isAbsoluteUrl(normalised)) {
            return normalised;
        }

        if (isWindowsFilesystemPath(normalised)) {
            if (saleId) {
                return `${DEFAULT_API_URL}/api/sales/document/${saleId}`;
            }

            return null;
        }

        if (normalised.startsWith("/")) {
            return `${DEFAULT_API_URL}${normalised}`;
        }

        return `${DEFAULT_API_URL}/${encodeURI(normalised)}`;
    }

    if (saleId) {
        return `${DEFAULT_API_URL}/api/sales/document/${saleId}`;
    }

    return null;
};

export interface DocumentDownloadResult {
    success: boolean;
    status: number | null;
}

export const downloadDocumentWithAuth = async (
    url: string,
    fallbackFileName = DEFAULT_FILE_NAME
): Promise<DocumentDownloadResult> => {
    try {
        const response = await fetch(url, {
            headers: {
                ...buildAuthHeader(),
            },
            credentials: "include",
        });

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
            };
        }

        const blob = await response.blob();
        const suggestedName =
            getFileNameFromContentDisposition(response.headers.get("Content-Disposition")) ||
            fallbackFileName;

        const blobUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = blobUrl;
        link.download = suggestedName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        return {
            success: true,
            status: response.status,
        };
    } catch (error) {
        console.error("downloadDocumentWithAuth error", error);
        return {
            success: false,
            status: null,
        };
    }
};
