"use client";

import { useMemo, useState } from "react";
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
import Link from "next/link"; // <-- en üst importlara ekle

/** ─────────────────────────────────────────────────────────────
 *  Tipler
 *  ──────────────────────────────────────────────────────────── */
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
    capacityPerDay: number; // günlük kapasite
    assignedToday: number;  // bugün atanmış lead sayısı
    active: boolean;
}

/** ─────────────────────────────────────────────────────────────
 *  Dummy veriler (backend bağlanınca API'den gelecek)
 *  ──────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<LeadStatus, string> = {
    Uncontacted: "bg-gray-300 text-gray-800",
    Positive: "bg-yellow-100 text-yellow-800",
    Solded: "bg-green-100 text-green-800",
    "No Interest": "bg-gray-200 text-gray-600",
    Blocked: "bg-red-100 text-red-700",
    "Wrong Number": "bg-red-50 text-red-500",
    "No Answer": "bg-orange-100 text-orange-800",
};

const AGENTS: Agent[] = [
    { id: 1, name: "Ahmet Yılmaz", langs: ["TR", "EN"], capacityPerDay: 50, assignedToday: 12, active: true },
    { id: 2, name: "Ayşe Kaya",   langs: ["DE", "EN"], capacityPerDay: 30, assignedToday: 28, active: true },
    { id: 3, name: "Mehmet Demir",langs: ["AR", "TR"], capacityPerDay: 40, assignedToday: 40, active: true },
    { id: 4, name: "Kemal Öztürk",langs: ["AL", "TR"], capacityPerDay: 25, assignedToday: 5,  active: false }, // paused örneği
];

const DUMMY_LEADS: Lead[] = [
    { id: 1, name: "Dummy Leadsey",   adSource: "Facebook", campaign: "TR/TR/DEU/€800/2.6.25", createdAt: "2025-06-22 18:03", status: "Positive",   firstRespond: "3 dk", lang: "TR", assignedUserId: undefined },
    { id: 3, name: "Dummy Leadslai̇f",adSource: "Facebook", campaign: "TR/TR/DEU/€800/2.6.25", createdAt: "2025-06-22 09:32", status: "Uncontacted",firstRespond: "18 dk",  lang: "DE", assignedUserId: undefined },
    { id: 4, name: "Dummy Leads",     adSource: "Facebook", campaign: "TR/TR/DEU/€800/2.6.25", createdAt: "2025-06-21 14:18", status: "Solded",     firstRespond: "55 dk", lang: "TR", assignedUserId: 1 },
    { id: 5, name: "Dummy Leadsn",    adSource: "Facebook", campaign: "TR/TR/DEU/€800/2.6.25", createdAt: "2025-06-14 20:40", status: "No Interest",firstRespond: "65 dk", lang: "EN", assignedUserId: undefined },
    { id: 6, name: "Dummy Leadsli",   adSource: "Facebook", campaign: "TR/TR/DEU/€800/2.6.25", createdAt: "2025-06-12 20:24", status: "Positive",   firstRespond: "12 dk", lang: "AR", assignedUserId: 3 },
];

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

/** ─────────────────────────────────────────────────────────────
 *  Yardımcılar
 *  ──────────────────────────────────────────────────────────── */
const getAgent = (id?: number | null) => AGENTS.find((a) => a.id === id);
const canAgentTake = (agent: Agent, lang: Lead["lang"]) =>
    agent.active &&
    agent.assignedToday < agent.capacityPerDay &&
    agent.langs.includes(lang);

/** ─────────────────────────────────────────────────────────────
 *  Sayfa
 *  ──────────────────────────────────────────────────────────── */
