"use client";

import MemberForm, { MemberFormData } from "./MemberForm";

interface EditMemberModalProps {
    isOpen: boolean;
    member: MemberFormData;
    onClose: () => void;
    onUpdate: (member: MemberFormData) => void;
}

export default function EditMemberModal({
                                            isOpen,
                                            member,
                                            onClose,
                                            onUpdate,
                                        }: EditMemberModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Üye Düzenle</h2>
                <MemberForm
                    initialData={member}
                    onSubmit={(data) => {
                        onUpdate(data);
                        onClose();
                    }}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
}
