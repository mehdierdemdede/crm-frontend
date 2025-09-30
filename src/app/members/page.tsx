"use client";
import React, { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import AddMemberModal from "@/components/AddMemberModal";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";

const INITIAL_MEMBERS = [
    { id: "m1", name: "Ahmet Yılmaz", email: "ahmet@example.com", role: "ADMIN", status: "active", totalActivities: 25 },
    { id: "m2", name: "Ayşe Kaya", email: "ayse@example.com", role: "USER", status: "active", totalActivities: 18 },
    { id: "m3", name: "Mehmet Demir", email: "mehmet@example.com", role: "USER", status: "invited", totalActivities: 4 },
    { id: "m4", name: "Zeynep Çelik", email: "zeynep@example.com", role: "USER", status: "active", totalActivities: 12 },
    { id: "m5", name: "Kemal Öztürk", email: "kemal@example.com", role: "USER", status: "invited", totalActivities: 0 },
];

export default function MembersPage() {
    const [planLimit] = useState(10);
    const [members, setMembers] = useState(INITIAL_MEMBERS);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [showAdd, setShowAdd] = useState(false);
    const remaining = planLimit - members.length;

    const filtered = useMemo(() => {
        let result = members;
        const q = query.trim().toLowerCase();

        if (q) {
            result = result.filter((m) =>
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== "all") {
            result = result.filter((m) => m.status === statusFilter);
        }

        if (roleFilter !== "all") {
            result = result.filter((m) => m.role === roleFilter);
        }

        return result;
    }, [members, query, statusFilter, roleFilter]);

    const handleAdd = (m: any) => {
        setMembers((prev) => [m, ...prev]);
    };

    const handleRemove = (id: string) => {
        if (!confirm("Bu üyeyi silmek istediğine emin misin?")) return;
        setMembers((prev) => prev.filter((p) => p.id !== id));
    };

    const handleResend = (id: string) => {
        alert("Davet/şifre yeniden (simüle) gönderildi.");
    };

    // İstatistikler
    const stats = useMemo(() => ({
        total: members.length,
        active: members.filter(m => m.status === "active").length,
        invited: members.filter(m => m.status === "invited").length,
        admins: members.filter(m => m.role === "Admin").length,
    }), [members]);

    return (
        <Layout>
            <div className="p-6 min-h-screen bg-gradient-to-b from-white to-blue-50">
                {/* Header area */}
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-2xl font-bold mb-1">Üye Yönetimi</h1>
                        <p className="text-sm text-gray-600">Organizasyon üyeleri ve izin yönetimi</p>
                    </div>
                    <div className="text-right text-sm text-gray-700">
                        <div>Paket: <strong>{planLimit} üyelik</strong></div>
                        <div>Kalan: <strong>{remaining} slot</strong></div>
                    </div>
                </header>

                {/* Filtreler ve Arama */}
                <div className="flex flex-col md:flex-row gap-4 mb-5 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto">
                        <input
                            className="border px-3 py-2 rounded w-full sm:w-64"
                            placeholder="İsim veya e-posta ara..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded border w-full sm:w-auto"
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="active">Aktif</option>
                            <option value="invited">Davetli</option>
                        </select>

                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-3 py-2 rounded border w-full sm:w-auto"
                        >
                            <option value="all">Tüm Roller</option>
                            <option value="ADMIN">Admin</option>
                            <option value="USER">Üye</option>
                        </select>
                    </div>

                    <Button
                        type="button"
                        className="bg-green-600 text-white px-4 py-2 rounded w-full md:w-auto"
                        onClick={() => setShowAdd(true)}
                        disabled={remaining <= 0}
                    >
                        + Yeni Üye Ekle
                    </Button>
                </div>

                {/* İstatistik Kartları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="text-sm text-gray-700">Toplam Üye</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Tüm üyeler</div>
                    </Card>

                    <Card>
                        <CardHeader className="text-sm text-gray-700">Aktif Üyeler</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.active}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Sistemde aktif</div>
                    </Card>

                    <Card>
                        <CardHeader className="text-sm text-gray-700">Davet Bekleyen</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.invited}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Davet onayı bekliyor</div>
                    </Card>

                    <Card>
                        <CardHeader className="text-sm text-gray-700">Adminler</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.admins}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Yönetici yetkisi</div>
                    </Card>
                </div>

                {/* Üye Listesi */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <span>Üye Listesi</span>
                            <span className="text-sm text-gray-500">
                                {filtered.length} üye gösteriliyor
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                <tr className="text-xs text-gray-500 border-b">
                                    <th className="py-3 px-2">#</th>
                                    <th className="py-3 px-2">İsim</th>
                                    <th className="py-3 px-2">E-posta</th>
                                    <th className="py-3 px-2">Rol</th>
                                    <th className="py-3 px-2">Durum</th>
                                    <th className="py-3 px-2">Aktiviteler</th>
                                    <th className="py-3 px-2 text-center">Aksiyon</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.map((m, i) => (
                                    <tr key={m.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-2">{i + 1}</td>
                                        <td className="py-3 px-2 font-medium">{m.name}</td>
                                        <td className="py-3 px-2 text-sm text-gray-600">{m.email}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                m.role === "Admin" ? "bg-blue-100 text-blue-700" :
                                                    m.role === "Member" ? "bg-green-100 text-green-700" :
                                                        "bg-gray-100 text-gray-700"
                                            }`}>
                                                {m.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                m.status === "active" ? "bg-green-100 text-green-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                            }`}>
                                                {m.status === "active" ? "Aktif" : "Davetli"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className="text-sm text-gray-600">{m.totalActivities}</span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="flex gap-2 justify-center">
                                                {m.status === "invited" && (
                                                    <button
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                        onClick={() => handleResend(m.id)}
                                                    >
                                                        Tekrar Gönder
                                                    </button>
                                                )}
                                                <button
                                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                    onClick={() => handleRemove(m.id)}
                                                >
                                                    Kaldır
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <div className="text-lg mb-2">🤷‍♂️</div>
                                                <div>Kayıt bulunamadı</div>
                                                <div className="text-sm mt-1">Filtreleri temizlemeyi deneyin</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {showAdd && (
                    <AddMemberModal
                        remainingSlots={remaining}
                        onClose={() => setShowAdd(false)}
                        onAdd={handleAdd}
                    />
                )}
            </div>
        </Layout>
    );
}