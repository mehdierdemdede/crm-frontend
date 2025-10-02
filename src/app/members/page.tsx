"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import AddMemberModal from "@/components/AddMemberModal";

interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
    langs: string[];
    capacityPerDay: number;
    assignedToday: number;
    active: boolean;
    autoAssign: boolean;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [openModal, setOpenModal] = useState(false);

    const handleSave = (newMember: any) => {
        setMembers((prev) => [
            ...prev,
            {
                id: prev.length + 1,
                assignedToday: 0,
                ...newMember,
            },
        ]);
    };

    return (
        <Layout title="Members" subtitle="Kullanıcıları yönetin">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span>Üyeler</span>
                        <Button variant="primary" onClick={() => setOpenModal(true)}>
                            + Yeni Üye
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="p-2">Ad Soyad</th>
                                <th className="p-2">Email</th>
                                <th className="p-2">Rol</th>
                                <th className="p-2">Diller</th>
                                <th className="p-2">Kapasite</th>
                                <th className="p-2">Aktif</th>
                                <th className="p-2">Auto-Assign</th>
                            </tr>
                            </thead>
                            <tbody>
                            {members.map((m) => (
                                <tr key={m.id} className="border-t">
                                    <td className="p-2">{m.name}</td>
                                    <td className="p-2">{m.email}</td>
                                    <td className="p-2">{m.role}</td>
                                    <td className="p-2">
                                        {m.langs.map((l) => (
                                            <span
                                                key={l}
                                                className="inline-block bg-gray-200 text-xs rounded px-2 py-0.5 mr-1"
                                            >
                          {l}
                        </span>
                                        ))}
                                    </td>
                                    <td className="p-2">
                                        <div className="w-40 bg-gray-200 rounded-full h-3 mb-1">
                                            <div
                                                className={`h-3 rounded-full ${
                                                    m.assignedToday >= m.capacityPerDay
                                                        ? "bg-red-500"
                                                        : "bg-green-500"
                                                }`}
                                                style={{
                                                    width: `${Math.min(
                                                        (m.assignedToday / m.capacityPerDay) * 100,
                                                        100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-600">
                        {m.assignedToday}/{m.capacityPerDay}
                      </span>
                                    </td>
                                    <td className="p-2">
                                        {m.active ? (
                                            <span className="text-green-600 font-medium">Aktif</span>
                                        ) : (
                                            <span className="text-red-600 font-medium">Pasif</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {m.autoAssign ? "✔" : "✖"}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {members.length === 0 && (
                            <div className="text-center text-gray-500 py-10">
                                Henüz üye eklenmedi.
                            </div>
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
