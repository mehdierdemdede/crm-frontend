"use client";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowRight,
    Calculator,
    CalendarRange,
    CheckCircle2,
    Loader2,
    PiggyBank,
    Users,
} from "lucide-react";
import { useEffect, useMemo } from "react";


import { Button } from "@/components/Button";
import { useOnboardingStore, MAX_SEAT_COUNT, MIN_SEAT_COUNT } from "@/hooks/useOnboardingStore";
import { getPublicPlans } from "@/lib/api";
import type { BillingPeriod, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
};

type PlanPricing = {
    basePrice: number;
    perSeatPrice: number;
    currency: string;
    priceId: string;
};

const toNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const getPricingForPeriod = (plan: Plan, billingPeriod: BillingPeriod): PlanPricing | null => {
    const price = plan.prices.find((item) => item.billingPeriod === billingPeriod);

    if (!price) {
        return null;
    }

    const metadata = (plan.metadata ?? {}) as Record<string, unknown>;
    const periodKey = billingPeriod.toLowerCase();

    const baseFromMetadata =
        toNumber(metadata[`basePrice_${periodKey}`]) ?? toNumber(metadata.basePrice);
    const perSeatFromMetadata =
        toNumber(metadata[`perSeatPrice_${periodKey}`]) ?? toNumber(metadata.perSeatPrice);

    const basePrice = baseFromMetadata ?? 0;
    const perSeatPrice = perSeatFromMetadata ?? price.amount;

    return {
        basePrice,
        perSeatPrice,
        currency: price.currency || "TRY",
        priceId: price.id,
    };
};

const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

const calculateEstimatedTotal = (pricing: PlanPricing, seatCount: number) =>
    pricing.basePrice + pricing.perSeatPrice * seatCount;

