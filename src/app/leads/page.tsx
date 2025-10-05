"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    Phone,
    MessageCircle,
    Facebook,
    Trash2,
    UserPlus,
    UserCheck,
    Users,
    CheckSquare,
} from "lucide-react";
import {
    getLeads,
    patchLeadStatus,
    patchLeadAssign,
    bulkAssignLeads,
    deleteLead,
} from "@/lib/api";

/** ───────────────────────────────
 *  Tipler
 *  ─────────────────────────────── */
type LeadStatus =
    | "Uncontacted"
    | "Positive"
    | "Solded"
    | "No Interest"
    | "Blocked"
    | "Wrong Number"
    | "No Answer";

interface Lead {
    id: number;
    name: string;
    adSource: "Facebook" | "Google" | "Manual";
    campaign: string;
    createdAt: string;
    status: LeadStatus;
    lang: "TR" | "EN" | "DE" | "AR" | "AL";
    firstRespond?: string;
    assignedUserId?: number | null;
}

interface Agent {
    id: number;
    name: string;
    langs: Array<Lead["lang"]>;
    capacityPerDay: number;
    assignedToday: number;
    active: boolean;
}

/** ───────────────────────────────
 *  Sabitler
 *  ─────────────────────────────── */
const STATUS_COLORS: Record<LeadStatus, string> = {
    Uncontacted: "bg-gray-300 text-gray-800",
    Positive: "bg-yellow-100 text-yellow-800",
    Solded: "bg-green-100 text-green-800",
    "No Interest": "bg-gray-200 text-gray-600",
    Blocked: "bg-red-100 text-red-700",
    "Wrong Number": "bg-red-50 text-red-500",
    "No Answer": "bg-orange-100 text-orange-800",
};

const STATUSES: LeadStatus[] = [
    "Uncontacted",
    "Positive",
    "Solded",
    "No Interest",
    "Blocked",
    "Wrong Number",
    "No Answer",
];

const LANGS: Array<Lead["lang"]> = ["TR", "EN", "DE", "AR", "AL"];

/** ───────────────────────────────
 *  Sayfa
 *  ─────────────────────────────── */
