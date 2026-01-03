"use client";
import { useState, useEffect } from "react";

import {
    inviteUser,
    type ApiResponse,
    type UserResponse,
    type AgentStatsResponse,
} from "@/lib/api";

import MemberForm, { MemberFormData } from "./MemberForm";

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (member: AgentStatsResponse) => void;
}

export default function AddMemberModal({ isOpen, onClose, onSave }: AddMemberModalProps) {
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState<import("@/lib/api").Organization[]>([]); // Use imported type or ensure import

    useEffect(() => {
        if (isOpen) {
            void fetchOrgsIfSuperAdmin();
        }
    }, [isOpen]);

    const fetchOrgsIfSuperAdmin = async () => {
        const { getCurrentUser, getOrganizations } = await import("@/lib/api");
        const user = await getCurrentUser();
        if (user?.role === "SUPER_ADMIN") {
            const orgs = await getOrganizations();
            setOrganizations(orgs);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (data: MemberFormData) => {
        setLoading(true);
        try {
            // Tip çıkarımı yeterli; istersen şu şekilde de yazabilirsin:
            // const response: ApiResponse<UserResponse> = await inviteUser({...});
            const response: ApiResponse<UserResponse> = await inviteUser({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                role: data.role,

                dailyCapacity: data.dailyCapacity,
                active: data.active,
                autoAssignEnabled: data.autoAssignEnabled,
                organizationId: data.organizationId,
            });

            if (response.status >= 200 && response.status < 300 && response.data) {
                const invitedUser = response.data;
                const newMember: AgentStatsResponse = {
                    userId: invitedUser.id,
                    fullName: `${invitedUser.firstName} ${invitedUser.lastName}`.trim(),
                    active: invitedUser.active,
                    autoAssignEnabled: invitedUser.autoAssignEnabled,

                    dailyCapacity: invitedUser.dailyCapacity,
                    assignedToday: 0,
                    remainingCapacity: invitedUser.dailyCapacity,
                    lastAssignedAt: null,
                };
                console.log("✅ Kullanıcı davet edildi:", invitedUser);
                onSave?.(newMember);
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
                <MemberForm onSubmit={handleSubmit} onCancel={onClose} loading={loading} organizations={organizations} />
            </div>
        </div>
    );
}
