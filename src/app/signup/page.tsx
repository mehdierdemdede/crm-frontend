"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Building2,
    Calculator,
    CheckCircle2,
    CreditCard,
    Fingerprint,
    Info,
    Lock,
    Mail,
    Phone,
    ShieldCheck,
    User,
    Users,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    usePublicSignupStore,
    type SignupAccountInfo,
    type SignupOrganizationInfo,
} from "@/hooks/usePublicSignupStore";
import { createPublicSignup, getPublicPlanById, initializePublicSignupPayment } from "@/lib/api";
import type { BillingPeriod, Plan, PublicSignupPaymentPayload } from "@/lib/types";

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
};

const MIN_SEAT_COUNT = 1;
const MAX_SEAT_COUNT = 200;

type PlanPricing = {
    basePrice: number;
    perSeatPrice: number;
    currency: string;
    trialDays?: number | null;
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

    const baseFromMetadata = toNumber(metadata[`basePrice_${periodKey}`]) ?? toNumber(metadata.basePrice);
    const perSeatFromMetadata = toNumber(metadata[`perSeatPrice_${periodKey}`]) ?? toNumber(metadata.perSeatPrice);

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

const calculateTotal = (pricing: PlanPricing, seatCount: number) => pricing.basePrice + pricing.perSeatPrice * seatCount;

const accountSchema = z.object({
    firstName: z.string().min(1, "Ad gerekli").max(100, "Ad en fazla 100 karakter olabilir").trim(),
    lastName: z
        .string()
        .min(1, "Soyad gerekli")
        .max(100, "Soyad en fazla 100 karakter olabilir")
        .trim(),
    email: z.string().email("Geçerli bir e-posta girin").max(255).trim(),
    password: z
        .string()
        .min(8, "Parola en az 8 karakter olmalıdır")
        .max(255, "Parola en fazla 255 karakter olabilir"),
    phone: z
        .string()
        .max(40, "Telefon numarası en fazla 40 karakter olabilir")
        .optional()
        .transform((value) => (value ? value.trim() : value)),
});

const organizationSchema = z.object({
    organizationName: z
        .string()
        .min(1, "Organizasyon adı gerekli")
        .max(255, "Organizasyon adı en fazla 255 karakter olabilir")
        .trim(),
    country: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => /^[A-Z]{2,3}$/.test(value), "Ülke kodu 2 veya 3 harf olmalıdır"),
    taxNumber: z
        .string()
        .min(1, "Vergi numarası gerekli")
        .max(50, "Vergi numarası en fazla 50 karakter olabilir")
        .trim(),
    companySize: z
        .string()
        .max(50, "Şirket büyüklüğü en fazla 50 karakter olabilir")
        .optional()
        .transform((value) => (value ? value.trim() : value)),
});

