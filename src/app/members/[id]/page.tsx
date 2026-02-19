"use client";

import { useParams, useRouter } from "next/navigation";

import { format, subDays, parseISO, isSameDay, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import EditMemberModal from "@/components/EditMemberModal";
import Layout from "@/components/Layout";
import {
    getAutoAssignStats,
    getLeads,
    getSalesByDateRange,
    updateUser,
    type AgentStatsResponse,
    type Role,
    type SaleResponse,
    type LeadResponse
} from "@/lib/api";


export default function MemberDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [member, setMember] = useState<AgentStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [openEdit, setOpenEdit] = useState(false);

    // Performance Data
    const [leads, setLeads] = useState<LeadResponse[]>([]);
    const [sales, setSales] = useState<SaleResponse[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        const fetchMember = async () => {
            setLoading(true);
            const data = await getAutoAssignStats();
            const found = data?.find((m) => String(m.userId) === String(id));
            setMember(found || null);
            setLoading(false);
        };
        void fetchMember();
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const fetchPerformance = async () => {
            setStatsLoading(true);
            const endDate = new Date();
            const startDate = subDays(endDate, 30); // Last 30 days

            const startIso = startDate.toISOString();
            const endIso = endDate.toISOString();

            try {
                // 1. Fetch Sales
                const salesData = await getSalesByDateRange(startIso, endIso, id);
                setSales(salesData);

                // 2. Fetch Leads (We fetch all for this user in date range)
                // Note: getLeads returns paginated data. We might need to fetch all pages or just use totalElements for KPI.
                // For chart, we need daily distribution. API pagination might limit us.
                // Let's fetch size=1000 for now to get reasonable amount of data for the chart.
                const leadsData = await getLeads({
                    assignedUserId: id,
                    dateFrom: startIso,
                    dateTo: endIso,
                    size: 1000
                });
                setLeads(leadsData?.content || []);
            } catch (error) {
                console.error("Performance data fetch failed", error);
            } finally {
                setStatsLoading(false);
            }
        };

        void fetchPerformance();
    }, [id]);

    // KPI Calculations
    const totalLeads = leads.length;
    const totalSales = sales.length;
    const conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : "0";


    // Chart Data Preparation
    const chartData = useMemo(() => {
        const endDate = new Date();
        const startDate = subDays(endDate, 30);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return days.map(day => {
            const dateStr = format(day, "d MMM", { locale: tr });
            const dayLeads = leads.filter(l => isSameDay(parseISO(l.createdAt), day)).length;
            const daySales = sales.filter(s => s.operationDate && isSameDay(parseISO(s.operationDate), day)).length;

            return {
                name: dateStr,
                leads: dayLeads,
                sales: daySales
            };
        });
    }, [leads, sales]);


    if (loading) {
        return (
            <Layout title="Üye Detayı">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Yükleniyor...
                </div>
            </Layout>
        );
    }

    if (!member) {
        return (
            <Layout title="Üye Detayı">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Üye bulunamadı.
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Üye Detayı" subtitle={member.fullName}>
            {/* Top Bar Actions */}
            <div className="col-span-12 flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => router.push("/members")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                </Button>
                <Button variant="primary" size="sm" onClick={() => setOpenEdit(true)}>
                    Düzenle
                </Button>
            </div>

            {/* Profile & Status Card */}
            <div className="col-span-12 lg:col-span-4">
                <Card className="h-full">
                    <CardHeader>
                        <span className="font-semibold text-lg">Profil</span>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Ad Soyad:</span>
                            <span className="font-medium">{member.fullName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Durum:</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${member.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {member.active ? "Aktif" : "Pasif"}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Otomatik Atama:</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${member.autoAssignEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                                {member.autoAssignEnabled ? "Açık" : "Kapalı"}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Günlük Kapasite:</span>
                            <span className="font-medium">{member.dailyCapacity}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Bugün Atanan:</span>
                            <span className="font-medium">{member.assignedToday}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPI Cards */}
            <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <span className="text-gray-500 text-sm mb-1">Toplam Lead (30 Gün)</span>
                        <span className="text-3xl font-bold text-blue-600">{statsLoading ? "..." : totalLeads}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <span className="text-gray-500 text-sm mb-1">Toplam Satış (30 Gün)</span>
                        <span className="text-3xl font-bold text-green-600">{statsLoading ? "..." : totalSales}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <span className="text-gray-500 text-sm mb-1">Dönüşüm Oranı</span>
                        <span className="text-3xl font-bold text-purple-600">{statsLoading ? "..." : `%${conversionRate}`}</span>
                    </CardContent>
                </Card>

                {/* Performance Chart */}
                <div className="col-span-1 sm:col-span-3">
                    <Card>
                        <CardHeader>Performans Grafiği (Son 30 Gün)</CardHeader>
                        <CardContent className="h-80">
                            {statsLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Yükleniyor...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="leads" name="Lead" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="sales" name="Satış" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {openEdit && (
                <EditMemberModal
                    isOpen={openEdit}
                    member={member}
                    onClose={() => setOpenEdit(false)}
                    onUpdate={async (updated: AgentStatsResponse & { role?: Role }) => {
                        const nameParts = updated.fullName.trim().split(/\s+/);
                        const firstName = nameParts[0] || "";
                        const lastName = nameParts.slice(1).join(" ") || "";

                        await updateUser(updated.userId, {
                            firstName,
                            lastName,
                            active: updated.active,
                            autoAssignEnabled: updated.autoAssignEnabled,
                            dailyCapacity: updated.dailyCapacity,
                            role: updated.role,
                        });

                        setMember(updated);
                    }}
                />
            )}
        </Layout>
    );
}
