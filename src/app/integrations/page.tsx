"use client";

import { Facebook, Globe, PlugZap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import Layout from "@/components/Layout";
import {
    getIntegrationStatuses,
    getFacebookOAuthUrl,
    getGoogleOAuthUrl,
    triggerFacebookLeadFetch,
    triggerGoogleLeadFetch,
    updateSyncFrequency,
    getIntegrationLogs,
    type IntegrationStatus,
    type IntegrationConnectionStatus,
    type IntegrationLog,
    type SyncFrequency,
} from "@/lib/api";
import { FACEBOOK_OAUTH_MESSAGE_TYPE } from "@/lib/facebookOAuth";
import { GOOGLE_OAUTH_MESSAGE_TYPE } from "@/lib/googleOAuth";

type AlertType = "success" | "error" | "info";

interface AlertState {
    type: AlertType;
    message: string;
}

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const STATUS_CONFIG: Record<
    IntegrationConnectionStatus,
    { label: string; badgeClass: string }
> = {
    CONNECTED: {
        label: "Bağlı",
        badgeClass: "bg-green-100 text-green-700",
    },
    PENDING: {
        label: "Beklemede",
        badgeClass: "bg-blue-100 text-blue-700",
    },
    DISCONNECTED: {
        label: "Bağlı Değil",
        badgeClass: "bg-gray-100 text-gray-700",
    },
    ERROR: {
        label: "Hata",
        badgeClass: "bg-red-100 text-red-700",
    },
    EXPIRED: {
        label: "Süresi Doldu",
        badgeClass: "bg-amber-100 text-amber-700",
    },
};

const DEFAULT_STATUS_CONFIG = {
    label: "Durum Bekleniyor",
    badgeClass: "bg-gray-100 text-gray-700",
};

const MESSAGE_TONE_CLASS: Record<
    "muted" | "warning",
    string
> = {
    muted: "border-gray-200 bg-gray-50 text-gray-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const getStatusConfig = (status?: IntegrationStatus | null) => {
    if (!status) {
        return DEFAULT_STATUS_CONFIG;
    }

    const normalizedStatus =
        typeof status.status === "string"
            ? (status.status.toUpperCase() as IntegrationConnectionStatus)
            : null;

    if (normalizedStatus) {
        if (normalizedStatus === "DISCONNECTED" && status.connected) {
            return STATUS_CONFIG.CONNECTED;
        }

        if (normalizedStatus in STATUS_CONFIG) {
            return STATUS_CONFIG[normalizedStatus];
        }
    }

    if (status.connected) {
        return STATUS_CONFIG.CONNECTED;
    }

    return DEFAULT_STATUS_CONFIG;
};

const getIdentifierLabel = (platform?: string | null) => {
    const normalized = platform?.toUpperCase();

    switch (normalized) {
        case "FACEBOOK":
            return "Facebook Sayfa Kimliği";
        case "GOOGLE":
            return "Google Hesap Kimliği";
        default:
            return "Platform Kimliği";
    }
};

const buildIntegrationDetails = (status: IntegrationStatus | null) => {
    const details: { label: string; value: string }[] = [];

    if (!status) {
        return details;
    }

    const identifier =
        status.pageName ?? status.platformPageId ?? status.pageId ?? null;
    if (identifier) {
        details.push({
            label: getIdentifierLabel(status.platform),
            value: identifier,
        });
    }

    const connectedAtText = formatDateTime(status.connectedAt);
    if (connectedAtText) {
        details.push({ label: "Bağlanma Tarihi", value: connectedAtText });
    }

    const expiresAtText = formatDateTime(status.expiresAt);
    if (expiresAtText) {
        details.push({ label: "Token Bitiş Zamanı", value: expiresAtText });
    }

    const lastSyncedAtText = formatDateTime(status.lastSyncedAt);
    if (lastSyncedAtText) {
        details.push({ label: "Son Senkron", value: lastSyncedAtText });
    }

    if (status.lastErrorMessage) {
        const lastErrorAtText = formatDateTime(status.lastErrorAt);
        details.push({
            label: "Son Hata",
            value: lastErrorAtText
                ? `${status.lastErrorMessage} (${lastErrorAtText})`
                : status.lastErrorMessage,
        });
    }

    return details;
};

const buildStatusMessage = (status: IntegrationStatus | null) => {
    if (!status) {
        return null;
    }

    if (status.statusMessage) {
        return {
            tone: status.requiresAction ? "warning" : "muted",
            message: status.statusMessage,
        } as const;
    }

    if (status.requiresAction) {
        return {
            tone: "warning" as const,
            message: "Bu entegrasyon için kullanıcı aksiyonu gerekiyor.",
        };
    }

    return null;
};

export default function IntegrationsPage() {
    const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([]);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    const [facebookConnectLoading, setFacebookConnectLoading] = useState(false);
    const [facebookFetchLoading, setFacebookFetchLoading] = useState(false);
    const [facebookAlert, setFacebookAlert] = useState<AlertState | null>(null);

    const [googleConnectLoading, setGoogleConnectLoading] = useState(false);
    const [googleFetchLoading, setGoogleFetchLoading] = useState(false);
    const [googleAlert, setGoogleAlert] = useState<AlertState | null>(null);

    const [activeTab, setActiveTab] = useState<"connections" | "history">("connections");
    const [logs, setLogs] = useState<IntegrationLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(0);
    const [logsTotalPages, setLogsTotalPages] = useState(0);

    type OAuthTimerKey = "facebook" | "google";
    type OAuthTimerEntry = {
        popupCheck?: number;
        statusPoll?: number;
    };

    const oauthPopupTimers = useRef<Partial<Record<OAuthTimerKey, OAuthTimerEntry>>>({});

    const clearOAuthTimers = useCallback((platform?: OAuthTimerKey) => {
        const platforms = platform
            ? [platform]
            : (Object.keys(oauthPopupTimers.current) as OAuthTimerKey[]);

        platforms.forEach((key) => {
            const timers = oauthPopupTimers.current[key];

            if (!timers) {
                return;
            }

            if (timers.popupCheck) {
                window.clearInterval(timers.popupCheck);
            }

            if (timers.statusPoll) {
                window.clearInterval(timers.statusPoll);
            }

            delete oauthPopupTimers.current[key];
        });
    }, []);

    const refreshIntegrationStatuses = useCallback(async () => {
        setStatusLoading(true);
        setStatusError(null);

        const response = await getIntegrationStatuses();

        if (response.status === 200) {
            setIntegrationStatuses(response.data ?? []);
        } else {
            setStatusError(
                response.message ?? "Entegrasyon durumları alınamadı."
            );
            setIntegrationStatuses([]);
        }

        setStatusLoading(false);
    }, []);

    useEffect(() => {
        void refreshIntegrationStatuses();
    }, [refreshIntegrationStatuses]);

    const facebookStatus = useMemo(
        () =>
            integrationStatuses.find(
                (status) => status.platform?.toUpperCase() === "FACEBOOK"
            ) ?? null,
        [integrationStatuses]
    );

    const googleStatus = useMemo(
        () =>
            integrationStatuses.find(
                (status) => status.platform?.toUpperCase() === "GOOGLE"
            ) ?? null,
        [integrationStatuses]
    );

    const isFacebookConnected =
        facebookStatus?.status === "CONNECTED" ||
        (!facebookStatus?.status && Boolean(facebookStatus?.connected));

    const isGoogleConnected =
        googleStatus?.status === "CONNECTED" ||
        (!googleStatus?.status && Boolean(googleStatus?.connected));

    const facebookStatusConfig = getStatusConfig(facebookStatus);
    const googleStatusConfig = getStatusConfig(googleStatus);

    const facebookDetails = useMemo(
        () => buildIntegrationDetails(facebookStatus),
        [facebookStatus]
    );

    const googleDetails = useMemo(
        () => buildIntegrationDetails(googleStatus),
        [googleStatus]
    );

    const facebookStatusMessage = useMemo(
        () => buildStatusMessage(facebookStatus),
        [facebookStatus]
    );

    const googleStatusMessage = useMemo(
        () => buildStatusMessage(googleStatus),
        [googleStatus]
    );

    useEffect(() => {
        setFacebookAlert((prev) => {
            if (isFacebookConnected) {
                if (!prev) {
                    return prev;
                }

                if (prev.type === "success") {
                    return prev;
                }

                if (prev.type !== "info") {
                    return prev;
                }

                return {
                    type: "success",
                    message:
                        "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
                };
            }

            if (prev?.type === "info") {
                return null;
            }

            return prev;
        });
    }, [isFacebookConnected]);

    useEffect(() => {
        setGoogleAlert((prev) => {
            if (isGoogleConnected) {
                if (!prev) {
                    return prev;
                }

                if (prev.type === "success") {
                    return prev;
                }

                if (prev.type !== "info") {
                    return prev;
                }

                return {
                    type: "success",
                    message:
                        "Google bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
                };
            }

            if (prev?.type === "info") {
                return null;
            }

            return prev;
        });
    }, [isGoogleConnected]);

    useEffect(() => {
        const handleOAuthCompletion = (platform: OAuthTimerKey) => {
            clearOAuthTimers(platform);

            if (platform === "facebook") {
                setFacebookConnectLoading(false);
                setFacebookAlert({
                    type: "success",
                    message:
                        "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
                });
            } else if (platform === "google") {
                setGoogleConnectLoading(false);
                setGoogleAlert({
                    type: "success",
                    message:
                        "Google bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
                });
            }

            void refreshIntegrationStatuses();
        };

        const handleOAuthMessage = (event: MessageEvent) => {
            if (typeof window === "undefined") {
                return;
            }

            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data?.type === FACEBOOK_OAUTH_MESSAGE_TYPE) {
                handleOAuthCompletion("facebook");
            } else if (event.data?.type === GOOGLE_OAUTH_MESSAGE_TYPE) {
                handleOAuthCompletion("google");
            }
        };

        window.addEventListener("message", handleOAuthMessage);

        return () => {
            window.removeEventListener("message", handleOAuthMessage);
        };
    }, [clearOAuthTimers, refreshIntegrationStatuses]);

    const handleFacebookConnectClick = useCallback(async () => {
        setFacebookConnectLoading(true);
        setFacebookAlert(null);

        const response = await getFacebookOAuthUrl();

        if (response.status === 200 && response.data?.url) {
            const popup = window.open(
                response.data.url,
                "facebook-oauth",
                "width=600,height=700"
            );

            if (popup) {
                clearOAuthTimers("facebook");

                setFacebookAlert({
                    type: "info",
                    message:
                        "Facebook bağlantısını tamamlamak için açılan pencerede işlemi tamamlayın. İşlem tamamlandığında bu sayfa otomatik olarak güncellenecektir.",
                });

                const timers: OAuthTimerEntry = {};
                oauthPopupTimers.current.facebook = timers;

                timers.statusPoll = window.setInterval(() => {
                    void refreshIntegrationStatuses();
                }, 5000);

                timers.popupCheck = window.setInterval(() => {
                    if (popup.closed) {
                        clearOAuthTimers("facebook");
                        setFacebookConnectLoading(false);
                        setFacebookAlert((prev) => {
                            if (prev && prev.type !== "info") {
                                return prev;
                            }

                            return {
                                type: "info",
                                message:
                                    "Facebook bağlantı penceresi kapatıldı. Bağlantı durumunu kontrol etmek için sayfa güncellendi.",
                            };
                        });
                        void refreshIntegrationStatuses();
                    }
                }, 500);

                return;
            }

            window.location.href = response.data.url;
            return;
        }

        setFacebookAlert({
            type: "error",
            message:
                response.message ??
                "Facebook bağlantısı başlatılırken bir hata oluştu.",
        });

        setFacebookConnectLoading(false);
    }, [clearOAuthTimers, refreshIntegrationStatuses]);

    const handleFacebookManualSync = useCallback(async () => {
        setFacebookFetchLoading(true);
        setFacebookAlert(null);

        const response = await triggerFacebookLeadFetch();

        if (response.status === 200 && response.data) {
            const { created, updated } = response.data;

            if ((created ?? 0) === 0 && (updated ?? 0) === 0) {
                setFacebookAlert({
                    type: "info",
                    message: "Facebook leads are already up to date.",
                });
            } else {
                setFacebookAlert({
                    type: "success",
                    message: `Facebook lead sync finished: ${created} new, ${updated} updated.`,
                });
            }

            void refreshIntegrationStatuses();
        } else if (response.status === 403) {
            setFacebookAlert({
                type: "error",
                message: "You don't have permission to sync Facebook leads.",
            });
        } else if (response.status === 404) {
            setFacebookAlert({
                type: "error",
                message: "Connect a Facebook page before syncing leads.",
            });
        } else {
            setFacebookAlert({
                type: "error",
                message:
                    response.message ??
                    "Facebook lead senkronizasyonu sırasında bir hata oluştu.",
            });
        }

        setFacebookFetchLoading(false);
    }, [refreshIntegrationStatuses]);

    const handleGoogleConnectClick = useCallback(async () => {
        setGoogleConnectLoading(true);
        setGoogleAlert(null);

        const response = await getGoogleOAuthUrl();

        if (response.status === 200 && response.data?.url) {
            const popup = window.open(
                response.data.url,
                "google-oauth",
                "width=600,height=700"
            );

            if (popup) {
                clearOAuthTimers("google");

                setGoogleAlert({
                    type: "info",
                    message:
                        "Google bağlantısını tamamlamak için açılan pencerede işlemi tamamlayın. İşlem tamamlandığında bu sayfa otomatik olarak güncellenecektir.",
                });

                const timers: OAuthTimerEntry = {};
                oauthPopupTimers.current.google = timers;

                timers.statusPoll = window.setInterval(() => {
                    void refreshIntegrationStatuses();
                }, 5000);

                timers.popupCheck = window.setInterval(() => {
                    if (popup.closed) {
                        clearOAuthTimers("google");
                        setGoogleConnectLoading(false);
                        setGoogleAlert((prev) => {
                            if (prev && prev.type !== "info") {
                                return prev;
                            }

                            return {
                                type: "info",
                                message:
                                    "Google bağlantı penceresi kapatıldı. Bağlantı durumunu kontrol etmek için sayfa güncellendi.",
                            };
                        });
                        void refreshIntegrationStatuses();
                    }
                }, 500);

                return;
            }

            window.location.href = response.data.url;
            return;
        }

        setGoogleAlert({
            type: "error",
            message:
                response.message ??
                "Google bağlantısı başlatılırken bir hata oluştu.",
        });

        setGoogleConnectLoading(false);
    }, [clearOAuthTimers, refreshIntegrationStatuses]);

    const handleGoogleManualSync = useCallback(async () => {
        setGoogleFetchLoading(true);
        setGoogleAlert(null);

        const response = await triggerGoogleLeadFetch();

        if (response.status === 200 && response.data) {
            const { created, updated } = response.data;

            if ((created ?? 0) === 0 && (updated ?? 0) === 0) {
                setGoogleAlert({
                    type: "info",
                    message: "Google leads are already up to date.",
                });
            } else {
                setGoogleAlert({
                    type: "success",
                    message: `Google lead sync finished: ${created} new, ${updated} updated.`,
                });
            }

            void refreshIntegrationStatuses();
        } else if (response.status === 403) {
            setGoogleAlert({
                type: "error",
                message: "You don't have permission to sync Google leads.",
            });
        } else if (response.status === 404) {
            setGoogleAlert({
                type: "error",
                message: "Connect a Google account before syncing leads.",
            });
        } else {
            setGoogleAlert({
                type: "error",
                message:
                    response.message ??
                    "Google lead senkronizasyonu sırasında bir hata oluştu.",
            });
        }

        setGoogleFetchLoading(false);
    }, [refreshIntegrationStatuses]);

    const handleFrequencyChange = useCallback(async (platform: string, frequency: SyncFrequency) => {
        setStatusLoading(true);
        const res = await updateSyncFrequency(platform, frequency);
        if (res.status === 200) {
            await refreshIntegrationStatuses();
        } else {
            console.error(res.message);
            // Opsiyonel: Hata göster
        }
        setStatusLoading(false);
    }, [refreshIntegrationStatuses]);

    useEffect(() => {
        if (facebookConnectLoading && isFacebookConnected) {
            clearOAuthTimers("facebook");
            setFacebookConnectLoading(false);
            setFacebookAlert({
                type: "success",
                message:
                    "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
            });
        }
    }, [facebookConnectLoading, clearOAuthTimers, isFacebookConnected]);

    useEffect(() => {
        if (googleConnectLoading && isGoogleConnected) {
            clearOAuthTimers("google");
            setGoogleConnectLoading(false);
            setGoogleAlert({
                type: "success",
                message:
                    "Google bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
            });
        }
    }, [clearOAuthTimers, googleConnectLoading, isGoogleConnected]);

    useEffect(() => {
        return () => {
            clearOAuthTimers();
        };
    }, [clearOAuthTimers]);

    const fetchLogs = useCallback(async (page = 0) => {
        setLogsLoading(true);
        const res = await getIntegrationLogs(page, 10);
        if (res.status === 200 && res.data) {
            setLogs(res.data.content);
            setLogsTotalPages(res.data.totalPages);
            setLogsPage(page);
        }
        setLogsLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === "history") {
            void fetchLogs();
        }
    }, [activeTab, fetchLogs]);

    return (
        <Layout title="Integrations" subtitle="Facebook ve Google bağlantılarınızı yönetin">
            <div className="col-span-12 mb-4">
                <div className="flex border-b">
                    <button
                        className={`px-4 py-2 font-medium text-sm ${activeTab === "connections"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("connections")}
                    >
                        Bağlantılar
                    </button>
                    <button
                        className={`px-4 py-2 font-medium text-sm ${activeTab === "history"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                        onClick={() => setActiveTab("history")}
                    >
                        Senkronizasyon Geçmişi
                    </button>
                </div>
            </div>

            {activeTab === "connections" && (
                <>
                    {/* Facebook */}
                    <div className="col-span-12 md:col-span-6">
                        <Card>
                            <CardHeader className="flex items-center gap-2">
                                <Facebook className="h-5 w-5 text-blue-600" />
                                Facebook Integration
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <p>
                                    Facebook Ads üzerinden gelen lead&apos;leri Patient Trace&apos;e otomatik olarak aktarın.
                                </p>

                                {facebookAlert && (
                                    <div
                                        className={`rounded-md border px-3 py-2 text-sm ${facebookAlert.type === "success"
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : facebookAlert.type === "error"
                                                ? "border-red-200 bg-red-50 text-red-700"
                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                            }`}
                                    >
                                        {facebookAlert.message}
                                    </div>
                                )}

                                {statusLoading ? (
                                    <p className="text-sm text-gray-500">
                                        Facebook bağlantı durumu yükleniyor...
                                    </p>
                                ) : statusError ? (
                                    <p className="text-sm text-red-600">{statusError}</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <span
                                                className={`inline-flex h-6 items-center rounded-full px-3 text-xs font-medium ${facebookStatusConfig.badgeClass}`}
                                            >
                                                {facebookStatusConfig.label}
                                            </span>

                                            <Button
                                                variant="primary"
                                                onClick={handleFacebookConnectClick}
                                                disabled={facebookConnectLoading}
                                                isLoading={facebookConnectLoading}
                                            >
                                                {isFacebookConnected
                                                    ? "Yeniden Bağlan"
                                                    : "Bağlan"}
                                            </Button>
                                        </div>

                                        {facebookStatusMessage && (
                                            <div
                                                className={`rounded-md border px-3 py-2 text-xs ${MESSAGE_TONE_CLASS[facebookStatusMessage.tone]
                                                    }`}
                                            >
                                                {facebookStatusMessage.message}
                                            </div>
                                        )}

                                        {facebookDetails.length > 0 && (
                                            <dl className="grid gap-2 text-xs text-gray-600">
                                                {facebookDetails.map((detail, index) => (
                                                    <div
                                                        key={`${detail.label}-${index}`}
                                                        className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                                                    >
                                                        <dt className="font-medium text-gray-500">
                                                            {detail.label}
                                                        </dt>
                                                        <dd className="text-gray-700 sm:text-right">
                                                            {detail.value}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}

                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xs text-gray-500">
                                                Manuel olarak Facebook lead&apos;lerini hemen senkronize edin.
                                            </span>
                                            <Button
                                                variant="secondary"
                                                onClick={handleFacebookManualSync}
                                                disabled={!isFacebookConnected || facebookFetchLoading}
                                                isLoading={facebookFetchLoading}
                                            >
                                                Lead Senkronizasyonu Başlat
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between border-t pt-3 mt-1">
                                            <span className="text-xs text-gray-600 font-medium">Otomatik Senkronizasyon:</span>
                                            <select
                                                value={facebookStatus?.syncFrequency || "MANUAL"}
                                                onChange={(e) => handleFrequencyChange("FACEBOOK", e.target.value as SyncFrequency)}
                                                disabled={!isFacebookConnected || statusLoading}
                                                className="text-xs border rounded px-2 py-1 bg-white"
                                            >
                                                <option value="MANUAL">Kapalı (Manuel)</option>
                                                <option value="HOURLY">Her Saat</option>
                                                <option value="DAILY">Günlük</option>
                                                <option value="WEEKLY">Haftalık</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Google */}
                    <div className="col-span-12 md:col-span-6">
                        <Card>
                            <CardHeader className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-red-500" />
                                Google Integration
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <p>
                                    Google Ads üzerinden gelen lead&apos;leri Patient Trace&apos;e otomatik olarak aktarın.
                                </p>
                                {googleAlert && (
                                    <div
                                        className={`rounded-md border px-3 py-2 text-sm ${googleAlert.type === "success"
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : googleAlert.type === "error"
                                                ? "border-red-200 bg-red-50 text-red-700"
                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                            }`}
                                    >
                                        {googleAlert.message}
                                    </div>
                                )}
                                {statusLoading ? (
                                    <p className="text-sm text-gray-500">
                                        Google bağlantı durumu yükleniyor...
                                    </p>
                                ) : statusError ? (
                                    <p className="text-sm text-red-600">{statusError}</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <span
                                                className={`inline-flex h-6 items-center rounded-full px-3 text-xs font-medium ${googleStatusConfig.badgeClass}`}
                                            >
                                                {googleStatusConfig.label}
                                            </span>
                                            <Button
                                                variant="primary"
                                                onClick={handleGoogleConnectClick}
                                                disabled={googleConnectLoading}
                                                isLoading={googleConnectLoading}
                                            >
                                                {isGoogleConnected ? "Yeniden Bağlan" : "Bağlan"}
                                            </Button>
                                        </div>

                                        {googleStatusMessage && (
                                            <div
                                                className={`rounded-md border px-3 py-2 text-xs ${MESSAGE_TONE_CLASS[googleStatusMessage.tone]
                                                    }`}
                                            >
                                                {googleStatusMessage.message}
                                            </div>
                                        )}

                                        {googleDetails.length > 0 && (
                                            <dl className="grid gap-2 text-xs text-gray-600">
                                                {googleDetails.map((detail, index) => (
                                                    <div
                                                        key={`${detail.label}-${index}`}
                                                        className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                                                    >
                                                        <dt className="font-medium text-gray-500">
                                                            {detail.label}
                                                        </dt>
                                                        <dd className="text-gray-700 sm:text-right">
                                                            {detail.value}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xs text-gray-500">
                                                Manuel olarak Google lead&apos;lerini hemen senkronize edin.
                                            </span>
                                            <Button
                                                variant="secondary"
                                                onClick={handleGoogleManualSync}
                                                disabled={!isGoogleConnected || googleFetchLoading}
                                                isLoading={googleFetchLoading}
                                            >
                                                Lead Senkronizasyonu Başlat
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between border-t pt-3 mt-1">
                                            <span className="text-xs text-gray-600 font-medium">Otomatik Senkronizasyon:</span>
                                            <select
                                                value={googleStatus?.syncFrequency || "MANUAL"}
                                                onChange={(e) => handleFrequencyChange("GOOGLE", e.target.value as SyncFrequency)}
                                                disabled={!isGoogleConnected || statusLoading}
                                                className="text-xs border rounded px-2 py-1 bg-white"
                                            >
                                                <option value="MANUAL">Kapalı (Manuel)</option>
                                                <option value="HOURLY">Her Saat</option>
                                                <option value="DAILY">Günlük</option>
                                                <option value="WEEKLY">Haftalık</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Excel Import */}
                    <div className="col-span-12">
                        <Card>
                            <CardHeader className="flex items-center gap-2">
                                <PlugZap className="h-5 w-5 text-amber-500" />
                                Excel Import
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <p>Excel dosyalarınızı yükleyerek manuel lead ekleyin.</p>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        window.location.href = "/integrations/excel";
                                    }}
                                >
                                    Excel Import Başlat
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {activeTab === "history" && (
                <div className="col-span-12">
                    <Card>
                        <CardHeader>İşlem Geçmişi</CardHeader>
                        <CardContent>
                            {logsLoading ? (
                                <p className="text-center text-gray-500 py-4">Yükleniyor...</p>
                            ) : logs.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Henüz bir işlem kaydı bulunmuyor.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100 text-left">
                                                <th className="p-2">Platform</th>
                                                <th className="p-2">Başlangıç</th>
                                                <th className="p-2">Durum/Sonuç</th>
                                                <th className="p-2">Yeni/Gnc</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log) => (
                                                <tr key={log.id} className="border-t hover:bg-gray-50">
                                                    <td className="p-2 font-medium">{log.platform}</td>
                                                    <td className="p-2">
                                                        {new Date(log.startedAt).toLocaleString("tr-TR")}
                                                    </td>
                                                    <td className="p-2">
                                                        {log.errorMessage ? (
                                                            <span className="text-red-600" title={log.errorMessage}>
                                                                Hata
                                                            </span>
                                                        ) : (
                                                            <span className="text-green-600">Başarılı</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2">
                                                        +{log.newCreated} / ↻{log.updated}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {logsTotalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <Button
                                        variant="secondary"
                                        disabled={logsPage === 0}
                                        onClick={() => fetchLogs(logsPage - 1)}
                                    >
                                        Önceki
                                    </Button>
                                    <span className="flex items-center text-sm text-gray-600">
                                        Sayfa {logsPage + 1} / {logsTotalPages}
                                    </span>
                                    <Button
                                        variant="secondary"
                                        disabled={logsPage >= logsTotalPages - 1}
                                        onClick={() => fetchLogs(logsPage + 1)}
                                    >
                                        Sonraki
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </Layout>
    );
}
