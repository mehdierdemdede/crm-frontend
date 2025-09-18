"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components//ui/Button";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { LogOut, Users, Phone, Clock, LineChart } from "lucide-react";

export default function Dashboard() {
    const router = useRouter();

    // 🔹 Dummy stats
    const stats = {
        totalLeads: 120,
        contactedLeads: 80,
        conversionRate: 35,
        responseTime: "2.4 saat",
    };

    // 🔹 Dummy team members
    const teamMembers = [
        {
            id: 1,
            name: "Ahmet Yılmaz",
            email: "ahmet@example.com",
            assignedLeads: 30,
            convertedLeads: 12,
            responseTime: "3s",
            totalActivities: 25,
            conversionRate: 40,
        },
        {
            id: 2,
            name: "Ayşe Kaya",
            email: "ayse@example.com",
            assignedLeads: 25,
            convertedLeads: 8,
            responseTime: "2s",
            totalActivities: 18,
            conversionRate: 32,
        },
        {
            id: 3,
            name: "Mehmet Demir",
            email: "mehmet@example.com",
            assignedLeads: 20,
            convertedLeads: 6,
            responseTime: "4s",
            totalActivities: 15,
            conversionRate: 28,
        },
    ];

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) router.push("/login");
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("tokenType");
        router.push("/login");
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">CRM Pro Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Hoş geldiniz, Admin</span>
                    <Button type="button" className="bg-red-500 text-white px-3 py-1 rounded" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 inline mr-2" /> Çıkış Yap
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" /> Toplam Lead
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.totalLeads}</CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-green-600" /> İletişime Geçilen
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.contactedLeads}</CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-yellow-600" /> Dönüşüm Oranı
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.conversionRate}%</CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" /> Ort. Yanıt Süresi
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.responseTime}</CardContent>
                </Card>
            </div>

            {/* Team Performance Chart */}
            <Card>
                <CardHeader>Ekip Performansı</CardHeader>
                <CardContent>
                    <BarChart width={600} height={300} data={teamMembers}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="conversionRate" fill="#3b82f6" />
                    </BarChart>
                </CardContent>
            </Card>
        </div>
    );
}
