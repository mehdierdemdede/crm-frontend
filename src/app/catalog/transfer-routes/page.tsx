"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    createTransferRoute,
    deleteTransferRoute,
    getTransferRoutes,
    updateTransferRoute,
    type TransferRoute,
} from "@/lib/api";

const currencyOptions = ["EUR", "USD", "TRY", "GBP"] as const;
type CurrencyOption = (typeof currencyOptions)[number];

interface TransferFormState {
    start: string;
    stops: string[];
    final: string;
    price: number | "";
    currency: CurrencyOption;
}

const defaultCurrency: CurrencyOption = "EUR";
const maxStops = 3;

const createEmptyForm = (): TransferFormState => ({
    start: "",
    stops: [],
    final: "",
    price: "",
    currency: defaultCurrency,
});

const splitNameIntoSegments = (name?: string | null): string[] =>
    (name ?? "")
        .split(/[→>-]/)
        .map((segment) => segment.replace(/^-|-$|>/g, "").trim())
        .filter(Boolean);

const getRouteSegments = (route: TransferRoute): string[] => {
    const segments: string[] = [];
    if (route.start) segments.push(route.start);
    const stops = Array.isArray(route.stops)
        ? route.stops.filter((stop) => !!stop && stop.trim() !== "")
        : [];
    segments.push(...stops);
    if (route.final) segments.push(route.final);
    if (segments.length === 0) {
        return splitNameIntoSegments(route.name);
    }
    return segments;
};

const composeRouteLabel = (route: TransferRoute): string => {
    const segments = getRouteSegments(route);
    if (segments.length === 0) return route.name ?? "";
    return segments.join(" → ");
};

const sortRoutes = (routes: TransferRoute[]): TransferRoute[] =>
    [...routes].sort((a, b) => {
        const labelA = composeRouteLabel(a).toLocaleLowerCase("tr");
        const labelB = composeRouteLabel(b).toLocaleLowerCase("tr");
        return labelA.localeCompare(labelB);
    });

