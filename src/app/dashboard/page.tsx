"use client";

import {
    Users,
    Flame,
    CheckCircle,
    ThumbsDown,
    Ban,
    AlertTriangle,
    Calendar,
    Percent,
    PhoneMissed,
} from "lucide-react";
import { useEffect, useState } from "react";
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
    Legend,
} from "recharts";

import { Card, CardHeader, CardContent } from "@/components/Card";
import Layout from "@/components/Layout";
import { getLeadReports, LeadReportResponse } from "@/lib/api";

const COLORS = [
    "#2563eb", // Blue (New/Uncontacted)
    "#16a34a", // Green (Sold)
    "#f59e0b", // Amber (Hot)
    "#dc2626", // Red (Blocked)
    "#9333ea", // Purple
    "#0ea5e9", // Cyan
    "#f97316", // Orange
];

const STATUS_LABELS: Record<string, string> = {
    UNCONTACTED: "Ulaşılmayan",
    HOT: "Sıcak",
    SOLD: "Satış",
    NOT_INTERESTED: "İlgisiz",
    BLOCKED: "Engelli / Spam",
    WRONG_INFO: "Yanlış Bilgi",
};

export default function DashboardPage() {
    const [stats, setStats] = useState<LeadReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(14); // Varsayılan 14 gün

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const endDate = new Date().toISOString();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const data = await getLeadReports(startDate.toISOString(), endDate);
            setStats(data);
            setLoading(false);
        };
        void fetchData();
    }, [days]);

    if (loading && !stats) {
        return (
            <Layout title="Dashboard">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Yükleniyor...
                </div>
            </Layout>
        );
    }

    // İstatiksel hesaplamalar
    const totalLeads = stats?.timeline?.reduce((sum, d) => sum + d.leads, 0) || 0;
    const soldCount = stats?.statusBreakdown?.find((s) => s.status === "SOLD")?.count || 0;
    const uncontactedCount = stats?.statusBreakdown?.find((s) => s.status === "UNCONTACTED")?.count || 0;
    const conversionRate = totalLeads > 0 ? ((soldCount / totalLeads) * 100).toFixed(1) : "0";

    // Chart verilerini Türkçeleştirme
    const pieData = stats?.statusBreakdown?.map((item) => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
    })) || [];

    return (
        <Layout
            title="Patient Trace Dashboard"
            subtitle="Performans ve Durum Özeti"
            actions={
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                    >
                        <option value={7}>Son 7 Gün</option>
                        <option value={14}>Son 14 Gün</option>
                        <option value={30}>Son 30 Gün</option>
                        <option value={90}>Son 90 Gün</option>
                    </select>
                </div>
            }
        >
            {/* 🔹 Özet Kartlar */}
            <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <SummaryCard
                    icon={<Users />}
                    label="Toplam Lead"
                    value={totalLeads}
                    color="text-blue-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<CheckCircle />}
                    label="Satış"
                    value={soldCount}
                    color="text-green-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<Percent />}
                    label="Dönüşüm"
                    value={`%${conversionRate}`}
                    color="text-purple-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<PhoneMissed />}
                    label="Ulaşılmayan"
                    value={uncontactedCount}
                    color="text-red-500"
                    colSpan="col-span-1 md:col-span-2"
                />
            </div>

            <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <SummaryCard
                    icon={<Flame />}
                    label="Sıcak Hasta"
                    value={stats?.statusBreakdown?.find((s) => s.status === "HOT")?.count || 0}
                    color="text-amber-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<ThumbsDown />}
                    label="İlgisiz"
                    value={stats?.statusBreakdown?.find((s) => s.status === "NOT_INTERESTED")?.count || 0}
                    color="text-gray-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<Ban />}
                    label="Engelli"
                    value={stats?.statusBreakdown?.find((s) => s.status === "BLOCKED")?.count || 0}
                    color="text-red-600"
                    colSpan="col-span-1 md:col-span-2"
                />
                <SummaryCard
                    icon={<AlertTriangle />}
                    label="Yanlış Bilgi"
                    value={stats?.statusBreakdown?.find((s) => s.status === "WRONG_INFO")?.count || 0}
                    color="text-orange-600"
                    colSpan="col-span-1 md:col-span-2"
                />
            </div>

            {/* 🔹 Timeline Chart */}
            <div className="col-span-12 lg:col-span-8">
                <Card className="h-full">
                    <CardHeader>Lead Oluşum Grafiği (Son {days} Gün)</CardHeader>
                    <CardContent className="h-80">
                        {Array.isArray(stats?.timeline) && stats!.timeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats!.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip
                                        labelFormatter={(value) => new Date(value).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="leads"
                                        name="Lead Sayısı"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Grafik verisi bulunamadı." />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Status Breakdown Pie Chart */}
            <div className="col-span-12 lg:col-span-4">
                <Card className="h-full">
                    <CardHeader>Statü Dağılımı</CardHeader>
                    <CardContent className="h-80">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Statü dağılım verisi yok." />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kullanıcı Performansı */}
            <div className="col-span-12">
                <Card>
                    <CardHeader>En İyi Performans Gösteren Kullanıcılar (Satış Adedi)</CardHeader>
                    <CardContent className="h-80">
                        {Array.isArray(stats?.userPerformance) && stats!.userPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats!.userPerformance} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="userName" type="category" width={120} tick={{ fontSize: 13 }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Legend verticalAlign="top" align="right" />
                                    <Bar dataKey="sales" fill="#16a34a" name="Satış" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="total" fill="#2563eb" name="Toplam Atanan" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Kullanıcı performans verisi bulunamadı." />
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
    colSpan = "",
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color?: string;
    colSpan?: string;
}) {
    return (
        <Card className={colSpan}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-500">{label}</div>
                <div className={`h-4 w-4 ${color}`}>{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

// 🔹 Boş veri bileşeni
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center text-gray-500 text-sm h-full w-full bg-gray-50 rounded-lg border border-dashed border-gray-200">
            {message}
        </div>
    );
}