function BillingPeriodToggle({
    value,
    onChange,
}: {
    value: BillingPeriod;
    onChange: (value: BillingPeriod) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Faturalama Dönemi</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
                {(Object.keys(BILLING_PERIOD_LABELS) as BillingPeriod[]).map((period) => {
                    const isActive = period === value;

                    return (
                        <button
                            key={period}
                            type="button"
                            onClick={() => onChange(period)}
                            className={cn(
                                "flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
                                isActive
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200",
                            )}
                        >
                            <CalendarRange className="h-4 w-4" />
                            {BILLING_PERIOD_LABELS[period]}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SeatSelector({ value, onChange }: { value: number; onChange: (next: number) => void }) {
    const handleValueChange = (next: number) => {
        onChange(Math.min(Math.max(next, MIN_SEAT_COUNT), MAX_SEAT_COUNT));
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Koltuk Sayısı</p>
            <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-500" />
                    <input
                        type="range"
                        min={MIN_SEAT_COUNT}
                        max={MAX_SEAT_COUNT}
                        value={value}
                        onChange={(event) => handleValueChange(Number(event.target.value))}
                        className="w-full accent-blue-500"
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{MIN_SEAT_COUNT}</span>
                    <span>{MAX_SEAT_COUNT}</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={MIN_SEAT_COUNT}
                        max={MAX_SEAT_COUNT}
                        value={value}
                        onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isNaN(nextValue)) {
                                handleValueChange(nextValue);
                            }
                        }}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-sm text-slate-500">kişi</span>
                </div>
            </div>
        </div>
    );
}

function PlanOption({
    plan,
    billingPeriod,
    seatCount,
    isSelected,
    onSelect,
}: {
    plan: Plan;
    billingPeriod: BillingPeriod;
    seatCount: number;
    isSelected: boolean;
    onSelect: (plan: Plan) => void;
}) {
    const pricing = useMemo(() => getPricingForPeriod(plan, billingPeriod), [plan, billingPeriod]);

    if (!pricing) {
        return null;
    }

    const { basePrice, perSeatPrice, currency } = pricing;
    const total = calculateEstimatedTotal(pricing, seatCount);

    return (
        <button
            type="button"
            onClick={() => onSelect(plan)}
            className={cn(
                "w-full rounded-3xl border p-6 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200",
                isSelected
                    ? "border-blue-500 bg-blue-50/60 shadow-md"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow",
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                    {plan.description ? (
                        <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                    ) : null}
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-600">
                    {BILLING_PERIOD_LABELS[billingPeriod]}
                </span>
            </div>

            <dl className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-blue-500" />
                    <dt className="font-medium">Temel ücret:</dt>
                    <dd className="ml-1 text-slate-700">{formatCurrency(basePrice, currency)}</dd>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <dt className="font-medium">Koltuk başı:</dt>
                    <dd className="ml-1 text-slate-700">{formatCurrency(perSeatPrice, currency)}</dd>
                </div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Calculator className="h-5 w-5 text-blue-500" />
                    <dt>Toplam ({seatCount} kişi):</dt>
                    <dd className="ml-1">{formatCurrency(total, currency)}</dd>
                </div>
            </dl>

            {plan.features && plan.features.length > 0 ? (
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </button>
    );
}

function SummaryCard({
    selectedPlan,
    billingPeriod,
    seatCount,
    onContinue,
}: {
    selectedPlan: Plan | null;
    billingPeriod: BillingPeriod;
    seatCount: number;
    onContinue: () => void;
}) {
    const pricing = selectedPlan ? getPricingForPeriod(selectedPlan, billingPeriod) : null;
    const total = pricing ? calculateEstimatedTotal(pricing, seatCount) : 0;

    return (
        <div className="sticky top-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Özet</h2>
            {selectedPlan && pricing ? (
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                    <div>
                        <p className="text-xs uppercase text-slate-500">Plan</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{selectedPlan.name}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Dönem</span>
                        <span className="font-medium text-slate-700">
                            {BILLING_PERIOD_LABELS[billingPeriod]}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Koltuk</span>
                        <span className="font-medium text-slate-700">{seatCount} kişi</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Temel ücret</span>
                            <span className="font-medium text-slate-700">
                                {formatCurrency(pricing.basePrice, pricing.currency)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Koltuk başı</span>
                            <span className="font-medium text-slate-700">
                                {formatCurrency(pricing.perSeatPrice, pricing.currency)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                        <span>Tahmini tutar</span>
                        <span>{formatCurrency(total, pricing.currency)}</span>
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <AlertCircle className="h-4 w-4 text-slate-500" />
                    <p>Bir plan seçerek özetinizi görüntüleyin.</p>
                </div>
            )}

            <Button
                type="button"
                onClick={onContinue}
                disabled={!selectedPlan || !pricing}
                className="mt-6 w-full"
            >
                Devam Et
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}

const planSupportsPeriod = (plan: Plan, billingPeriod: BillingPeriod) =>
    plan.prices.some((price) => price.billingPeriod === billingPeriod);

export default function SelectPlanPage() {
    const router = useRouter();
    const selectedPlan = useOnboardingStore((state) => state.selectedPlan);
    const billingPeriod = useOnboardingStore((state) => state.billingPeriod);
    const seatCount = useOnboardingStore((state) => state.seatCount);
    const setPlan = useOnboardingStore((state) => state.setPlan);
    const setBillingPeriod = useOnboardingStore((state) => state.setBillingPeriod);
    const setSeatCount = useOnboardingStore((state) => state.setSeatCount);

    const { data: plans, isLoading, isError } = useQuery({
        queryKey: ["onboarding", "plans"],
        queryFn: getPublicPlans,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (!plans || plans.length === 0) {
            return;
        }

        if (selectedPlan) {
            const matchingPlan = plans.find((plan) => plan.id === selectedPlan.id);
            if (matchingPlan && planSupportsPeriod(matchingPlan, billingPeriod)) {
                if (matchingPlan !== selectedPlan) {
                    setPlan(matchingPlan);
                }
                return;
            }
        }

        const fallback = plans.find((plan) => planSupportsPeriod(plan, billingPeriod)) ?? null;
        if (fallback !== selectedPlan) {
            setPlan(fallback);
        }
    }, [plans, billingPeriod, selectedPlan, setPlan]);

    const handleBillingPeriodChange = (period: BillingPeriod) => {
        setBillingPeriod(period);
    };

    const handleContinue = () => {
        if (!selectedPlan) {
            return;
        }

        router.push("/onboarding/checkout");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[2fr_1fr] lg:gap-10 lg:px-10">
                <div className="space-y-6">
                    <header>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Onboarding</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Planınızı seçin</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            Takımınıza en uygun aboneliği seçin ve koltuk sayısını belirleyin. Seçiminizi istediğiniz zaman güncelleyebilirsiniz.
                        </p>
                    </header>

                    <div className="grid gap-4 md:grid-cols-2">
                        <BillingPeriodToggle value={billingPeriod} onChange={handleBillingPeriodChange} />
                        <SeatSelector value={seatCount} onChange={setSeatCount} />
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 shadow-sm">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : isError ? (
                        <div className="flex items-center gap-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <span>Planlar yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</span>
                        </div>
                    ) : plans && plans.length > 0 ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {plans.map((plan) => (
                                <PlanOption
                                    key={plan.id}
                                    plan={plan}
                                    billingPeriod={billingPeriod}
                                    seatCount={seatCount}
                                    isSelected={selectedPlan?.id === plan.id}
                                    onSelect={setPlan}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
                            Şu anda görüntülenecek plan bulunmuyor.
                        </div>
                    )}
                </div>

                <SummaryCard
                    selectedPlan={selectedPlan}
                    billingPeriod={billingPeriod}
                    seatCount={seatCount}
                    onContinue={handleContinue}
                />
            </div>
        </div>
    );
}
