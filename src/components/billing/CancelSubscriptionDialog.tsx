"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import Modal from "@/components/Modal";
import { cancelSubscription } from "@/lib/api";
import type { Subscription } from "@/lib/types";

interface CancelSubscriptionDialogProps {
    isOpen: boolean;
    subscription: Subscription;
    onClose: () => void;
    onSuccess?: (subscription: Subscription) => void;
}

const formatDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long",
    }).format(date);
};

export default function CancelSubscriptionDialog({
    isOpen,
    subscription,
    onClose,
    onSuccess,
}: CancelSubscriptionDialogProps) {
    const queryClient = useQueryClient();
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setCancelAtPeriodEnd(false);
        }
    }, [isOpen]);

    const mutation = useMutation({
        mutationFn: () => cancelSubscription(subscription.id, { cancelAtPeriodEnd }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({
                queryKey: ["customer-subscriptions", subscription.customerId],
            });
            queryClient.invalidateQueries({ queryKey: ["subscription", subscription.id] });
            onSuccess?.(updated);
            onClose();
        },
        onError: (error: unknown) => {
            console.error("Abonelik iptali başarısız", error);
            alert("Aboneliği iptal ederken bir hata oluştu. Lütfen tekrar deneyin.");
        },
    });

    const handleConfirm = () => {
        mutation.mutate();
    };

    const periodEndFormatted = formatDate(subscription.currentPeriodEnd);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Aboneliği İptal Et"
            description="İptal işleminizi onaylayın."
            actions={[
                {
                    label: "Vazgeç",
                    onClick: onClose,
                    variant: "outline",
                },
                {
                    label: "Aboneliği İptal Et",
                    onClick: handleConfirm,
                    isLoading: mutation.isPending,
                    variant: "danger",
                },
            ]}
        >
            <div className="space-y-5 text-sm text-slate-600">
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Bu işlem aboneliğinizi sonlandırır.</p>
                        <p className="mt-1 text-xs text-red-600">
                            İptal edilen aboneliklerde hizmet erişimi seçiminize göre hemen veya dönem sonunda durdurulur.
                        </p>
                    </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-slate-700 hover:border-red-300">
                    <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={cancelAtPeriodEnd}
                        onChange={(event) => setCancelAtPeriodEnd(event.target.checked)}
                    />
                    <span className="text-sm font-medium">Dönem sonunda iptal et</span>
                </label>

                {cancelAtPeriodEnd && periodEndFormatted ? (
                    <div className="rounded-lg bg-slate-100 px-4 py-3 text-xs text-slate-600">
                        Aboneliğiniz {periodEndFormatted} tarihinde sona erecek.
                    </div>
                ) : null}

                {!cancelAtPeriodEnd && (
                    <div className="rounded-lg bg-slate-100 px-4 py-3 text-xs text-slate-600">
                        İptali onayladığınız anda abonelik sonlandırılacaktır.
                    </div>
                )}
            </div>
        </Modal>
    );
}
