"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import type { LeadResponse as Lead } from "@/lib/api";
import Link from "next/link";
import {
    Phone,
    MessageCircle,
    Facebook,
    Trash2,
    UserPlus,
    UserCheck,
    CheckSquare,
} from "lucide-react";
import {
    getLeads,
    updateLeadStatus,
    deleteLead,
} from "@/lib/api";



type LeadStatus =
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "PROPOSAL_SENT"
    | "NEGOTIATION"
    | "CLOSED_WON"
    | "CLOSED_LOST";

const STATUS_COLORS: Record<string, string> = {
    NEW: "bg-gray-300 text-gray-800",
    CONTACTED: "bg-blue-100 text-blue-800",
    QUALIFIED: "bg-yellow-100 text-yellow-800",
    PROPOSAL_SENT: "bg-indigo-100 text-indigo-800",
    NEGOTIATION: "bg-amber-100 text-amber-800",
    CLOSED_WON: "bg-green-100 text-green-800",
    CLOSED_LOST: "bg-red-100 text-red-800",
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // 📦 Lead listesi yükleniyor
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getLeads();
            setLeads(data);
            setLoading(false);
        };
        fetchData();
    }, []);

    // 🔍 Filtreleme
    const filtered = useMemo(() => {
        return leads.filter((l) => {
            const byText =
                l.name.toLowerCase().includes(search.toLowerCase()) ||
                (l.campaign?.name?.toLowerCase() || "").includes(search.toLowerCase());
            const byStatus = statusFilter ? l.status === statusFilter : true;
            return byText && byStatus;
        });
    }, [leads, search, statusFilter]);

    // 🟢 Durum değiştir
    const handleStatusChange = async (leadId: string, newStatus: string) => {
        const success = await updateLeadStatus(leadId, newStatus);
        if (success) {
            setLeads((prev) =>
                prev.map((l) =>
                    l.id === leadId ? { ...l, status: newStatus } : l
                )
            );
        } else {
            alert("Durum güncellenemedi.");
        }
    };

    // ❌ Lead silme
    const handleDelete = async (leadId: string) => {
        if (!confirm("Bu lead'i silmek istediğine emin misin?")) return;
        const success = await deleteLead(leadId);
        if (success) {
            setLeads((prev) => prev.filter((l) => l.id !== leadId));
        } else {
            alert("Silme işlemi başarısız oldu.");
        }
    };

    return (
        <Layout title="Lead Yönetimi" subtitle="Tüm lead'leri görüntüle ve yönet">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="İsim veya kampanya ara…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Tüm Durumlar</option>
                                {Object.keys(STATUS_COLORS).map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-center text-gray-500 py-10">
                                Yükleniyor...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                Kayıt bulunamadı.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2">Ad</th>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Dil</th>
                                        <th className="p-2">Kampanya</th>
                                        <th className="p-2">Durum</th>
                                        <th className="p-2">Atanan</th>
                                        <th className="p-2">Tarih</th>
                                        <th className="p-2 text-center">Aksiyonlar</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filtered.map((lead) => (
                                        <tr key={lead.id} className="border-t">
                                            <td className="p-2">
                                                <Link
                                                    href={`/leads/${lead.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {lead.name}
                                                </Link>
                                            </td>
                                            <td className="p-2">{lead.email || "-"}</td>
                                            <td className="p-2">{lead.language || "-"}</td>
                                            <td className="p-2">{lead.campaign?.name || "-"}</td>

                                            <td className="p-2">
                                                <select
                                                    className={`border rounded-md p-1 text-sm ${STATUS_COLORS[lead.status]}`}
                                                    value={lead.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(lead.id, e.target.value)
                                                    }
                                                >
                                                    {Object.keys(STATUS_COLORS).map((s) => (
                                                        <option key={s} value={s}>
                                                            {s.replace("_", " ")}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="p-2">
                                                {lead.assignedToUser
                                                    ? `${lead.assignedToUser.firstName} ${lead.assignedToUser.lastName}`
                                                    : "-"}
                                            </td>

                                            <td className="p-2">
                                                {new Date(lead.createdAt).toLocaleString()}
                                            </td>

                                            <td className="p-2 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" variant="outline" title="Telefon">
                                                        <Phone className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        title="Messenger"
                                                    >
                                                        <Facebook className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={() => handleDelete(lead.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
