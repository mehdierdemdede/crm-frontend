"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createSale } from "@/lib/api";

type Currency = "TRY" | "USD" | "EUR" | "GBP";

export interface SalesPayload {
    leadId: string; // ✅ UUID string (number değil)
    operationDate: string;
    operationType: string;
    price: number | "";
    currency: "TRY" | "USD" | "EUR" | "GBP";
    hotel: string;
    nights: number | "";
    transfer: string[];
    passportFile?: File | null;
}

const STEPS = ["Operasyon", "Fiyat", "Konaklama & Transfer", "Belgeler & Onay"];
const TRANSFER_OPTIONS = [
    "Full",
    "Havalimanı - Otel",
    "Havalimanı - Klinik",
    "Operasyon Günü Geliş",
    "Operasyon Günü Dönüş",
    "Pansuman Günü Geliş",
    "Pansuman Günü Dönüş",
    "Yıkama Günü Geliş",
    "Yıkama Günü Dönüş",
    "Otel - Havalimanı",
];

export default function SalesForm({
                                      leadId,
                                      onSubmit,
                                  }: {
    leadId: string; // ✅ UUID string olmalı
    onSubmit: (payload: SalesPayload) => void;
})
 {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [form, setForm] = useState<SalesPayload>({
        leadId,
        operationDate: "",
        operationType: "",
        price: "",
        currency: "TRY",
        hotel: "",
        nights: "",
        transfer: [],
        passportFile: null,
    });

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
            if (!form.hotel) errs.push("Otel seçilmelidir.");
            if (form.nights === "" || Number(form.nights) <= 0)
                errs.push("Gece sayısı 1 veya üzeri olmalıdır.");
            if (form.transfer.length === 0)
                errs.push("En az bir transfer seçilmelidir.");
        }
        setErrors(errs);
        return errs.length === 0;
    };

    const next = () => validateStep() && setStep((s) => s + 1);
    const prev = () => setStep((s) => s - 1);

    const submit = async (e: FormEvent) => {
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
            transfer: form.transfer,
        };

        const { success: saleCreated, saleId } = await createSale(payload, form.passportFile);
        if (saleCreated) {
            setSuccess(true);
            onSubmit(payload);

            if (saleId) {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                setDocumentUrl(`${apiUrl}/api/sales/document/${saleId}`);
            }
        } else {
            setSubmitError("❌ Satış kaydedilemedi.");
        }
    };

    const fullSelected = form.transfer.includes("Full");

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
                    <div className="mb-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md">
                        {errors.map((e, i) => (
                            <p key={i}>• {e}</p>
                        ))}
                    </div>
                )}
                {submitError && (
                    <div className="mb-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md">
                        {submitError}
                    </div>
                )}

                {/* ✅ Başarı mesajı */}
                {success && (
                    <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-md flex flex-wrap items-center gap-2">
                        <span>✅ Satış başarıyla kaydedildi.</span>
                        {documentUrl && (
                            <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-medium"
                            >
                                Satış belgesini görüntüle
                            </a>
                        )}
                    </div>
                )}

                {/* 🧭 Step 1: Operasyon */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium mb-1">Operasyon Tarihi</label>
                            <Input
                                type="date"
                                value={form.operationDate}
                                onChange={(e) =>
                                    setForm({ ...form, operationDate: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Operasyon Türü</label>
                            <select
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
                            <label className="block text-sm font-medium mb-1">Fiyat</label>
                            <div className="flex gap-2">
                                <Input
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
                                <select
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
                            <label className="block text-sm font-medium mb-1">Otel</label>
                            <select
                                className="border rounded-lg p-2 w-full shadow-sm"
                                value={form.hotel}
                                onChange={(e) => setForm({ ...form, hotel: e.target.value })}
                            >
                                <option value="">Seçiniz</option>
                                <option value="Hotel A">Hotel A</option>
                                <option value="Hotel B">Hotel B</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Gece Sayısı</label>
                            <Input
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
                            <label className="block text-sm font-medium mb-1">Transfer</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {TRANSFER_OPTIONS.map((t) => (
                                    <label key={t} className="flex items-center text-sm gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.transfer.includes(t)}
                                            disabled={fullSelected && t !== "Full"}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                if (t === "Full") {
                                                    setForm({ ...form, transfer: checked ? ["Full"] : [] });
                                                    return;
                                                }
                                                const base = form.transfer.includes("Full")
                                                    ? []
                                                    : form.transfer;
                                                setForm({
                                                    ...form,
                                                    transfer: checked
                                                        ? [...base, t]
                                                        : base.filter((x) => x !== t),
                                                });
                                            }}
                                        />
                                        {t}
                                    </label>
                                ))}
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

                {/* 📎 Step 4: Belgeler */}
                {step === 4 && (
                    <form onSubmit={submit} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Belge (Pasaport, uçuş, onay vb.)
                            </label>
                            <Input
                                type="file"
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        passportFile: e.target.files?.[0] || null,
                                    })
                                }
                            />
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>
                                Geri
                            </Button>
                            <Button type="submit" variant="primary">
                                Kaydet
                            </Button>
                        </div>

                        {/* ✅ belge yüklendiyse göster */}
                        {form.passportFile && (
                            <div className="mt-3 flex justify-end">
                <span className="text-xs text-gray-500 mr-2">
                    Seçilen belge: {form.passportFile.name}
                </span>
                            </div>
                        )}
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