export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | LeadStatus>("");
    const [langFilter, setLangFilter] = useState<"" | Lead["lang"]>("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [assignUserId, setAssignUserId] = useState<number | "">("");
    const [agents, setAgents] = useState<Agent[]>([]);

    /** ───────────────────────────────
     *  Lead'leri yükle (Backend)
     *  ─────────────────────────────── */
    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            const data = await getLeads();

            // backend response mapping
            const mapped = data.map((d: any) => ({
                id: Number(d.id),
                name: d.name,
                adSource: (d.adSource || "Manual") as Lead["adSource"],
                campaign: d.campaign || "-",
                createdAt: new Date(d.createdAt).toLocaleString("tr-TR"),
                status: (d.status || "Uncontacted") as LeadStatus,
                lang: (d.language || "TR") as Lead["lang"],
                assignedUserId: d.assignedUserId ? Number(d.assignedUserId) : undefined,
            }));
            setLeads(mapped);
            setLoading(false);
        };

        fetchLeads();
    }, []);

    /** Dummy agents (ileride backend’e bağlanacak) */
    useEffect(() => {
        setAgents([
            {
                id: 1,
                name: "Ahmet Yılmaz",
                langs: ["TR", "EN"],
                capacityPerDay: 50,
                assignedToday: 12,
                active: true,
            },
            {
                id: 2,
                name: "Ayşe Kaya",
                langs: ["DE", "EN"],
                capacityPerDay: 30,
                assignedToday: 28,
                active: true,
            },
        ]);
    }, []);

    /** Filtreleme */
    const filtered = useMemo(() => {
        return leads.filter((l) => {
            const byText =
                l.name.toLowerCase().includes(search.toLowerCase()) ||
                l.campaign.toLowerCase().includes(search.toLowerCase());
            const byStatus = statusFilter ? l.status === statusFilter : true;
            const byLang = langFilter ? l.lang === langFilter : true;
            return byText && byStatus && byLang;
        });
    }, [leads, search, statusFilter, langFilter]);

    /** Tekli atama */
    const handleAssignOne = async (leadId: number, userId: number | "") => {
        setLeads((prev) =>
            prev.map((l) =>
                l.id === leadId ? { ...l, assignedUserId: userId === "" ? null : Number(userId) } : l
            )
        );
        await patchLeadAssign(String(leadId), userId === "" ? null : String(userId));
    };

    /** Toplu atama */
    const handleBulkAssign = async () => {
        if (assignUserId === "" || selectedIds.length === 0) return;
        await bulkAssignLeads(selectedIds.map(String), String(assignUserId));
        setSelectedIds([]);
    };

    /** Status değişimi */
    const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
        setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        const success = await patchLeadStatus(String(leadId), newStatus);
        if (!success) alert("Durum güncelleme başarısız ❌");
    };

    /** Lead silme */
    const handleDelete = async (leadId: number) => {
        const confirm = window.confirm("Bu lead silinecek, emin misin?");
        if (!confirm) return;
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        await deleteLead(String(leadId));
    };

    /** Seçimler */
    const toggleSelect = (id: number, checked: boolean) => {
        setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? filtered.map((l) => l.id) : []);
    };

    if (loading) {
        return (
            <Layout title="Lead Yönetimi" subtitle="Yükleniyor...">
                <p className="text-center text-gray-500 py-10">Veriler yükleniyor...</p>
            </Layout>
        );
    }

    /** ───────────────────────────────
     *  Render
     *  ─────────────────────────────── */
    return (
        <Layout title="Lead Yönetimi" subtitle="Lead listesi, durum ve atama">
            {/* 🔹 Filtre Alanı */}
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="İsim, kampanya ara…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="">Durum (hepsi)</option>
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={langFilter}
                                onChange={(e) => setLangFilter(e.target.value as any)}
                            >
                                <option value="">Dil (hepsi)</option>
                                {LANGS.map((l) => (
                                    <option key={l} value={l}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 🔹 Toplu Atama */}
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            <span className="text-sm text-gray-600">{selectedIds.length} seçildi</span>
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={assignUserId}
                                onChange={(e) =>
                                    setAssignUserId(e.target.value === "" ? "" : Number(e.target.value))
                                }
                            >
                                <option value="">Assign to…</option>
                                {agents.map((a) => {
                                    const capLeft = a.capacityPerDay - a.assignedToday;
                                    return (
                                        <option key={a.id} value={a.id} disabled={!a.active || capLeft <= 0}>
                                            {a.name} {a.active ? "" : "(paused)"} — {a.assignedToday}/
                                            {a.capacityPerDay}
                                        </option>
                                    );
                                })}
                            </select>
                            <Button size="sm" variant="primary" onClick={handleBulkAssign}>
                                <UserCheck className="h-4 w-4 mr-1" /> Ata
                            </Button>
                            <Button size="sm" variant="outline">
                                <UserPlus className="h-4 w-4 mr-1" /> Yeni Lead
                            </Button>
                        </div>
                    </CardHeader>

                    {/* 🔹 Lead Tablosu */}
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedIds.length === filtered.length && filtered.length > 0
                                            }
                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="p-2">Lead Adı</th>
                                    <th className="p-2">Dil</th>
                                    <th className="p-2">Kaynak</th>
                                    <th className="p-2">Kampanya</th>
                                    <th className="p-2">Tarih</th>
                                    <th className="p-2">Durum</th>
                                    <th className="p-2">Atanan Kullanıcı</th>
                                    <th className="p-2">Aksiyonlar</th>
                                </tr>
                                </thead>

                                <tbody>
                                {filtered.map((lead) => (
                                    <tr key={lead.id} className="border-t">
                                        <td className="p-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(lead.id)}
                                                onChange={(e) => toggleSelect(lead.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Link
                                                href={`/leads/${lead.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {lead.name}
                                            </Link>
                                        </td>
                                        <td className="p-2">{lead.lang}</td>
                                        <td className="p-2">{lead.adSource}</td>
                                        <td className="p-2">{lead.campaign}</td>
                                        <td className="p-2">{lead.createdAt}</td>
                                        <td className="p-2">
                                            <select
                                                className={`border rounded-md p-1 text-sm ${STATUS_COLORS[lead.status]}`}
                                                value={lead.status}
                                                onChange={(e) =>
                                                    handleStatusChange(lead.id, e.target.value as LeadStatus)
                                                }
                                            >
                                                {STATUSES.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                className="border rounded-md p-1 text-sm"
                                                value={lead.assignedUserId ?? ""}
                                                onChange={(e) =>
                                                    handleAssignOne(
                                                        lead.id,
                                                        e.target.value === "" ? "" : Number(e.target.value)
                                                    )
                                                }
                                            >
                                                <option value="">Unassigned</option>
                                                {agents.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
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

                            {filtered.length === 0 && (
                                <div className="text-center text-gray-500 py-10">
                                    Sonuç bulunamadı.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
