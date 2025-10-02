"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";

const CRM_COLUMNS = ["name", "email", "phone", "campaign", "lang", "status"];

export default function ExcelImportPage() {
    const [step, setStep] = useState(1);
    const [fileName, setFileName] = useState("");
    const [mapping, setMapping] = useState<{ [key: string]: string }>({});

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setFileName(e.target.files[0].name);
            setStep(2);
        }
    };

    const dummyExcelCols = ["Ad Soyad", "Eposta", "Telefon", "Reklam Kaynağı"];

    const handleMappingChange = (excelCol: string, crmCol: string) => {
        setMapping((prev) => ({ ...prev, [excelCol]: crmCol }));
    };

    return (
        <Layout title="Excel Import" subtitle="Excel dosyanızla lead ekleyin">
            <div className="col-span-12">
                <Card>
                    <CardHeader>Adım {step}</CardHeader>
                    <CardContent className="space-y-6">
                        {/* Step 1: Dosya yükleme */}
                        {step === 1 && (
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <input
                                    type="file"
                                    accept=".xlsx,.csv"
                                    onChange={handleFileUpload}
                                    className="border rounded p-2"
                                />
                                <p className="text-sm text-gray-500">
                                    .xlsx veya .csv formatında dosya yükleyin.
                                </p>
                            </div>
                        )}

                        {/* Step 2: Kolon eşleştirme */}
                        {step === 2 && (
                            <div>
                                <h3 className="font-semibold mb-4">
                                    Excel kolonlarını CRM alanlarına eşleştirin
                                </h3>
                                <table className="min-w-full text-sm border">
                                    <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2">Excel Kolonu</th>
                                        <th className="p-2">CRM Alanı</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {dummyExcelCols.map((col) => (
                                        <tr key={col} className="border-t">
                                            <td className="p-2">{col}</td>
                                            <td className="p-2">
                                                <select
                                                    className="border rounded p-1"
                                                    value={mapping[col] || ""}
                                                    onChange={(e) =>
                                                        handleMappingChange(col, e.target.value)
                                                    }
                                                >
                                                    <option value="">Seçiniz</option>
                                                    {CRM_COLUMNS.map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>

                                <div className="flex justify-end mt-4">
                                    <Button variant="primary" onClick={() => setStep(3)}>
                                        Devam Et
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Önizleme */}
                        {step === 3 && (
                            <div>
                                <h3 className="font-semibold mb-4">Önizleme</h3>
                                <table className="min-w-full text-sm border">
                                    <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2">Ad Soyad</th>
                                        <th className="p-2">Eposta</th>
                                        <th className="p-2">Telefon</th>
                                        <th className="p-2">Reklam Kaynağı</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="p-2">Ahmet Yılmaz</td>
                                        <td className="p-2">ahmet@example.com</td>
                                        <td className="p-2">+90 555 123 4567</td>
                                        <td className="p-2">Facebook Kampanya A</td>
                                    </tr>
                                    </tbody>
                                </table>
                                <div className="flex justify-end mt-4">
                                    <Button variant="primary" onClick={() => setStep(4)}>
                                        Import Başlat
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Tamamlandı */}
                        {step === 4 && (
                            <div className="text-center space-y-4">
                                <p className="text-lg font-semibold text-green-600">
                                    Import işlemi başarıyla tamamlandı 🎉
                                </p>
                                <p>50 lead sisteme eklendi.</p>
                                <Button variant="primary" onClick={() => setStep(1)}>
                                    Yeni Import
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
