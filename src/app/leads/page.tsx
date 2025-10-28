"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
    getLeads,
    updateLeadStatus,
    deleteLead,
    patchLeadAssign,
    getUsers,
    addLeadAction,
    type LeadResponse,
    type LeadStatus,
    type SimpleUser,
} from "@/lib/api";
import { Phone, MessageCircle, Facebook, Trash2, ArrowUpDown } from "lucide-react";

const STATUS_LABELS: Record<LeadStatus, string> = {
    UNCONTACTED: "İlk Temas Yok",
    HOT: "Sıcak Hasta",
    SOLD: "Satış",
    NOT_INTERESTED: "İlgisiz",
    BLOCKED: "Engellendi",
    WRONG_INFO: "Yanlış Bilgi",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
    UNCONTACTED: "bg-gray-200 text-gray-800",
    HOT: "bg-yellow-100 text-yellow-800",
    SOLD: "bg-green-100 text-green-800",
    NOT_INTERESTED: "bg-gray-100 text-gray-600",
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

export default function LeadsPage() {
    const [leads, setLeads] = useState<LeadResponse[]>([]);
    const [users, setUsers] = useState<SimpleUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [languageFilter, setLanguageFilter] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("");
    const [assignedFilter, setAssignedFilter] = useState("");
    const [sortBy, setSortBy] = useState<SortableColumn>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const perPage = 10;
    const { user } = useAuth();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const userData = await getUsers();
                setUsers(userData ?? []);
            } catch (err) {
                console.error("Kullanıcı listesi alınamadı:", err);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (assignedFilter === "__me__" && !user?.id) {
            return;
        }
        const fetchLeads = async () => {
            setLoading(true);
            try {
                const assignedUserId = (() => {
                    if (assignedFilter === "__me__") return user?.id ?? undefined;
                    if (
                        assignedFilter &&
                        assignedFilter !== "__me__" &&
                        assignedFilter !== "__unassigned__"
                    )
                        return assignedFilter;
                    return undefined;
                })();

                const leadPage = await getLeads({
                    page,
                    size: perPage,
                    sort: `${sortBy},${sortOrder}`,
                    search: search.trim() || undefined,
                    status: statusFilter || undefined,
                    language: languageFilter || undefined,
                    campaignId: campaignFilter || undefined,
                    assignedUserId,
                    unassigned: assignedFilter === "__unassigned__",
                });

                setLeads(leadPage?.content ?? []);
                setTotalPages(leadPage?.totalPages ?? 1);
                setTotalElements(
                    leadPage?.totalElements ?? leadPage?.content?.length ?? 0
                );
            } catch (err) {
                console.error("Lead listesi alınamadı:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, [
        assignedFilter,
        campaignFilter,
        languageFilter,
        page,
        perPage,
        search,
        sortBy,
        sortOrder,
        statusFilter,
        user?.id,
    ]);

    const languageOptions = useMemo(() => {
        const langs = new Set<string>();
        leads.forEach((lead) => {
            if (lead.language) langs.add(lead.language);
        });
        return Array.from(langs).sort((a, b) => a.localeCompare(b));
    }, [leads]);

    const campaignOptions = useMemo(() => {
        const campaigns = new Map<string, string>();
        leads.forEach((lead) => {
            const key = lead.campaign?.id ?? lead.campaign?.name ?? null;
            if (key) {
                campaigns.set(key, lead.campaign?.name ?? "İsimsiz Kampanya");
            }
        });
        return Array.from(campaigns.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [leads]);

    const handleCall = (phone?: string | null | undefined) => {
        if (!phone) return alert("Telefon numarası bulunamadı.");
        window.open(`tel:${phone}`, "_self");
    };

    const handleWhatsApp = (phone?: string | null | undefined) => {
        if (!phone) return alert("Telefon numarası bulunamadı.");
        const formatted = phone.replace(/\D/g, "");
        window.open(`https://wa.me/${formatted}`, "_blank");
    };

    const handleMessenger = (messengerId?: string | null | undefined) => {
        if (!messengerId) return alert("Messenger bağlantısı bulunamadı.");
        window.open(`https://m.me/${messengerId}`, "_blank");
    };

    const handleSort = (field: SortableColumn) => {
        if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else {
            setSortBy(field);
            setSortOrder("asc");
        }
        setPage(0);
    };

    const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        const targetLead = leads.find((l) => l.id === leadId);
        if (!targetLead || targetLead.status === newStatus) return;

        const ok = await updateLeadStatus(leadId, newStatus);
        if (ok) {
            setLeads((prev) =>
                prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
            );
            const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
            await addLeadAction(
                leadId,
                "STATUS",
                `Lead durumu ${statusLabel} olarak güncellendi`
            );
        } else alert("Durum güncellenemedi.");
    };

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


    const handleDelete = async (leadId: string) => {
        if (!confirm("Bu lead'i silmek istediğine emin misin?")) return;
        const ok = await deleteLead(leadId);
        if (ok) {
            await addLeadAction(leadId, "DELETE", "Lead silindi.");
            setLeads((prev) => prev.filter((l) => l.id !== leadId));
            setTotalElements((prev) => Math.max(prev - 1, 0));
        }
    };

    return (
        <Layout title="Lead Yönetimi" subtitle="Tüm lead’leri görüntüle ve yönet">
            {/* 🧭 Filtre ve üst bar */}
            <div className="col-span-12">
                <Card className="shadow-md rounded-xl">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap">
                            <Input
                                className="flex-1 sm:w-64"
                                placeholder="İsim, email veya kampanya ara..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(0);
                                }}
                            />
                            <select
                                className="border rounded-md p-2 text-sm bg-white shadow-sm"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="">Tüm Durumlar</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border rounded-md p-2 text-sm bg-white shadow-sm"
                                value={languageFilter}
                                onChange={(e) => {
                                    setLanguageFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="">Tüm Diller</option>
                                {languageOptions.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border rounded-md p-2 text-sm bg-white shadow-sm"
                                value={campaignFilter}
                                onChange={(e) => {
                                    setCampaignFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="">Tüm Kampanyalar</option>
                                {campaignOptions.map((campaign) => (
                                    <option key={campaign.id} value={campaign.id}>
                                        {campaign.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border rounded-md p-2 text-sm bg-white shadow-sm"
                                value={assignedFilter}
                                onChange={(e) => {
                                    setAssignedFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="">Tüm Kullanıcılar</option>
                                <option value="__unassigned__">Atanmamış</option>
                                {user && <option value="__me__">Bana Atananlar</option>}
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 text-right sm:text-left">
                            {totalElements} kayıt listeleniyor
                        </div>
                    </CardHeader>

                    {/* 📋 Tablo (masaüstü) */}
                    <CardContent>
                        {loading ? (
                            <div className="text-center text-gray-500 py-10">Yükleniyor...</div>
                        ) : leads.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                Kayıt bulunamadı.
                            </div>
                        ) : (
                            <>
                                {/* Masaüstü tablo */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                                        <thead>
                                        <tr className="bg-gray-50 text-left text-gray-700 font-medium">
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
                                                    className="p-3 cursor-pointer select-none"
                                                    onClick={() => handleSort(c.key as SortableColumn)}
                                                >
                                                    {c.label}{" "}
                                                    <ArrowUpDown className="inline h-3 w-3 ml-1 text-gray-400" />
                                                </th>
                                            ))}
                                            <th className="p-3 text-center">Aksiyonlar</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {leads.map((lead) => (
                                            <tr
                                                key={lead.id}
                                                className="border-t hover:bg-blue-50 transition-colors even:bg-gray-50"
                                            >
                                                <td className="p-3">
                                                    <Link
                                                        href={`/leads/${lead.id}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {lead.name ?? "-"}
                                                    </Link>
                                                </td>
                                                <td className="p-3">{lead.email ?? "-"}</td>
                                                <td className="p-3">{lead.language ?? "-"}</td>
                                                <td className="p-3">{lead.campaign?.name ?? "-"}</td>

                                                <td className="p-3">
                                                    <select
                                                        className={`border rounded-lg p-1.5 text-xs font-medium ${STATUS_COLORS[lead.status as LeadStatus]} focus:ring-2 focus:ring-blue-200`}
                                                        value={lead.status}
                                                        onChange={(e) =>
                                                            handleStatusChange(
                                                                lead.id,
                                                                e.target.value as LeadStatus
                                                            )
                                                        }
                                                    >
                                                        {Object.entries(STATUS_LABELS).map(
                                                            ([val, label]) => (
                                                                <option key={val} value={val}>
                                                                    {label}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </td>

                                                <td className="p-3">
                                                    <select
                                                        className="border rounded-lg bg-white shadow-sm text-xs p-1.5"
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

                                                <td className="p-3 text-gray-700">
                                                    {new Date(lead.createdAt).toLocaleString()}
                                                </td>

                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Button size="icon" variant="outline" onClick={() => handleCall(lead.phone)}>
                                                            <Phone className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" onClick={() => handleWhatsApp(lead.phone)}>
                                                            <MessageCircle className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" onClick={() => handleMessenger(lead.email)}>
                                                            <Facebook className="h-4 w-4 text-indigo-600" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50"
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

                                {/* 📱 Mobil görünüm (kartlar) */}
                                <div className="md:hidden flex flex-col gap-4">
                                    {leads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="border rounded-lg bg-white shadow-sm p-3 flex flex-col gap-2"
                                        >
                                            <div className="flex justify-between items-center">
                                                <Link
                                                    href={`/leads/${lead.id}`}
                                                    className="font-semibold text-blue-600 text-base"
                                                >
                                                    {lead.name ?? "-"}
                                                </Link>
                                                <span className="text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                                            </div>

                                            <div className="text-xs text-gray-600">
                                                <div>Email: {lead.email ?? "-"}</div>
                                                <div>Dil: {lead.language ?? "-"}</div>
                                                <div>Kampanya: {lead.campaign?.name ?? "-"}</div>
                                            </div>

                                            <div className="flex justify-between items-center mt-2">
                                                <select
                                                    className={`border rounded-md p-1 text-xs font-medium ${STATUS_COLORS[lead.status as LeadStatus]}`}
                                                    value={lead.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            lead.id,
                                                            e.target.value as LeadStatus
                                                        )
                                                    }
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                        <option key={val} value={val}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    className="border rounded-md text-xs p-1 bg-white"
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
                                            </div>

                                            <div className="flex justify-end gap-2 mt-2">
                                                <div className="flex justify-end gap-2 mt-2">
                                                    {/* 📞 Telefon Araması */}
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleCall(lead.phone)}
                                                        title="Telefon ile ara"
                                                    >
                                                        <Phone className="h-4 w-4 text-blue-600"/>
                                                    </Button>

                                                    {/* 💬 WhatsApp */}
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleWhatsApp(lead.phone)}
                                                        title="WhatsApp ile mesaj gönder"
                                                    >
                                                        <MessageCircle className="h-4 w-4 text-green-600"/>
                                                    </Button>

                                                    {/* 💙 Messenger */}
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleMessenger(lead.email)}
                                                        title="Messenger üzerinden mesaj gönder"
                                                    >
                                                        <Facebook className="h-4 w-4 text-indigo-600"/>
                                                    </Button>

                                                    {/* 🗑️ Silme */}
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleDelete(lead.id)}
                                                        title="Lead'i sil"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600"/>
                                                    </Button>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 📄 Sayfalama */}
            <div className="col-span-12 flex justify-start mt-6 mb-8">
                <div
                    className="flex items-center justify-center gap-4 bg-white border border-gray-200 rounded-lg px-6 py-2.5 shadow-sm w-full sm:w-auto">
                    <Button
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(p - 1, 0))}
                        variant="outline"
                        className="min-w-[90px] h-9 flex items-center justify-center text-sm"
                    >
                        ← Önceki
                    </Button>

                    <span className="text-gray-700 font-medium text-sm min-w-[120px] text-center select-none">
          Sayfa {page + 1} / {totalPages}
        </span>

                    <Button
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                        variant="outline"
                        className="min-w-[90px] h-9 flex items-center justify-center text-sm"
                    >
                        Sonraki →
                    </Button>
                </div>
            </div>
        </Layout>
    );

}
