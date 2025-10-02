"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import AddMemberModal from "@/components/AddMemberModal";
import Link from "next/link"; // en üstte ekle


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

// Dummy üyeler
const DUMMY_MEMBERS: Member[] = [
    {
        id: 1,
        name: "Ahmet Yılmaz",
        email: "ahmet@example.com",
        role: "USER",
        langs: ["TR", "EN"],
        capacityPerDay: 10,
        assignedToday: 6,
        active: true,
        autoAssign: true,
    },
    {
        id: 2,
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        role: "ADMIN",
        langs: ["TR", "DE"],
        capacityPerDay: 15,
        assignedToday: 15,
        active: true,
        autoAssign: false,
    },
    {
        id: 3,
        name: "Mehmet Demir",
        email: "mehmet@example.com",
        role: "USER",
        langs: ["EN"],
        capacityPerDay: 8,
        assignedToday: 3,
        active: false,
        autoAssign: false,
    },
];

const LANG_COLORS: Record<string, string> = {
    TR: "bg-red-100 text-red-800",
    EN: "bg-blue-100 text-blue-800",
    DE: "bg-yellow-100 text-yellow-800",
    AR: "bg-green-100 text-green-800",
    AL: "bg-purple-100 text-purple-800",
};

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [openModal, setOpenModal] = useState(false);

    useEffect(() => {
        // sayfa açıldığında dummy üyeleri yükle
        setMembers(DUMMY_MEMBERS);
    }, []);

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
                        <span className="font-semibold">Üyeler</span>
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
                                    <td className="p-2">
                                        <Link href={`/members/${m.id}`} className="text-blue-600 hover:underline">
                                            {m.name}
                                        </Link>
                                    </td>
                                    <td className="p-2">{m.email}</td>
                                    <td className="p-2">{m.role}</td>
                                    <td className="p-2">
                                        {m.langs.map((l) => (
                                            <span
                                                key={l}
                                                className={`inline-block text-xs rounded px-2 py-0.5 mr-1 ${
                                                    LANG_COLORS[l] || "bg-gray-200 text-gray-700"
                                                }`}
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
                      <span
                          className={`px-2 py-0.5 text-xs rounded ${
                              m.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                      >
                        {m.active ? "Aktif" : "Pasif"}
                      </span>
                                    </td>
                                    <td className="p-2">
                      <span
                          className={`px-2 py-0.5 text-xs rounded ${
                              m.autoAssign ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                          }`}
                      >
                        {m.autoAssign ? "✔ Evet" : "✖ Hayır"}
                      </span>
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
