"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface MemberFormData {
    id?: number;
    name: string;
    email: string;
    role: Role;
    langs: string[];
    capacityPerDay: number;
    active: boolean;
    autoAssign: boolean;
}

const ALL_LANGS = [
    { value: "TR", label: "Türkçe" },
    { value: "EN", label: "İngilizce" },
    { value: "DE", label: "Almanca" },
    { value: "AR", label: "Arapça" },
    { value: "AL", label: "Arnavutça" },
];

export default function MemberForm({
                                       initialData,
                                       onSubmit,
                                       onCancel,
                                   }: {
    initialData?: MemberFormData;
    onSubmit: (data: MemberFormData) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<MemberFormData>(
        initialData || {
            name: "",
            email: "",
            role: "USER",
            langs: [],
            capacityPerDay: 10,
            active: true,
            autoAssign: true,
        }
    );

    useEffect(() => {
        if (initialData) setForm(initialData);
    }, [initialData]);

    const toggleLang = (lang: string) => {
        setForm((prev) => ({
            ...prev,
            langs: prev.langs.includes(lang)
                ? prev.langs.filter((l) => l !== lang)
                : [...prev.langs, lang],
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad Soyad */}
            <div>
                <label className="block text-sm font-medium">Ad Soyad</label>
                <input
                    type="text"
                    className="border rounded w-full p-2"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                    type="email"
                    className="border rounded w-full p-2"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
            </div>

            {/* Rol */}
            <div>
                <label className="block text-sm font-medium">Rol</label>
                <select
                    className="border rounded w-full p-2"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                </select>
            </div>

            {/* Diller */}
            <div>
                <label className="block text-sm font-medium mb-1">Diller</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_LANGS.map((l) => (
                        <label
                            key={l.value}
                            className={`px-2 py-1 border rounded cursor-pointer text-sm ${
                                form.langs.includes(l.value)
                                    ? "bg-blue-100 border-blue-400"
                                    : "bg-white"
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={form.langs.includes(l.value)}
                                onChange={() => toggleLang(l.value)}
                                className="hidden"
                            />
                            {l.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Kapasite */}
            <div>
                <label className="block text-sm font-medium">Günlük Kapasite</label>
                <input
                    type="number"
                    className="border rounded w-full p-2"
                    value={form.capacityPerDay}
                    onChange={(e) =>
                        setForm({ ...form, capacityPerDay: Number(e.target.value) })
                    }
                />
            </div>

            {/* Aktif & Auto Assign */}
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    Aktif
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.autoAssign}
                        onChange={(e) => setForm({ ...form, autoAssign: e.target.checked })}
                    />
                    Auto-Assign
                </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    İptal
                </Button>
                <Button type="submit" variant="primary">
                    Kaydet
                </Button>
            </div>
        </form>
    );
}
