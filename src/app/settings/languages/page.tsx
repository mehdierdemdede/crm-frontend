"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { LanguageFlagIcon } from "@/components/LanguageFlagIcon";
import { useLanguages } from "@/contexts/LanguageContext";
import { enhanceLanguageOption, type LanguageOption } from "@/lib/languages";
import {
    type LanguageCatalogEntry,
    searchLanguageCatalog,
} from "@/lib/api";

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
        error: contextError,
        clearError,
    } = useLanguages();

    const [form, setForm] = useState<LanguageFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<LanguageCatalogEntry[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchAbortController = useRef<AbortController | null>(null);
    const activeSearchId = useRef(0);
    const hideSuggestionsTimeout = useRef<number>();
    const skipNextSearch = useRef(false);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setFormError(null);
        setSuccessMessage(null);
        setSearchTerm("");
        setSearchResults([]);
        setSearchError(null);
        setShowSuggestions(false);
        if (hideSuggestionsTimeout.current) {
            window.clearTimeout(hideSuggestionsTimeout.current);
        }
        if (searchAbortController.current) {
            searchAbortController.current.abort();
            searchAbortController.current = null;
        }
        clearError();
    };

    const startEdit = (language: LanguageOption) => {
        clearError();
        setForm({
            code: language.value,
            name: language.label,
            flag: language.flag ?? "",
            active: language.active ?? true,
        });
        setEditingId(language.id ?? null);
        setFormError(null);
        setSuccessMessage(null);
        setSearchTerm(language.label);
        setSearchResults([]);
        setSearchError(null);
        setShowSuggestions(false);
    };

    useEffect(() => {
        const trimmed = searchTerm.trim();

        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            if (searchAbortController.current) {
                searchAbortController.current.abort();
                searchAbortController.current = null;
            }
            setSearching(false);
            return;
        }

        if (trimmed.length < 2) {
            if (searchAbortController.current) {
                searchAbortController.current.abort();
                searchAbortController.current = null;
            }
            activeSearchId.current += 1;
            setSearching(false);
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        const controller = new AbortController();
        searchAbortController.current = controller;
        const searchId = activeSearchId.current + 1;
        activeSearchId.current = searchId;

        const timeoutId = window.setTimeout(() => {
            setSearching(true);
            searchLanguageCatalog(trimmed, controller.signal)
                .then((results) => {
                    if (activeSearchId.current !== searchId) return;
                    setSearchResults(results);
                    setSearchError(null);
                })
                .catch((error) => {
                    if (error instanceof DOMException && error.name === "AbortError") {
                        return;
                    }
                    if (activeSearchId.current !== searchId) return;
                    setSearchResults([]);
                    setSearchError(
                        error instanceof Error
                            ? error.message
                            : "Dil kataloğu aranırken bir hata oluştu.",
                    );
                })
                .finally(() => {
                    if (activeSearchId.current !== searchId) return;
                    setSearching(false);
                    searchAbortController.current = null;
                });
        }, 300);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
            if (searchAbortController.current === controller) {
                searchAbortController.current = null;
            }
        };
    }, [searchTerm]);

    useEffect(() => {
        return () => {
            if (searchAbortController.current) {
                searchAbortController.current.abort();
                searchAbortController.current = null;
            }
            if (hideSuggestionsTimeout.current) {
                window.clearTimeout(hideSuggestionsTimeout.current);
            }
        };
    }, []);

    const handleDelete = async (language: LanguageOption) => {
        if (!language.id) return;
        const confirmed = window.confirm(
            `${language.label} dilini silmek istediğinize emin misiniz?`
        );
        if (!confirmed) return;
        try {
            clearError();
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

    const handleSearchChange = (value: string) => {
        if (hideSuggestionsTimeout.current) {
            window.clearTimeout(hideSuggestionsTimeout.current);
        }
        setSearchTerm(value);
        setShowSuggestions(true);
    };

    const handleSearchFocus = () => {
        if (hideSuggestionsTimeout.current) {
            window.clearTimeout(hideSuggestionsTimeout.current);
        }
        setShowSuggestions(true);
    };

    const handleSearchBlur = () => {
        if (hideSuggestionsTimeout.current) {
            window.clearTimeout(hideSuggestionsTimeout.current);
        }
        hideSuggestionsTimeout.current = window.setTimeout(() => {
            setShowSuggestions(false);
        }, 150);
    };

    const handleSuggestionSelect = (entry: LanguageCatalogEntry) => {
        if (hideSuggestionsTimeout.current) {
            window.clearTimeout(hideSuggestionsTimeout.current);
        }
        skipNextSearch.current = true;
        if (searchAbortController.current) {
            searchAbortController.current.abort();
            searchAbortController.current = null;
        }
        activeSearchId.current += 1;
        setForm((prev) => ({
            ...prev,
            code: entry.code.toUpperCase(),
            name: entry.name,
            flag: entry.flagEmoji ?? "",
        }));
        setSearchTerm(entry.name);
        setSearchResults([]);
        setSearchError(null);
        setShowSuggestions(false);
        setFormError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        setSuccessMessage(null);
        clearError();

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
            const normalisedPayload = {
                code,
                name,
                flagEmoji: flagEmoji || null,
                active,
            };
            if (editingId) {
                await updateLanguage(editingId, normalisedPayload);
                setSuccessMessage("Dil bilgisi güncellendi.");
            } else {
                const created = await addLanguage(normalisedPayload);
                setSuccessMessage(
                    created?.id
                        ? "Yeni dil başarıyla eklendi."
                        : "Yeni dil yerel olarak eklendi. Kalıcı olması için lütfen backend üzerinde tanımlayın."
                );
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

    const suggestionsVisible =
        showSuggestions &&
        searchTerm.trim().length >= 2 &&
        (searching || searchResults.length > 0 || searchError !== null);

    return (
        <Layout title="Dil Yönetimi" subtitle="Kullanılabilir dil seçeneklerini yönetin">
            {contextError && (
                <div className="col-span-12">
                    <div className="mb-4 flex items-start justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <span>{contextError}</span>
                        <button
                            type="button"
                            onClick={clearError}
                            className="text-xs font-semibold uppercase tracking-wide text-red-700"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
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
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-800">
                                    Dil Ara ve Seç
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(event) =>
                                            handleSearchChange(event.target.value)
                                        }
                                        onFocus={handleSearchFocus}
                                        onBlur={handleSearchBlur}
                                        placeholder="Örn. İngilizce"
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
                                        autoComplete="off"
                                    />
                                    {searching && (
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                            Aranıyor...
                                        </span>
                                    )}
                                    {suggestionsVisible && (
                                        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                            {searchError ? (
                                                <div className="px-3 py-2 text-sm text-red-600">
                                                    {searchError}
                                                </div>
                                            ) : searchResults.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-gray-500">
                                                    Sonuç bulunamadı.
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-gray-100">
                                                    {searchResults.map((entry) => {
                                                        const option = enhanceLanguageOption({
                                                            value: entry.code.toUpperCase(),
                                                            label: entry.name,
                                                            flag: entry.flagEmoji ?? undefined,
                                                        });
                                                        return (
                                                            <li key={`${entry.code}-${entry.name}`}>
                                                                <button
                                                                    type="button"
                                                                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
                                                                    onMouseDown={(event) => {
                                                                        event.preventDefault();
                                                                        handleSuggestionSelect(entry);
                                                                    }}
                                                                >
                                                                    <LanguageFlagIcon option={option} size={18} />
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">
                                                                            {entry.name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {entry.code.toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    En az 2 harf yazarak API kataloğundaki dilleri arayabilir ve
                                    seçim yaparak formu doldurabilirsiniz.
                                </p>
                            </div>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    clearError();
                                    void refresh();
                                }}
                                disabled={loading}
                            >
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
                                                <td className="px-3 py-2 text-lg">
                                                    <LanguageFlagIcon
                                                        option={enhanceLanguageOption(language)}
                                                        size={18}
                                                    />
                                                </td>
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
