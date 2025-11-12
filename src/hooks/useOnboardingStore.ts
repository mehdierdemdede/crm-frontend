"use client";

import { create } from "zustand";

import type { BillingPeriod, Plan } from "@/lib/types";

export const MIN_SEAT_COUNT = 1;
export const MAX_SEAT_COUNT = 200;
export const DEFAULT_SEAT_COUNT = 5;
const DEFAULT_BILLING_PERIOD: BillingPeriod = "MONTH";

type OnboardingState = {
    selectedPlan: Plan | null;
    billingPeriod: BillingPeriod;
    seatCount: number;
    setPlan: (plan: Plan | null) => void;
    setBillingPeriod: (period: BillingPeriod) => void;
    setSeatCount: (seatCount: number) => void;
    reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
    selectedPlan: null,
    billingPeriod: DEFAULT_BILLING_PERIOD,
    seatCount: DEFAULT_SEAT_COUNT,
    setPlan: (plan) => set({ selectedPlan: plan }),
    setBillingPeriod: (period) => set({ billingPeriod: period }),
    setSeatCount: (seatCount) =>
        set(() => ({
            seatCount: Math.min(Math.max(seatCount, MIN_SEAT_COUNT), MAX_SEAT_COUNT),
        })),
    reset: () =>
        set({
            selectedPlan: null,
            billingPeriod: DEFAULT_BILLING_PERIOD,
            seatCount: DEFAULT_SEAT_COUNT,
        }),
}));
