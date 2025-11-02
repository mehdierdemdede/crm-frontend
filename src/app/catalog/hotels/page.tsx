"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    createHotel,
    deleteHotel,
    getHotels,
    updateHotel,
    type Hotel,
} from "@/lib/api";

interface HotelFormState {
    name: string;
}

const emptyForm: HotelFormState = {
    name: "",
};

const sortHotels = (hotels: Hotel[]): Hotel[] =>
    [...hotels].sort((a, b) => {
        const nameA = (a.name ?? "").toLocaleLowerCase("tr");
        const nameB = (b.name ?? "").toLocaleLowerCase("tr");
        return nameA.localeCompare(nameB);
    });

export default function HotelsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<HotelFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

    const startEdit = (hotel: Hotel) => {
        setEditingId(hotel.id);
        setForm({ name: hotel.name ?? "" });
        setError(null);
        setSuccess(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = form.name.trim();
        if (!trimmedName) {
            setError("Lütfen otel adı girin.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                const updated = await updateHotel(editingId, { name: trimmedName });
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
                const created = await createHotel({ name: trimmedName });
                if (!created) {
                    throw new Error("Otel oluşturulamadı.");
                }
                setHotels((prev) => sortHotels([...prev, created]));
                setSuccess("Yeni otel oluşturuldu.");
            }
            setForm(emptyForm);
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
                            <Input
                                label="Otel Adı"
                                placeholder="Örn. Panorama Resort"
                                value={form.name}
                                onChange={(event) => setForm({ name: event.target.value })}
                                disabled={saving}
                            />
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
                                            <th className="px-3 py-2 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedHotels.map((hotel) => (
                                            <tr key={hotel.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-900">{hotel.name ?? "-"}</td>
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
