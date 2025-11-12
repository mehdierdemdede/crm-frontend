"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Input } from "@/components/Input";
import Layout from "@/components/Layout";
import {
    createHotel,
    deleteHotel,
    getHotels,
    updateHotel,
    type Hotel,
} from "@/lib/api";

const currencyOptions = ["EUR", "USD", "TRY", "GBP"] as const;
type CurrencyOption = (typeof currencyOptions)[number];

interface HotelFormState {
    name: string;
    starRating: number | "";
    nightlyRate: number | "";
    currency: CurrencyOption;
    address: string;
}

const defaultCurrency: CurrencyOption = "EUR";

const createEmptyForm = (): HotelFormState => ({
    name: "",
    starRating: "",
    nightlyRate: "",
    currency: defaultCurrency,
    address: "",
});

const sortHotels = (hotels: Hotel[]): Hotel[] =>
    [...hotels].sort((a, b) => {
        const nameA = (a.name ?? "").toLocaleLowerCase("tr");
        const nameB = (b.name ?? "").toLocaleLowerCase("tr");
        return nameA.localeCompare(nameB);
    });

export default function HotelsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<HotelFormState>(createEmptyForm());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const idPrefix = useId();
    const currencySelectId = `${idPrefix}-currency`;
    const addressTextareaId = `${idPrefix}-address`;

    const fetchHotels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getHotels();
            setHotels(sortHotels(data));
        } catch (err) {
            console.error(err);
            setError("Oteller yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchHotels();
    }, [fetchHotels]);

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

    const startEdit = (hotel: Hotel) => {
        setEditingId(hotel.id);
        setForm({
            name: hotel.name ?? "",
            starRating:
                typeof hotel.starRating === "number" && !Number.isNaN(hotel.starRating)
                    ? hotel.starRating
                    : "",
            nightlyRate:
                typeof hotel.nightlyRate === "number" && !Number.isNaN(hotel.nightlyRate)
                    ? hotel.nightlyRate
                    : "",
            currency: resolveCurrency(hotel.currency as string | null | undefined),
            address: hotel.address ?? "",
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
        const trimmedName = form.name.trim();
        const starRatingValue =
            form.starRating === "" ? null : Number.parseInt(String(form.starRating), 10);
        const nightlyRateValue =
            form.nightlyRate === "" ? null : Number.parseFloat(String(form.nightlyRate));
        const trimmedAddress = form.address.trim();

        if (!trimmedName) {
            setError("Lütfen otel adı girin.");
            return;
        }
        if (
            starRatingValue === null ||
            Number.isNaN(starRatingValue) ||
            starRatingValue < 1 ||
            starRatingValue > 5
        ) {
            setError("Yıldız sayısı 1 ile 5 arasında olmalıdır.");
            return;
        }
        if (
            nightlyRateValue === null ||
            Number.isNaN(nightlyRateValue) ||
            nightlyRateValue <= 0
        ) {
            setError("Gecelik ücreti 0'dan büyük bir değer olmalıdır.");
            return;
        }
        if (!trimmedAddress) {
            setError("Lütfen otel adresi girin.");
            return;
        }

        const payload = {
            name: trimmedName,
            starRating: starRatingValue,
            nightlyRate: nightlyRateValue,
            currency: form.currency,
            address: trimmedAddress,
        };

        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                const updated = await updateHotel(editingId, payload);
                if (!updated) {
                    throw new Error("Otel güncellenemedi.");
                }
                setHotels((prev) =>
                    sortHotels(
                        prev.map((item) => (item.id === editingId ? { ...item, ...updated } : item)),
                    ),
                );
                setSuccess("Otel bilgileri güncellendi.");
            } else {
                const created = await createHotel(payload);
                if (!created) {
                    throw new Error("Otel oluşturulamadı.");
                }
                setHotels((prev) => sortHotels([...prev, created]));
                setSuccess("Yeni otel oluşturuldu.");
            }
            setForm(createEmptyForm());
            setEditingId(null);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error ? err.message : "İşlem sırasında beklenmeyen bir hata oluştu.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (hotel: Hotel) => {
        if (!hotel.id) return;
        const confirmed = window.confirm(
            `${hotel.name ?? "Bu oteli"} silmek istediğinize emin misiniz?`,
        );
        if (!confirmed) return;

        setError(null);
        setSuccess(null);
        try {
            const deleted = await deleteHotel(hotel.id);
            if (!deleted) {
                throw new Error("Otel silinemedi.");
            }
            setHotels((prev) => prev.filter((item) => item.id !== hotel.id));
            setSuccess("Otel silindi.");
            if (editingId === hotel.id) {
                cancelEdit();
            }
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error ? err.message : "Otel silme işleminde bir sorun oluştu.",
            );
        }
    };

    const sortedHotels = useMemo(() => sortHotels(hotels), [hotels]);

    const formatNightlyRate = (hotel: Hotel): string => {
        const rate =
            typeof hotel.nightlyRate === "number" && !Number.isNaN(hotel.nightlyRate)
                ? hotel.nightlyRate
                : null;
        if (rate === null) return "-";
        const currency = (hotel.currency as string | null | undefined) ?? defaultCurrency;
        try {
            return new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
            }).format(rate);
        } catch (error) {
            console.warn("Currency format error", error);
            return `${rate} ${currency}`;
        }
    };

    const formatStarRating = (hotel: Hotel): string => {
        const rating =
            typeof hotel.starRating === "number" && !Number.isNaN(hotel.starRating)
                ? hotel.starRating
                : null;
        if (!rating) return "-";
        return `${"★".repeat(Math.max(1, Math.min(5, Math.round(rating))))}`;
    };

    return (
        <Layout
            title="Otel Yönetimi"
            subtitle="Operasyon ekibiniz için kullanılan otel listesini yönetin"
        >
            <div className="col-span-12 space-y-6">
                <Card>
                    <CardHeader className="font-semibold">Otel Bilgileri</CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <Input
                                    label="Otel Adı"
                                    placeholder="Örn. Panorama Resort"
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    disabled={saving}
                                />
                                <Input
                                    label="Yıldız Sayısı"
                                    type="number"
                                    min={1}
                                    max={5}
                                    placeholder="Örn. 5"
                                    value={form.starRating}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            starRating:
                                                event.target.value === ""
                                                    ? ""
                                                    : Number(event.target.value),
                                        }))
                                    }
                                    disabled={saving}
                                />
                                <div className="grid gap-2 sm:grid-cols-[2fr,1fr] sm:items-end">
                                    <Input
                                        label="Gecelik Ücreti"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="Örn. 120"
                                        value={form.nightlyRate}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                nightlyRate:
                                                    event.target.value === ""
                                                        ? ""
                                                        : Number(event.target.value),
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                    <div>
                                        <label
                                            className="mb-1 block text-sm font-medium text-gray-800"
                                            htmlFor={currencySelectId}
                                        >
                                            Para Birimi
                                        </label>
                                        <select
                                            id={currencySelectId}
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
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label
                                    className="mb-1 block text-sm font-medium text-gray-800"
                                    htmlFor={addressTextareaId}
                                >
                                    Adres
                                </label>
                                <textarea
                                    id={addressTextareaId}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Örn. Atatürk Cad. No:12, Antalya"
                                    value={form.address}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            address: event.target.value,
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                            {error && (
                                <div
                                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                                    aria-live="polite"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div
                                    className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                                    aria-live="polite"
                                    role="status"
                                >
                                    {success}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" isLoading={saving}>
                                    {editingId ? "Otel Güncelle" : "Yeni Otel Ekle"}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                        İptal Et
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void fetchHotels()}
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
                        <span>Tanımlı Oteller</span>
                        <span className="text-sm font-normal text-gray-500">
                            {loading ? "Yükleniyor..." : `${sortedHotels.length} kayıt`}
                        </span>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-10 text-center text-gray-500">Veriler yükleniyor...</div>
                        ) : sortedHotels.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">
                                Henüz kayıtlı otel bulunmuyor. Yeni bir otel ekleyin.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                            <th className="px-3 py-2">Otel Adı</th>
                                            <th className="px-3 py-2">Yıldız</th>
                                            <th className="px-3 py-2">Gecelik Ücret</th>
                                            <th className="px-3 py-2">Adres</th>
                                            <th className="px-3 py-2 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedHotels.map((hotel) => (
                                            <tr key={hotel.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-900">{hotel.name ?? "-"}</td>
                                                <td className="px-3 py-2 text-gray-900">{formatStarRating(hotel)}</td>
                                                <td className="px-3 py-2 text-gray-900">{formatNightlyRate(hotel)}</td>
                                                <td className="px-3 py-2 text-gray-700">
                                                    {hotel.address ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => startEdit(hotel)}
                                                        >
                                                            Düzenle
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => void handleDelete(hotel)}
                                                        >
                                                            Sil
                                                        </Button>
                                                    </div>
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
