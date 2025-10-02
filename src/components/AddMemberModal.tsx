"use client";

import { useState } from "react";
import { Button } from "./Button";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface NewMemberInput {
    name: string;
    email: string;
    role: Role;
    langs: string[];
    capacityPerDay: number;
    active: boolean;
    autoAssign: boolean;
}

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (member: NewMemberInput) => void;
}

const ALL_LANGS = [
    { value: "TR", label: "Türkçe" },
    { value: "EN", label: "İngilizce" },
    { value: "DE", label: "Almanca" },
    { value: "AR", label: "Arapça" },
    { value: "AL", label: "Arnavutça" },
];

export default function AddMemberModal({
                                           isOpen,
                                           onClose,
                                           onSave,
                                       }: AddMemberModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<Role>("USER");
    const [langs, setLangs] = useState<string[]>([]);
    const [capacityPerDay, setCapacityPerDay] = useState<number>(30);
    const [active, setActive] = useState<boolean>(true);
    const [autoAssign, setAutoAssign] = useState<boolean>(false);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>("");

    if (!isOpen) return null;

    const toggleLang = (val: string) => {
        setLangs((prev) =>
            prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
        );
    };

    const validate = (): string[] => {
        const errs: string[] = [];
        if (!name.trim()) errs.push("Ad Soyad zorunludur.");
        if (!email.trim() || !email.includes("@")) errs.push("Geçerli bir e-posta giriniz.");
        if (langs.length === 0) errs.push("En az bir dil seçiniz.");
        if (capacityPerDay <= 0) errs.push("Günlük kapasite 1 veya üzeri olmalıdır.");
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const errs = validate();
        if (errs.length) {
            setError(errs.join(" "));
            return;
        }

        try {
            setBusy(true);

            // Backend entegrasyonu burada yapılacak:
            // await api.post('/members', { name, email, role, langs, capacityPerDay, active, autoAssign });

            onSave({
                name,
                email,
                role,
                langs,
                capacityPerDay,
                active,
                autoAssign,
            });

            onClose();
        } catch (err: any) {
            setError(err?.message || "Bir hata oluştu.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">Yeni Üye Ekle</h2>

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Ad Soyad */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Ad Soyad</label>
                        <input
                            type="text"
                            className="w-full border rounded-md px-3 py-2"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: Ahmet Yılmaz"
                            required
                        />
                    </div>

                    {/* E-posta */}
                    <div>
                        <label className="block text-sm font-medium mb-1">E-posta</label>
                        <input
                            type="email"
                            className="w-full border rounded-md px-3 py-2"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ahmet@example.com"
                            required
                        />
                    </div>

                    {/* Rol */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Rol</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 bg-white"
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                        >
                            <option value="USER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                    </div>

                    {/* Diller (checkbox group) */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Diller</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ALL_LANGS.map((l) => (
                                <label key={l.value} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={langs.includes(l.value)}
                                        onChange={() => toggleLang(l.value)}
                                    />
                                    {l.label}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Birden fazla dil seçebilirsiniz.</p>
                    </div>

                    {/* Günlük Kapasite */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Günlük Lead Kapasitesi</label>
                        <input
                            type="number"
                            min={1}
                            className="w-full border rounded-md px-3 py-2"
                            value={capacityPerDay}
                            onChange={(e) => setCapacityPerDay(Number(e.target.value))}
                        />
                    </div>

                    {/* Aktif / Auto-assign */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                            />
                            Aktif
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={autoAssign}
                                onChange={(e) => setAutoAssign(e.target.checked)}
                            />
                            Auto-Assign
                        </label>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
                            İptal
                        </Button>
                        <Button type="submit" variant="primary" disabled={busy}>
                            {busy ? "Ekleniyor…" : "Kaydet"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
