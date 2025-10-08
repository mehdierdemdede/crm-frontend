const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

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

        if (normalised.startsWith("/")) {
            return `${DEFAULT_API_URL}${normalised}`;
        }

        return `${DEFAULT_API_URL}/${normalised}`;
    }

    if (saleId) {
        return `${DEFAULT_API_URL}/api/sales/document/${saleId}`;
    }

    return null;
};
