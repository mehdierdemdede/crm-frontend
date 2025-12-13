"use client";


import { useState, useEffect } from "react";

import AddMemberModal from "@/components/AddMemberModal";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import Layout from "@/components/Layout";
import { getUsers, UserResponse } from "@/lib/api";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    useEffect(() => {
        void fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // getUsers backendde zaten role check yapıyor
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Tüm Kullanıcılar (Super Admin)" subtitle="Sistemdeki tüm kayıtlı kullanıcılar">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span className="font-semibold">Kullanıcı Listesi</span>
                        <Button variant="primary" onClick={() => setIsInviteModalOpen(true)}>+ Yeni Davet</Button>
                    </CardHeader>
                    <CardContent>
                        <AddMemberModal
                            isOpen={isInviteModalOpen}
                            onClose={() => setIsInviteModalOpen(false)}
                            onSave={() => {
                                void fetchUsers();
                            }}
                        />
                        {loading ? (
                            <div className="text-center py-10">Yükleniyor...</div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2">Ad Soyad</th>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Rol</th>
                                        <th className="p-2">Durum</th>
                                        <th className="p-2">Org ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-t hover:bg-gray-50">
                                            <td className="p-2 font-medium">{u.firstName} {u.lastName}</td>
                                            <td className="p-2 text-gray-600">{u.email}</td>
                                            <td className="p-2">
                                                <span className={`px-2 py-1 rounded text-xs ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                {u.active ?
                                                    <span className="text-green-600">Aktif</span> :
                                                    <span className="text-red-500">Pasif</span>
                                                }
                                            </td>
                                            <td className="p-2 text-xs text-gray-400 font-mono">
                                                {/* Org Name servisten dönmüyor olabilir, şimdilik ID */}
                                                {/* u.organizationId field'ı UserResponse'a eklenmeli gerekirse */}
                                                --
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
