"use client";

import { useState, useEffect } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Legend,
    BarChart,
    Bar,
} from "recharts";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import Layout from "@/components/Layout";
import { getLeadReports, LeadReportResponse } from "@/lib/api";

const COLORS = ["#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#9333ea"];
const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

const getDateRange = (startValue: string, endValue: string) => {
    const startDate = startValue || new Date(Date.now() - DEFAULT_RANGE_MS).toISOString();
    const endDate = endValue || new Date().toISOString();

    return { startDate, endDate };
};

export default function ReportsPage() {
    const [report, setReport] = useState<LeadReportResponse | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const fetchReport = async () => {
        const { startDate, endDate } = getDateRange(start, end);
        const data = await getLeadReports(startDate, endDate);
        setReport(data);
    };

    useEffect(() => {
        const { startDate, endDate } = getDateRange("", "");
        void (async () => {
            const data = await getLeadReports(startDate, endDate);
            setReport(data);
        })();
    }, []);

    return (
        <Layout title="Raporlar" subtitle="Zaman bazlı analiz ve performans">
            <div className="col-span-12">
                <Card>
                    <CardHeader>Filtreler</CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        <div>
                            <label className="block text-sm mb-1">Başlangıç</label>
                            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Bitiş</label>
                            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                        </div>
                        <Button variant="primary" onClick={fetchReport}>
                            Raporu Getir
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Timeline */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Zaman Bazlı Lead Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        {report ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={report.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="leads" stroke="#2563eb" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-500 text-center py-10">Veri yok</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Status Breakdown */}
            <div className="col-span-12 lg:col-span-6">
                <Card>
                    <CardHeader>Statü Dağılımı</CardHeader>
                    <CardContent className="h-72">
                        {report ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={report.statusBreakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        outerRadius={100}
                                        label
                                    >
                                        {report.statusBreakdown.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-500 text-center py-10">Veri yok</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔹 Kullanıcı Performansı */}
            <div className="col-span-12">
                <Card>
                    <CardHeader>Kullanıcı Performansı</CardHeader>
                    <CardContent className="h-80">
                        {report ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={report.userPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="userName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="sales" name="Satış" fill="#16a34a" />
                                    <Bar dataKey="total" name="Toplam Lead" fill="#2563eb" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-500 text-center py-10">Veri yok</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