export default function TransferRoutesPage() {
    const [routes, setRoutes] = useState<TransferRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<TransferFormState>(createEmptyForm());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getTransferRoutes();
            setRoutes(sortRoutes(data));
        } catch (err) {
            console.error(err);
            setError("Transfer rotaları yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchRoutes();
    }, [fetchRoutes]);

    useEffect(() => {
        if (!success) return;
        const timeout = window.setTimeout(() => setSuccess(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [success]);

    const resolveCurrency = (currency: string | null | undefined): CurrencyOption => {
        if (!currency) return defaultCurrency;
        return currencyOptions.includes(currency as CurrencyOption)
            ? (currency as CurrencyOption)
            : defaultCurrency;
    };

    const startEdit = (route: TransferRoute) => {
        setEditingId(route.id);
        const segments = getRouteSegments(route);
        const start = route.start ?? segments[0] ?? "";
        const final = route.final ?? (segments.length > 0 ? segments[segments.length - 1] : "");
        const stops = Array.isArray(route.stops) && route.stops.length > 0
            ? route.stops.filter((stop) => stop && stop.trim() !== "")
            : segments.slice(1, -1);
        setForm({
            start,
            stops,
            final,
            price:
                typeof route.price === "number" && !Number.isNaN(route.price)
                    ? route.price
                    : "",
            currency: resolveCurrency(route.currency as string | null | undefined),
        });
        setError(null);
        setSuccess(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(createEmptyForm());
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedStart = form.start.trim();
        const trimmedFinal = form.final.trim();
        const trimmedStops = form.stops
            .map((stop) => stop.trim())
            .filter((stop) => stop.length > 0);
        const priceValue = form.price === "" ? null : Number.parseFloat(String(form.price));

        if (!trimmedStart) {
            setError("Lütfen başlangıç noktasını girin.");
            return;
        }
        if (!trimmedFinal) {
            setError("Lütfen final noktasını girin.");
            return;
        }
        if (priceValue === null || Number.isNaN(priceValue) || priceValue <= 0) {
            setError("Fiyat 0'dan büyük olmalıdır.");
            return;
        }

        const composedName = [trimmedStart, ...trimmedStops, trimmedFinal].join(" → ");

        const payload = {
            start: trimmedStart,
            stops: trimmedStops,
            final: trimmedFinal,
            price: priceValue,
            currency: form.currency,
            name: composedName,
        };

        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                const updated = await updateTransferRoute(editingId, payload);
                if (!updated) {
                    throw new Error("Transfer rotası güncellenemedi.");
                }
                setRoutes((prev) =>
                    sortRoutes(
                        prev.map((item) => (item.id === editingId ? { ...item, ...updated } : item)),
                    ),
                );
                setSuccess("Transfer rotası güncellendi.");
            } else {
                const created = await createTransferRoute(payload);
                if (!created) {
                    throw new Error("Transfer rotası oluşturulamadı.");
                }
                setRoutes((prev) => sortRoutes([...prev, created]));
                setSuccess("Yeni transfer rotası eklendi.");
            }
            setForm(createEmptyForm());
            setEditingId(null);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "İşlem sırasında beklenmeyen bir hata oluştu.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (route: TransferRoute) => {
        if (!route.id) return;
        const confirmed = window.confirm(
            `${route.name ?? "Bu transfer rotasını"} silmek istediğinize emin misiniz?`,
        );
        if (!confirmed) return;

        setError(null);
        setSuccess(null);
        try {
            const deleted = await deleteTransferRoute(route.id);
            if (!deleted) {
                throw new Error("Transfer rotası silinemedi.");
            }
            setRoutes((prev) => prev.filter((item) => item.id !== route.id));
            setSuccess("Transfer rotası silindi.");
            if (editingId === route.id) {
                cancelEdit();
            }
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Transfer rotası silme işleminde bir sorun oluştu.",
            );
        }
    };

    const sortedRoutes = useMemo(() => sortRoutes(routes), [routes]);

    const formatPrice = (route: TransferRoute): string => {
        const price =
            typeof route.price === "number" && !Number.isNaN(route.price)
                ? route.price
                : null;
        if (price === null) return "-";
        const currency = (route.currency as string | null | undefined) ?? defaultCurrency;
        try {
            return new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
            }).format(price);
        } catch (error) {
            console.warn("Currency format error", error);
            return `${price} ${currency}`;
        }
    };

    const getStopsForDisplay = (route: TransferRoute): string[] => {
        const stops = Array.isArray(route.stops)
            ? route.stops.filter((stop) => !!stop && stop.trim() !== "")
            : [];
        if (stops.length > 0) return stops.slice(0, maxStops);
        const segments = getRouteSegments(route);
        return segments.slice(1, -1).slice(0, maxStops);
    };

    return (
        <Layout
            title="Transfer Rotaları"
            subtitle="Hasta transfer operasyonları için kullanılan güzergahları yönetin"
        >
            <div className="col-span-12 space-y-6">
                <Card>
                    <CardHeader className="font-semibold">Transfer Bilgileri</CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <Input
                                    label="Başlangıç"
                                    placeholder="Örn. Havalimanı"
                                    value={form.start}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, start: event.target.value }))
                                    }
                                    disabled={saving}
                                />
                                <Input
                                    label="Final"
                                    placeholder="Örn. Otel"
                                    value={form.final}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, final: event.target.value }))
                                    }
                                    disabled={saving}
                                />
                                <div className="grid gap-2 sm:grid-cols-[2fr,1fr] sm:items-end">
                                    <Input
                                        label="Fiyat"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="Örn. 100"
                                        value={form.price}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                price:
                                                    event.target.value === ""
                                                        ? ""
                                                        : Number(event.target.value),
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                    <label className="block">
                                        <span className="mb-1 block text-sm font-medium text-gray-800">
                                            Para Birimi
                                        </span>
                                        <select
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                                            value={form.currency}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    currency: event.target.value as CurrencyOption,
                                                }))
                                            }
                                            disabled={saving}
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option key={currency} value={currency}>
                                                    {currency}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-800">
                                        Duraklar (isteğe bağlı)
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setForm((prev) =>
                                                prev.stops.length >= maxStops
                                                    ? prev
                                                    : {
                                                          ...prev,
                                                          stops: [...prev.stops, ""],
                                                      },
                                            )
                                        }
                                        disabled={saving || form.stops.length >= maxStops}
                                    >
                                        Durak Ekle
                                    </Button>
                                </div>
                                {form.stops.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        Rotaya durak eklemek için Durak Ekle butonunu kullanın.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {form.stops.map((stop, index) => (
                                            <div
                                                key={`stop-${index}`}
                                                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                                            >
                                                <Input
                                                    label={`${index + 1}. Durak`}
                                                    placeholder="Örn. Klinik"
                                                    value={stop}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            stops: prev.stops.map((item, idx) =>
                                                                idx === index ? event.target.value : item,
                                                            ),
                                                        }))
                                                    }
                                                    disabled={saving}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            stops: prev.stops.filter((_, idx) => idx !== index),
                                                        }))
                                                    }
                                                    disabled={saving}
                                                >
                                                    Kaldır
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                    {success}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" isLoading={saving}>
                                    {editingId ? "Transfer Güncelle" : "Yeni Transfer Ekle"}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                        İptal Et
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void fetchRoutes()}
                                    disabled={loading || saving}
                                >
                                    Yenile
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center justify-between font-semibold">
                        <span>Kayıtlı Transferler</span>
                        <span className="text-sm font-normal text-gray-500">
                            {loading ? "Yükleniyor..." : `${sortedRoutes.length} kayıt`}
                        </span>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-10 text-center text-gray-500">Veriler yükleniyor...</div>
                        ) : sortedRoutes.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">
                                Henüz transfer rotası bulunmuyor. Yeni bir kayıt ekleyin.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                            <th className="px-3 py-2">Başlangıç</th>
                                            <th className="px-3 py-2">1. Durak</th>
                                            <th className="px-3 py-2">2. Durak</th>
                                            <th className="px-3 py-2">3. Durak</th>
                                            <th className="px-3 py-2">Final</th>
                                            <th className="px-3 py-2">Fiyat</th>
                                            <th className="px-3 py-2 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRoutes.map((route) => {
                                            const segments = getRouteSegments(route);
                                            const startLabel = route.start ?? segments[0] ?? "-";
                                            const stopsForDisplay = getStopsForDisplay(route);
                                            const finalLabel =
                                                route.final ??
                                                (segments.length > 0
                                                    ? segments[segments.length - 1]
                                                    : "-");

                                            return (
                                                <tr
                                                    key={route.id}
                                                    className="border-b last:border-0 hover:bg-gray-50"
                                                >
                                                    <td className="px-3 py-2 text-gray-900">{startLabel}</td>
                                                    {Array.from({ length: maxStops }).map((_, index) => (
                                                        <td
                                                            key={`stop-${route.id}-${index}`}
                                                            className="px-3 py-2 text-gray-700"
                                                        >
                                                            {stopsForDisplay[index] ?? "-"}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-gray-900">{finalLabel}</td>
                                                    <td className="px-3 py-2 text-gray-900">
                                                        {formatPrice(route)}
                                                    </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => startEdit(route)}
                                                        >
                                                            Düzenle
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => void handleDelete(route)}
                                                        >
                                                            Sil
                                                        </Button>
                                                    </div>
                                                </td>
                                                </tr>
                                            );
                                        })}
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
