"use client";

import { useEffect, useId, useState } from "react";


import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Input } from "@/components/Input";
import {
    createSale,
    getHotels,
    getTransferRoutes,
    type Hotel,
    type SaleResponse,
    type SalesPayload,
    type TransferRoute,
} from "@/lib/api";
import {
    downloadDocumentWithAuth,
    inferDocumentFileName,
    resolveDocumentUrl,
} from "@/lib/document";

import type { FormEvent } from "react";

type Currency = "TRY" | "USD" | "EUR" | "GBP";
type SalesFormState = Omit<SalesPayload, "price" | "nights"> & {
    price: number | "";
    nights: number | "";
};

const STEPS = ["Operasyon", "Fiyat", "Konaklama & Transfer", "Belgeler & Onay"];
const FALLBACK_TRANSFER_OPTIONS: TransferRoute[] = [
    { id: "full", name: "Full" },
    { id: "airport-hotel", name: "Havalimanı → Otel" },
    { id: "airport-clinic", name: "Havalimanı → Klinik" },
    { id: "op-day-arrive", name: "Operasyon Günü Geliş" },
    { id: "op-day-return", name: "Operasyon Günü Dönüş" },
    { id: "dressing-arrive", name: "Pansuman Günü Geliş" },
    { id: "dressing-return", name: "Pansuman Günü Dönüş" },
    { id: "wash-arrive", name: "Yıkama Günü Geliş" },
    { id: "wash-return", name: "Yıkama Günü Dönüş" },
    { id: "hotel-airport", name: "Otel → Havalimanı" },
];
export default function SalesForm({
    leadId,
    onSubmit,
}: {
    leadId: string; // ✅ UUID string olmalı
    onSubmit: (
        payload: SalesPayload,
        result: { sale?: SaleResponse | null; saleId?: string | null }
    ) => void;
})
 {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [form, setForm] = useState<SalesFormState>({
        leadId,
        operationDate: "",
        operationType: "",
        price: "",
        currency: "TRY",
        hotel: "",
        nights: "",
        transfer: [],
        transferPreference: "NO",
    });
    const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
    const [documentFileName, setDocumentFileName] = useState<string>("satis-belgesi.pdf");
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [transferOptions, setTransferOptions] = useState<TransferRoute[]>([]);
    const [passportFile, setPassportFile] = useState<File | null>(null);
    const [flightTicketFile, setFlightTicketFile] = useState<File | null>(null);
    const idPrefix = useId();
    const fieldIds = {
        operationDate: `${idPrefix}-operation-date`,
        operationType: `${idPrefix}-operation-type`,
        price: `${idPrefix}-price`,
        currency: `${idPrefix}-currency`,
        hotel: `${idPrefix}-hotel`,
        nights: `${idPrefix}-nights`,
        transferYes: `${idPrefix}-transfer-yes`,
        transferNo: `${idPrefix}-transfer-no`,
        passport: `${idPrefix}-passport`,
        flight: `${idPrefix}-flight`,
    } as const;

    const formatCurrency = (value: number | null | undefined, currency?: string | null) => {
        if (typeof value !== "number" || Number.isNaN(value)) return null;
        const resolvedCurrency = currency ?? "EUR";
        try {
            return new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: resolvedCurrency,
                maximumFractionDigits: 2,
            }).format(value);
        } catch (error) {
            console.warn("Currency format error", error);
            return `${value} ${resolvedCurrency}`;
        }
    };

    const formatHotelOption = (hotel: Hotel): string => {
        const parts: string[] = [];
        if (hotel.name) parts.push(hotel.name);
        if (typeof hotel.starRating === "number" && !Number.isNaN(hotel.starRating)) {
            parts.push(`${hotel.starRating}★`);
        }
        return parts.join(" • ") || hotel.id;
    };

    const getHotelStars = (hotel: Hotel): string => {
        if (typeof hotel.starRating !== "number" || Number.isNaN(hotel.starRating)) return "-";
        const rating = Math.max(1, Math.min(5, Math.round(hotel.starRating)));
        return `${rating} (${"★".repeat(rating)})`;
    };

    const getTransferSegments = (route: TransferRoute): string[] => {
        const segments: string[] = [];
        if (route.start) segments.push(route.start);
        const stops = Array.isArray(route.stops)
            ? route.stops.filter((stop) => !!stop && stop.trim() !== "")
            : [];
        segments.push(...stops);
        if (route.final) segments.push(route.final);
        if (segments.length === 0 && route.name) {
            return route.name
                .split(/[→>-]/)
                .map((segment) => segment.replace(/^-|-$|>/g, "").trim())
                .filter(Boolean);
        }
        return segments;
    };

    const formatTransferLabel = (route: TransferRoute): string => {
        const segments = getTransferSegments(route);
        const path = segments.length > 0 ? segments.join(" → ") : route.name ?? "";
        const price =
            typeof route.price === "number" && !Number.isNaN(route.price)
                ? formatCurrency(route.price, route.currency)
                : null;
        return price ? `${path} (${price})` : path;
    };

    useEffect(() => {
        const fetchOptions = async () => {
            const [fetchedHotels, fetchedTransfers] = await Promise.all([
                getHotels(),
                getTransferRoutes(),
            ]);

            setHotels(fetchedHotels);
            setTransferOptions(fetchedTransfers);
        };

        void fetchOptions();
    }, []);

    const validateStep = () => {
        const errs: string[] = [];
        if (step === 1) {
            if (!form.operationDate) errs.push("Operasyon tarihi seçilmelidir.");
            if (!form.operationType) errs.push("Operasyon türü seçilmelidir.");
        }
        if (step === 2) {
            if (form.price === "" || Number(form.price) <= 0)
                errs.push("Geçerli bir fiyat giriniz.");
        }
        if (step === 3) {
            if (!form.transferPreference) errs.push("Transfer tercihi seçilmelidir.");
            if (!form.hotel) errs.push("Otel seçilmelidir.");
            if (form.nights === "" || Number(form.nights) <= 0)
                errs.push("Gece sayısı 1 veya üzeri olmalıdır.");
            if (form.transferPreference === "YES" && form.transfer.length === 0)
                errs.push("Transfer seçeneklerinden en az birini işaretleyiniz.");
        }
        setErrors(errs);
        return errs.length === 0;
    };

    const next = () => validateStep() && setStep((s) => s + 1);
    const prev = () => setStep((s) => s - 1);

    const submit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateStep()) return;

        setSubmitError(null);
        setSuccess(false);
        setDocumentUrl(null);

        const payload = {
            leadId: String(leadId),
            operationDate: form.operationDate,
            operationType: form.operationType,
            price: Number(form.price) || 0,
            currency: form.currency,
            hotel: form.hotel,
            nights: Number(form.nights) || 0,
            transfer:
                form.transferPreference === "YES" ? form.transfer : [],
            transferPreference: form.transferPreference || "NO",
        };

        const { success: saleCreated, sale, saleId } = await createSale(payload, {
            passport: passportFile,
            flightTicket: flightTicketFile,
        });

        if (saleCreated) {
            setSuccess(true);
            onSubmit(payload, { sale: sale ?? null, saleId: saleId ?? null });

            setPassportFile(null);
            setFlightTicketFile(null);

            const url = resolveDocumentUrl(sale?.documentPath, sale?.id ?? saleId ?? null);
            setDocumentUrl(url);
            setDocumentFileName(inferDocumentFileName(sale?.documentPath));
        } else {
            setSubmitError("❌ Satış kaydedilemedi.");
        }
    };

    const transferChoices =
        transferOptions.length > 0 ? transferOptions : FALLBACK_TRANSFER_OPTIONS;
    const normalizeValue = (value: string | null | undefined) =>
        value ? value.trim().toLocaleLowerCase("tr-TR") : "";
    const getTransferOptionValue = (transfer: TransferRoute) => transfer.id ?? transfer.name ?? "";
    const fullTransferValue = transferChoices.reduce<string | null>((acc, transfer) => {
        if (acc) return acc;
        const isFullOption =
            normalizeValue(transfer.name) === "full" || normalizeValue(transfer.id) === "full";
        if (!isFullOption) return acc;
        const optionValue = getTransferOptionValue(transfer);
        return optionValue || acc;
    }, null);
    const fullSelected = fullTransferValue
        ? form.transfer.includes(fullTransferValue)
        : form.transfer.some((value) => normalizeValue(value) === "full");

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex justify-between items-center">
                <div className="font-semibold text-base">Satış / Operasyon</div>
                <div className="text-xs text-gray-500">Adım {step} / {STEPS.length}</div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* ✅ Stepper */}
                <ol className="mb-3 grid grid-cols-4 gap-2 text-xs">
                    {STEPS.map((label, idx) => {
                        const num = idx + 1;
                        const active = step === num;
                        const done = step > num;
                        return (
                            <li
                                key={label}
                                className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                                    active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                                } transition-colors`}
                            >
                <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        done
                            ? "bg-green-500 text-white"
                            : active
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700"
                    }`}
                >
                  {num}
                </span>
                                <span className="truncate">{label}</span>
                            </li>
                        );
                    })}
                </ol>

                {/* ⚠️ Hata mesajları */}
                {errors.length > 0 && (
                    <div
                        className="mb-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md"
                        aria-live="polite"
                        role="alert"
                    >
                        {errors.map((e, i) => (
                            <p key={i}>• {e}</p>
                        ))}
                    </div>
                )}
                {submitError && (
                    <div
                        className="mb-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md"
                        aria-live="polite"
                        role="alert"
                    >
                        {submitError}
                    </div>
                )}

                {/* ✅ Başarı mesajı */}
                {success && (
                    <div
                        className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-md flex flex-wrap items-center gap-2"
                        aria-live="polite"
                        role="status"
                    >
                        <span>✅ Satış başarıyla kaydedildi.</span>
                        {documentUrl && (
                            <button
                                type="button"
                                className="underline font-medium disabled:opacity-60"
                                onClick={async () => {
                                    setIsDownloadingDocument(true);
                                    try {
                                        const result = await downloadDocumentWithAuth(
                                            documentUrl,
                                            documentFileName
                                        );

                                        if (!result.success) {
                                            if (result.status === 401) {
                                                alert(
                                                    "Belgeyi görüntülemek için lütfen tekrar giriş yapınız."
                                                );
                                            } else {
                                                alert(
                                                    "Satış belgesi indirilemedi. Lütfen daha sonra tekrar deneyiniz."
                                                );
                                            }
                                        }
                                    } finally {
                                        setIsDownloadingDocument(false);
                                    }
                                }}
                                disabled={isDownloadingDocument}
                            >
                                {isDownloadingDocument ? "Belge indiriliyor..." : "Satış belgesini görüntüle"}
                            </button>
                        )}
                    </div>
                )}

                {/* 🧭 Step 1: Operasyon */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <Input
                                label="Operasyon Tarihi"
                                type="date"
                                id={fieldIds.operationDate}
                                value={form.operationDate}
                                onClick={(e) => e.currentTarget.showPicker?.()}
                                onFocus={(e) => e.currentTarget.showPicker?.()}
                                onChange={(e) =>
                                    setForm({ ...form, operationDate: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor={fieldIds.operationType}>
                                Operasyon Türü
                            </label>
                            <select
                                id={fieldIds.operationType}
                                className="border rounded-lg p-2 w-full shadow-sm"
                                value={form.operationType}
                                onChange={(e) =>
                                    setForm({ ...form, operationType: e.target.value })
                                }
                            >
                                <option value="">Seçiniz</option>
                                <optgroup label="Saç Ekim">
                                    <option value="Saç - FUE">Saç - FUE</option>
                                    <option value="Saç - DHI">Saç - DHI</option>
                                    <option value="Saç - Kök Hücre">Saç - Kök Hücre</option>
                                </optgroup>
                                <optgroup label="Estetik">
                                    <option value="Burun Estetiği">Burun Estetiği</option>
                                    <option value="Liposuction">Liposuction</option>
                                    <option value="BBL (Brezilya Popo)">BBL (Brezilya Popo)</option>
                                    <option value="Meme Büyütme">Meme Büyütme</option>
                                    <option value="Mide Ameliyatları">Mide Ameliyatları</option>
                                </optgroup>
                            </select>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="primary" onClick={next}>
                                Devam Et
                            </Button>
                        </div>
                    </div>
                )}

                {/* 💰 Step 2: Fiyat */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor={fieldIds.price}>
                                Fiyat
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id={fieldIds.price}
                                    type="number"
                                    placeholder="0"
                                    value={form.price}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            price:
                                                e.target.value === "" ? "" : Number(e.target.value),
                                        })
                                    }
                                />
                                <div className="flex flex-col">
                                    <label className="sr-only" htmlFor={fieldIds.currency}>
                                        Para birimi
                                    </label>
                                    <select
                                        id={fieldIds.currency}
                                        className="border rounded-lg p-2 shadow-sm"
                                        value={form.currency}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                currency: e.target.value as Currency,
                                            })
                                        }
                                    >
                                        <option value="TRY">₺</option>
                                        <option value="USD">$</option>
                                        <option value="EUR">€</option>
                                        <option value="GBP">£</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>
                                Geri
                            </Button>
                            <Button variant="primary" onClick={next}>
                                Devam Et
                            </Button>
                        </div>
                    </div>
                )}

                {/* 🏨 Step 3: Konaklama */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor={fieldIds.hotel}>
                                Otel
                            </label>
                            <select
                                id={fieldIds.hotel}
                                className="border rounded-lg p-2 w-full shadow-sm"
                                value={form.hotel}
                                onChange={(e) => setForm({ ...form, hotel: e.target.value })}
                            >
                                <option value="">Seçiniz</option>
                                {hotels.map((hotel) => (
                                    <option key={hotel.id} value={hotel.id}>
                                        {formatHotelOption(hotel)}
                                    </option>
                                ))}
                            </select>
                            {form.hotel && (
                                (() => {
                                    const selectedHotel = hotels.find((hotel) => hotel.id === form.hotel);
                                    if (!selectedHotel) return null;
                                    return (
                                        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                            <div className="font-medium">
                                                {selectedHotel.name ?? selectedHotel.id}
                                            </div>
                                            <div>Yıldız: {getHotelStars(selectedHotel)}</div>
                                            <div className="text-blue-900/80">
                                                {selectedHotel.address ?? "Adres bilgisi bulunmuyor."}
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        <div>
                            <Input
                                label="Gece Sayısı"
                                id={fieldIds.nights}
                                type="number"
                                min={1}
                                value={form.nights}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        nights:
                                            e.target.value === "" ? "" : Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div>
                            <span className="block text-sm font-medium mb-1">Transfer</span>
                            <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                                <div className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id={fieldIds.transferYes}
                                        name="transfer-preference"
                                        value="YES"
                                        checked={form.transferPreference === "YES"}
                                        onChange={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                transferPreference: "YES",
                                            }))
                                        }
                                    />
                                    <label htmlFor={fieldIds.transferYes}>Evet</label>
                                </div>
                                <div className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id={fieldIds.transferNo}
                                        name="transfer-preference"
                                        value="NO"
                                        checked={form.transferPreference === "NO"}
                                        onChange={() =>
                                            setForm((prev) => ({
                                                ...prev,
                                                transferPreference: "NO",
                                                transfer: [],
                                            }))
                                        }
                                    />
                                    <label htmlFor={fieldIds.transferNo}>Hayır</label>
                                </div>
                            </div>

                            {form.transferPreference === "YES" ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {transferChoices.map((transfer) => {
                                        const optionValue = getTransferOptionValue(transfer);
                                        if (!optionValue) return null;
                                        const optionLabel =
                                            formatTransferLabel(transfer) ||
                                            transfer.name ||
                                            transfer.id ||
                                            optionValue;
                                        const isFullOption =
                                            normalizeValue(transfer.name) === "full" ||
                                            normalizeValue(transfer.id) === "full";
                                        return (
                                            <div
                                                key={optionValue}
                                                className="flex items-center text-sm gap-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    id={`${fieldIds.transferYes}-${optionValue}`}
                                                    checked={form.transfer.includes(optionValue)}
                                                    disabled={fullSelected && !isFullOption}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        if (isFullOption) {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                transfer: checked ? [optionValue] : [],
                                                            }));
                                                            return;
                                                        }
                                                        setForm((prev) => {
                                                            const base = fullSelected ? [] : prev.transfer;
                                                            return {
                                                                ...prev,
                                                                transfer: checked
                                                                    ? [...base, optionValue]
                                                                    : base.filter((x) => x !== optionValue),
                                                            };
                                                        });
                                                    }}
                                                />
                                                <label htmlFor={`${fieldIds.transferYes}-${optionValue}`}>
                                                    {optionLabel}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    Bu hasta için transfer planlanmadı.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>
                                Geri
                            </Button>
                            <Button variant="primary" onClick={next}>
                                Devam Et
                            </Button>
                        </div>
                    </div>
                )}

                {/* 📎 Step 4: Belgeler */}
                {step === 4 && (
                    <form
                        onSubmit={(event) => {
                            void submit(event);
                        }}
                        className="space-y-4 animate-fade-in"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor={fieldIds.passport}>
                                    Pasaport / Kimlik
                                </label>
                                <Input
                                    type="file"
                                    id={fieldIds.passport}
                                    onChange={(e) =>
                                        setPassportFile(e.target.files?.[0] ?? null)
                                    }
                                />
                                {passportFile && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Seçilen belge: {passportFile.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor={fieldIds.flight}>
                                    Uçuş Bileti
                                </label>
                                <Input
                                    type="file"
                                    id={fieldIds.flight}
                                    onChange={(e) =>
                                        setFlightTicketFile(e.target.files?.[0] ?? null)
                                    }
                                />
                                {flightTicketFile && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Seçilen belge: {flightTicketFile.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            Pasaport/ID ve uçuş biletlerini ayrı ayrı yükleyebilirsiniz. İki dosyayı aynı anda yüklemek zorunlu
                            değildir.
                        </p>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>
                                Geri
                            </Button>
                            <Button type="submit" variant="primary">
                                Kaydet
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
