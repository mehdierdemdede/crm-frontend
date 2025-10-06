"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import {
    Users,
    Flame,
    CheckCircle,
    ThumbsDown,
    Ban,
    AlertTriangle,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { getLeadReports, LeadReportResponse } from "@/lib/api";

const COLORS = [
    "#2563eb", // Blue
    "#16a34a", // Green
    "#f59e0b", // Amber
    "#dc2626", // Red
    "#9333ea", // Purple
    "#0ea5e9", // Cyan
];

export default function DashboardPage() {
    const [stats, setStats] = useState<LeadReportResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const endDate = new Date().toISOString();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14); // son 14 gün
            const data = await getLeadReports(startDate.toISOString(), endDate);
            setStats(data);
            setLoading(false);
        };
        fetchData();
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
        <Layout title="CRM Dashboard" subtitle="Performans ve Durum Özeti">
            {/* 🔹 Özet Kartlar */}
            <div className="col-span-12 grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <SummaryCard
                    icon={<Users />}
                    label="Toplam Lead"
                    value={stats.timeline?.reduce((sum, d) => sum + d.leads, 0) || 0}
                    color="text-blue-600"
                />
                <SummaryCard
                    icon={<Flame />}
                    label="Sıcak Hasta"
                    value={
                        stats.statusBreakdown?.find((s) => s.status === "HOT")?.count || 0
                    }
                    color="text-amber-600"
                />
                <SummaryCard
                    icon={<CheckCircle />}
                    label="Satış"
                    value={
                        stats.statusBreakdown?.find((s) => s.status === "SOLD")?.count || 0
                    }
                    color="text-green-600"
                />
                <SummaryCard
                    icon={<ThumbsDown />}
                    label="İlgisiz"
                    value={
                        stats.statusBreakdown?.find((s) => s.status === "NOT_INTERESTED")
                            ?.count || 0
                    }
                    color="text-gray-600"
                />
                <SummaryCard
                    icon={<Ban />}
                    label="Engelli"
                    value={
                        stats.statusBreakdown?.find((s) => s.status === "BLOCKED")?.count ||
                        0
                    }
                    color="text-red-600"
                />
                <SummaryCard
                    icon={<AlertTriangle />}
                    label="Yanlış Bilgi"
                    value={
                        stats.statusBreakdown?.find((s) => s.status === "WRONG_INFO")
                            ?.count || 0
                    }
                    color="text-orange-600"
                />
            </div>

            {/* 🔹 Timeline Chart */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Son 14 Günlük Lead Oluşum Grafiği</CardHeader>
                    <CardContent className="h-72">
                        {Array.isArray(stats.timeline) && stats.timeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="leads"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Grafik verisi bulunamadı." />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kullanıcı Performansı */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>En İyi Performans Gösteren Kullanıcılar</CardHeader>
                    <CardContent className="h-72">
                        {Array.isArray(stats.userPerformance) &&
                        stats.userPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.userPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="userName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="sales" fill="#16a34a" name="Satış" />
                                    <Bar dataKey="total" fill="#2563eb" name="Toplam Lead" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Kullanıcı performans verisi bulunamadı." />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Status Breakdown Pie Chart */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Lead Statü Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        {Array.isArray(stats.statusBreakdown) &&
                        stats.statusBreakdown.length > 0 ? (
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
                                        {stats.statusBreakdown?.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={COLORS[i % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Statü dağılım verisi yok." />
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

// 🔹 Basit özet kart bileşeni
function SummaryCard({
                         icon,
                         label,
                         value,
                         color,
                     }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex items-center gap-2">
                <div className={`h-5 w-5 ${color}`}>{icon}</div>
                <span>{label}</span>
            </CardHeader>
            <CardContent className="text-lg font-semibold">{value}</CardContent>
        </Card>
    );
}

// 🔹 Boş veri bileşeni
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center text-gray-500 text-sm h-full">
            {message}
        </div>
    );
}
