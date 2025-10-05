"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Users, Phone, BarChart2, Clock } from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { getDashboardStats, LeadStatsResponse } from "@/lib/api";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#9333ea"];

export default function DashboardPage() {
    const [stats, setStats] = useState<LeadStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await getDashboardStats();
            setStats(data);
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <Layout title="Dashboard">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Yükleniyor...
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="CRM Dashboard" subtitle="Genel performans ve özet">
            {/* 🔹 Stats Cards */}
            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" /> Toplam Lead
                    </CardHeader>
                    <CardContent>{stats.totalLeads}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-green-600" /> İletişime Geçilen
                    </CardHeader>
                    <CardContent>{stats.contactedLeads}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-amber-600" /> Dönüşüm Oranı
                    </CardHeader>
                    <CardContent>%{stats.conversionRate.toFixed(1)}</CardContent>
                </Card>
            </div>

            <div className="col-span-12 md:col-span-3">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600" /> Ort. Yanıt Süresi
                    </CardHeader>
                    <CardContent>
                        {stats.avgFirstResponseMinutes
                            ? `${stats.avgFirstResponseMinutes} dk`
                            : "Veri yok"}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Campaign Breakdown */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Kampanya Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        {stats.campaignBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.campaignBreakdown}
                                        dataKey="count"
                                        nameKey="campaignName"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        label
                                    >
                                        {stats.campaignBreakdown.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-500 text-sm text-center py-10">
                                Veri bulunamadı.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Status Breakdown */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Lead Statü Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        {stats.statusBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.statusBreakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        label
                                    >
                                        {stats.statusBreakdown.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-500 text-sm text-center py-10">
                                Veri bulunamadı.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
