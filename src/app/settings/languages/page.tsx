"use client";

import { FormEvent, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useLanguages } from "@/contexts/LanguageContext";
import { type LanguageOption } from "@/lib/languages";

interface LanguageFormState {
    code: string;
    name: string;
    flag: string;
    active: boolean;
}

const emptyForm: LanguageFormState = {
    code: "",
    name: "",
    flag: "",
    active: true,
};

const normaliseFlag = (flag: string) => flag.trim() || "";

export default function LanguageSettingsPage() {
    const {
        languages,
        loading,
        addLanguage,
        updateLanguage,
        removeLanguage,
        refresh,
    } = useLanguages();

    const [form, setForm] = useState<LanguageFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setFormError(null);
        setSuccessMessage(null);
    };

    const startEdit = (language: LanguageOption) => {
        setForm({
            code: language.value,
            name: language.label,
            flag: language.flag ?? "",
            active: language.active ?? true,
        });
        setEditingId(language.id ?? null);
        setFormError(null);
        setSuccessMessage(null);
    };

    const handleDelete = async (language: LanguageOption) => {
        if (!language.id) return;
        const confirmed = window.confirm(
            `${language.label} dilini silmek istediğinize emin misiniz?`
        );
        if (!confirmed) return;
        try {
            setSubmitting(true);
            await removeLanguage(language.id);
            setSuccessMessage(`${language.label} silindi.`);
            if (editingId === language.id) {
                setForm(emptyForm);
                setEditingId(null);
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Dil silme işlemi başarısız oldu.";
            setFormError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        setSuccessMessage(null);

        const code = form.code.trim().toUpperCase();
        const name = form.name.trim();
        const flagEmoji = normaliseFlag(form.flag);
        const active = form.active;

        if (!code || !name) {
            setFormError("Dil kodu ve adı zorunludur.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = { code, name, flagEmoji: flagEmoji || undefined, active };
            if (editingId) {
                await updateLanguage(editingId, payload);
                setSuccessMessage("Dil bilgisi güncellendi.");
            } else {
                await addLanguage(payload);
                setSuccessMessage("Yeni dil başarıyla eklendi.");
            }
            setForm(emptyForm);
            setEditingId(null);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Dil kaydedilirken bir hata oluştu.";
            setFormError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title="Dil Yönetimi" subtitle="Kullanılabilir dil seçeneklerini yönetin">
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span className="font-semibold">
                            {editingId ? "Dili Güncelle" : "Yeni Dil Ekle"}
                        </span>
                        <Button variant="outline" size="sm" onClick={resetForm} disabled={submitting}>
                            Sıfırla
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                label="Dil Kodu"
                                value={form.code}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        code: event.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="Örn. EN"
                                maxLength={8}
                                required
                            />
                            <Input
                                label="Dil Adı"
                                value={form.name}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Örn. İngilizce"
                                required
                            />
                            <Input
                                label="Bayrak Emojisi"
                                value={form.flag}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        flag: event.target.value,
                                    }))
                                }
                                placeholder="Örn. 🇬🇧"
                                maxLength={8}
                            />
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            active: event.target.checked,
                                        }))
                                    }
                                />
                                Aktif
                            </label>
                            {formError && (
                                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                                    {formError}
                                </div>
                            )}
                            {successMessage && (
                                <div className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                                    {successMessage}
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                {editingId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        disabled={submitting}
                                    >
                                        Vazgeç
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={submitting}
                                    disabled={submitting}
                                >
                                    {editingId ? "Güncelle" : "Ekle"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-12 lg:col-span-8">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span className="font-semibold">Tanımlı Diller</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
                                Yenile
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-10 text-center text-gray-500">Diller yükleniyor...</div>
                        ) : languages.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">
                                Henüz sistemde tanımlı dil bulunmuyor.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                                            <th className="px-3 py-2">Kod</th>
                                            <th className="px-3 py-2">Ad</th>
                                            <th className="px-3 py-2">Bayrak</th>
                                            <th className="px-3 py-2">Durum</th>
                                            <th className="px-3 py-2 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {languages.map((language) => (
                                            <tr key={`${language.value}-${language.id ?? "default"}`} className="border-t">
                                                <td className="px-3 py-2 font-mono text-xs text-gray-600">
                                                    {language.value}
                                                </td>
                                                <td className="px-3 py-2">{language.label}</td>
                                                <td className="px-3 py-2 text-lg">{language.flag ?? "🏳️"}</td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                                            language.active !== false
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-200 text-gray-600"
                                                        }`}
                                                    >
                                                        {language.active !== false ? "Aktif" : "Pasif"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => startEdit(language)}
                                                            disabled={submitting}
                                                        >
                                                            Düzenle
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDelete(language)}
                                                            disabled={submitting || !language.id}
                                                        >
                                                            Sil
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-4 text-xs text-gray-500">
                                    ID&apos;si olmayan diller varsayılan değerlerdir ve yalnızca backend tarafında tanımlandığında kalıcı hale gelir.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
