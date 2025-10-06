"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import Link from "next/link";
import {
    getLeads,
    updateLeadStatus,
    deleteLead,
    patchLeadAssign,
    getUsers,
    type LeadResponse,
    type LeadStatus,
    type SimpleUser,
} from "@/lib/api";
import { Phone, MessageCircle, Facebook, Trash2, ArrowUpDown } from "lucide-react";

/** Türkçe karşılıklar */
const STATUS_LABELS: Record<LeadStatus, string> = {
    UNCONTACTED: "İlk Temas Yok",
    HOT: "Sıcak Hasta",
    SOLD: "Satış",
    NOT_INTERESTED: "İlgisiz",
    BLOCKED: "Engellendi",
    WRONG_INFO: "Yanlış Bilgi",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
    UNCONTACTED: "bg-gray-300 text-gray-800",
    HOT: "bg-yellow-100 text-yellow-800",
    SOLD: "bg-green-100 text-green-800",
    NOT_INTERESTED: "bg-gray-200 text-gray-700",
    BLOCKED: "bg-red-100 text-red-700",
    WRONG_INFO: "bg-orange-100 text-orange-800",
};

type SortableColumn =
    | "name"
    | "email"
    | "language"
    | "campaign"
    | "status"
    | "assignedToUser"
    | "createdAt";

function getSortValue(l: LeadResponse, col: SortableColumn): string {
    switch (col) {
        case "name":
            return l.name ?? "";
        case "email":
            return l.email ?? "";
        case "language":
            return l.language ?? "";
        case "campaign":
            return l.campaign?.name ?? "";
        case "status":
            return l.status ?? "";
        case "assignedToUser":
            return l.assignedToUser
                ? `${l.assignedToUser.firstName ?? ""} ${l.assignedToUser.lastName ?? ""}`.trim()
                : "";
        case "createdAt":
            return l.createdAt ? new Date(l.createdAt).toISOString() : "";
        default:
            return "";
    }
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<LeadResponse[]>([]);
    const [users, setUsers] = useState<SimpleUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortBy, setSortBy] = useState<SortableColumn>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const perPage = 10;

    // 📦 verileri yükle
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [leadData, userData] = await Promise.all([getLeads(), getUsers()]);
            setLeads(leadData ?? []);
            setUsers(userData ?? []);
            setLoading(false);
        };
        fetchData();
    }, []);

    // 🔍 filtreleme
    const filtered = useMemo(() => {
        return leads.filter((l) => {
            const hay = search.toLowerCase();
            const byText =
                l.name?.toLowerCase().includes(hay) ||
                l.email?.toLowerCase().includes(hay) ||
                l.campaign?.name?.toLowerCase().includes(hay);
            const byStatus = statusFilter ? l.status === statusFilter : true;
            return byText && byStatus;
        });
    }, [leads, search, statusFilter]);

    // 🔼🔽 sıralama
    const handleSort = (field: SortableColumn) => {
        if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = getSortValue(a, sortBy);
            const bv = getSortValue(b, sortBy);
            return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });
    }, [filtered, sortBy, sortOrder]);

    // 📄 sayfalama
    const totalPages = Math.ceil(sorted.length / perPage) || 1;
    const paginated = useMemo(
        () => sorted.slice((page - 1) * perPage, page * perPage),
        [sorted, page]
    );

    // 🟢 durum değiştir
    const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        const ok = await updateLeadStatus(leadId, newStatus);
        if (ok) {
            setLeads((prev) =>
                prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
            );
        } else alert("Durum güncellenemedi.");
    };

    // 👤 kullanıcı atama
    const handleAssign = async (leadId: string, userId: string | null) => {
        const ok = await patchLeadAssign(leadId, userId);
        if (ok) {
            setLeads((prev) =>
                prev.map((l) =>
                    l.id === leadId
                        ? {
                            ...l,
                            assignedToUser: userId
                                ? users.find((u) => u.id === userId) || null
                                : null,
                        }
                        : l
                )
            );
        } else alert("Atama başarısız!");
    };

    // ❌ silme
    const handleDelete = async (leadId: string) => {
        if (!confirm("Bu lead'i silmek istediğine emin misin?")) return;
        const ok = await deleteLead(leadId);
        if (ok) setLeads((prev) => prev.filter((l) => l.id !== leadId));
    };

    return (
        <Layout title="Lead Yönetimi" subtitle="Tüm lead’leri görüntüle ve yönet">
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="İsim, email veya kampanya ara…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">Tüm Durumlar</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-center text-gray-500 py-10">Yükleniyor...</div>
                        ) : paginated.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">Kayıt bulunamadı.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-100 text-left">
                                        {[
                                            { key: "name", label: "Ad" },
                                            { key: "email", label: "Email" },
                                            { key: "language", label: "Dil" },
                                            { key: "campaign", label: "Kampanya" },
                                            { key: "status", label: "Durum" },
                                            { key: "assignedToUser", label: "Atanan Kullanıcı" },
                                            { key: "createdAt", label: "Tarih" },
                                        ].map((c) => (
                                            <th
                                                key={c.key}
                                                className="p-2 cursor-pointer select-none"
                                                onClick={() => handleSort(c.key as SortableColumn)}
                                            >
                                                {c.label} <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                            </th>
                                        ))}
                                        <th className="p-2 text-center">Aksiyonlar</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paginated.map((lead) => (
                                        <tr key={lead.id} className="border-t hover:bg-gray-50">
                                            <td className="p-2">
                                                <Link
                                                    href={`/leads/${lead.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {lead.name ?? "-"}
                                                </Link>
                                            </td>
                                            <td className="p-2">{lead.email ?? "-"}</td>
                                            <td className="p-2">{lead.language ?? "-"}</td>
                                            <td className="p-2">{lead.campaign?.name ?? "-"}</td>

                                            <td className="p-2">
                                                <select
                                                    className={`border rounded-md p-1 text-xs ${STATUS_COLORS[lead.status as LeadStatus]}`}
                                                    value={lead.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(lead.id, e.target.value as LeadStatus)
                                                    }
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                        <option key={val} value={val}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* 🔹 Atama sütunu */}
                                            <td className="p-2">
                                                <select
                                                    className="border rounded-md p-1 text-xs"
                                                    value={lead.assignedToUser?.id || ""}
                                                    onChange={(e) =>
                                                        handleAssign(
                                                            lead.id,
                                                            e.target.value ? e.target.value : null
                                                        )
                                                    }
                                                >
                                                    <option value="">Atanmadı</option>
                                                    {users.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.firstName} {u.lastName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="p-2">
                                                {new Date(lead.createdAt).toLocaleString()}
                                            </td>

                                            <td className="p-2 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" variant="outline" title="Telefon">
                                                        <Phone className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" title="WhatsApp">
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" title="Messenger">
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
