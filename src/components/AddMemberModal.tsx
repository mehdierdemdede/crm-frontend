"use client";
import React, { useState } from "react";
// Özel Button bileşeniniz burada import ediliyor
import { Button } from "./Button";
import {inviteUser, InviteUserRequest, Role} from "@/lib/api";


interface Props {
    onClose: () => void;
    onAdd: (member: any) => void;
    remainingSlots: number;
}
const roleOptions: { label: string; value: Role }[] = [
    { label: "Member", value: "USER" },
    { label: "Admin", value: "ADMIN" },
    { label: "Super Admin", value: "SUPER_ADMIN" },
];

export default function AddMemberModal({ onClose, onAdd, remainingSlots }: Props) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<Role>("USER");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setBusy(true);
        try {

            const requestData: InviteUserRequest = {
                firstName: name,
                email: email,
                role: role,
            };



            const response = await inviteUser(requestData);

            if (response.data) {
                setMessage("Davet başarıyla gönderildi.");
                onAdd(response.data); // Backend'den dönen kullanıcıyı ekle
                // ...
            } else {
                setError(response.message || "Bir hata oluştu.");
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
                <h3 className="text-lg font-semibold mb-4">Yeni Takım Üyesi Ekle</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Kullanıcıya, kendi şifresini oluşturabileceği bir davet linki gönderilecektir.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... form inputları aynı kalıyor ... */}
                    <div>
                        <label className="text-sm block mb-1 font-medium">İsim Soyisim</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ahmet Yılmaz"
                        />
                    </div>

                    <div>
                        <label className="text-sm block mb-1 font-medium">E-posta</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ahmet@sirket.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm block mb-1 font-medium">Rol</label>

                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                            className="w-full border px-3 py-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {roleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error &&
                        <div className="text-sm text-red-600 p-2 bg-red-50 rounded border border-red-200">{error}</div>}
                    {message && <div
                        className="text-sm text-green-700 p-2 bg-green-50 rounded border border-green-200">{message}</div>}

                    <div className="flex justify-end gap-3 pt-2">
                        {/* === DEĞİŞİKLİK BURADA === */}
                        <Button
                            type="button"
                            className="bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100"
                            onClick={onClose}
                            disabled={busy}
                        >
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                            disabled={busy}
                        >
                            {busy ? "Ekleniyor..." : `Davet Gönder (${remainingSlots} slot kaldı)`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}