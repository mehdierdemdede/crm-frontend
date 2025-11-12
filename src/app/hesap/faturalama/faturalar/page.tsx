"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { getCustomerInvoices } from "@/lib/api";
import type { Invoice } from "@/lib/types";

const STATUS_CONFIG: Record<Invoice["status"], { label: string; className: string }> = {
    DRAFT: {
        label: "Taslak",
        className: "bg-slate-200 text-slate-700",
    },
    OPEN: {
        label: "Açık",
        className: "bg-amber-100 text-amber-700",
    },
    PAST_DUE: {
        label: "Gecikmiş",
        className: "bg-red-100 text-red-700",
    },
    PAID: {
        label: "Ödendi",
        className: "bg-emerald-100 text-emerald-700",
    },
    VOID: {
        label: "İptal",
        className: "bg-gray-200 text-gray-600",
    },
    UNCOLLECTIBLE: {
        label: "Tahsil Edilemez",
        className: "bg-orange-100 text-orange-700",
    },
};

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        minimumFractionDigits: 2,
    }).format(value / 100);

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
    }).format(date);
};

const formatDateRange = (invoice: Invoice) => {
    if (invoice.periodStart && invoice.periodEnd) {
        return `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`;
    }

    return formatDate(invoice.issuedAt);
};

function StatusBadge({ status }: { status: Invoice["status"] }) {
    const config = STATUS_CONFIG[status];

    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config?.className ?? "bg-slate-200 text-slate-700"}`}
        >
            <span className="mr-1 h-2 w-2 rounded-full bg-current" />
            {config?.label ?? status}
        </span>
    );
}

export default function InvoicesPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const customerId = user?.organizationId;

    const {
        data: invoices,
        isLoading,
        isError,
        error,
    } = useQuery<Invoice[], Error>({
        queryKey: ["customer-invoices", customerId],
        queryFn: async () => {
            if (!customerId) {
                throw new Error("Müşteri bilgisi bulunamadı");
            }

            return getCustomerInvoices(customerId);
        },
        enabled: Boolean(customerId),
        staleTime: 1000 * 60,
    });

    const chartData = useMemo(() => {
        const months: { key: string; label: string; total: number }[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i -= 1) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            months.push({
                key,
                label: new Intl.DateTimeFormat("tr-TR", {
                    month: "short",
                    year: "numeric",
                }).format(date),
                total: 0,
            });
        }

        if (!Array.isArray(invoices)) {
            return months;
        }

        invoices.forEach((invoice) => {
            const referenceDate = invoice.periodEnd ?? invoice.issuedAt;
            const date = new Date(referenceDate);
            if (Number.isNaN(date.getTime())) {
                return;
            }

            const key = `${date.getFullYear()}-${date.getMonth()}`;
            const bucket = months.find((item) => item.key === key);
            if (bucket) {
                bucket.total += invoice.amountDue;
            }
        });

        return months;
    }, [invoices]);

    const renderContent = () => {
        if (isAuthLoading || (isLoading && Boolean(customerId))) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Faturalar yükleniyor…</span>
                </div>
            );
        }

        if (isError) {
            return (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error?.message ?? "Faturalar alınırken bir hata oluştu."}</span>
                </div>
            );
        }

        if (!invoices || invoices.length === 0) {
            return (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Henüz oluşturulmuş bir faturanız bulunmuyor.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Dönem</th>
                            <th className="px-4 py-3">Durum</th>
                            <th className="px-4 py-3 text-right">Toplam</th>
                            <th className="px-4 py-3 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                        {invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-slate-50">
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                    {formatDateRange(invoice)}
                                </td>
                                <td className="px-4 py-4">
                                    <StatusBadge status={invoice.status} />
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-slate-900">
                                    {formatCurrency(invoice.amountDue, invoice.currency)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <Link
                                        href={`/hesap/faturalama/faturalar/${invoice.id}`}
                                        className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Görüntüle
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <Layout title="Faturalar" subtitle="Fatura geçmişinizi inceleyin ve detaylara ulaşın">
            <div className="col-span-12 space-y-6">
                <Card>
                    <CardHeader>Aylık harcama trendi</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="invoiceSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={8} />
                                <YAxis
                                    tickFormatter={(value: number) =>
                                        new Intl.NumberFormat("tr-TR", {
                                            notation: "compact",
                                            maximumFractionDigits: 1,
                                        }).format(value / 100)
                                    }
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    formatter={(value: number) => [
                                        formatCurrency(value as number, invoices?.[0]?.currency ?? "TRY"),
                                        "Toplam",
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    fill="url(#invoiceSpend)"
                                    name="Toplam"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>Fatura listesi</CardHeader>
                    <CardContent>{renderContent()}</CardContent>
                </Card>
            </div>
        </Layout>
    );
}
