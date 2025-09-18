"use client";
import React, { useState } from "react";
import { Button } from "./Button";

interface Props {
    onClose: () => void;
    onAdd: (member: any) => void;
    remainingSlots: number;
}

function genPassword(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export default function AddMemberModal({ onClose, onAdd, remainingSlots }: Props) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Member");
    const [inviteOption, setInviteOption] = useState<"link" | "auto">("link");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError(null);
        if (!name.trim() || !email.trim()) {
            setError("İsim ve e-posta gerekli.");
            return;
        }
        if (remainingSlots <= 0) {
            setError("Üye limiti dolu. Paket yükselt veya bazı üyeleri sil.");
            return;
        }

        setBusy(true);
        // Simulate server delay
        await new Promise((r) => setTimeout(r, 700));

        const id = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString();
        const newMember: any = {
            id,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            status: inviteOption === "link" ? "invited" : "active",
            invitedAt: new Date().toISOString(),
        };

        if (inviteOption === "auto") {
            const pwd = genPassword();
            newMember.password = pwd; // simulated
            newMember.note = `Oto oluşturulmuş şifre: ${pwd}`;
            setMessage("Otomatik şifre oluşturuldu ve (simüle) e-postaya gönderildi.");
        } else {
            newMember.note = "Davet linki gönderildi (simüle). Kullanıcı e-posta ile şifre oluşturacak.";
            setMessage("Davet linki (simüle) gönderildi.");
        }

        onAdd(newMember);

        setBusy(false);
        // kısa süreli gösterip modal kapat
        setTimeout(() => {
            setMessage(null);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
                <h3 className="text-lg font-semibold mb-2">Yeni Üye Ekle</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-sm block mb-1">İsim</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border px-3 py-2 rounded" />
                    </div>

                    <div>
                        <label className="text-sm block mb-1">E-posta</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" />
                    </div>

                    <div>
                        <label className="text-sm block mb-1">Rol</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border px-3 py-2 rounded">
                            <option>Member</option>
                            <option>Admin</option>
                            <option>Manager</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm block mb-1">Davetiye Seçeneği</label>
                        <div className="flex gap-3 items-center">
                            <label className="flex items-center gap-2">
                                <input type="radio" name="invite" checked={inviteOption === "link"} onChange={() => setInviteOption("link")} />
                                Davet linki gönder (kullanıcı şifresini oluşturur) — önerilen
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name="invite" checked={inviteOption === "auto"} onChange={() => setInviteOption("auto")} />
                                Otomatik şifre oluştur ve gönder
                            </label>
                        </div>
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {message && <div className="text-sm text-green-700">{message}</div>}

                    <div className="flex justify-end gap-2">
                        <button type="button" className="px-3 py-2 rounded border" onClick={onClose} disabled={busy}>
                            İptal
                        </button>
                        <Button type="submit" onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={busy}>
                            {busy ? "Ekleniyor..." : `Ekle (${remainingSlots} slot kaldı)`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
