"use client";

import { CheckCircle, XCircle, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

import { Card, CardHeader, CardContent } from "@/components/Card";
import { LanguageFlagIcon } from "@/components/LanguageFlagIcon";
import Layout from "@/components/Layout";
import { useLanguages } from "@/contexts/LanguageContext";
import { getAgentStats, type AgentStatsResponse } from "@/lib/api";
import { enhanceLanguageOption } from "@/lib/languages";


const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

export default function AutoAssignStatsPage() {
    const [stats, setStats] = useState<AgentStatsResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const { getOptionByCode } = useLanguages();

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await getAgentStats();
            setStats(data);
            setLoading(false);
        };
        void fetchStats();
    }, []);

    if (loading) {
        return (
            <Layout title="Auto-Assign İstatistikleri">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Yükleniyor...
                </div>
            </Layout>
        );
    }

    // 🔹 Grafik veri hazırlıkları
    const capacityData = stats.map((a) => ({
        name: a.fullName,
        used: a.assignedToday,
        remaining: a.remainingCapacity,
    }));

    const autoAssignData = [
        { name: "Açık", value: stats.filter((a) => a.autoAssignEnabled).length },
        { name: "Kapalı", value: stats.filter((a) => !a.autoAssignEnabled).length },
    ];

    return (
        <Layout
            title="Auto-Assign İstatistikleri"
            subtitle="Danışman kapasite ve performans görünümü"
        >
            {/* 🔹 Üst kartlar - özet */}
            <div className="col-span-12 grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" /> Aktif Danışman
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {stats.filter((a) => a.active).length}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" /> Auto-Assign Açık
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {stats.filter((a) => a.autoAssignEnabled).length}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" /> Tam Kapasitede
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold">
                        {stats.filter((a) => a.remainingCapacity <= 0).length}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kapasite Bar Chart */}
            <div className="col-span-12 lg:col-span-8">
                <Card>
                    <CardHeader>Kapasite Doluluk Oranı</CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={capacityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="used" name="Atanan" stackId="a" fill="#2563eb" />
                                <Bar
                                    dataKey="remaining"
                                    name="Kalan"
                                    stackId="a"
                                    fill="#16a34a"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Auto Assign Pie Chart */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>Auto-Assign Durumu</CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={autoAssignData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label
                                >
                                    {autoAssignData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Tablo */}
            <div className="col-span-12">
                <Card>
                    <CardHeader>Kullanıcı Bazlı Detaylar</CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">Kullanıcı</th>
                                    <th className="p-2">Durum</th>
                                    <th className="p-2">Auto Assign</th>
                                    <th className="p-2">Diller</th>
                                    <th className="p-2 text-center">Kapasite</th>
                                    <th className="p-2 text-center">Bugün Atanan</th>
                                    <th className="p-2 text-center">Kalan</th>
                                </tr>
                                </thead>
                                <tbody>
                                {stats.map((a) => (
                                    <tr key={a.userId} className="border-t hover:bg-gray-50">
                                        <td className="p-2">{a.fullName}</td>
                                        <td className="p-2">
                                            {a.active ? (
                                                <span className="text-green-600">Aktif</span>
                                            ) : (
                                                <span className="text-red-600">Pasif</span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {a.autoAssignEnabled ? (
                                                <span className="text-blue-600">Açık</span>
                                            ) : (
                                                <span className="text-gray-600">Kapalı</span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {a.supportedLanguages.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {a.supportedLanguages.map((code) => {
                                                        const option =
                                                            getOptionByCode(code) ??
                                                            enhanceLanguageOption({
                                                                value: code,
                                                                label: code,
                                                            });
                                                        return (
                                                            <span
                                                                key={code}
                                                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                                            >
                                                                <LanguageFlagIcon option={option} size={14} />
                                                                <span>{option.label ?? code}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-center">{a.dailyCapacity}</td>
                                        <td className="p-2 text-center">{a.assignedToday}</td>
                                        <td className="p-2 text-center">
                                            {a.remainingCapacity}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
