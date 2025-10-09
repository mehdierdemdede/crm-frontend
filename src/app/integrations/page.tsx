"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Facebook, Globe, PlugZap } from "lucide-react";
import {
    getFacebookIntegrationStatus,
    getFacebookOAuthUrl,
    triggerFacebookLeadFetch,
    type FacebookIntegrationStatus,
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

export default function IntegrationsPage() {
    const [facebookStatus, setFacebookStatus] = useState<FacebookIntegrationStatus | null>(null);
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

    const refreshFacebookStatus = useCallback(async () => {
        setStatusLoading(true);
        setStatusError(null);

        const response = await getFacebookIntegrationStatus();

        if (response.status === 200) {
            setFacebookStatus(response.data ?? null);
        } else if (response.status === 404) {
            setFacebookStatus(null);
        } else {
            setStatusError(
                response.message ?? "Facebook entegrasyon durumu alınamadı."
            );
            setFacebookStatus(null);
        }

        setStatusLoading(false);
    }, []);

    useEffect(() => {
        void refreshFacebookStatus();
    }, [refreshFacebookStatus]);

    const isFacebookConnected = Boolean(facebookStatus?.connected);

    const facebookConnectionSubtitle = useMemo(() => {
        if (!isFacebookConnected) {
            return null;
        }

        const details: string[] = [];

        if (facebookStatus?.pageName || facebookStatus?.pageId) {
            details.push(
                `Sayfa: ${facebookStatus.pageName ?? facebookStatus.pageId}`
            );
        }

        const connectedAtText = formatDateTime(facebookStatus?.connectedAt);
        if (connectedAtText) {
            details.push(`Bağlantı tarihi: ${connectedAtText}`);
        }

        const lastSyncedAtText = formatDateTime(facebookStatus?.lastSyncedAt);
        if (lastSyncedAtText) {
            details.push(`Son manuel senkron: ${lastSyncedAtText}`);
        }

        if (details.length === 0) {
            return null;
        }

        return details.join(" • ");
    }, [facebookStatus, isFacebookConnected]);

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
                void refreshFacebookStatus();
            }
        };

        window.addEventListener("message", handleOAuthMessage);

        return () => {
            window.removeEventListener("message", handleOAuthMessage);
        };
    }, [clearOAuthTimers, refreshFacebookStatus]);

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
                    void refreshFacebookStatus();
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
                        void refreshFacebookStatus();
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
    }, [clearOAuthTimers, refreshFacebookStatus]);

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

            void refreshFacebookStatus();
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
    }, [refreshFacebookStatus]);

    useEffect(() => {
        if (connectLoading && facebookStatus?.connected) {
            clearOAuthTimers();
            setConnectLoading(false);
            setAlert({
                type: "success",
                message:
                    "Facebook bağlantısı başarıyla tamamlandı. Açılan pencereyi kapatabilirsiniz.",
            });
        }
    }, [facebookStatus, connectLoading, clearOAuthTimers]);

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
                            Facebook Ads üzerinden gelen lead’leri CRM’e otomatik olarak aktarın.
                        </p>

                        {alert && (
                            <div
                                className={`rounded-md border px-3 py-2 text-sm ${
                                    alert.type === "success"
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
                                        className={`text-sm font-medium ${
                                            isFacebookConnected
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {isFacebookConnected ? "Bağlı" : "Bağlı Değil"}
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

                                {facebookConnectionSubtitle && (
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                                        {facebookConnectionSubtitle}
                                    </div>
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
                            Google Ads üzerinden gelen lead’leri CRM’e otomatik olarak aktarın.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm font-medium text-orange-500">
                                Yakında
                            </span>
                            <Button variant="ghost" disabled>
                                Çok Yakında
                            </Button>
                        </div>
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
