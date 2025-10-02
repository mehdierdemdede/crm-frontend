"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface Member {
    id: number;
    name: string;
    email: string;
    role: Role;
    langs: string[];
    capacityPerDay: number;
    active: boolean;
    autoAssign: boolean;
}

interface EditMemberModalProps {
    isOpen: boolean;
    member: Member;
    onClose: () => void;
    onUpdate: (updated: Member) => void;
}

const ALL_LANGS = [
    { value: "TR", label: "Türkçe" },
    { value: "EN", label: "İngilizce" },
    { value: "DE", label: "Almanca" },
    { value: "AR", label: "Arapça" },
    { value: "AL", label: "Arnavutça" },
];

export default function EditMemberModal({
                                            isOpen,
                                            member,
                                            onClose,
                                            onUpdate,
                                        }: EditMemberModalProps) {
    const [form, setForm] = useState<Member>(member);

    useEffect(() => {
        setForm(member);
    }, [member]);

    if (!isOpen) return null;

    const handleChange = (field: keyof Member, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

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
        onUpdate(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Üye Düzenle</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* İsim */}
                    <div>
                        <label className="block text-sm font-medium">Ad Soyad</label>
                        <input
                            type="text"
                            className="border rounded w-full p-2"
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <input
                            type="email"
                            className="border rounded w-full p-2"
                            value={form.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                        />
                    </div>

                    {/* Rol */}
                    <div>
                        <label className="block text-sm font-medium">Rol</label>
                        <select
                            className="border rounded w-full p-2"
                            value={form.role}
                            onChange={(e) => handleChange("role", e.target.value as Role)}
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
                            onChange={(e) => handleChange("capacityPerDay", Number(e.target.value))}
                        />
                    </div>

                    {/* Aktif & Auto Assign */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(e) => handleChange("active", e.target.checked)}
                            />
                            Aktif
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.autoAssign}
                                onChange={(e) => handleChange("autoAssign", e.target.checked)}
                            />
                            Auto-Assign
                        </label>
                    </div>

                    {/* Butonlar */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            İptal
                        </Button>
                        <Button type="submit" variant="primary">
                            Kaydet
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
