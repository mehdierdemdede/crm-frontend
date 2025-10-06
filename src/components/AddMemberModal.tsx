"use client";
import { useState } from "react";
import { inviteUser, type ApiResponse, type UserResponse } from "@/lib/api";
import MemberForm, { MemberFormData } from "./MemberForm";

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (member: MemberFormData) => void;
}

export default function AddMemberModal({ isOpen, onClose, onSave }: AddMemberModalProps) {
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;

    const handleSubmit = async (data: MemberFormData) => {
        setLoading(true);
        try {
            // Tip çıkarımı yeterli; istersen şu şekilde de yazabilirsin:
            // const response: ApiResponse<UserResponse> = await inviteUser({...});
            const response = await inviteUser({
                firstName: data.name.split(" ")[0],
                lastName: data.name.split(" ")[1] || "",
                email: data.email,
                role: data.role,
                supportedLanguages: data.langs,
                dailyCapacity: data.capacityPerDay,
                active: data.active,
                autoAssignEnabled: data.autoAssign,
            });

            if (response.status >= 200 && response.status < 300 && response.data) {
                console.log("✅ Kullanıcı davet edildi:", response.data);
                onSave?.(data);
                onClose();
            } else {
                alert("❌ Davet başarısız: " + (response.message || "Bilinmeyen hata"));
            }
        } catch (err) {
            console.error("Invite error:", err);
            alert("Beklenmeyen bir hata oluştu, lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Yeni Üye Ekle</h2>
                <MemberForm onSubmit={handleSubmit} onCancel={onClose} loading={loading} />
            </div>
        </div>
    );
}
