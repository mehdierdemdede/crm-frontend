"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    BarChart,
    Bar,
    Legend,
} from "recharts";
import { Input } from "@/components/Input";
import { Download } from "lucide-react";


// Dummy data
const dummyStatusData = [
    { name: "Satış", value: 45 },
    { name: "İlgisiz", value: 25 },
    { name: "Blocked", value: 10 },
    { name: "No Answer", value: 15 },
    { name: "Wrong Number", value: 5 },
];

const dummyTimelineData = [
    { date: "01-10", leads: 10 },
    { date: "02-10", leads: 14 },
    { date: "03-10", leads: 8 },
    { date: "04-10", leads: 16 },
    { date: "05-10", leads: 20 },
];

const dummyUserPerformance = [
    { name: "Ahmet", sales: 12, total: 30 },
    { name: "Ayşe", sales: 20, total: 35 },
    { name: "Mehmet", sales: 15, total: 40 },
];

const COLORS = ["#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#9333ea"];

export default function ReportsPage() {
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        campaign: "",
        user: "",
        statuses: [] as string[],
    });

    const toggleStatus = (status: string) => {
        setFilters((prev) => ({
            ...prev,
            statuses: prev.statuses.includes(status)
                ? prev.statuses.filter((s) => s !== status)
                : [...prev.statuses, status],
        }));
    };

    const exportCSV = () => {
        const headers = ["Kullanıcı", "Satış", "Toplam Lead"];
        const rows = dummyUserPerformance.map(u => [u.name, u.sales, u.total]);
        const csvContent =
            [headers, ...rows].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "report.csv");
        link.click();
    };

    const exportPDF = async () => {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        doc.text("Kullanıcı Performansı Raporu", 14, 16);

        let y = 30;
        dummyUserPerformance.forEach((u) => {
            doc.text(`${u.name} - Satış: ${u.sales} / Toplam: ${u.total}`, 14, y);
            y += 10;
        });

        doc.save("report.pdf");
    };


    return (
        <Layout title="Reports" subtitle="Detaylı analiz ve raporlar">
            {/* 🔹 Filtre Alanı */}
            <div className="col-span-12">

                <Card>
                    <CardHeader>Filtreler</CardHeader>

                    <CardContent>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={exportCSV}>
                                <Download className="h-4 w-4 mr-1"/> Export CSV
                            </Button>
                            <Button variant="outline" onClick={exportPDF}>
                                <Download className="h-4 w-4 mr-1"/> Export PDF
                            </Button>
                        </div>
                    </CardContent>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Başlangıç</label>
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Bitiş</label>
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Kampanya</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={filters.campaign}
                                    onChange={(e) => setFilters({...filters, campaign: e.target.value})}
                                >
                                    <option value="">Hepsi</option>
                                    <option value="Facebook A">Facebook A</option>
                                    <option value="Google B">Google B</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Kullanıcı</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={filters.user}
                                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                                >
                                    <option value="">Hepsi</option>
                                    <option value="Ahmet">Ahmet</option>
                                    <option value="Ayşe">Ayşe</option>
                                </select>
                            </div>
                        </div>

                        {/* Status çoklu seçim */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-1">Lead Statüleri</label>
                            <div className="flex flex-wrap gap-2">
                                {["Satış", "İlgisiz", "Blocked", "No Answer", "Wrong Number"].map(
                                    (s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`px-3 py-1 rounded-full text-xs ${
                                                filters.statuses.includes(s)
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700"
                                            }`}
                                            onClick={() => toggleStatus(s)}
                                        >
                                            {s}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <Button variant="primary">Raporu Getir</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>



            {/* 🔹 Özet Kartlar */}
            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader>Toplam Lead</CardHeader>
                    <CardContent>120</CardContent>
                </Card>
            </div>
            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader>Satışa Dönen</CardHeader>
                    <CardContent>45</CardContent>
                </Card>
            </div>
            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader>İlgisiz / Blocked</CardHeader>
                    <CardContent>35</CardContent>
                </Card>
            </div>
            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader>Ort. First Respond</CardHeader>
                    <CardContent>25 dk</CardContent>
                </Card>
            </div>

            {/* 🔹 Status Dağılımı */}
            <div className="col-span-12 md:col-span-6">
                <Card>
                    <CardHeader>Status Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dummyStatusData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {dummyStatusData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Timeline (günlük lead sayısı) */}
            <div className="col-span-12 md:col-span-6">
                <Card>
                    <CardHeader>Lead Timeline</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dummyTimelineData}>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="date"/>
                                <YAxis/>
                                <Tooltip/>
                                <Line type="monotone" dataKey="leads" stroke="#2563eb"/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kullanıcı Performansı */}
            <div className="col-span-12">
                <Card>
                    <CardHeader>Kullanıcı Performansı</CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dummyUserPerformance}>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="name"/>
                                <YAxis/>
                                <Tooltip/>
                                <Legend/>
                                <Bar dataKey="sales" name="Satış" fill="#16a34a"/>
                                <Bar dataKey="total" name="Toplam Lead" fill="#2563eb"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
