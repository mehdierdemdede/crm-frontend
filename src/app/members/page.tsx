"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import AddMemberModal from "@/components/AddMemberModal";
import Link from "next/link";
import { getAutoAssignStats, type AgentStatsResponse } from "@/lib/api"; // ✅ yeni servis
import { useLanguages } from "@/contexts/LanguageContext";

export default function MembersPage() {
    const [members, setMembers] = useState<AgentStatsResponse[]>([]);
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const { getOptionByCode } = useLanguages();

    // 📦 Verileri yükle
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getAutoAssignStats();
            if (data) setMembers(data);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleSave = (newMember: AgentStatsResponse) => {
        setMembers((prev) => {
            const exists = prev.some((member) => member.userId === newMember.userId);
            if (exists) {
                return prev.map((member) =>
                    member.userId === newMember.userId ? newMember : member
                );
            }
            return [...prev, newMember];
        });
    };

    return (
        <Layout title="Üye Yönetimi" subtitle="Kullanıcıları görüntüle ve yönet">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span className="font-semibold">Üyeler</span>
                        <Button variant="primary" onClick={() => setOpenModal(true)}>
                            + Yeni Üye
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-center text-gray-500 py-10">Yükleniyor...</div>
                        ) : members.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                Henüz üye bulunamadı.
                            </div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">Ad Soyad</th>
                                    <th className="p-2">Diller</th>
                                    <th className="p-2">Kapasite</th>
                                    <th className="p-2">Aktif</th>
                                    <th className="p-2">Auto-Assign</th>
                                </tr>
                                </thead>
                                <tbody>
                                {members.map((m) => (
                                    <tr key={m.userId} className="border-t hover:bg-gray-50">
                                        <td className="p-2">
                                            <Link
                                                href={`/members/${m.userId}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {m.fullName}
                                            </Link>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-wrap gap-1">
                                                {m.supportedLanguages.map((code) => {
                                                    const option = getOptionByCode(code);
                                                    return (
                                                        <span
                                                            key={code}
                                                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                                        >
                                                            <span>{option?.flag ?? "🏳️"}</span>
                                                            <span>{option?.label ?? code}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <div className="w-40 bg-gray-200 rounded-full h-3 mb-1">
                                                <div
                                                    className={`h-3 rounded-full ${
                                                        m.assignedToday >= m.dailyCapacity
                                                            ? "bg-red-500"
                                                            : "bg-green-500"
                                                    }`}
                                                    style={{
                                                        width: `${Math.min(
                                                            (m.assignedToday / m.dailyCapacity) * 100,
                                                            100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-600">
                          {m.assignedToday}/{m.dailyCapacity}
                        </span>
                                        </td>
                                        <td className="p-2">
                        <span
                            className={`px-2 py-0.5 text-xs rounded ${
                                m.active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                          {m.active ? "Aktif" : "Pasif"}
                        </span>
                                        </td>
                                        <td className="p-2">
                        <span
                            className={`px-2 py-0.5 text-xs rounded ${
                                m.autoAssignEnabled
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-200 text-gray-600"
                            }`}
                        >
                          {m.autoAssignEnabled ? "✔ Evet" : "✖ Hayır"}
                        </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {openModal && (
                <AddMemberModal
                    isOpen={openModal}
                    onClose={() => setOpenModal(false)}
                    onSave={handleSave}
                />
            )}
        </Layout>
    );
}
