"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { ArrowLeft, Download, FileText, Loader2, Receipt, Tag } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Layout from "@/components/Layout";
import { getInvoiceById } from "@/lib/api";
import type { InvoiceDetail, InvoiceLineItem } from "@/lib/types";

const STATUS_LABELS: Record<InvoiceDetail["status"], string> = {
    DRAFT: "Taslak",
    OPEN: "Açık",
    PAST_DUE: "Gecikmiş",
    PAID: "Ödendi",
    VOID: "İptal",
    UNCOLLECTIBLE: "Tahsil Edilemez",
};

const STATUS_COLORS: Record<InvoiceDetail["status"], string> = {
    DRAFT: "bg-slate-200 text-slate-700",
    OPEN: "bg-amber-100 text-amber-700",
    PAST_DUE: "bg-red-100 text-red-700",
    PAID: "bg-emerald-100 text-emerald-700",
    VOID: "bg-gray-200 text-gray-600",
    UNCOLLECTIBLE: "bg-orange-100 text-orange-700",
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
        dateStyle: "long",
    }).format(date);
};

const formatPeriod = (invoice?: InvoiceDetail | null) => {
    if (!invoice) return "-";
    if (invoice.periodStart && invoice.periodEnd) {
        return `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`;
    }

    return formatDate(invoice.issuedAt);
};

const getLineItems = (invoice?: InvoiceDetail | null): InvoiceLineItem[] => {
    if (!invoice) return [];
    if (Array.isArray(invoice.lineItems)) {
        return invoice.lineItems;
    }

    return [];
};

