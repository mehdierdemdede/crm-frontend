"use client";

import MemberForm, { MemberFormData } from "./MemberForm";

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (member: MemberFormData) => void;
}

export default function AddMemberModal({
                                           isOpen,
                                           onClose,
                                           onSave,
                                       }: AddMemberModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Yeni Üye Ekle</h2>
                <MemberForm
                    onSubmit={(data) => {
                        onSave(data);
                        onClose();
                    }}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
}
