"use client";

import { Facebook, Globe, PlugZap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import Layout from "@/components/Layout";
import {
    getIntegrationStatuses,
    getFacebookOAuthUrl,
    triggerFacebookLeadFetch,
    type IntegrationStatus,
    type IntegrationConnectionStatus,
} from "@/lib/api";
import { FACEBOOK_OAUTH_MESSAGE_TYPE } from "@/lib/facebookOAuth";

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

    const [connectLoading, setConnectLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [alert, setAlert] = useState<AlertState | null>(null);

    const oauthPopupTimers = useRef<{
        popupCheck?: number;
        statusPoll?: number;
    }>({});

    const clearOAuthTimers = useCallback(() => {
        if (oauthPopupTimers.current.popupCheck) {
            window.clearInterval(oauthPopupTimers.current.popupCheck);
            oauthPopupTimers.current.popupCheck = undefined;
        }

        if (oauthPopupTimers.current.statusPoll) {
            window.clearInterval(oauthPopupTimers.current.statusPoll);
            oauthPopupTimers.current.statusPoll = undefined;
        }
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
        setAlert((prev) => {
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
        const handleOAuthMessage = (event: MessageEvent) => {
            if (typeof window === "undefined") {
                return;
            }

            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data?.type === FACEBOOK_OAUTH_MESSAGE_TYPE) {
                clearOAuthTimers();
                setConnectLoading(false);
                setAlert({
                    type: "success",
                    message:
                        "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
                });
                void refreshIntegrationStatuses();
            }
        };

        window.addEventListener("message", handleOAuthMessage);

        return () => {
            window.removeEventListener("message", handleOAuthMessage);
        };
    }, [clearOAuthTimers, refreshIntegrationStatuses]);

    const handleConnectClick = useCallback(async () => {
        setConnectLoading(true);
        setAlert(null);

        const response = await getFacebookOAuthUrl();

        if (response.status === 200 && response.data?.url) {
            const popup = window.open(
                response.data.url,
                "facebook-oauth",
                "width=600,height=700"
            );

            if (popup) {
                clearOAuthTimers();

                setAlert({
                    type: "info",
                    message:
                        "Facebook bağlantısını tamamlamak için açılan pencerede işlemi tamamlayın. İşlem tamamlandığında bu sayfa otomatik olarak güncellenecektir.",
                });

                oauthPopupTimers.current.statusPoll = window.setInterval(() => {
                    void refreshIntegrationStatuses();
                }, 5000);

                oauthPopupTimers.current.popupCheck = window.setInterval(() => {
                    if (popup.closed) {
                        clearOAuthTimers();
                        setConnectLoading(false);
                        setAlert((prev) => {
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

        setAlert({
            type: "error",
            message:
                response.message ??
                "Facebook bağlantısı başlatılırken bir hata oluştu.",
        });

        setConnectLoading(false);
    }, [clearOAuthTimers, refreshIntegrationStatuses]);

    const handleManualSync = useCallback(async () => {
        setFetchLoading(true);
        setAlert(null);

        const response = await triggerFacebookLeadFetch();

        if (response.status === 200 && response.data) {
            const { created, updated } = response.data;

            if ((created ?? 0) === 0 && (updated ?? 0) === 0) {
                setAlert({
                    type: "info",
                    message: "Facebook leads are already up to date.",
                });
            } else {
                setAlert({
                    type: "success",
                    message: `Facebook lead sync finished: ${created} new, ${updated} updated.`,
                });
            }

            void refreshIntegrationStatuses();
        } else if (response.status === 403) {
            setAlert({
                type: "error",
                message: "You don't have permission to sync Facebook leads.",
            });
        } else if (response.status === 404) {
            setAlert({
                type: "error",
                message: "Connect a Facebook page before syncing leads.",
            });
        } else {
            setAlert({
                type: "error",
                message:
                    response.message ??
                    "Facebook lead senkronizasyonu sırasında bir hata oluştu.",
            });
        }

        setFetchLoading(false);
    }, [refreshIntegrationStatuses]);

    useEffect(() => {
        if (connectLoading && isFacebookConnected) {
            clearOAuthTimers();
            setConnectLoading(false);
            setAlert({
                type: "success",
                message:
                    "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
            });
        }
    }, [connectLoading, clearOAuthTimers, isFacebookConnected]);

    useEffect(() => {
        return () => {
            clearOAuthTimers();
        };
    }, [clearOAuthTimers]);

    return (
        <Layout title="Integrations" subtitle="Facebook ve Google bağlantılarınızı yönetin">
            {/* Facebook */}
            <div className="col-span-12 md:col-span-6">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Facebook className="h-5 w-5 text-blue-600" />
                        Facebook Integration
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <p>
                            Facebook Ads üzerinden gelen lead’leri Patient Trace'e otomatik olarak aktarın.
                        </p>

                        {alert && (
                            <div
                                className={`rounded-md border px-3 py-2 text-sm ${alert.type === "success"
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : alert.type === "error"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-blue-200 bg-blue-50 text-blue-700"
                                    }`}
                            >
                                {alert.message}
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
                                        onClick={handleConnectClick}
                                        disabled={connectLoading}
                                        isLoading={connectLoading}
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
                                        Manuel olarak Facebook lead’lerini hemen senkronize edin.
                                    </span>
                                    <Button
                                        variant="secondary"
                                        onClick={handleManualSync}
                                        disabled={!isFacebookConnected || fetchLoading}
                                        isLoading={fetchLoading}
                                    >
                                        Lead Senkronizasyonu Başlat
                                    </Button>
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
                            Google Ads üzerinden gelen lead’leri Patient Trace'e otomatik olarak aktarın.
                        </p>
                        {statusLoading ? (
                            <p className="text-sm text-gray-500">
                                Google bağlantı durumu yükleniyor...
                            </p>
                        ) : statusError ? (
                            <p className="text-sm text-red-600">{statusError}</p>
                        ) : googleStatus ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <span
                                        className={`inline-flex h-6 items-center rounded-full px-3 text-xs font-medium ${googleStatusConfig.badgeClass}`}
                                    >
                                        {googleStatusConfig.label}
                                    </span>
                                    <Button variant="ghost" disabled>
                                        Yakında
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
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Google entegrasyonu için durum bilgisi bulunamadı.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Excel Import yönlendirme */}
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
        </Layout>
    );
}
