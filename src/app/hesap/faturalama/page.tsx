"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    CalendarDays,
    CreditCard,
    Loader2,
    RefreshCw,
    Users as UsersIcon,
} from "lucide-react";

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { getCustomerSubscriptions } from "@/lib/api";
import type { Subscription } from "@/lib/types";

const STATUS_CONFIG: Record<Subscription["status"], { label: string; className: string }> = {
    TRIALING: {
        label: "Deneme",
        className: "bg-indigo-100 text-indigo-700",
    },
    ACTIVE: {
        label: "Aktif",
        className: "bg-green-100 text-green-700",
    },
    PAST_DUE: {
        label: "Ödeme Gecikmiş",
        className: "bg-red-100 text-red-700",
    },
    CANCELED: {
        label: "İptal Edildi",
        className: "bg-gray-200 text-gray-600",
    },
    INCOMPLETE: {
        label: "Eksik",
        className: "bg-yellow-100 text-yellow-700",
    },
    INCOMPLETE_EXPIRED: {
        label: "Süresi Doldu",
        className: "bg-orange-100 text-orange-700",
    },
};

function SubscriptionStatusBadge({ status }: { status: Subscription["status"] }) {
    const config = STATUS_CONFIG[status] ?? {
        label: status,
        className: "bg-slate-200 text-slate-700",
    };

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
        >
            <span className="h-2 w-2 rounded-full bg-current" />
            {config.label}
        </span>
    );
}

const formatDate = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long",
    }).format(date);
};

function CurrentPlanCard({
    subscription,
    onChangePlan,
    onUpdateSeats,
    onCancel,
}: {
    subscription: Subscription;
    onChangePlan: (subscription: Subscription) => void;
    onUpdateSeats: (subscription: Subscription) => void;
    onCancel: (subscription: Subscription) => void;
}) {
    return (
        <Card className="border border-slate-200 p-0 shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">Mevcut Plan</p>
                    <h2 className="text-xl font-semibold text-slate-900">{subscription.planId}</h2>
                    <p className="text-xs text-slate-500">Abonelik ID: {subscription.id}</p>
                </div>
                <SubscriptionStatusBadge status={subscription.status} />
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-6 text-slate-600">
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <CalendarDays className="h-4 w-4" /> Faturalama Dönemi
                        </dt>
                        <dd className="mt-2 text-sm text-slate-800">
                            Sonraki yenileme {formatDate(subscription.currentPeriodEnd)}
                        </dd>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <UsersIcon className="h-4 w-4" /> Koltuk Sayısı
                        </dt>
                        <dd className="mt-2 text-sm text-slate-800">{subscription.seats} koltuk</dd>
                    </div>
                </dl>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durum</dt>
                    <dd className="mt-2">
                        <SubscriptionStatusBadge status={subscription.status} />
                    </dd>
                </div>

                {subscription.trialEndsAt ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                        Deneme süresi {formatDate(subscription.trialEndsAt)} tarihinde sona erecek.
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => onChangePlan(subscription)}
                    >
                        <RefreshCw className="h-4 w-4" /> Planı Değiştir
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => onUpdateSeats(subscription)}
                    >
                        <UsersIcon className="h-4 w-4" /> Koltuk Sayısı
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        className="gap-2"
                        onClick={() => onCancel(subscription)}
                    >
                        <AlertCircle className="h-4 w-4" /> İptal Et
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function BillingPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const customerId = user?.organizationId;

    const {
        data: subscriptions,
        isLoading,
        isError,
        error,
    } = useQuery<Subscription[], Error>({
        queryKey: ["customer-subscriptions", customerId],
        queryFn: async () => {
            if (!customerId) {
                throw new Error("Müşteri kimliği bulunamadı");
            }

            return getCustomerSubscriptions(customerId);
        },
        enabled: Boolean(customerId),
        staleTime: 1000 * 60,
    });

    const activeSubscription = useMemo(() => {
        if (!subscriptions || subscriptions.length === 0) {
            return null;
        }

        return (
            subscriptions.find((item) => item.status === "ACTIVE" || item.status === "TRIALING") ??
            subscriptions[0]
        );
    }, [subscriptions]);

    const handleChangePlan = useCallback((subscription: Subscription) => {
        console.info("Plan değiştir tetiklendi", subscription.id);
    }, []);

    const handleUpdateSeats = useCallback((subscription: Subscription) => {
        console.info("Koltuk güncelle tetiklendi", subscription.id);
    }, []);

    const handleCancelSubscription = useCallback((subscription: Subscription) => {
        console.info("Abonelik iptal tetiklendi", subscription.id);
    }, []);

    const handleUpdatePaymentMethod = useCallback(() => {
        console.info("Kart güncelleme tokenize akışı başlatıldı");
    }, []);

    const isLoadingState = isAuthLoading || (isLoading && Boolean(customerId));

    return (
        <Layout title="Faturalama" subtitle="Abonelik planınızı ve ödemelerinizi yönetin">
            {activeSubscription?.status === "PAST_DUE" ? (
                <div className="col-span-12">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            <span>Ödemeniz başarısız oldu. Kart bilgilerinizi güncelleyerek aboneliğinizi aktif tutabilirsiniz.</span>
                        </div>
                        <Button
                            variant="danger"
                            size="sm"
                            className="gap-2"
                            onClick={handleUpdatePaymentMethod}
                        >
                            <CreditCard className="h-4 w-4" /> Kartı Güncelle
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="col-span-12">
                {isLoadingState ? (
                    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : isError ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <AlertCircle className="h-6 w-6" />
                        <p>Abonelik bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
                        {error?.message ? <p className="text-xs">Hata ayrıntısı: {error.message}</p> : null}
                    </div>
                ) : !customerId && !isAuthLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                        Abonelik bilgisi için müşteri kimliği bulunamadı.
                    </div>
                ) : !activeSubscription ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                        Herhangi bir abonelik bulunamadı.
                    </div>
                ) : (
                    <CurrentPlanCard
                        subscription={activeSubscription}
                        onChangePlan={handleChangePlan}
                        onUpdateSeats={handleUpdateSeats}
                        onCancel={handleCancelSubscription}
                    />
                )}
            </div>

            {subscriptions && subscriptions.length > 1 ? (
                <div className="col-span-12">
                    <Card className="border border-slate-200 p-0 shadow-sm">
                        <CardHeader className="border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-900">
                            Diğer Abonelikler
                        </CardHeader>
                        <CardContent className="px-6 py-4">
                            <ul className="space-y-3 text-sm text-slate-600">
                                {subscriptions
                                    .filter((item) => item.id !== activeSubscription?.id)
                                    .map((item) => (
                                        <li key={item.id} className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-medium text-slate-800">{item.planId}</p>
                                                <p className="text-xs text-slate-500">Sonraki yenileme: {formatDate(item.currentPeriodEnd)}</p>
                                            </div>
                                            <SubscriptionStatusBadge status={item.status} />
                                        </li>
                                    ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            ) : null}
        </Layout>
    );
}
