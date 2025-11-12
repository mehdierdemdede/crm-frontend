"use client";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import EditMemberModal from "@/components/EditMemberModal";
import { LanguageFlagIcon } from "@/components/LanguageFlagIcon";
import Layout from "@/components/Layout";
import { useLanguages } from "@/contexts/LanguageContext";
import { getAutoAssignStats, type AgentStatsResponse } from "@/lib/api";
import { enhanceLanguageOption } from "@/lib/languages";

export default function MemberDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [member, setMember] = useState<AgentStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [openEdit, setOpenEdit] = useState(false);
    const { getOptionByCode } = useLanguages();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getAutoAssignStats();
            const found = data?.find((m) => String(m.userId) === String(id));
            setMember(found || null);
            setLoading(false);
        };
        void fetchData();
    }, [id]);

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

    // Dummy grafiği koruyalım, ileride backend raporuna bağlanabilir
    const dummyPerformance = [
        { day: "01-10", leads: 5, sales: 2 },
        { day: "02-10", leads: 7, sales: 3 },
        { day: "03-10", leads: 4, sales: 1 },
        { day: "04-10", leads: 6, sales: 2 },
        { day: "05-10", leads: 8, sales: 4 },
    ];

    return (
        <Layout title="Üye Detayı" subtitle={member.fullName}>
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span className="font-semibold">{member.fullName}</span>
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
                        <p>
                            <b>Diller:</b>{" "}
                            {member.supportedLanguages.length > 0 ? (
                                <span className="inline-flex flex-wrap gap-1">
                                    {member.supportedLanguages.map((code) => {
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
                                </span>
                            ) : (
                                <span>-</span>
                            )}
                        </p>
                        <p><b>Kapasite:</b> {member.assignedToday}/{member.dailyCapacity}</p>
                        <p>
                            <b>Durum:</b>{" "}
                            <span className={member.active ? "text-green-600" : "text-red-600"}>
                {member.active ? "Aktif" : "Pasif"}
              </span>
                        </p>
                        <p>
                            <b>Auto-Assign:</b> {member.autoAssignEnabled ? "✔" : "✖"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-12 lg:col-span-8">
                <Card>
                    <CardHeader>Performans (Örnek)</CardHeader>
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

            {openEdit && (
                <EditMemberModal
                    isOpen={openEdit}
                    member={member}
                    onClose={() => setOpenEdit(false)}
                    onUpdate={(updated) => setMember(updated)}
                />
            )}
        </Layout>
    );
}
