"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CreditCard,
    Hash,
    Lock,
    ShieldCheck,
    User,
} from "lucide-react";
import { Suspense, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { dispatchToast } from "@/components/toaster";
import { useOnboardingStore } from "@/hooks/useOnboardingStore";
import { getAuthHeaders } from "@/lib/api";
import { resolveBackendApiBaseUrl } from "@/lib/backendConfig";
import type { BillingPeriod, Plan } from "@/lib/types";

const cardFormSchema = z.object({
    holderName: z.string().min(1, "Kart üzerindeki isim gerekli").trim(),
    cardNumber: z
        .string()
        .min(12, "Kart numarası en az 12 haneli olmalıdır")
        .max(19, "Kart numarası en fazla 19 haneli olabilir")
        .regex(/^[0-9 ]+$/, "Kart numarası yalnızca rakamlardan ve boşluklardan oluşabilir"),
    expMonth: z
        .string()
        .min(1, "Ay gerekli")
        .refine((value) => {
            const month = Number(value);
            return Number.isInteger(month) && month >= 1 && month <= 12;
        }, "Geçerli bir ay girin"),
    expYear: z
        .string()
        .min(2, "Yıl gerekli")
        .refine((value) => {
            const year = Number(value);
            const currentYear = new Date().getFullYear();
            return Number.isInteger(year) && year >= currentYear && year <= currentYear + 20;
        }, "Geçerli bir yıl girin"),
    cvc: z
        .string()
        .min(3, "CVC en az 3 haneli olmalıdır")
        .max(4, "CVC en fazla 4 haneli olabilir")
        .regex(/^\d+$/, "CVC yalnızca rakamlardan oluşmalıdır"),
});

const tokenizeResponseSchema = z.object({
    tokenRef: z.string(),
    brand: z.string(),
    last4: z.string().min(4).max(4),
});

type CardFormValues = z.infer<typeof cardFormSchema>;
type TokenizeResponse = z.infer<typeof tokenizeResponseSchema>;

type PlanPricing = {
    basePrice: number;
    perSeatPrice: number;
    currency: string;
    trialDays?: number | null;
};

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
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

const getPricingForPeriod = (plan: Plan | null, billingPeriod: BillingPeriod): PlanPricing | null => {
    if (!plan) {
        return null;
    }

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
        trialDays: price.trialDays,
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

const resolvePlanCode = (plan: Plan | null): string | null => {
    if (!plan) {
        return null;
    }

    const metadata = (plan.metadata ?? {}) as Record<string, unknown>;

    if (typeof metadata.planCode === "string") {
        return metadata.planCode;
    }

    if (typeof metadata.code === "string") {
        return metadata.code;
    }

    return plan.id;
};

const sanitizeCardNumber = (value: string) => value.replace(/\D+/g, "");

const getApiBaseUrl = () => resolveBackendApiBaseUrl();

async function tokenizeCard(payload: {
    holderName: string;
    cardNumber: string;
    expMonth: number;
    expYear: number;
    cvc: string;
}): Promise<TokenizeResponse> {
    const response = await fetch(`${getApiBaseUrl()}/payment-methods/tokenize`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data: unknown = null;

    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            data = raw;
        }
    }

    if (!response.ok) {
        const message =
            (typeof data === "string" && data.trim().length > 0
                ? data.trim()
                : data &&
                        typeof data === "object" &&
                        "message" in data &&
                        typeof (data as { message?: unknown }).message === "string"
                    ? (data as { message: string }).message
                    : "Kart bilgileri doğrulanamadı");
        throw new Error(message);
    }

    const parsed = tokenizeResponseSchema.safeParse(data);

    if (!parsed.success) {
        throw new Error("Kart bilgileri doğrulanamadı");
    }

    return parsed.data;
}

async function createSubscription(payload: {
    customerId: string;
    planCode: string;
    billingPeriod: BillingPeriod;
    seatCount: number;
    cardToken: string;
    trialDays?: number;
}) {
    const response = await fetch(`${getApiBaseUrl()}/billing/subscriptions`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const raw = await response.text();
        let message = "Abonelik oluşturulamadı";

        if (raw) {
            try {
                const data = JSON.parse(raw) as { message?: unknown };
                if (typeof data.message === "string" && data.message.trim().length > 0) {
                    message = data.message;
                }
            } catch {
                if (raw.trim().length > 0) {
                    message = raw.trim();
                }
            }
        }

        throw new Error(message);
    }
}

function CheckoutPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedPlan = useOnboardingStore((state) => state.selectedPlan);
    const billingPeriod = useOnboardingStore((state) => state.billingPeriod);
    const seatCount = useOnboardingStore((state) => state.seatCount);
    const resetOnboarding = useOnboardingStore((state) => state.reset);

    const customerId = searchParams?.get("customerId") ?? "";

    useEffect(() => {
        if (!selectedPlan) {
            router.replace("/onboarding/select-plan");
        }
    }, [router, selectedPlan]);

    const pricing = useMemo(
        () => getPricingForPeriod(selectedPlan, billingPeriod),
        [selectedPlan, billingPeriod],
    );

    const form = useForm<CardFormValues>({
        resolver: zodResolver(cardFormSchema),
        defaultValues: {
            holderName: "",
            cardNumber: "",
            expMonth: "",
            expYear: "",
            cvc: "",
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = form;

    const onSubmit = async (values: CardFormValues) => {
        if (!selectedPlan || !pricing) {
            dispatchToast({
                title: "Plan seçilmedi",
                description: "Lütfen önce bir plan seçin.",
                variant: "error",
            });
            router.replace("/onboarding/select-plan");
            return;
        }

        if (!customerId) {
            dispatchToast({
                title: "Eksik bilgi",
                description: "Müşteri bilgisi bulunamadı. Lütfen bağlantınızı kontrol edin.",
                variant: "error",
            });
            return;
        }

        try {
            const sanitizedNumber = sanitizeCardNumber(values.cardNumber);
            const tokenized = await tokenizeCard({
                holderName: values.holderName,
                cardNumber: sanitizedNumber,
                expMonth: Number(values.expMonth),
                expYear: Number(values.expYear),
                cvc: values.cvc,
            });

            const planCode = resolvePlanCode(selectedPlan);

            if (!planCode) {
                throw new Error("Plan kodu bulunamadı");
            }

            const payload = {
                customerId,
                planCode,
                billingPeriod,
                seatCount,
                cardToken: tokenized.tokenRef,
                ...(pricing.trialDays ? { trialDays: pricing.trialDays } : {}),
            };

            await createSubscription(payload);

            dispatchToast({
                title: "Abonelik oluşturuldu",
                description: "Faturalama sayfasına yönlendiriliyorsunuz.",
                variant: "success",
            });

            resetOnboarding();
            router.push("/hesap/faturalama");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Ödeme işlemi tamamlanamadı";

            dispatchToast({
                title: "İşlem başarısız",
                description: message,
                variant: "error",
            });
        }
    };

    if (!selectedPlan) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[3fr_2fr] lg:px-10">
                <div className="space-y-6">
                    <header className="space-y-2">
                        <button
                            type="button"
                            onClick={() => router.push("/onboarding/select-plan")}
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Geri dön
                        </button>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                                Onboarding
                            </p>
                            <h1 className="mt-1 text-3xl font-bold text-slate-900">
                                Ödeme ve kart bilgileri
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Kart bilgilerinizi güvenle girin ve aboneliğinizi birkaç adımda tamamlayın. Kart
                                verileri yalnızca tokenizasyon için kullanılır.
                            </p>
                        </div>
                    </header>

                    {!customerId && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                            <AlertCircle className="mt-0.5 h-5 w-5" />
                            <p className="text-sm">
                                Müşteri kimliği bulunamadı. Aboneliği oluşturmak için geçerli bir bağlantı
                                kullandığınızdan emin olun.
                            </p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Kart Bilgileri</h2>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <Input
                                label="Kart Üzerindeki İsim"
                                placeholder="Ad Soyad"
                                {...register("holderName")}
                                error={errors.holderName?.message}
                                icon={<User className="h-4 w-4 text-slate-400" />}
                            />
                            <Input
                                label="Kart Numarası"
                                placeholder="0000 0000 0000 0000"
                                {...register("cardNumber")}
                                error={errors.cardNumber?.message}
                                icon={<Hash className="h-4 w-4 text-slate-400" />}
                                inputMode="numeric"
                                autoComplete="cc-number"
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <Input
                                label="Son Kullanma Ayı"
                                placeholder="MM"
                                {...register("expMonth")}
                                error={errors.expMonth?.message}
                                icon={<Calendar className="h-4 w-4 text-slate-400" />}
                                inputMode="numeric"
                                autoComplete="cc-exp-month"
                            />
                            <Input
                                label="Son Kullanma Yılı"
                                placeholder="YYYY"
                                {...register("expYear")}
                                error={errors.expYear?.message}
                                icon={<Calendar className="h-4 w-4 text-slate-400" />}
                                inputMode="numeric"
                                autoComplete="cc-exp-year"
                            />
                            <Input
                                label="CVC"
                                placeholder="CVC"
                                {...register("cvc")}
                                error={errors.cvc?.message}
                                icon={<Lock className="h-4 w-4 text-slate-400" />}
                                inputMode="numeric"
                                autoComplete="cc-csc"
                            />
                        </div>

                        <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={!customerId}>
                            Ödemeyi Tamamla
                        </Button>
                    </form>

                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Güvenli ödeme</h2>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li>• Kart bilgileriniz yalnızca güvenli tokenizasyon için kullanılır ve saklanmaz.</li>
                            <li>• Ödeme altyapımız PCI-DSS uyumlu servisler tarafından sağlanır.</li>
                            <li>• Herhangi bir sorun yaşarsanız destek ekibimizle iletişime geçebilirsiniz.</li>
                        </ul>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Sipariş Özeti</h2>
                        <div className="mt-4 space-y-4 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                                <span>Plan</span>
                                <span className="font-semibold text-slate-900">{selectedPlan.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Dönem</span>
                                <span className="font-semibold text-slate-900">
                                    {BILLING_PERIOD_LABELS[billingPeriod]}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Koltuk sayısı</span>
                                <span className="font-semibold text-slate-900">{seatCount}</span>
                            </div>
                            {pricing && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span>Aylık taban ücret</span>
                                        <span className="font-semibold text-slate-900">
                                            {formatCurrency(pricing.basePrice, pricing.currency)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Koltuk başına</span>
                                        <span className="font-semibold text-slate-900">
                                            {formatCurrency(pricing.perSeatPrice, pricing.currency)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                                        <span>Tahmini toplam</span>
                                        <span>{formatCurrency(calculateEstimatedTotal(pricing, seatCount), pricing.currency)}</span>
                                    </div>
                                </>
                            )}
                            {pricing?.trialDays ? (
                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                                    <span>Deneme süresi</span>
                                    <span>{pricing.trialDays} gün</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {selectedPlan.features && selectedPlan.features.length > 0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                Plan özellikleri
                            </h3>
                            <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                {selectedPlan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
                    Yükleniyor...
                </div>
            }
        >
            <CheckoutPageContent />
        </Suspense>
    );
}