export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>(DUMMY_LEADS);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | LeadStatus>("");
    const [langFilter, setLangFilter] = useState<"" | Lead["lang"]>("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [assignUserId, setAssignUserId] = useState<number | "">("");

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

    /** Tekli atama (satır içi dropdown) */
    const handleAssignOne = (leadId: number, userId: number | "") => {
        setLeads((prev) =>
            prev.map((l) =>
                l.id === leadId ? { ...l, assignedUserId: userId === "" ? null : Number(userId) } : l
            )
        );
        // TODO: backend PATCH /leads/:id {assignedUserId}
    };

    /** Toplu atama */
    const handleBulkAssign = () => {
        if (assignUserId === "" || selectedIds.length === 0) return;
        const agent = getAgent(Number(assignUserId));
        if (!agent) return;

        // kapasite/dil kontrolü: kapasite kadar, dil uyumlu leadleri ata
        let remainingCapacity = Math.max(agent.capacityPerDay - agent.assignedToday, 0);
        setLeads((prev) =>
            prev.map((l) => {
                if (!selectedIds.includes(l.id)) return l;
                if (remainingCapacity <= 0) return l;
                if (!canAgentTake(agent, l.lang)) return l;
                remainingCapacity -= 1;
                return { ...l, assignedUserId: agent.id };
            })
        );
        setSelectedIds([]);
        // TODO: backend POST /assign {leadIds, userId}
    };

    const toggleSelect = (id: number, checked: boolean) => {
        setSelectedIds((prev) =>
            checked ? [...prev, id] : prev.filter((x) => x !== id)
        );
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? filtered.map((l) => l.id) : []);
    };

    const handleStatusChange = (leadId: number, newStatus: LeadStatus) => {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
        // TODO: backend PATCH /leads/:id {status}
    };

    const handleDelete = (leadId: number) => {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        // TODO: backend DELETE /leads/:id
    };

    return (
        <Layout title="Lead Yönetimi" subtitle="Leads listesi, durum ve atama">
            {/* Top filter/action bar */}
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

                        {/* Toplu atama alanı */}
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            <span className="text-sm text-gray-600">
                {selectedIds.length} seçildi
              </span>
                            <select
                                className="border rounded-md p-2 text-sm"
                                value={assignUserId}
                                onChange={(e) => setAssignUserId(e.target.value === "" ? "" : Number(e.target.value))}
                            >
                                <option value="">Assign to…</option>
                                {AGENTS.map((a) => {
                                    const capLeft = a.capacityPerDay - a.assignedToday;
                                    return (
                                        <option key={a.id} value={a.id} disabled={!a.active || capLeft <= 0}>
                                            {a.name} {a.active ? "" : "(paused)"} — {a.assignedToday}/{a.capacityPerDay}
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

                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === filtered.length && filtered.length > 0}
                                            onChange={(e) => toggleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="p-2">Lead Adı</th>
                                    {/* sadece lead ismi */}
                                    <th className="p-2">Dil</th>
                                    <th className="p-2">Kaynak</th>
                                    <th className="p-2">Kampanya</th>
                                    <th className="p-2">Tarih</th>
                                    <th className="p-2">First Respond</th>
                                    <th className="p-2">Durum</th>
                                    <th className="p-2">Atanan Kullanıcı</th>
                                    {/* dropdown burada */}
                                    <th className="p-2">Aksiyonlar</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.map((lead) => {
                                    const agent = getAgent(lead.assignedUserId || undefined);
                                    return (
                                        <tr key={lead.id} className="border-t">
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(lead.id)}
                                                    onChange={(e) => toggleSelect(lead.id, e.target.checked)}
                                                />
                                            </td>

                                            <td className="p-2">
                                                <Link href={`/leads/${lead.id}`}
                                                      className="text-blue-600 hover:underline">
                                                    {lead.name}
                                                </Link>
                                            </td>

                                            <td className="p-2">
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs">
                            {lead.lang}
                          </span>
                                            </td>

                                            <td className="p-2">{lead.adSource}</td>
                                            <td className="p-2">{lead.campaign}</td>
                                            <td className="p-2">{lead.createdAt}</td>

                                            {/* First Respond */}
                                            <td className="p-2">
  <span className="inline-block bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded">
    {lead.firstRespond || "-"}
  </span>
                                            </td>

                                            {/* Status */}
                                            <td className="p-2">
                                                <select
                                                    className={`border rounded-md p-1 text-sm ${STATUS_COLORS[lead.status as LeadStatus]}`}
                                                    value={lead.status}
                                                    onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                                                >
                                                    {STATUSES.map((s) => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Atanan kullanıcı (satır içi dropdown) */}
                                            <td className="p-2">
                                                <select
                                                    className="border rounded-md p-1 text-sm"
                                                    value={lead.assignedUserId ?? ""}
                                                    onChange={(e) =>
                                                        handleAssignOne(lead.id, e.target.value === "" ? "" : Number(e.target.value))
                                                    }
                                                >
                                                    <option value="">Unassigned</option>
                                                    {AGENTS.map((a) => {
                                                        const capLeft = a.capacityPerDay - a.assignedToday;
                                                        const ok = canAgentTake(a, lead.lang);
                                                        const label = `${a.name} — ${a.assignedToday}/${a.capacityPerDay}${
                                                            a.langs.includes(lead.lang) ? "" : " (lang!)"
                                                        }`;
                                                        return (
                                                            <option key={a.id} value={a.id} disabled={!ok}>
                                                                {label}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                {agent && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {agent.name} • {agent.assignedToday}/{agent.capacityPerDay}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Aksiyonlar */}
                                            <td className="p-2">
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" title="Telefon">
                                                        <Phone className="h-4 w-4"/>
                                                    </Button>
                                                    <Button size="sm" variant="outline" title="WhatsApp">
                                                        <MessageCircle className="h-4 w-4"/>
                                                    </Button>
                                                    <Button size="sm" variant="outline" title="Messenger">
                                                        <Facebook className="h-4 w-4"/>
                                                    </Button>
                                                    <Button size="sm" variant="danger"
                                                            onClick={() => handleDelete(lead.id)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>

                            {filtered.length === 0 && (
                                <div className="text-center text-gray-500 py-10">Sonuç bulunamadı.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
