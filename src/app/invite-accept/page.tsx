"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/api";

function InviteAcceptContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const validatePassword = (pwd: string) => {
        // Basit doğrulama -> prod'da daha katı kurallar öneririm
        return pwd.length >= 8;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError("Token bulunamadı. Davet linkini kontrol ediniz.");
            return;
        }
        if (!validatePassword(password)) {
            setError("Şifre en az 8 karakter olmalı.");
            return;
        }
        if (password !== confirm) {
            setError("Şifreler eşleşmiyor.");
            return;
        }

        setBusy(true);

        try {
            const res = await acceptInvite({ token, password });

            if (res.status !== 200) {
                throw new Error(res.message || "Invite kabul edilemedi");
            }

            setSuccess("Şifreniz başarıyla kaydedildi. Giriş sayfasına yönlendiriliyorsunuz...");
            setTimeout(() => router.push("/login"), 1500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Bir hata oluştu";
            setError(message);
        } finally {
            setBusy(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white shadow-md rounded p-6">
                <h1 className="text-xl font-semibold mb-3">Hesabını aktive et</h1>
                <p className="text-sm text-gray-600 mb-4">Lütfen yeni şifreni belirle. Şifre 8 karakterden uzun olmalı.</p>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm mb-1">Yeni Şifre</label>
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border px-3 py-2 rounded" />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Şifre (Tekrar)</label>
                        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" className="w-full border px-3 py-2 rounded" />
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {success && <div className="text-sm text-green-700">{success}</div>}

                    <div className="flex justify-end">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={busy}>
                            {busy ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function InviteAcceptPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Yükleniyor...</div>
                </div>
            }
        >
            <InviteAcceptContent />
        </Suspense>
    );
}
