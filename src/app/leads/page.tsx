"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { LanguageFlagIcon } from "@/components/LanguageFlagIcon";
import Modal from "@/components/Modal";
import { ToastContainer, type ToastMessage } from "@/components/Toast";
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
import { useLanguages } from "@/contexts/LanguageContext";
import { enhanceLanguageOption, type LanguageOption } from "@/lib/languages";
import useDebounce from "@/hooks/useDebounce";
import { Skeleton } from "@/components/Skeleton";

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

const TABLE_COLUMNS: Array<{ key: SortableColumn; label: string }> = [
    { key: "name", label: "Ad" },
    { key: "email", label: "Email" },
    { key: "language", label: "Dil" },
    { key: "campaign", label: "Kampanya" },
    { key: "status", label: "Durum" },
    { key: "assignedToUser", label: "Atanan Kullanıcı" },
    { key: "createdAt", label: "Tarih" },
];

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
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [leadToDelete, setLeadToDelete] = useState<LeadResponse | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const debouncedSearch = useDebounce(search, 400);
    const isSearching = search !== debouncedSearch;
    const perPage = 10;
    const { user } = useAuth();
    const { languages, getOptionByCode } = useLanguages();

    const showToast = useCallback(
        (toast: Omit<ToastMessage, "id">) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setToasts((prev) => [
                ...prev.slice(-3),
                {
                    id,
                    duration: toast.duration ?? 4000,
                    variant: toast.variant ?? "info",
                    ...toast,
                },
            ]);
        },
        []
    );

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const handleCloseDeleteModal = useCallback(() => {
        if (deleteLoading) return;
        setLeadToDelete(null);
    }, [deleteLoading]);

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
                    search: debouncedSearch.trim() || undefined,
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
        debouncedSearch,
        sortBy,
        sortOrder,
        statusFilter,
        user?.id,
    ]);

    const languageOptions = useMemo(() => {
        const map = new Map<string, LanguageOption>();

        languages
            .filter((lang) => lang.active ?? true)
            .forEach((lang) => {
                map.set(lang.value, enhanceLanguageOption(lang));
            });

        leads.forEach((lead) => {
            if (lead.language && !map.has(lead.language)) {
                map.set(
                    lead.language,
                    enhanceLanguageOption({
                        value: lead.language,
                        label: lead.language,
                    })
                );
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            a.label.localeCompare(b.label, "tr")
        );
    }, [languages, leads]);

    const campaignOptions = useMemo(() => {
        const campaigns = new Set<string>();
        leads.forEach((lead) => {
            if (lead.campaign?.name) campaigns.add(lead.campaign.name);
        });
        return Array.from(campaigns).sort((a, b) => a.localeCompare(b));
    }, [leads]);

    const filtered = useMemo(() => {
        return leads.filter((l) => {
            const hay = debouncedSearch.toLowerCase();
            const byText =
                l.name?.toLowerCase().includes(hay) ||
                l.email?.toLowerCase().includes(hay) ||
                l.campaign?.name?.toLowerCase().includes(hay);
            const byStatus = statusFilter ? l.status === statusFilter : true;
            const byLanguage = languageFilter ? l.language === languageFilter : true;
            const byCampaign = campaignFilter
                ? l.campaign?.name === campaignFilter
                : true;
            const byAssigned = (() => {
                if (!assignedFilter) return true;
                if (assignedFilter === "__me__")
                    return l.assignedToUser?.id === user?.id;
                if (assignedFilter === "__unassigned__")
                    return !l.assignedToUser;
                return l.assignedToUser?.id === assignedFilter;
            })();

            return byText && byStatus && byLanguage && byCampaign && byAssigned;
        });
    }, [
        assignedFilter,
        campaignFilter,
        languageFilter,
        leads,
        debouncedSearch,
        statusFilter,
        user?.id,
    ]);

    const handleCall = (phone?: string | null | undefined) => {
        if (!phone) {
            showToast({
                title: "Telefon numarası yok",
                description: "Telefon numarası bulunamadı.",
                variant: "error",
            });
            return;
        }
        window.open(`tel:${phone}`, "_self");
    };

    const handleWhatsApp = (phone?: string | null | undefined) => {
        if (!phone) {
            showToast({
                title: "Telefon numarası yok",
                description: "WhatsApp için telefon numarası bulunamadı.",
                variant: "error",
            });
            return;
        }
        const formatted = phone.replace(/\D/g, "");
        window.open(`https://wa.me/${formatted}`, "_blank");
    };

    const handleMessenger = (messengerId?: string | null | undefined) => {
        if (!messengerId) {
            showToast({
                title: "Bağlantı bulunamadı",
                description: "Messenger bağlantısı bulunamadı.",
                variant: "error",
            });
            return;
        }
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
            showToast({
                title: "Durum güncellendi",
                description: `${targetLead.name ?? "Lead"} durumu "${
                    STATUS_LABELS[newStatus] ?? newStatus
                }" olarak işaretlendi.`,
                variant: "success",
            });
        } else {
            showToast({
                title: "İşlem başarısız",
                description: "Lead durumu güncellenemedi.",
                variant: "error",
            });
        }
    };

    const handleAssign = async (leadId: string, userId: string | null) => {
        const ok = await patchLeadAssign(leadId, userId);
        if (ok) {
            const assignedUser = userId
                ? users.find((u) => u.id === userId) || null
                : null;
            setLeads((prev) =>
                prev.map((l) =>
                    l.id === leadId
                        ? {
                              ...l,
                              assignedToUser: assignedUser,
                          }
                        : l
                )
            );
            showToast({
                title: userId ? "Lead atandı" : "Atama kaldırıldı",
                description: userId
                    ? `${assignedUser?.firstName ?? "Kullanıcı"} ${
                          assignedUser?.lastName ?? ""
                      } lead'e atandı.`.trim()
                    : "Lead ataması kaldırıldı.",
                variant: "success",
            });
        } else {
            showToast({
                title: "Atama başarısız",
                description: "Lead ataması tamamlanamadı. Lütfen tekrar deneyin.",
                variant: "error",
            });
        }
    };

    const handleDeleteRequest = (lead: LeadResponse) => {
        setLeadToDelete(lead);
    };

    const handleDeleteConfirm = async () => {
        if (!leadToDelete) return;
        setDeleteLoading(true);
        const ok = await deleteLead(leadToDelete.id);
        if (ok) {
            await addLeadAction(leadToDelete.id, "DELETE", "Lead silindi.");
            setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
            setTotalElements((prev) => Math.max(prev - 1, 0));
            showToast({
                title: "Lead silindi",
                description: `${leadToDelete.name ?? "Lead"} başarıyla silindi.`,
                variant: "success",
            });
            setLeadToDelete(null);
        } else {
            showToast({
                title: "Silme başarısız",
                description: "Lead silinemedi. Lütfen tekrar deneyin.",
                variant: "error",
            });
        }
        setDeleteLoading(false);
    };

    return (
        <>
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
                            {isSearching && (
                                <span className="text-xs text-blue-500 self-start sm:self-center animate-pulse px-2 py-1 bg-blue-50 rounded-md">
                                    Aranıyor...
                                </span>
                            )}
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
                                {languageOptions.map((lang) => {
                                    const optionText = `${lang.flag ?? ""} ${lang.label}`.trim();
                                    const optionStyle = lang.flagImageUrl
                                        ? {
                                              backgroundImage: `url(${lang.flagImageUrl})`,
                                              backgroundRepeat: "no-repeat",
                                              backgroundPosition: "8px center",
                                              backgroundSize: "18px 13px",
                                              paddingLeft: "32px",
                                          }
                                        : undefined;
                                    return (
                                        <option
                                            key={lang.value}
                                            value={lang.value}
                                            style={optionStyle}
                                        >
                                            {optionText}
                                        </option>
                                    );
                                })}
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
                                    <option key={campaign} value={campaign}>
                                        {campaign}
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
                            Toplam {totalElements} kayıttan {filtered.length} kayıt listeleniyor
                        </div>
                    </CardHeader>

                    {/* 📋 Tablo (masaüstü) */}
                    <CardContent>
                        {loading ? (
                            <>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                                        <thead>
                                            <tr className="bg-gray-50 text-left text-gray-700 font-medium">
                                                {TABLE_COLUMNS.map((c) => (
                                                    <th
                                                        key={c.key}
                                                        className="p-3"
                                                    >
                                                        {c.label}
                                                    </th>
                                                ))}
                                                <th className="p-3 text-center">Aksiyonlar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 6 }).map((_, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-t even:bg-gray-50"
                                                >
                                                    <td className="p-3">
                                                        <Skeleton className="h-4 w-32" />
                                                    </td>
                                                    <td className="p-3">
                                                        <Skeleton className="h-4 w-40" />
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-4 w-4 rounded-full" />
                                                            <Skeleton className="h-4 w-20" />
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <Skeleton className="h-4 w-28" />
                                                    </td>
                                                    <td className="p-3">
                                                        <Skeleton className="h-7 w-32" />
                                                    </td>
                                                    <td className="p-3">
                                                        <Skeleton className="h-7 w-32" />
                                                    </td>
                                                    <td className="p-3">
                                                        <Skeleton className="h-4 w-24" />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            {Array.from({ length: 4 }).map((__, actionIdx) => (
                                                                <Skeleton
                                                                    key={actionIdx}
                                                                    className="h-9 w-9 rounded-full"
                                                                />
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="md:hidden flex flex-col gap-4">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="border rounded-lg bg-white shadow-sm p-3 flex flex-col gap-3"
                                        >
                                            <div className="flex justify-between items-center">
                                                <Skeleton className="h-5 w-32" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>

                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-40" />
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="h-4 w-4 rounded-full" />
                                                    <Skeleton className="h-4 w-24" />
                                                </div>
                                                <Skeleton className="h-4 w-32" />
                                            </div>

                                            <div className="flex gap-3">
                                                <Skeleton className="h-8 flex-1" />
                                                <Skeleton className="h-8 flex-1" />
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                {Array.from({ length: 4 }).map((__, actionIdx) => (
                                                    <Skeleton
                                                        key={actionIdx}
                                                        className="h-9 w-9 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
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
                                            {TABLE_COLUMNS.map((c) => (
                                                <th
                                                    key={c.key}
                                                    className="p-3 cursor-pointer select-none"
                                                    onClick={() => handleSort(c.key)}
                                                >
                                                    {c.label}{" "}
                                                    <ArrowUpDown className="inline h-3 w-3 ml-1 text-gray-400" />
                                                </th>
                                            ))}
                                            <th className="p-3 text-center">Aksiyonlar</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {leads.map((lead) => {
                                            const languageOption = lead.language
                                                ? getOptionByCode(lead.language) ??
                                                  enhanceLanguageOption({
                                                      value: lead.language,
                                                      label: lead.language,
                                                  })
                                                : undefined;
                                            return (
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
                                                <td className="p-3">
                                                    {lead.language ? (
                                                        <span className="inline-flex items-center gap-2">
                                                            <LanguageFlagIcon
                                                                option={languageOption}
                                                                size={18}
                                                            />
                                                            <span>
                                                                {languageOption?.label ?? lead.language}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
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
                                                            onClick={() => handleDeleteRequest(lead)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>

                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 📱 Mobil görünüm (kartlar) */}
                                <div className="md:hidden flex flex-col gap-4">
                                    {leads.map((lead) => {
                                        const languageOption = lead.language
                                            ? getOptionByCode(lead.language) ??
                                              enhanceLanguageOption({
                                                  value: lead.language,
                                                  label: lead.language,
                                              })
                                            : undefined;
                                        return (
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
                                                <div>
                                                    Dil:{" "}
                                                    {lead.language ? (
                                                        <span className="inline-flex items-center gap-2">
                                                            <LanguageFlagIcon
                                                                option={languageOption}
                                                                size={16}
                                                            />
                                                            <span>{languageOption?.label ?? lead.language}</span>
                                                        </span>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
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
                                                        onClick={() => handleDeleteRequest(lead)}
                                                        title="Lead'i sil"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600"/>
                                                    </Button>
                                                </div>

                                            </div>
                                            </div>
                                        );
                                    })}
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
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            <Modal
                isOpen={!!leadToDelete}
                onClose={handleCloseDeleteModal}
                closeOnBackdrop={!deleteLoading}
                showCloseButton={!deleteLoading}
                title="Lead'i Sil"
                description={
                    leadToDelete
                        ? `${leadToDelete.name ?? "Bu lead"} kalıcı olarak silinecek.`
                        : undefined
                }
                actions={[
                    {
                        label: "İptal",
                        variant: "ghost",
                        onClick: handleCloseDeleteModal,
                        disabled: deleteLoading,
                    },
                    {
                        label: "Sil",
                        variant: "danger",
                        onClick: handleDeleteConfirm,
                        isLoading: deleteLoading,
                        disabled: deleteLoading,
                    },
                ]}
            >
                {leadToDelete && (
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>Bu işlem geri alınamaz. Lead ile ilişkili tüm kayıtlar silinecek.</p>
                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            <p className="font-semibold text-gray-900">
                                {leadToDelete.name ?? "İsimsiz Lead"}
                            </p>
                            {leadToDelete.email && (
                                <p className="mt-1 text-xs text-gray-500">{leadToDelete.email}</p>
                            )}
                            {leadToDelete.phone && (
                                <p className="mt-0.5 text-xs text-gray-500">{leadToDelete.phone}</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );

}
