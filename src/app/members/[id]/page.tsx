"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { ArrowLeft } from "lucide-react";
import EditMemberModal from "@/components/EditMemberModal";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

const DUMMY_MEMBERS = [
    {
        id: 1,
        name: "Ahmet Yılmaz",
        email: "ahmet@example.com",
        role: "USER",
        supportedLanguages: ["TR", "EN"],
        capacityPerDay: 10,
        assignedToday: 6,
        active: true,
        autoAssign: true,
        autoAssignEnabled: true,
        dailyCapacity: 5
    },
    {
        id: 2,
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        role: "ADMIN",
        supportedLanguages: ["TR", "DE"],
        capacityPerDay: 15,
        assignedToday: 15,
        active: true,
        autoAssign: false,
        autoAssignEnabled: true,
        dailyCapacity: 5
    },
    {
        id: 3,
        name: "Mehmet Demir",
        email: "mehmet@example.com",
        role: "USER",
        supportedLanguages: ["EN"],
        capacityPerDay: 8,
        assignedToday: 3,
        active: false,
        autoAssign: false,
        autoAssignEnabled: true,
        dailyCapacity: 5
    },
];

const dummyPerformance = [
    { day: "01-10", leads: 5, sales: 2 },
    { day: "02-10", leads: 7, sales: 3 },
    { day: "03-10", leads: 4, sales: 1 },
    { day: "04-10", leads: 6, sales: 2 },
    { day: "05-10", leads: 8, sales: 4 },
];

export default function MemberDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const member = DUMMY_MEMBERS.find((m) => String(m.id) === String(id));
    const [memberData, setMemberData] = useState(member);
    const [openEdit, setOpenEdit] = useState(false);

    if (!memberData) {
        return (
            <Layout title="Üye Detayı">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Üye bulunamadı
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Üye Detayı" subtitle={memberData.name}>
            {/* Sol taraf: Üye bilgileri */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span className="font-semibold">{memberData.name}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push("/members")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => setOpenEdit(true)}>
                                Düzenle
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p><b>Email:</b> {memberData.email}</p>
                        <p><b>Rol:</b> {memberData.role}</p>
                        <p><b>Diller:</b> {memberData.supportedLanguages.join(", ")}</p>
                        <p>
                            <b>Kapasite:</b> {memberData.assignedToday}/{memberData.capacityPerDay}
                        </p>
                        <p>
                            <b>Durum:</b>{" "}
                            <span className={memberData.active ? "text-green-600" : "text-red-600"}>
                {memberData.active ? "Aktif" : "Pasif"}
              </span>
                        </p>
                        <p>
                            <b>Auto-Assign:</b> {memberData.autoAssign ? "✔" : "✖"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sağ taraf: Performans grafiği */}
            <div className="col-span-12 lg:col-span-8">
                <Card>
                    <CardHeader>Performans (Dummy)</CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dummyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="leads" name="Lead" fill="#2563eb" />
                                <Bar dataKey="sales" name="Satış" fill="#16a34a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Modal */}
            {openEdit && (
                <EditMemberModal
                    isOpen={openEdit}
                    member={memberData}
                    onClose={() => setOpenEdit(false)}
                    onUpdate={(updated) => setMemberData(updated)}
                />
            )}
        </Layout>
    );
}