const paymentSchema = z.object({
    cardHolderName: z
        .string()
        .min(1, "Kart üzerindeki isim gerekli")
        .max(255, "Kart üzerindeki isim en fazla 255 karakter olabilir")
        .trim(),
    cardNumber: z
        .string()
        .min(12, "Kart numarası en az 12 haneli olmalıdır")
        .max(23, "Kart numarası en fazla 23 karakter olabilir")
        .refine(
            (value) => /^\d{12,19}$/.test(sanitizeCardNumber(value)),
            "Kart numarası yalnızca 12-19 rakamdan oluşmalıdır",
        ),
    expireMonth: z
        .string()
        .min(1, "Ay gerekli")
        .refine((value) => {
            const month = Number(value);
            return Number.isInteger(month) && month >= 1 && month <= 12;
        }, "Geçerli bir ay girin"),
    expireYear: z
        .string()
        .min(2, "Yıl gerekli")
        .refine((value) => {
            const year = Number(value);
            return Number.isInteger(year) && year >= 2000 && year <= 2100;
        }, "Yıl 2000 ile 2100 arasında olmalıdır"),
    cvc: z
        .string()
        .min(3, "CVC en az 3 hane olmalıdır")
        .max(4, "CVC en fazla 4 haneli olabilir")
        .regex(/^\d+$/, "CVC yalnızca rakamlardan oluşmalıdır"),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type OrganizationFormValues = z.infer<typeof organizationSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

type StepKey = "ACCOUNT" | "ORGANIZATION" | "SUMMARY" | "PAYMENT" | "CONFIRMATION";

const steps: { key: StepKey; title: string; description: string }[] = [
    {
        key: "ACCOUNT",
        title: "Yönetici Bilgileri",
        description: "Hesabı oluşturacak yöneticinin bilgilerini girin.",
    },
    {
        key: "ORGANIZATION",
        title: "Organizasyon",
        description: "Şirket veya organizasyon detaylarınızı paylaşın.",
    },
    {
        key: "SUMMARY",
        title: "Plan Özeti",
        description: "Seçtiğiniz planı ve toplam tutarı kontrol edin.",
    },
    {
        key: "PAYMENT",
        title: "Ödeme",
        description: "Kartınızı güvenle tanımlayın ve aboneliği başlatın.",
    },
    {
        key: "CONFIRMATION",
        title: "Tamamlandı",
        description: "Abonelik durumu ve sonraki adımlar.",
    },
];

const sanitizeCardNumber = (value: string) => value.replace(/[^\d]/g, "");

const getAccountFormDefaultValues = (info: SignupAccountInfo | null): AccountFormValues => ({
    firstName: info?.firstName ?? "",
    lastName: info?.lastName ?? "",
    email: info?.email ?? "",
    password: info?.password ?? "",
    phone: info?.phone ?? "",
});

const getOrganizationFormDefaultValues = (
    info: SignupOrganizationInfo | null,
): OrganizationFormValues => ({
    organizationName: info?.organizationName ?? "",
    country: info?.country ?? "",
    taxNumber: info?.taxNumber ?? "",
    companySize: info?.companySize ?? "",
});

const toPaymentAccountPayload = (
    info: SignupAccountInfo,
): PublicSignupPaymentPayload["account"] => ({
    firstName: info.firstName,
    lastName: info.lastName,
    email: info.email,
    password: info.password,
    ...(info.phone ? { phone: info.phone } : {}),
});

const toPaymentOrganizationPayload = (
    info: SignupOrganizationInfo,
): PublicSignupPaymentPayload["organization"] => ({
    organizationName: info.organizationName,
    country: info.country,
    taxNumber: info.taxNumber,
    ...(info.companySize ? { companySize: info.companySize } : {}),
});

const parseBillingPeriod = (value: string | null): BillingPeriod | null => {
    if (!value) {
        return null;
    }

    const normalized = value.toUpperCase();

    if (normalized === "MONTH" || normalized === "MONTHLY") {
        return "MONTH";
    }

    if (normalized === "YEAR" || normalized === "YEARLY") {
        return "YEAR";
    }

    return null;
};

function StepHeader({ currentStep }: { currentStep: StepKey }) {
    const currentIndex = steps.findIndex((step) => step.key === currentStep);

    return (
        <nav aria-label="Kayıt adımları" className="space-y-4">
            <ol className="flex flex-wrap items-center gap-3 text-sm">
                {steps.map((step, index) => {
                    const isActive = step.key === currentStep;
                    const isCompleted = index < currentIndex;

                    return (
                        <li key={step.key} className="flex items-center gap-2">
                            <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                                    isActive
                                        ? "border-blue-500 bg-blue-100 text-blue-600"
                                        : isCompleted
                                          ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                                          : "border-slate-200 bg-white text-slate-500"
                                }`}
                            >
                                {index + 1}
                            </span>
                            <span
                                className={`text-sm font-medium ${
                                    isActive ? "text-blue-600" : isCompleted ? "text-emerald-600" : "text-slate-500"
                                }`}
                            >
                                {step.title}
                            </span>
                            {index < steps.length - 1 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function PlanSummary({ plan, seatCount, billingPeriod }: { plan: Plan | null; seatCount: number; billingPeriod: BillingPeriod }) {
    const pricing = useMemo(() => getPricingForPeriod(plan, billingPeriod), [plan, billingPeriod]);

    if (!plan || !pricing) {
        return (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
                Seçili plan bilgileri yüklenemedi. Lütfen planlar sayfasından yeniden seçim yapın.
            </div>
        );
    }

    const total = calculateTotal(pricing, seatCount);

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                        {plan.description ? <p className="mt-1 text-sm text-slate-600">{plan.description}</p> : null}
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        {BILLING_PERIOD_LABELS[billingPeriod]}
                    </span>
                </div>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <dt className="font-medium">Koltuk sayısı</dt>
                        <dd className="ml-1 font-semibold text-slate-900">{seatCount} kişi</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4 text-blue-500" />
                        <dt className="font-medium">Temel ücret</dt>
                        <dd className="ml-1 text-slate-900">{formatCurrency(pricing.basePrice, pricing.currency)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-500" />
                        <dt className="font-medium">Koltuk başı</dt>
                        <dd className="ml-1 text-slate-900">{formatCurrency(pricing.perSeatPrice, pricing.currency)}</dd>
                    </div>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        <dt>Toplam (ilk fatura)</dt>
                        <dd className="ml-1">{formatCurrency(total, pricing.currency)}</dd>
                    </div>
                </dl>
            </div>
            {pricing.trialDays ? (
                <div className="flex items-start gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <ShieldCheck className="mt-0.5 h-5 w-5" />
                    <p>
                        Bu plan için <strong>{pricing.trialDays} gün</strong> ücretsiz denemeniz var. Kartınız yalnızca deneme süresi
                        sonunda otomatik olarak ücretlendirilecektir.
                    </p>
                </div>
            ) : null}
            {plan.features && plan.features.length > 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Plan özellikleri</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

function SignupWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const selectedPlan = usePublicSignupStore((state) => state.selectedPlan);
    const seatCount = usePublicSignupStore((state) => state.seatCount);
    const billingPeriod = usePublicSignupStore((state) => state.billingPeriod);
    const setPlanSelection = usePublicSignupStore((state) => state.setPlanSelection);
    const setSeatCountState = usePublicSignupStore((state) => state.setSeatCount);
    const setBillingPeriodState = usePublicSignupStore((state) => state.setBillingPeriod);
    const accountInfo = usePublicSignupStore((state) => state.accountInfo);
    const setAccountInfo = usePublicSignupStore((state) => state.setAccountInfo);
    const organizationInfo = usePublicSignupStore((state) => state.organizationInfo);
    const setOrganizationInfo = usePublicSignupStore((state) => state.setOrganizationInfo);
    const paymentResult = usePublicSignupStore((state) => state.paymentResult);
    const setPaymentResult = usePublicSignupStore((state) => state.setPaymentResult);
    const resetStore = usePublicSignupStore((state) => state.reset);

    const planId = searchParams?.get("planId") ?? selectedPlan?.id ?? "";
    const seatsParam = searchParams?.get("seats");
    const billingParam = searchParams?.get("billingPeriod");
    const inviteToken = searchParams?.get("inviteToken") ?? undefined;

    const parsedSeats = useMemo(() => {
        if (!seatsParam) {
            return null;
        }

        const parsed = Number(seatsParam);

        if (!Number.isFinite(parsed)) {
            return null;
        }

        const normalized = Math.min(Math.max(Math.round(parsed), MIN_SEAT_COUNT), MAX_SEAT_COUNT);
        return normalized;
    }, [seatsParam]);

    useEffect(() => {
        if (parsedSeats !== null && parsedSeats !== seatCount) {
            setSeatCountState(parsedSeats);
        }
    }, [parsedSeats, seatCount, setSeatCountState]);

    const parsedBillingPeriod = parseBillingPeriod(billingParam);

    useEffect(() => {
        if (parsedBillingPeriod && parsedBillingPeriod !== billingPeriod) {
            setBillingPeriodState(parsedBillingPeriod);
        }
    }, [parsedBillingPeriod, billingPeriod, setBillingPeriodState]);

    const { data: fetchedPlan } = useQuery({
        queryKey: ["public-plan", planId],
        queryFn: () => getPublicPlanById(planId),
        enabled: Boolean(planId) && (!selectedPlan || selectedPlan.id !== planId),
        staleTime: 1000 * 60 * 10,
    });

    useEffect(() => {
        if (fetchedPlan && (!selectedPlan || selectedPlan.id !== fetchedPlan.id)) {
            setPlanSelection({ plan: fetchedPlan });
        }
    }, [fetchedPlan, selectedPlan, setPlanSelection]);

    const pricing = useMemo(
        () => getPricingForPeriod(selectedPlan ?? fetchedPlan ?? null, billingPeriod),
        [selectedPlan, fetchedPlan, billingPeriod],
    );

    const accountForm = useForm<AccountFormValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: getAccountFormDefaultValues(accountInfo),
    });

    useEffect(() => {
        accountForm.reset(getAccountFormDefaultValues(accountInfo));
    }, [accountInfo, accountForm]);

    const organizationForm = useForm<OrganizationFormValues>({
        resolver: zodResolver(organizationSchema),
        defaultValues: getOrganizationFormDefaultValues(organizationInfo),
    });

    useEffect(() => {
        organizationForm.reset(getOrganizationFormDefaultValues(organizationInfo));
    }, [organizationInfo, organizationForm]);

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            cardHolderName: "",
            cardNumber: "",
            expireMonth: "",
            expireYear: "",
            cvc: "",
        },
    });

    const currentStep = steps[currentStepIndex] ?? steps[0]!;

    const goToStep = (index: number) => {
        if (index >= 0 && index < steps.length) {
            setCurrentStepIndex(index);
        }
    };

    const handleAccountSubmit = accountForm.handleSubmit((values) => {
        setAccountInfo(values);
        goToStep(currentStepIndex + 1);
    });

    const handleOrganizationSubmit = organizationForm.handleSubmit((values) => {
        setOrganizationInfo(values);
        goToStep(currentStepIndex + 1);
    });

    const handlePaymentSubmit = paymentForm.handleSubmit(async (values) => {
        if (!selectedPlan && !fetchedPlan) {
            return;
        }

        if (!accountInfo || !organizationInfo) {
            goToStep(0);
            return;
        }

        const plan = selectedPlan ?? fetchedPlan!;
        const sanitizedCard = sanitizeCardNumber(values.cardNumber);

        try {
            setPaymentResult(null);
            const response = await initializePublicSignupPayment({
                planId: plan.id,
                billingPeriod,
                seatCount,
                account: toPaymentAccountPayload(accountInfo),
                organization: toPaymentOrganizationPayload(organizationInfo),
                card: {
                    cardHolderName: values.cardHolderName,
                    cardNumber: sanitizedCard,
                    expireMonth: Number(values.expireMonth),
                    expireYear: Number(values.expireYear),
                    cvc: values.cvc,
                },
            });

            if (response.status === "FAILURE") {
                throw new Error(response.message ?? "Ödeme işlemi tamamlanamadı");
            }
            const signupPayload = {
                planId: plan.id,
                billingPeriod,
                seatCount,
                organizationName: organizationInfo.organizationName,
                organization: {
                    organizationName: organizationInfo.organizationName,
                    country: organizationInfo.country,
                    taxNumber: organizationInfo.taxNumber,
                    ...(organizationInfo.companySize ? { companySize: organizationInfo.companySize } : {}),
                },
                admin: {
                    firstName: accountInfo.firstName,
                    lastName: accountInfo.lastName,
                    email: accountInfo.email,
                    ...(accountInfo.phone ? { phone: accountInfo.phone } : {}),
                    password: accountInfo.password,
                },
                ...(inviteToken ? { inviteToken } : {}),
                ...(response.subscriptionId ? { subscriptionId: response.subscriptionId } : {}),
                ...(response.iyzicoSubscriptionId ? { iyzicoSubscriptionId: response.iyzicoSubscriptionId } : {}),
                ...(response.iyzicoCustomerId ? { iyzicoCustomerId: response.iyzicoCustomerId } : {}),
            } as const;

            const signupResponse = await createPublicSignup(signupPayload);

            if (signupResponse.status === "FAILED") {
                throw new Error(signupResponse.message ?? "Kayıt işlemi tamamlanamadı");
            }

            setPaymentResult({
                status: response.status,
                subscriptionId: response.subscriptionId ?? undefined,
                iyzicoSubscriptionId: response.iyzicoSubscriptionId,
                iyzicoCustomerId: response.iyzicoCustomerId,
                message: signupResponse.message ?? response.message,
                hasTrial: response.hasTrial ?? Boolean(pricing?.trialDays && pricing.trialDays > 0),
            });

            goToStep(currentStepIndex + 1);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Kart bilgileri doğrulanamadı";
            setPaymentResult({
                status: "FAILURE",
                message,
            });
            paymentForm.setError("cardNumber", { message });
        }
    });

    const handleBack = () => {
        if (currentStepIndex === 0) {
            router.push("/planlar");
            return;
        }

        goToStep(currentStepIndex - 1);
    };

    const handleReset = () => {
        resetStore();
        router.push("/planlar");
    };

    const renderStepContent = () => {
        switch (currentStep.key) {
            case "ACCOUNT":
                return (
                    <form onSubmit={handleAccountSubmit} className="space-y-5">
                        <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Ad"
                                    placeholder="Adınız"
                                    {...accountForm.register("firstName")}
                                    error={accountForm.formState.errors.firstName?.message}
                                    icon={<User className="h-4 w-4 text-slate-400" />}
                                    autoComplete="given-name"
                                />
                                <Input
                                    label="Soyad"
                                    placeholder="Soyadınız"
                                    {...accountForm.register("lastName")}
                                    error={accountForm.formState.errors.lastName?.message}
                                    icon={<User className="h-4 w-4 text-slate-400" />}
                                    autoComplete="family-name"
                                />
                            </div>
                            <Input
                                label="İş E-postası"
                                placeholder="ornek@firma.com"
                                {...accountForm.register("email")}
                                error={accountForm.formState.errors.email?.message}
                                icon={<Mail className="h-4 w-4 text-slate-400" />}
                                inputMode="email"
                                autoComplete="email"
                            />
                            <Input
                                type="password"
                                label="Parola"
                                placeholder="Parola oluşturun"
                                {...accountForm.register("password")}
                                error={accountForm.formState.errors.password?.message}
                                icon={<Lock className="h-4 w-4 text-slate-400" />}
                                autoComplete="new-password"
                            />
                            <Input
                                label="Telefon (opsiyonel)"
                                placeholder="0 (5xx) xxx xx xx"
                                {...accountForm.register("phone")}
                                error={accountForm.formState.errors.phone?.message}
                                icon={<Phone className="h-4 w-4 text-slate-400" />}
                                inputMode="tel"
                                autoComplete="tel"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Button type="button" variant="ghost" onClick={handleBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Planlara dön
                            </Button>
                            <Button type="submit" variant="primary">
                                Devam et
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                );
            case "ORGANIZATION":
                return (
                    <form onSubmit={handleOrganizationSubmit} className="space-y-5">
                        <div className="grid gap-4">
                            <Input
                                label="Organizasyon Adı"
                                placeholder="Şirket veya takım adınız"
                                {...organizationForm.register("organizationName")}
                                error={organizationForm.formState.errors.organizationName?.message}
                                icon={<Building2 className="h-4 w-4 text-slate-400" />}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Ülke"
                                    placeholder="Ülke"
                                    {...organizationForm.register("country")}
                                    error={organizationForm.formState.errors.country?.message}
                                    icon={<Info className="h-4 w-4 text-slate-400" />}
                                    autoComplete="country-name"
                                />
                                <Input
                                    label="Vergi Numarası"
                                    placeholder="Vergi numarası"
                                    {...organizationForm.register("taxNumber")}
                                    error={organizationForm.formState.errors.taxNumber?.message}
                                    icon={<Fingerprint className="h-4 w-4 text-slate-400" />}
                                />
                            </div>
                            <Input
                                label="Çalışan Sayısı (opsiyonel)"
                                placeholder="Örn. 25"
                                {...organizationForm.register("companySize")}
                                error={organizationForm.formState.errors.companySize?.message}
                                icon={<Users className="h-4 w-4 text-slate-400" />}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Button type="button" variant="ghost" onClick={() => goToStep(currentStepIndex - 1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Geri
                            </Button>
                            <Button type="submit" variant="primary">
                                Devam et
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                );
            case "SUMMARY":
                return (
                    <div className="space-y-6">
                        <PlanSummary plan={selectedPlan ?? fetchedPlan ?? null} seatCount={seatCount} billingPeriod={billingPeriod} />

                        <div className="flex items-center justify-between">
                            <Button type="button" variant="ghost" onClick={() => goToStep(currentStepIndex - 1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Geri
                            </Button>
                            <Button type="button" variant="primary" onClick={() => goToStep(currentStepIndex + 1)}>
                                Devam et
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                );
            case "PAYMENT":
                return (
                    <form onSubmit={handlePaymentSubmit} className="space-y-5">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-5 w-5 text-blue-500" />
                                <h3 className="text-lg font-semibold text-slate-900">Kart Bilgileri</h3>
                            </div>
                            <div className="mt-4 grid gap-4">
                                <Input
                                    label="Kart Üzerindeki İsim"
                                    placeholder="Ad Soyad"
                                    {...paymentForm.register("cardHolderName")}
                                    error={paymentForm.formState.errors.cardHolderName?.message}
                                />
                                <Input
                                    label="Kart Numarası"
                                    placeholder="0000 0000 0000 0000"
                                    {...paymentForm.register("cardNumber")}
                                    error={paymentForm.formState.errors.cardNumber?.message}
                                    inputMode="numeric"
                                />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Input
                                        label="Ay"
                                        placeholder="MM"
                                        {...paymentForm.register("expireMonth")}
                                        error={paymentForm.formState.errors.expireMonth?.message}
                                        inputMode="numeric"
                                        maxLength={2}
                                    />
                                    <Input
                                        label="Yıl"
                                        placeholder="YYYY"
                                        {...paymentForm.register("expireYear")}
                                        error={paymentForm.formState.errors.expireYear?.message}
                                        inputMode="numeric"
                                        maxLength={4}
                                    />
                                    <Input
                                        label="CVC"
                                        placeholder="CVC"
                                        {...paymentForm.register("cvc")}
                                        error={paymentForm.formState.errors.cvc?.message}
                                        inputMode="numeric"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-500" />
                            <p>
                                Kart bilgileriniz Iyzico ile güvenli bir şekilde tokenize edilir. Sunucularımızda kart numarası
                                saklanmaz.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <Button type="button" variant="ghost" onClick={() => goToStep(currentStepIndex - 1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Geri
                            </Button>
                            <Button type="submit" variant="primary" isLoading={paymentForm.formState.isSubmitting}>
                                Ödemeyi Tamamla
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                );
            case "CONFIRMATION":
                return (
                    <div className="space-y-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold text-slate-900">Kayıt tamamlandı!</h2>
                            {paymentResult?.hasTrial ? (
                                <p className="text-sm text-slate-600">
                                    {paymentResult.message ??
                                        `${paymentResult.hasTrial ? "Denemeniz başladı" : "Aboneliğiniz aktifleştirildi"}. Kartınız deneme süresi sonunda otomatik olarak ücretlendirilecek.`}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-600">
                                    {paymentResult?.message ?? "Ödeme işleminiz başarıyla tamamlandı ve aboneliğiniz aktifleştirildi."}
                                </p>
                            )}
                            {paymentResult?.subscriptionId ? (
                                <p className="text-xs text-slate-500">
                                    Abonelik numaranız: <strong>{paymentResult.subscriptionId}</strong>
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                            <Button type="button" variant="primary" onClick={handleReset}>
                                Planlara Dön
                            </Button>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Giriş Yap
                            </Link>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
                <aside className="lg:w-1/3">
                    <div className="sticky top-10 space-y-6">
                        <div>
                            <button
                                type="button"
                                onClick={handleBack}
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Planlara geri dön
                            </button>
                            <h1 className="mt-4 text-3xl font-bold text-slate-900">Abonelik ve Kayıt</h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Birkaç adımda hesap yöneticinizi oluşturun, organizasyon bilgilerinizi girin ve Iyzico üzerinden
                                kartınızı tanımlayın.
                            </p>
                        </div>

                        <StepHeader currentStep={currentStep.key} />

                        <PlanSummary plan={selectedPlan ?? fetchedPlan ?? null} seatCount={seatCount} billingPeriod={billingPeriod} />
                    </div>
                </aside>

                <main className="flex-1">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <header className="mb-6 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{currentStep.title}</p>
                            <h2 className="text-xl font-semibold text-slate-900">{currentStep.title}</h2>
                            <p className="text-sm text-slate-600">{currentStep.description}</p>
                        </header>

                        {selectedPlan || fetchedPlan ? (
                            renderStepContent()
                        ) : (
                            <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                                <AlertCircle className="mt-0.5 h-5 w-5" />
                                <div className="space-y-1 text-sm">
                                    <p>Devam etmek için bir plan seçmeniz gerekiyor.</p>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/planlar")}
                                        className="font-medium text-blue-700 underline-offset-4 hover:underline"
                                    >
                                        Planlara git
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function SignupWizardPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    İçerik yükleniyor...
                </div>
            }
        >
            <SignupWizardContent />
        </Suspense>
    );
}

