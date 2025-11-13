"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Input } from "@/components/Input";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, createBillingPlan } from "@/lib/api";
import type { BillingPeriod, CreatePlanPayload } from "@/lib/types";

const BILLING_PERIODS: BillingPeriod[] = ["MONTH", "YEAR"];
const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    MONTH: "Aylık",
    YEAR: "Yıllık",
};
const CURRENCY_OPTIONS = ["TRY", "USD", "EUR", "GBP"] as const;

interface PeriodFormState {
    enabled: boolean;
    priceId: string;
    currency: string;
    amount: string;
    basePrice: string;
    perSeatPrice: string;
    seatLimit: string;
    trialDays: string;
}

const createEmptyPeriod = (enabled = false): PeriodFormState => ({
    enabled,
    priceId: "",
    currency: "TRY",
    amount: "",
    basePrice: "",
    perSeatPrice: "",
    seatLimit: "",
    trialDays: "",
});

const selectClasses =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

export default function PlanManagementPage() {
    const { user } = useAuth();
    const [planId, setPlanId] = useState("");
    const [planName, setPlanName] = useState("");
    const [description, setDescription] = useState("");
    const [defaultBasePrice, setDefaultBasePrice] = useState("");
    const [defaultPerSeatPrice, setDefaultPerSeatPrice] = useState("");
    const [features, setFeatures] = useState<string[]>([""]);
    const [periods, setPeriods] = useState<Record<BillingPeriod, PeriodFormState>>({
        MONTH: createEmptyPeriod(true),
        YEAR: createEmptyPeriod(false),
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const planMutation = useMutation({
        mutationFn: createBillingPlan,
    });

    const resetForm = () => {
        setPlanId("");
        setPlanName("");
        setDescription("");
        setDefaultBasePrice("");
        setDefaultPerSeatPrice("");
        setFeatures([""]);
        setPeriods({
            MONTH: createEmptyPeriod(true),
            YEAR: createEmptyPeriod(false),
        });
        setFormError(null);
    };

    const handleFeatureChange = (index: number, value: string) => {
        setFeatures((current) => {
            const copy = [...current];
            copy[index] = value;
            return copy;
        });
    };

    const addFeatureField = () => setFeatures((current) => [...current, ""]);

    const removeFeatureField = (index: number) => {
        setFeatures((current) => {
            if (current.length === 1) return current;
            return current.filter((_, i) => i !== index);
        });
    };

    const setPeriodValue = (
        period: BillingPeriod,
        key: keyof PeriodFormState,
        value: string | boolean,
    ) => {
        setPeriods((prev) => ({
            ...prev,
            [period]: {
                ...prev[period],
                [key]: value,
            },
        }));
    };

    const buildPayload = (): CreatePlanPayload | null => {
        const fail = (message: string) => {
            setFormError(message);
            return null;
        };

        const trimmedId = planId.trim();
        const trimmedName = planName.trim();

        if (!trimmedId) {
            return fail("Plan ID alanı boş bırakılamaz.");
        }
        if (!trimmedName) {
            return fail("Plan adı zorunludur.");
        }

        const enabledPeriods = BILLING_PERIODS.filter((period) => periods[period].enabled);
        if (enabledPeriods.length === 0) {
            return fail("En az bir faturalama dönemini aktif etmelisiniz.");
        }

        const prices = [];
        for (const period of enabledPeriods) {
            const periodState = periods[period];
            const periodLabel = BILLING_PERIOD_LABELS[period];
            const priceId = periodState.priceId.trim();
            const amountValue = periodState.amount.trim();
            const currency = periodState.currency.trim();

            if (!priceId) {
                return fail(`${periodLabel} dönemi için Price ID zorunludur.`);
            }
            if (!amountValue) {
                return fail(`${periodLabel} dönemi için koltuk başı fiyatı girin.`);
            }

            const amount = Number(amountValue);
            if (!Number.isFinite(amount) || amount < 0) {
                return fail(`${periodLabel} dönemi için koltuk başı fiyatı geçerli bir sayı olmalıdır.`);
            }

            if (!currency) {
                return fail(`${periodLabel} dönemi için para birimi seçin.`);
            }

            let seatLimit: number | null = null;
            const seatLimitValue = periodState.seatLimit.trim();
            if (seatLimitValue) {
                const parsed = Number(seatLimitValue);
                if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
                    return fail(`${periodLabel} dönemi için koltuk limiti pozitif tam sayı olmalıdır.`);
                }
                seatLimit = parsed;
            }

            let trialDays: number | null = null;
            const trialValue = periodState.trialDays.trim();
            if (trialValue) {
                const parsed = Number(trialValue);
                if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
                    return fail(`${periodLabel} dönemi için deneme süresi negatif olmayan tam sayı olmalıdır.`);
                }
                trialDays = parsed;
            }

            prices.push({
                id: priceId,
                amount,
                currency,
                billingPeriod: period,
                seatLimit,
                trialDays,
            });
        }

        const metadata: Record<string, number> = {};
        const base = defaultBasePrice.trim();
        if (base) {
            const parsed = Number(base);
            if (!Number.isFinite(parsed) || parsed < 0) {
                return fail("Taban ücret alanı geçerli bir sayı olmalıdır.");
            }
            metadata.basePrice = parsed;
        }

        const seat = defaultPerSeatPrice.trim();
        if (seat) {
            const parsed = Number(seat);
            if (!Number.isFinite(parsed) || parsed < 0) {
                return fail("Koltuk başı taban ücreti geçerli bir sayı olmalıdır.");
            }
            metadata.perSeatPrice = parsed;
        }

        for (const period of BILLING_PERIODS) {
            const state = periods[period];
            const suffix = period.toLowerCase();
            if (state.basePrice.trim()) {
                const parsed = Number(state.basePrice.trim());
                if (!Number.isFinite(parsed) || parsed < 0) {
                    return fail(`${BILLING_PERIOD_LABELS[period]} dönemi taban ücreti geçerli bir sayı olmalıdır.`);
                }
                metadata[`basePrice_${suffix}`] = parsed;
            }
            if (state.perSeatPrice.trim()) {
                const parsed = Number(state.perSeatPrice.trim());
                if (!Number.isFinite(parsed) || parsed < 0) {
                    return fail(`${BILLING_PERIOD_LABELS[period]} dönemi koltuk başı ücreti geçerli bir sayı olmalıdır.`);
                }
                metadata[`perSeatPrice_${suffix}`] = parsed;
            }
        }

        const sanitizedFeatures = features
            .map((feature) => feature.trim())
            .filter((feature) => feature.length > 0);

        const descriptionValue = description.trim();

        return {
            id: trimmedId,
            name: trimmedName,
            description: descriptionValue || undefined,
            features: sanitizedFeatures,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            prices,
        };
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        setSuccessMessage(null);

        const payload = buildPayload();
        if (!payload) {
            return;
        }

        try {
            const createdPlan = await planMutation.mutateAsync(payload);
            setSuccessMessage(`${createdPlan.name} planı başarıyla kaydedildi.`);
            resetForm();
        } catch (error) {
            if (error instanceof ApiError) {
                setFormError(error.message || "Plan kaydedilirken bir hata oluştu.");
            } else {
                setFormError("Plan kaydedilirken bir hata oluştu.");
            }
        }
    };

    if (!user) {
        return (
            <Layout title="Plan Yönetimi" subtitle="Yeni ücret planları oluşturun">
                <div className="col-span-12">
                    <Card>
                        <CardContent>Kullanıcı bilgisi yükleniyor...</CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    if (user.role !== "SUPER_ADMIN") {
        return (
            <Layout title="Plan Yönetimi" subtitle="Yeni ücret planları oluşturun">
                <div className="col-span-12">
                    <Card>
                        <CardHeader>Yetkisiz Erişim</CardHeader>
                        <CardContent>
                            Bu sayfaya yalnızca super admin rolündeki kullanıcılar erişebilir.
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Plan Yönetimi" subtitle="Yeni planlar ekleyin ve fiyatlandırmayı tanımlayın">
            <div className="col-span-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>Plan Bilgileri</CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600">
                                Plan ID değeri slug/unique anahtar olarak kullanılacaktır. Hem onboarding akışında hem de
                                /planlar vitrini bu alanı kullanır.
                            </p>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Plan ID"
                                    value={planId}
                                    onChange={(event) => setPlanId(event.target.value)}
                                    placeholder="growth"
                                    required
                                />
                                <Input
                                    label="Plan Adı"
                                    value={planName}
                                    onChange={(event) => setPlanName(event.target.value)}
                                    placeholder="Growth"
                                    required
                                />
                            </div>
                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-medium text-gray-800">Açıklama</label>
                                <textarea
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    className="min-h-[90px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Plan hakkında kısa bir açıklama girin"
                                />
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Varsayılan Taban Ücret"
                                    type="number"
                                    min="0"
                                    value={defaultBasePrice}
                                    onChange={(event) => setDefaultBasePrice(event.target.value)}
                                    hint="Planın her dönem için başlangıç ücreti"
                                />
                                <Input
                                    label="Varsayılan Koltuk Başı Ücret"
                                    type="number"
                                    min="0"
                                    value={defaultPerSeatPrice}
                                    onChange={(event) => setDefaultPerSeatPrice(event.target.value)}
                                    hint="Seçilen dönem özelinde değer girilmemişse kullanılacak"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>Plan Özellikleri</CardHeader>
                        <CardContent className="space-y-4">
                            {features.map((feature, index) => (
                                <div key={`feature-${index}`} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Input
                                            label={`Özellik ${index + 1}`}
                                            value={feature}
                                            onChange={(event) => handleFeatureChange(index, event.target.value)}
                                            placeholder="Örn. Gelişmiş raporlama"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="mt-6 text-red-600 hover:text-red-700"
                                        onClick={() => removeFeatureField(index)}
                                        disabled={features.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addFeatureField} className="gap-2">
                                <Plus className="h-4 w-4" /> Özellik Ekle
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>Fiyatlandırma</CardHeader>
                        <CardContent className="space-y-6">
                            {BILLING_PERIODS.map((period) => {
                                const state = periods[period];
                                return (
                                    <div key={period} className="rounded-2xl border border-gray-200 p-4">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-base font-semibold text-gray-900">
                                                    {BILLING_PERIOD_LABELS[period]}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Bu dönemi aktif ederek plan vitrininde gösterirsiniz.
                                                </p>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={state.enabled}
                                                    onChange={(event) =>
                                                        setPeriodValue(period, "enabled", event.target.checked)
                                                    }
                                                />
                                                Dönem aktif
                                            </label>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <Input
                                                label="Price ID"
                                                value={state.priceId}
                                                onChange={(event) => setPeriodValue(period, "priceId", event.target.value)}
                                                placeholder={`${period.toLowerCase()}-price-id`}
                                                disabled={!state.enabled}
                                            />
                                            <Input
                                                label="Koltuk Başı Fiyat"
                                                type="number"
                                                min="0"
                                                value={state.amount}
                                                onChange={(event) => setPeriodValue(period, "amount", event.target.value)}
                                                disabled={!state.enabled}
                                            />
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-800">Para Birimi</label>
                                                <select
                                                    className={selectClasses}
                                                    value={state.currency}
                                                    onChange={(event) => setPeriodValue(period, "currency", event.target.value)}
                                                    disabled={!state.enabled}
                                                >
                                                    {CURRENCY_OPTIONS.map((currency) => (
                                                        <option key={currency} value={currency}>
                                                            {currency}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <Input
                                                label="Döneme Özel Taban Ücret"
                                                type="number"
                                                min="0"
                                                value={state.basePrice}
                                                onChange={(event) => setPeriodValue(period, "basePrice", event.target.value)}
                                                hint="Boş bırakılırsa varsayılan değer kullanılır"
                                                disabled={!state.enabled}
                                            />
                                            <Input
                                                label="Döneme Özel Koltuk Ücreti"
                                                type="number"
                                                min="0"
                                                value={state.perSeatPrice}
                                                onChange={(event) => setPeriodValue(period, "perSeatPrice", event.target.value)}
                                                hint="Boş bırakılırsa varsayılan değer kullanılır"
                                                disabled={!state.enabled}
                                            />
                                            <Input
                                                label="Koltuk Limiti"
                                                type="number"
                                                min="1"
                                                value={state.seatLimit}
                                                onChange={(event) => setPeriodValue(period, "seatLimit", event.target.value)}
                                                hint="Opsiyonel"
                                                disabled={!state.enabled}
                                            />
                                            <Input
                                                label="Deneme Süresi (Gün)"
                                                type="number"
                                                min="0"
                                                value={state.trialDays}
                                                onChange={(event) => setPeriodValue(period, "trialDays", event.target.value)}
                                                hint="Opsiyonel"
                                                disabled={!state.enabled}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {formError ? (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{formError}</span>
                        </div>
                    ) : null}

                    {successMessage ? (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{successMessage}</span>
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                        <Button type="button" variant="outline" onClick={resetForm}>
                            Formu Temizle
                        </Button>
                        <Button type="submit" isLoading={planMutation.isPending} className="md:min-w-[200px]">
                            Planı Kaydet
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
