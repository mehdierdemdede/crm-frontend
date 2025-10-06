"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {createSale} from "@/lib/api";

type Currency = "TRY" | "USD" | "EUR" | "GBP";

export interface SalesPayload {
    leadId: string;
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
    leadId: number;
    onSubmit: (payload: SalesPayload) => void;
}) {
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<string[]>([]);
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

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep()) return;

        const payload = {
            leadId: String(leadId), // ✅ string'e çeviriyoruz (backend UUID istiyorsa)
            operationDate: form.operationDate,
            operationType: form.operationType,
            price: Number(form.price) || 0,
            currency: form.currency,
            hotel: form.hotel,
            nights: Number(form.nights) || 0,
            transfer: form.transfer,
        } as const;

        const success = await createSale(payload, form.passportFile);
        if (success) {
            alert("✅ Satış başarıyla kaydedildi.");
            onSubmit(payload);
        } else {
            alert("❌ Satış kaydedilemedi.");
        }
    };


    const fullSelected = form.transfer.includes("Full");

    return (
        <Card>
            <CardHeader>Satış / Operasyon</CardHeader>
            <CardContent>
                {/* Stepper */}
                <ol className="mb-4 grid grid-cols-4 gap-2 text-xs">
                    {STEPS.map((label, idx) => {
                        const num = idx + 1;
                        const active = step === num;
                        const done = step > num;
                        return (
                            <li
                                key={label}
                                className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                                    active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                                }`}
                            >
                <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        done ? "bg-green-500 text-white"
                            : active ? "bg-blue-600 text-white"
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

                {errors.length > 0 && (
                    <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded">
                        {errors.map((e, i) => (
                            <p key={i}>• {e}</p>
                        ))}
                    </div>
                )}

                {/* Adım 1 */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Operasyon Tarihi</label>
                            <Input
                                type="date"
                                value={form.operationDate}
                                onChange={(e) => setForm({ ...form, operationDate: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Operasyon Türü</label>
                            <select
                                className="border rounded-md p-2 w-full"
                                value={form.operationType}
                                onChange={(e) => setForm({ ...form, operationType: e.target.value })}
                            >
                                <option value="">Seçiniz</option>
                                {/* Saç */}
                                <option value="Saç - FUE">Saç - FUE</option>
                                <option value="Saç - DHI">Saç - DHI</option>
                                <option value="Saç - Kök Hücre">Saç - Kök Hücre</option>
                                {/* Estetik (özet) */}
                                <option value="Burun Estetiği">Burun Estetiği</option>
                                <option value="Liposuction">Liposuction</option>
                                <option value="BBL (Brezilya Popo)">BBL (Brezilya Popo)</option>
                                <option value="Meme Büyütme">Meme Büyütme</option>
                                <option value="Mide Ameliyatları">Mide Ameliyatları</option>
                            </select>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="primary" onClick={next}>Devam Et</Button>
                        </div>
                    </div>
                )}

                {/* Adım 2 */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Fiyat</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            price: e.target.value === "" ? "" : Number(e.target.value),
                                        })
                                    }
                                />
                                <select
                                    className="border rounded-md p-2"
                                    value={form.currency}
                                    onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                                >
                                    <option value="TRY">₺</option>
                                    <option value="USD">$</option>
                                    <option value="EUR">€</option>
                                    <option value="GBP">£</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>Geri</Button>
                            <Button variant="primary" onClick={next}>Devam Et</Button>
                        </div>
                    </div>
                )}

                {/* Adım 3 */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Otel</label>
                            <select
                                className="border rounded-md p-2 w-full"
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
                                        nights: e.target.value === "" ? "" : Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium mb-1">Transfer</label>
                                {fullSelected && (
                                    <span className="text-xs text-gray-500">Full seçiliyken diğer seçenekler devre dışıdır.</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                {TRANSFER_OPTIONS.map((t) => (
                                    <label key={t} className="text-sm">
                                        <input
                                            type="checkbox"
                                            checked={form.transfer.includes(t)}
                                            disabled={fullSelected && t !== "Full"}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                // Full seçimi özel kural
                                                if (t === "Full") {
                                                    setForm({ ...form, transfer: checked ? ["Full"] : [] });
                                                    return;
                                                }
                                                // Diğer seçenekler: Full seçiliyse önce Full'ü kaldır
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
                                        />{" "}
                                        {t}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>Geri</Button>
                            <Button variant="primary" onClick={next}>Devam Et</Button>
                        </div>
                    </div>
                )}

                {/* Adım 4 */}
                {step === 4 && (
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Pasaport / Uçuş Belgeleri</label>
                            <Input
                                type="file"
                                onChange={(e) =>
                                    setForm({ ...form, passportFile: e.target.files?.[0] || null })
                                }
                            />
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={prev}>Geri</Button>
                            <Button type="submit" variant="primary">Kaydet</Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
