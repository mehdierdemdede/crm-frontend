"use client";

import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Layout from "@/components/Layout";
import {Card, CardContent, CardHeader} from "@/components/Card";
import {BarChart2, Clock, Phone, Users,} from "lucide-react";

// Recharts
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {getIntegrationLogs} from "@/lib/api";

// ───────────────────────────────
// Dummy Data
// ───────────────────────────────
const DUMMY_STATS = {
    totalLeads: 120,
    contactedLeads: 80,
    conversionRate: 35,
    responseTime: "2.4 saat",
};

const DUMMY_TEAM = [
    { id: 1, name: "Ahmet Yılmaz", conversionRate: 40 },
    { id: 2, name: "Ayşe Kaya", conversionRate: 32 },
    { id: 3, name: "Mehmet Demir", conversionRate: 28 },
    { id: 4, name: "Kübra Koral", conversionRate: 39 },
];

const DUMMY_ACTIVITIES = [
    { id: 1, text: "Ahmet Yılmaz yeni bir lead ekledi", time: "2 dakika önce" },
    { id: 2, text: "Ayşe Kaya bir e-posta gönderdi", time: "15 dakika önce" },
    { id: 3, text: "Mehmet Demir bir leadi kapattı", time: "1 saat önce" },
    { id: 4, text: "Zeynep Çelik yorum ekledi", time: "2 saat önce" },
];

const campaignData = [
    { name: "Facebook Kampanya A", value: 40 },
    { name: "Google Kampanya B", value: 25 },
    { name: "Manuel Import", value: 15 },
    { name: "Facebook Kampanya C", value: 20 },
];

const statusData = [
    { name: "Sıcak", value: 35 },
    { name: "Satış", value: 20 },
    { name: "İlgisiz", value: 15 },
    { name: "Blocked", value: 10 },
    { name: "Yanlış Numara", value: 8 },
    { name: "Cevapsız", value: 12 },
];

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#9333ea"];

// ───────────────────────────────
// Component
// ───────────────────────────────
export default function DashboardPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            router.push("/login");
            return;
        }

        // 🔹 Integration Log'ları çek
        getIntegrationLogs().then(setLogs);
    }, [router]);

    return (
        <Layout title="CRM Dashboard" subtitle="Genel bakış ve ekip performansı">
            {/* 🔹 Stats Grid */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600"/> Toplam Lead
                    </CardHeader>
                    <CardContent>{DUMMY_STATS.totalLeads}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-green-600"/> İletişime Geçilen
                    </CardHeader>
                    <CardContent>{DUMMY_STATS.contactedLeads}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-amber-600"/> Dönüşüm Oranı
                    </CardHeader>
                    <CardContent>%{DUMMY_STATS.conversionRate}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600"/> Ort. Yanıt Süresi
                    </CardHeader>
                    <CardContent>{DUMMY_STATS.responseTime}</CardContent>
                </Card>
            </div>

            {/* 🔹 Campaign Breakdown */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Campaign Breakdown</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={campaignData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label
                                >
                                    {campaignData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Lead Status Breakdown */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Lead Status Breakdown</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label
                                >
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Tooltip/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Ekip Performansı */}
            <div className="col-span-12 lg:col-span-8">
                <Card>
                    <CardHeader>Ekip Performansı</CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DUMMY_TEAM} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="name" tick={{fontSize: 12}}/>
                                <YAxis/>
                                <Tooltip/>
                                <Legend/>
                                <Bar dataKey="conversionRate" name="Dönüşüm %" fill="#2563eb"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kısa Özet */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>Kısa Özet</CardHeader>
                    <CardContent>
                        <p>Toplam Üye: {DUMMY_TEAM.length}</p>
                        <p>Toplam Aktivite: {DUMMY_ACTIVITIES.length}</p>
                        <ul className="mt-2 text-sm space-y-1">
                            {DUMMY_ACTIVITIES.map((a) => (
                                <li key={a.id}>
                                    • {a.text}{" "}
                                    <span className="text-gray-500">({a.time})</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Detaylı Ekip Tablosu */}
            <div className="col-span-12 overflow-x-auto">
                <Card>
                    <CardHeader>Detaylı Ekip Tablosu</CardHeader>
                    <CardContent>
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="p-2">#</th>
                                <th className="p-2">Ekip Üyesi</th>
                                <th className="p-2">Dönüşüm Oranı</th>
                            </tr>
                            </thead>
                            <tbody>
                            {DUMMY_TEAM.map((m, i) => (
                                <tr key={m.id} className="border-t">
                                    <td className="p-2">{i + 1}</td>
                                    <td className="p-2">{m.name}</td>
                                    <td className="p-2">{m.conversionRate}%</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
            <div className="col-span-12">
                <Card>
                    <CardHeader>Son Entegrasyon Kayıtları</CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="text-gray-500 text-sm">Henüz entegrasyon kaydı bulunmuyor.</p>
                        ) : (
                            <table className="min-w-full text-sm border">
                                <thead className="bg-gray-100 text-left">
                                <tr>
                                    <th className="p-2">Platform</th>
                                    <th className="p-2">Toplam</th>
                                    <th className="p-2">Yeni</th>
                                    <th className="p-2">Güncellendi</th>
                                    <th className="p-2">Durum</th>
                                    <th className="p-2">Tarih</th>
                                </tr>
                                </thead>
                                <tbody>
                                {logs.slice(0, 10).map((log) => (
                                    <tr key={log.id} className="border-t">
                                        <td className="p-2">{log.platform}</td>
                                        <td className="p-2">{log.totalFetched}</td>
                                        <td className="p-2 text-green-600">{log.newCreated}</td>
                                        <td className="p-2 text-blue-600">{log.updated}</td>
                                        <td className="p-2">
                                            {log.errorMessage ? (
                                                <span className="text-red-600 font-medium">Hata</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">Başarılı</span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {new Date(log.finishedAt).toLocaleString("tr-TR")}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
