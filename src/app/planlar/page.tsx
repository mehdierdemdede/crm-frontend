"use client";

import Link from "next/link";

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
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getPublicPlans } from "@/lib/api";
import type { BillingPeriod, Plan } from "@/lib/types";

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
};

const DEFAULT_SEAT_COUNT = 5;
const MIN_SEAT_COUNT = 1;
const MAX_SEAT_COUNT = 200;

type PlanPricing = {
    basePrice: number;
    perSeatPrice: number;
    currency: string;
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
    };
};

const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

function BillingPeriodToggle({
    value,
    onChange,
}: {
    value: BillingPeriod;
    onChange: (value: BillingPeriod) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Faturalama Dönemi</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
                {(Object.keys(BILLING_PERIOD_LABELS) as BillingPeriod[]).map((period) => {
                    const isActive = period === value;

                    return (
                        <button
                            key={period}
                            type="button"
                            onClick={() => onChange(period)}
                            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                                isActive
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
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

function SeatCounter({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    const handleValueChange = (next: number) => {
        const clampedValue = Math.min(Math.max(next, MIN_SEAT_COUNT), MAX_SEAT_COUNT);
        onChange(clampedValue);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Koltuk Sayısı</p>
            <div className="mt-3 space-y-3">
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
                            if (Number.isNaN(nextValue)) {
                                return;
                            }

                            handleValueChange(nextValue);
                        }}
                        className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-sm text-slate-500">kişi</span>
                </div>
            </div>
        </div>
    );
}

function PlanCard({
    plan,
    seatCount,
    billingPeriod,
    isAuthenticated,
}: {
    plan: Plan;
    seatCount: number;
    billingPeriod: BillingPeriod;
    isAuthenticated: boolean;
}) {
    const pricing = useMemo(() => getPricingForPeriod(plan, billingPeriod), [plan, billingPeriod]);

    if (!pricing) {
        return null;
    }

    const { basePrice, perSeatPrice, currency } = pricing;
    const total = basePrice + perSeatPrice * seatCount;

    return (
        <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
                        {plan.description ? (
                            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                        ) : null}
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-600">
                        {BILLING_PERIOD_LABELS[billingPeriod]}
                    </span>
                </div>

                <dl className="mt-6 space-y-3 text-sm text-slate-600">
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
            </div>

            <Link
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
                {isAuthenticated ? "Abone Ol" : "Kaydol ve Abone Ol"}
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

export default function PlansPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTH");
    const [seatCount, setSeatCount] = useState<number>(DEFAULT_SEAT_COUNT);
    const { user } = useAuth();

    const { data: plans, isLoading, isError } = useQuery({
        queryKey: ["public-plans"],
        queryFn: getPublicPlans,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className="max-w-5xl mx-auto grid gap-6 p-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-900">Planlarımızı Keşfedin</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Ekibinizin büyüklüğüne göre en uygun aboneliği seçin, istediğiniz zaman ölçekleyin.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />
                <SeatCounter value={seatCount} onChange={setSeatCount} />
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
                <div className="grid gap-6 md:grid-cols-2">
                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            seatCount={seatCount}
                            billingPeriod={billingPeriod}
                            isAuthenticated={Boolean(user)}
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
                    Şu anda görüntülenecek plan bulunmuyor.
                </div>
            )}
        </div>
    );
}
