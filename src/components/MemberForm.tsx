"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";
import { DEFAULT_LANGUAGE_OPTIONS } from "@/lib/languages";
import { useLanguages } from "@/contexts/LanguageContext";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface MemberFormData {
    id?: string | number;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    supportedLanguages: string[];
    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
}

const defaultFormValues: MemberFormData = {
    firstName: "",
    lastName: "",
    email: "",
    role: "USER",
    supportedLanguages: [],
    dailyCapacity: 10,
    active: true,
    autoAssignEnabled: true,
};

const withDefaults = (data?: MemberFormData): MemberFormData => ({
    ...defaultFormValues,
    ...data,
    supportedLanguages: data?.supportedLanguages ? [...data.supportedLanguages] : [],
});

export default function MemberForm({
                                       initialData,
                                       onSubmit,
                                       onCancel,
                                       loading,
                                   }: {
    initialData?: MemberFormData;
    onSubmit: (data: MemberFormData) => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    const [form, setForm] = useState<MemberFormData>(withDefaults(initialData));
    const { languages, loading: languagesLoading } = useLanguages();

    const languageOptions = (languages.length > 0
        ? languages
        : DEFAULT_LANGUAGE_OPTIONS
    ).filter((option) => option.active ?? true);

    useEffect(() => {
        setForm(withDefaults(initialData));
    }, [initialData]);

    const toggleLang = (lang: string) => {
        setForm((prev) => ({
            ...prev,
            supportedLanguages: prev.supportedLanguages.includes(lang)
                ? prev.supportedLanguages.filter((l) => l !== lang)
                : [...prev.supportedLanguages, lang],
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ad</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Soyad</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Rol</label>
                    <select
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Diller</label>
                <p className="mt-1 text-xs text-gray-500">
                    Kullanıcının destekleyebileceği dilleri seçin.
                </p>
                {languagesLoading ? (
                    <div className="mt-3 text-sm text-gray-500">Diller yükleniyor...</div>
                ) : languageOptions.length === 0 ? (
                    <div className="mt-3 text-sm text-orange-600">
                        Henüz tanımlı dil bulunmuyor. Önce ayarlardan dil ekleyin.
                    </div>
                ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {languageOptions.map((option) => {
                            const isSelected = form.supportedLanguages.includes(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleLang(option.value)}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    <span className="text-base">{option.flag ?? "🏳️"}</span>
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Günlük Kapasite
                    </label>
                    <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        value={form.dailyCapacity}
                        onChange={(e) =>
                            setForm({ ...form, dailyCapacity: Number(e.target.value) })
                        }
                        required
                    />
                </div>
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            className="h-4 w-4"
                        />
                        Aktif
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={form.autoAssignEnabled}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    autoAssignEnabled: e.target.checked,
                                })
                            }
                            className="h-4 w-4"
                        />
                        Auto-Assign
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    İptal
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                    Kaydet
                </Button>
            </div>
        </form>
    );
}
