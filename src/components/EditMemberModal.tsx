"use client";

import { type AgentStatsResponse } from "@/lib/api";
import MemberForm, { MemberFormData } from "./MemberForm";

interface EditMemberModalProps {
    isOpen: boolean;
    member: AgentStatsResponse;
    onClose: () => void;
    onUpdate: (member: AgentStatsResponse) => void;
}

const toFormData = (member: AgentStatsResponse): MemberFormData => {
    const nameParts = member.fullName?.trim().split(/\s+/) ?? [];
    const firstName = (member as unknown as { firstName?: string })?.firstName || nameParts.shift() || "";
    const lastName = (member as unknown as { lastName?: string })?.lastName || nameParts.join(" ");

    return {
        id: member.userId,
        firstName,
        lastName,
        email: (member as unknown as { email?: string })?.email || "",
        role: ((member as unknown as { role?: MemberFormData["role"] })?.role) || "USER",
        supportedLanguages: member.supportedLanguages || [],
        dailyCapacity: member.dailyCapacity || 0,
        active: member.active,
        autoAssignEnabled: member.autoAssignEnabled,
    };
};

const mergeMemberData = (
    form: MemberFormData,
    original: AgentStatsResponse
): AgentStatsResponse => ({
    ...original,
    fullName: `${form.firstName} ${form.lastName}`.trim(),
    active: form.active,
    autoAssignEnabled: form.autoAssignEnabled,
    supportedLanguages: form.supportedLanguages,
    dailyCapacity: form.dailyCapacity,
    remainingCapacity: Math.max(form.dailyCapacity - original.assignedToday, 0),
});

export default function EditMemberModal({
                                            isOpen,
                                            member,
                                            onClose,
                                            onUpdate,
                                        }: EditMemberModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold">Üye Düzenle</h2>
                <MemberForm
                    initialData={toFormData(member)}
                    onSubmit={(data) => {
                        onUpdate(mergeMemberData(data, member));
                        onClose();
                    }}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
}
