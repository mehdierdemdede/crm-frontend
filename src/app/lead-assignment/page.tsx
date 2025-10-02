"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { PlusCircle, Trash2 } from "lucide-react";

interface Rule {
    id: number;
    campaign: string;
    user: string;
    assigned: number; // kullanıcıya atanmış lead sayısı
}

const DUMMY_RULES: Rule[] = [
    { id: 1, campaign: "Facebook Kampanya A", user: "Ahmet Yılmaz", assigned: 70 },
    { id: 2, campaign: "Facebook Kampanya A", user: "Ayşe Kaya", assigned: 30 },
    { id: 3, campaign: "Google Kampanya B", user: "Mehmet Demir", assigned: 50 },
];

export default function LeadAssignmentPage() {
    const [rules, setRules] = useState(DUMMY_RULES);
    const [showModal, setShowModal] = useState(false);

    // toplam lead sayısını hesapla
    const totalLeads = rules.reduce((sum, r) => sum + r.assigned, 0);

    const handleDelete = (id: number) => {
        setRules((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <Layout title="Lead Assignment" subtitle="Reklam bazlı lead dağılımını görüntüleyin">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <span>Dağıtım Listesi</span>
                        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                            <PlusCircle className="h-4 w-4 mr-1" /> Yeni Atama
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">#</th>
                                    <th className="p-2">Kampanya</th>
                                    <th className="p-2">Kullanıcı</th>
                                    <th className="p-2">Atanan Lead</th>
                                    <th className="p-2">Oran (%)</th>
                                    <th className="p-2">Aksiyon</th>
                                </tr>
                                </thead>
                                <tbody>
                                {rules.map((rule, i) => {
                                    const percentage =
                                        totalLeads > 0 ? ((rule.assigned / totalLeads) * 100).toFixed(1) : "0";
                                    return (
                                        <tr key={rule.id} className="border-t">
                                            <td className="p-2">{i + 1}</td>
                                            <td className="p-2">{rule.campaign}</td>
                                            <td className="p-2">{rule.user}</td>
                                            <td className="p-2">{rule.assigned}</td>
                                            <td className="p-2">{percentage}%</td>
                                            <td className="p-2">
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => handleDelete(rule.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">Yeni Atama</h2>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                // Backend entegrasyonu yapılacak
                                setShowModal(false);
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium mb-1">Kampanya</label>
                                <select className="border rounded-md p-2 w-full">
                                    <option value="Facebook Kampanya A">Facebook Kampanya A</option>
                                    <option value="Google Kampanya B">Google Kampanya B</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Kullanıcı</label>
                                <select className="border rounded-md p-2 w-full">
                                    <option value="Ahmet Yılmaz">Ahmet Yılmaz</option>
                                    <option value="Ayşe Kaya">Ayşe Kaya</option>
                                    <option value="Mehmet Demir">Mehmet Demir</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Atanacak Lead Sayısı</label>
                                <input type="number" min={1} className="border rounded-md p-2 w-full" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowModal(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" variant="primary">
                                    Kaydet
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
