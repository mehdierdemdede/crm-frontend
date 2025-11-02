const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const ensureApiSuffix = (url: string) => {
    const trimmed = trimTrailingSlash(url);
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const resolveEnvBackendUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    return envUrl && envUrl.length > 0 ? envUrl : null;
};

const resolveLocalFallbackUrl = () => {
    const fallbackPort = process.env.NEXT_PUBLIC_DEV_BACKEND_PORT?.trim() || "8080";
    const formatUrl = (protocol: string, hostname: string) =>
        `${protocol}//${hostname}${fallbackPort ? `:${fallbackPort}` : ""}`;

    if (typeof window !== "undefined") {
        const { protocol, hostname } = window.location;
        return formatUrl(protocol, hostname);
    }

    return formatUrl("http", "localhost");
};

export const resolveBackendRootUrl = () => {
    const envUrl = resolveEnvBackendUrl();
    if (envUrl) {
        return trimTrailingSlash(envUrl);
    }

    return resolveLocalFallbackUrl();
};

export const resolveBackendApiBaseUrl = () => ensureApiSuffix(resolveBackendRootUrl());
