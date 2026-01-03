import { useState, useEffect } from "react";

import { type AgentStatsResponse, getUser, UserResponse, Role } from "@/lib/api";

import MemberForm, { MemberFormData } from "./MemberForm";

interface EditMemberModalProps {
    isOpen: boolean;
    member: AgentStatsResponse;
    onClose: () => void;
    onUpdate: (member: AgentStatsResponse & { role?: Role }) => void;
}

const toFormData = (member: AgentStatsResponse, userDetails?: UserResponse): MemberFormData => {
    const nameParts = member.fullName?.trim().split(/\s+/) ?? [];
    const firstName = (member as unknown as { firstName?: string })?.firstName || nameParts.shift() || "";
    const lastName = (member as unknown as { lastName?: string })?.lastName || nameParts.join(" ");

    return {
        id: member.userId,
        firstName,
        lastName,
        email: userDetails?.email || (member as unknown as { email?: string })?.email || "",
        role: userDetails?.role || ((member as unknown as { role?: MemberFormData["role"] })?.role) || "USER",
        dailyCapacity: member.dailyCapacity || 0,
        active: member.active,
        autoAssignEnabled: member.autoAssignEnabled,
    };
};

const mergeMemberData = (
    form: MemberFormData,
    original: AgentStatsResponse
): AgentStatsResponse & { role?: Role } => ({
    ...original,
    fullName: `${form.firstName} ${form.lastName}`.trim(),
    active: form.active,
    autoAssignEnabled: form.autoAssignEnabled,
    dailyCapacity: form.dailyCapacity,
    remainingCapacity: Math.max(form.dailyCapacity - original.assignedToday, 0),
    // Pass role back to parent for update
    role: form.role as Role
});

export default function EditMemberModal({
    isOpen,
    member,
    onClose,
    onUpdate,
}: EditMemberModalProps) {
    const [userDetails, setUserDetails] = useState<UserResponse | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && member.userId) {
            setLoading(true);
            getUser(member.userId).then((user) => {
                if (user) setUserDetails(user);
                setLoading(false);
            });
        }
    }, [isOpen, member.userId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold">Üye Düzenle</h2>
                {loading ? (
                    <div className="text-center py-4">Yükleniyor...</div>
                ) : (
                    <MemberForm
                        initialData={toFormData(member, userDetails)}
                        onSubmit={(data) => {
                            onUpdate(mergeMemberData(data, member));
                            onClose();
                        }}
                        onCancel={onClose}
                    />
                )}
            </div>
        </div>
    );
}
