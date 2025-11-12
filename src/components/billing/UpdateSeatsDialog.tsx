"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Users } from "lucide-react";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import Modal from "@/components/Modal";
import { Input } from "@/components/Input";
import { updateSubscriptionSeats } from "@/lib/api";
import type { SeatProration, Subscription } from "@/lib/types";
import { SeatProrationOptions } from "@/lib/types";

interface SeatPricingInfo {
    basePrice: number;
    perSeatPrice: number;
    currency: string;
}

interface UpdateSeatsDialogProps {
    isOpen: boolean;
    subscription: Subscription;
    pricing: SeatPricingInfo;
    onClose: () => void;
    onSuccess?: (subscription: Subscription) => void;
    minSeats?: number;
    maxSeats?: number;
}

const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency || "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

export default function UpdateSeatsDialog({
    isOpen,
    subscription,
    pricing,
    onClose,
    onSuccess,
    minSeats = 1,
    maxSeats = 200,
}: UpdateSeatsDialogProps) {
    const queryClient = useQueryClient();
    const [seatCount, setSeatCount] = useState(subscription.seats);
    const [proration, setProration] = useState<SeatProration>("IMMEDIATE");

    useEffect(() => {
        if (!isOpen) return;
        setSeatCount(subscription.seats);
        setProration("IMMEDIATE");
    }, [isOpen, subscription.seats]);

    const mutation = useMutation({
        mutationFn: (payload: { seatCount: number; proration: SeatProration }) =>
            updateSubscriptionSeats(subscription.id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({
                queryKey: ["customer-subscriptions", subscription.customerId],
            });
            queryClient.invalidateQueries({ queryKey: ["subscription", subscription.id] });
            onSuccess?.(updated);
            onClose();
        },
        onError: (error: unknown) => {
            console.error("Koltuk güncelleme başarısız", error);
            alert("Koltuk güncelleme sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        },
    });

    const currentTotal = useMemo(
        () => pricing.basePrice + pricing.perSeatPrice * subscription.seats,
        [pricing.basePrice, pricing.perSeatPrice, subscription.seats],
    );

    const newTotal = useMemo(
        () => pricing.basePrice + pricing.perSeatPrice * seatCount,
        [pricing.basePrice, pricing.perSeatPrice, seatCount],
    );

    const difference = newTotal - currentTotal;

    const differenceLabel = useMemo(() => {
        if (difference === 0) {
            return formatCurrency(0, pricing.currency);
        }

        const formatted = formatCurrency(Math.abs(difference), pricing.currency);
        return difference > 0 ? `+${formatted}` : `-${formatted}`;
    }, [difference, pricing.currency]);

    const chartData = useMemo(
        () => [
            { label: "Mevcut", value: currentTotal },
            { label: "Yeni", value: newTotal },
        ],
        [currentTotal, newTotal],
    );

    const handleSeatChange = (value: number) => {
        const clamped = Math.min(Math.max(value, minSeats), maxSeats);
        setSeatCount(clamped);
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number.parseInt(event.target.value, 10);
        if (Number.isNaN(nextValue)) {
            setSeatCount(minSeats);
            return;
        }
        handleSeatChange(nextValue);
    };

    const handleSubmit = () => {
        if (seatCount === subscription.seats) return;
        mutation.mutate({ seatCount, proration });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Koltuk Sayısını Güncelle"
            description="Takımınız için ihtiyaç duyduğunuz koltuk sayısını ayarlayın."
            actions={[
                {
                    label: "Vazgeç",
                    onClick: onClose,
                    variant: "outline",
                },
                {
                    label: "Koltukları Güncelle",
                    onClick: handleSubmit,
                    isLoading: mutation.isPending,
                    disabled: seatCount === subscription.seats,
                },
            ]}
        >
            <div className="grid gap-6 md:grid-cols-[1.2fr_minmax(0,1fr)]">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700">
                            Koltuk sayısı ({seatCount})
                            <input
                                type="range"
                                min={minSeats}
                                max={maxSeats}
                                value={seatCount}
                                onChange={(event) => handleSeatChange(Number(event.target.value))}
                                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-blue-100 accent-blue-500"
                            />
                        </label>
                        <Input
                            type="number"
                            min={minSeats}
                            max={maxSeats}
                            value={seatCount}
                            onChange={handleInputChange}
                            label="Manuel giriş"
                            hint={`En az ${minSeats}, en fazla ${maxSeats} koltuk.`}
                        />
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Prorasyon Zamanı</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            {SeatProrationOptions.map((option) => (
                                <label
                                    key={option}
                                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-blue-300"
                                >
                                    <input
                                        type="radio"
                                        className="h-4 w-4"
                                        name="seat-proration"
                                        value={option}
                                        checked={proration === option}
                                        onChange={() => setProration(option)}
                                    />
                                    <span>
                                        {option === "IMMEDIATE" ? "Hemen Uygula" : "Dönem Sonunda"}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {proration === "AT_PERIOD_END" ? (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                Dönem sonunda uygulanır ve mevcut dönem boyunca koltuk sayısı korunur.
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Users className="h-4 w-4" />
                        Tahmini Fiyat Farkı
                    </div>
                    <div className="h-32 w-full">
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <XAxis dataKey="label" hide />
                                <YAxis hide domain={[0, Math.max(newTotal, currentTotal) * 1.2 || 1]} />
                                <Tooltip
                                    cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                                    formatter={(value: number) => formatCurrency(value, pricing.currency)}
                                />
                                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span>Mevcut tutar</span>
                            <strong>{formatCurrency(currentTotal, pricing.currency)}</strong>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <span>Yeni tutar</span>
                            <strong>{formatCurrency(newTotal, pricing.currency)}</strong>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs font-medium">
                            <span>Fark</span>
                            <span
                                className={
                                    difference > 0
                                        ? "text-blue-600"
                                        : difference < 0
                                        ? "text-emerald-600"
                                        : "text-slate-500"
                                }
                            >
                                {differenceLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
