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

interface TransferFormState {
    name: string;
}

const emptyForm: TransferFormState = {
    name: "",
};

const sortRoutes = (routes: TransferRoute[]): TransferRoute[] =>
    [...routes].sort((a, b) => {
        const nameA = (a.name ?? "").toLocaleLowerCase("tr");
        const nameB = (b.name ?? "").toLocaleLowerCase("tr");
        return nameA.localeCompare(nameB);
    });

export default function TransferRoutesPage() {
    const [routes, setRoutes] = useState<TransferRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<TransferFormState>(emptyForm);
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

    const startEdit = (route: TransferRoute) => {
        setEditingId(route.id);
        setForm({ name: route.name ?? "" });
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
            setError("Lütfen transfer adı girin.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                const updated = await updateTransferRoute(editingId, { name: trimmedName });
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
                const created = await createTransferRoute({ name: trimmedName });
                if (!created) {
                    throw new Error("Transfer rotası oluşturulamadı.");
                }
                setRoutes((prev) => sortRoutes([...prev, created]));
                setSuccess("Yeni transfer rotası eklendi.");
            }
            setForm(emptyForm);
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
                            <Input
                                label="Transfer Adı"
                                placeholder="Örn. Havalimanı → Klinik"
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
                                            <th className="px-3 py-2">Transfer Adı</th>
                                            <th className="px-3 py-2 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRoutes.map((route) => (
                                            <tr key={route.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-900">{route.name ?? "-"}</td>
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
