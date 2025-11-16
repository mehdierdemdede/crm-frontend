"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { BillingPeriod, Plan } from "@/lib/types";

export type SignupAccountInfo = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
};

export type SignupOrganizationInfo = {
    organizationName: string;
    country: string;
    taxNumber: string;
    companySize?: string | null;
};

export type SignupPaymentResult = {
    status: "SUCCESS" | "FAILURE";
    subscriptionId?: string;
    iyzicoSubscriptionId?: string | null;
    iyzicoCustomerId?: string | null;
    message?: string | null;
    hasTrial?: boolean;
};

type PublicSignupState = {
    selectedPlan: Plan | null;
    billingPeriod: BillingPeriod;
    seatCount: number;
    accountInfo: SignupAccountInfo | null;
    organizationInfo: SignupOrganizationInfo | null;
    paymentResult: SignupPaymentResult | null;
    setPlanSelection: (params: { plan: Plan; billingPeriod?: BillingPeriod; seatCount?: number }) => void;
    setBillingPeriod: (period: BillingPeriod) => void;
    setSeatCount: (seatCount: number) => void;
    setAccountInfo: (account: SignupAccountInfo) => void;
    setOrganizationInfo: (organization: SignupOrganizationInfo) => void;
    setPaymentResult: (result: SignupPaymentResult | null) => void;
    reset: () => void;
};

const DEFAULT_STATE: Pick<PublicSignupState, "selectedPlan" | "billingPeriod" | "seatCount" | "accountInfo" | "organizationInfo" | "paymentResult"> = {
    selectedPlan: null,
    billingPeriod: "MONTH",
    seatCount: 1,
    accountInfo: null,
    organizationInfo: null,
    paymentResult: null,
};

const MIN_SEAT_COUNT = 1;
const MAX_SEAT_COUNT = 200;

export const usePublicSignupStore = create<PublicSignupState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,
            setPlanSelection: ({ plan, billingPeriod, seatCount }) =>
                set((state) => ({
                    selectedPlan: plan,
                    billingPeriod: billingPeriod ?? state.billingPeriod,
                    seatCount:
                        typeof seatCount === "number"
                            ? Math.min(Math.max(Math.round(seatCount), MIN_SEAT_COUNT), MAX_SEAT_COUNT)
                            : state.seatCount,
                })),
            setBillingPeriod: (period) => set({ billingPeriod: period }),
            setSeatCount: (nextSeatCount) =>
                set({
                    seatCount: Math.min(
                        Math.max(Math.round(nextSeatCount), MIN_SEAT_COUNT),
                        MAX_SEAT_COUNT,
                    ),
                }),
            setAccountInfo: (account) => set({ accountInfo: account }),
            setOrganizationInfo: (organization) => set({ organizationInfo: organization }),
            setPaymentResult: (result) => set({ paymentResult: result }),
            reset: () => set({ ...DEFAULT_STATE }),
        }),
        {
            name: "public-signup-state",
            partialize: (state) => ({
                selectedPlan: state.selectedPlan,
                billingPeriod: state.billingPeriod,
                seatCount: state.seatCount,
                accountInfo: state.accountInfo,
                organizationInfo: state.organizationInfo,
                paymentResult: state.paymentResult,
            }),
        },
    ),
);

