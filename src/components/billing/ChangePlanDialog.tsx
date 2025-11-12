"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import Modal from "@/components/Modal";
import { changeSubscriptionPlan } from "@/lib/api";
import type { BillingPeriod, Plan, Price, Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChangePlanDialogProps {
    isOpen: boolean;
    subscription: Subscription;
    plans: Plan[];
    onClose: () => void;
    onSuccess?: (subscription: Subscription) => void;
}

type PlanOption = {
    plan: Plan;
    price: Price;
};

const PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
};

const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

export default function ChangePlanDialog({
    isOpen,
    subscription,
    plans,
    onClose,
    onSuccess,
}: ChangePlanDialogProps) {
    const queryClient = useQueryClient();

    const currentOption = useMemo(() => {
        const currentPlan = plans.find((plan) => plan.id === subscription.planId);
        if (!currentPlan) return null;

        const currentPrice = currentPlan.prices.find((price) => price.id === subscription.priceId);
        if (!currentPrice) return null;

        const option: PlanOption = { plan: currentPlan, price: currentPrice };
        return option;
    }, [plans, subscription.planId, subscription.priceId]);

    const initialPeriod = currentOption?.price.billingPeriod ?? "MONTH";

    const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(initialPeriod);
    const [selectedPlanId, setSelectedPlanId] = useState<string>(subscription.planId);

    useEffect(() => {
        setSelectedPeriod(initialPeriod);
    }, [initialPeriod]);

    useEffect(() => {
        setSelectedPlanId(subscription.planId);
    }, [subscription.planId, subscription.priceId]);

    const planOptions = useMemo(() => {
        const options: PlanOption[] = [];

        plans.forEach((plan) => {
            const priceForPeriod = plan.prices.find((price) => price.billingPeriod === selectedPeriod);
            if (!priceForPeriod) return;

            options.push({ plan, price: priceForPeriod });
        });

        return options.sort((a, b) => a.price.amount - b.price.amount);
    }, [plans, selectedPeriod]);

    useEffect(() => {
        if (planOptions.length === 0) return;
        const option = planOptions.find((item) => item.plan.id === selectedPlanId);
        if (!option) {
            const fallback = planOptions[0];
            if (fallback) {
                setSelectedPlanId(fallback.plan.id);
            }
        }
    }, [planOptions, selectedPlanId]);

    const selectedOption = planOptions.find((item) => item.plan.id === selectedPlanId) ?? null;

    const isDowngrade = useMemo(() => {
        if (!currentOption || !selectedOption) return false;
        if (currentOption.price.currency !== selectedOption.price.currency) return false;

        return selectedOption.price.amount < currentOption.price.amount;
    }, [currentOption, selectedOption]);

    const isSamePlan = selectedOption?.price.id === subscription.priceId;

    const mutation = useMutation({
        mutationFn: ({ planId, priceId }: { planId: string; priceId: string }) =>
            changeSubscriptionPlan(subscription.id, { planId, priceId }),
        onSuccess: (updated) => {
            void queryClient.invalidateQueries({
                queryKey: ["customer-subscriptions", subscription.customerId],
            });
            void queryClient.invalidateQueries({
                queryKey: ["subscription", subscription.id],
            });
            onSuccess?.(updated);
            onClose();
        },
        onError: (error: unknown) => {
            console.error("Plan değişikliği başarısız", error);
            alert("Plan değişikliği sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        },
    });

    const handleConfirm = () => {
        if (!selectedOption || isSamePlan) return;
        void mutation.mutate({
            planId: selectedOption.plan.id,
            priceId: selectedOption.price.id,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Planı Değiştir"
            description="Yeni planınızı ve faturalama dönemini seçin."
            actions={[
                {
                    label: "Vazgeç",
                    onClick: onClose,
                    variant: "outline",
                },
                {
                    label: "Planı Güncelle",
                    onClick: handleConfirm,
                    isLoading: mutation.isPending,
                    disabled: !selectedOption || isSamePlan,
                },
            ]}
        >
            <div className="space-y-6">
                <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Faturalama Dönemi</p>
                    <div className="mt-3 flex gap-2">
                        {(Object.keys(PERIOD_LABELS) as BillingPeriod[]).map((period) => (
                            <Button
                                key={period}
                                variant={period === selectedPeriod ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setSelectedPeriod(period)}
                            >
                                {PERIOD_LABELS[period]}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3">
                    {planOptions.map((option) => {
                        const { plan, price } = option;
                        const isActive = selectedOption?.plan.id === plan.id;
                        const currency = price.currency || currentOption?.price.currency || "TRY";
                        return (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={cn(
                                    "flex w-full flex-col gap-2 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2",
                                    "focus:ring-blue-500",
                                    isActive
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50",
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
                                        {plan.description ? (
                                            <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                                        ) : null}
                                    </div>
                                    <div className="text-right text-sm font-semibold text-slate-900">
                                        {formatCurrency(price.amount, currency)}
                                        <span className="ml-1 text-xs font-normal text-slate-500">
                                            / {PERIOD_LABELS[price.billingPeriod]}
                                        </span>
                                    </div>
                                </div>
                                {plan.features && plan.features.length > 0 ? (
                                    <ul className="mt-2 grid list-disc gap-1 pl-5 text-xs text-slate-600">
                                        {plan.features.slice(0, 4).map((feature) => (
                                            <li key={feature}>{feature}</li>
                                        ))}
                                        {plan.features.length > 4 ? (
                                            <li className="text-slate-400">+{plan.features.length - 4} özellik daha</li>
                                        ) : null}
                                    </ul>
                                ) : null}
                                {plan.id === subscription.planId && price.id === subscription.priceId ? (
                                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                        <CheckCircle2 className="h-3 w-3" /> Mevcut planınız
                                    </div>
                                ) : null}
                            </button>
                        );
                    })}

                    {planOptions.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            Bu dönem için uygun plan bulunamadı.
                        </div>
                    ) : null}
                </div>

                {isDowngrade ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Daha düşük bir plana geçiş seçtiniz.</p>
                            <p className="mt-1 text-xs text-amber-700">
                                Düşürme işlemleri mevcut faturalama dönemi sonunda uygulanır.
                            </p>
                        </div>
                    </div>
                ) : null}

                {!isDowngrade && selectedOption && currentOption &&
                selectedOption.price.amount > currentOption.price.amount ? (
                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <ArrowDownRight className="mt-0.5 h-4 w-4 rotate-180 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Plan yükseltmesi hemen uygulanır.</p>
                            <p className="mt-1 text-xs text-blue-600">
                                Yeni planınız seçtiğiniz anda aktif olacaktır.
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