export default function InvoiceDetailPage() {
    const params = useParams<{ invoiceId: string | string[] }>();
    const invoiceIdParam = params?.invoiceId;
    const invoiceId = Array.isArray(invoiceIdParam) ? invoiceIdParam[0] : invoiceIdParam;

    const {
        data: invoice,
        isLoading,
        isError,
        error,
    } = useQuery<InvoiceDetail, Error>({
        queryKey: ["invoice", invoiceId],
        queryFn: async () => {
            if (!invoiceId) {
                throw new Error("Fatura kimliği bulunamadı");
            }

            return getInvoiceById(invoiceId);
        },
        enabled: Boolean(invoiceId),
        staleTime: 1000 * 60,
    });

    const lineItems = useMemo(() => getLineItems(invoice), [invoice]);

    const handleDownloadPdf = useCallback(() => {
        if (!invoice) return;

        const document = new jsPDF({ unit: "mm", format: "a4" });
        const marginLeft = 20;
        let cursorY = 20;

        document.setFont("helvetica", "bold");
        document.setFontSize(18);
        document.text("FATURA", marginLeft, cursorY);

        // Logo alanı
        document.setDrawColor(180, 180, 180);
        document.rect(150, 15, 40, 20);
        document.setFontSize(8);
        document.setFont("helvetica", "normal");
        document.text("Şirket Logosu", 170, 27, { align: "center" });

        cursorY += 14;

        document.setFontSize(12);
        document.text(`Fatura ID: ${invoice.id}`, marginLeft, cursorY);
        cursorY += 6;
        document.text(`Müşteri: ${invoice.customerName ?? "Bilinmiyor"}`, marginLeft, cursorY);
        cursorY += 6;
        document.text(`Dönem: ${formatPeriod(invoice)}`, marginLeft, cursorY);
        cursorY += 6;
        document.text(`Durum: ${STATUS_LABELS[invoice.status] ?? invoice.status}`, marginLeft, cursorY);
        cursorY += 10;

        document.setFont("helvetica", "bold");
        document.text("Özet", marginLeft, cursorY);
        cursorY += 8;

        document.setFont("helvetica", "normal");
        document.text(`Toplam Tutar: ${formatCurrency(invoice.amountDue, invoice.currency)}`, marginLeft, cursorY);
        cursorY += 6;
        document.text(`Ödenen Tutar: ${formatCurrency(invoice.amountPaid, invoice.currency)}`, marginLeft, cursorY);
        cursorY += 10;

        document.setFont("helvetica", "bold");
        document.text("Kalemler", marginLeft, cursorY);
        cursorY += 8;

        document.setFont("helvetica", "bold");
        document.text("Açıklama", marginLeft, cursorY);
        document.text("Adet", 120, cursorY, { align: "right" });
        document.text("Tutar", 180, cursorY, { align: "right" });
        cursorY += 6;

        document.setFont("helvetica", "normal");

        if (lineItems.length === 0) {
            document.text("Bu faturada kalem bulunmamaktadır.", marginLeft, cursorY);
            cursorY += 6;
        } else {
            lineItems.forEach((item) => {
                if (cursorY > 260) {
                    document.addPage();
                    cursorY = 20;
                }

                document.text(item.description, marginLeft, cursorY, { maxWidth: 80 });
                document.text(
                    item.quantity != null ? String(item.quantity) : "-",
                    120,
                    cursorY,
                    { align: "right" },
                );
                document.text(
                    formatCurrency(item.total ?? 0, invoice.currency),
                    180,
                    cursorY,
                    { align: "right" },
                );
                cursorY += 6;
            });
        }

        document.save(`invoice-${invoice.id}.pdf`);
    }, [invoice, lineItems]);

    if (isLoading) {
        return (
            <Layout title="Fatura Detayı" subtitle="Fatura bilgileri yükleniyor">
                <div className="col-span-12 flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Yükleniyor…
                </div>
            </Layout>
        );
    }

    if (isError || !invoice) {
        return (
            <Layout title="Fatura Detayı" subtitle="Fatura bilgisi alınamadı">
                <div className="col-span-12">
                    <Card>
                        <CardContent className="flex items-center gap-3 text-sm text-red-700">
                            <FileText className="h-5 w-5" />
                            {error?.message ?? "Fatura detayları alınırken bir hata oluştu."}
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Fatura Detayı" subtitle={`Fatura #${invoice.id}`}>
            <div className="col-span-12 flex flex-wrap items-center justify-between gap-3">
                <Link
                    href="/hesap/faturalama/faturalar"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" /> Geri dön
                </Link>

                <Button onClick={handleDownloadPdf} className="gap-2">
                    <Download className="h-4 w-4" /> PDF İndir
                </Button>
            </div>

            <div className="col-span-12 grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <Receipt className="h-5 w-5 text-slate-500" /> Genel Bilgiler
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm text-slate-600">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Müşteri</dt>
                                <dd className="mt-1 text-base text-slate-900">
                                    {invoice.customerName ?? "Bilinmiyor"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dönem</dt>
                                <dd className="mt-1 text-base text-slate-900">{formatPeriod(invoice)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durum</dt>
                                <dd className="mt-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                            STATUS_COLORS[invoice.status]
                                        }`}
                                    >
                                        <span className="mr-1 h-2 w-2 rounded-full bg-current" />
                                        {STATUS_LABELS[invoice.status]}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <Tag className="h-5 w-5 text-slate-500" /> Özet
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                            <span>Toplam Tutar</span>
                            <span className="text-base font-semibold text-slate-900">
                                {formatCurrency(invoice.amountDue, invoice.currency)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Ödenen</span>
                            <span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                        </div>
                        {invoice.dueAt ? (
                            <div className="flex items-center justify-between text-slate-600">
                                <span>Son Ödeme Tarihi</span>
                                <span>{formatDate(invoice.dueAt)}</span>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-12">
                <Card>
                    <CardHeader className="text-base font-semibold text-slate-900">Kalemler</CardHeader>
                    <CardContent>
                        {lineItems.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                Bu faturaya ait kalem bilgisi bulunamadı.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3">Açıklama</th>
                                            <th className="px-4 py-3 text-right">Adet</th>
                                            <th className="px-4 py-3 text-right">Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {lineItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity ?? "-"}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(item.total ?? 0, invoice.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
