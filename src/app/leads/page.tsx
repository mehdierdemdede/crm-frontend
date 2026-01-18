"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Phone, MessageCircle, Facebook, Trash2, ArrowUpDown, Send, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import { Skeleton } from "@/components/Skeleton";
import { ToastContainer, type ToastMessage } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import useDebounce from "@/hooks/useDebounce";
import {
    getLeads,
    updateLeadStatus,
    deleteLead,
    patchLeadAssign,
    getUsers,
    addLeadAction,
    createLead,
    initiateLeadCall,
    sendLeadWhatsAppMessage,
    type LeadListParams,
    type LeadResponse,
    type LeadStatus,
    type SimpleUser,
    type LeadCallResult,
    type LeadWhatsAppMessageResponse,
} from "@/lib/api";



type SortableColumn = "name" | "assignedToUser" | "createdAt";
type DurationUnit = "minutes" | "hours";

type TableColumnKey =
    | "name"
    | "phone"
    | "adInfo"
    | "status"
    | "assignedToUser"
    | "createdAt"
    | "firstResponse"
    | "actions";

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

const TABLE_COLUMNS: Array<{ key: TableColumnKey; label: string; sortable?: boolean }> = [
    { key: "name", label: "İsim Soyisim", sortable: true },
    { key: "phone", label: "Telefon" },
    { key: "adInfo", label: "Reklam" },
    { key: "status", label: "Lead Durumu" },
    { key: "assignedToUser", label: "Danışman", sortable: true },
    { key: "createdAt", label: "Lead Geliş Tarihi", sortable: true },
    { key: "firstResponse", label: "Aksiyon Süresi" },
    { key: "actions", label: "Aksiyonlar" },
];

const FILTER_SELECT_CLASSES =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500";

const INITIAL_CREATE_FORM = {
    name: "",
    email: "",
    phone: "",

};

const parseDurationToMinutes = (value: string, unit: DurationUnit): number | undefined => {
    if (!value) return undefined;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return undefined;
    return unit === "hours" ? numeric * 60 : numeric;
};

const toStartOfDay = (value: string): Date | null => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const toEndOfDay = (value: string): Date | null => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(23, 59, 59, 999);
    return date;
};

const getFirstResponseMinutes = (lead: LeadResponse): number | null => {
    if (
        typeof lead.firstActionDelayMinutes === "number" &&
        !Number.isNaN(lead.firstActionDelayMinutes)
    ) {
        return lead.firstActionDelayMinutes;
    }

    if (!lead.firstActionAt) return null;

    const created = new Date(lead.createdAt).getTime();
    const first = new Date(lead.firstActionAt).getTime();
    if (Number.isNaN(created) || Number.isNaN(first)) return null;
    if (first < created) return 0;

    return (first - created) / 60000;
};

const formatFirstResponseDuration = (minutes: number | null | undefined): string => {
    if (minutes == null || Number.isNaN(minutes)) return "-";
    const rounded = Math.round(minutes);
    if (rounded < 60) return `${rounded} dk`;
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (mins === 0) return `${hours} sa`;
    return `${hours} sa ${mins} dk`;
};

const formatAdInfo = (lead: LeadResponse): string => {
    const legacyLead = lead as unknown as {
        ad_name?: unknown;
        ad_info?: unknown;
        campaign_name?: unknown;
        adset_name?: unknown;
    };

    // 🔹 Prioritize `adName` (Editable) over `adInfo`
    const rawAdName = lead.adName ?? legacyLead.ad_name;
    const adName = typeof rawAdName === "string" ? rawAdName.trim() : "";
    if (adName) return adName;

    const rawAdInfo = lead.adInfo ?? legacyLead.ad_info;
    const adInfo = typeof rawAdInfo === "string" ? rawAdInfo.trim() : "";
    if (adInfo) return adInfo;

    const rawCampaignName = lead.campaign?.name ?? lead.campaignName ?? legacyLead.campaign_name;
    const campaignName = typeof rawCampaignName === "string" ? rawCampaignName.trim() : "";

    const rawAdsetName = lead.adsetName ?? legacyLead.adset_name;
    const adsetName = typeof rawAdsetName === "string" ? rawAdsetName.trim() : "";

    const parts = [campaignName, adsetName].filter(Boolean);

    if (parts.length > 0) return parts.join(" / ");

    return "";
};

const formatUserName = (user?: SimpleUser | null): string => {
    if (!user) return "Atanmadı";
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (fullName) return fullName;
    return user.email || "Atanmadı";
};

const getEmailDisplay = (lead: LeadResponse): string => {
    if (lead.email) return lead.email;
    if (lead.phone) return "Email bilgisi yok";
    return "İletişim bilgisi yok";
};

const BULK_ASSIGN_FETCH_SIZE = 200;

export default function LeadsPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<LeadResponse[]>([]);
    const [users, setUsers] = useState<SimpleUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
    const [campaignFilter, setCampaignFilter] = useState("");
    const [assignedFilter, setAssignedFilter] = useState("");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [actionDurationMin, setActionDurationMin] = useState("");
    const [actionDurationMax, setActionDurationMax] = useState("");
    const [actionDurationUnit, setActionDurationUnit] = useState<DurationUnit>("minutes");
    const [sortBy, setSortBy] = useState<SortableColumn>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [leadToDelete, setLeadToDelete] = useState<LeadResponse | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
    const [bulkAssignScope, setBulkAssignScope] = useState<"selected" | "filtered">(
        "selected",
    );
    const [bulkAssignUserId, setBulkAssignUserId] = useState("");
    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createLeadLoading, setCreateLeadLoading] = useState(false);
    const [createLeadError, setCreateLeadError] = useState<string | null>(null);
    const [createLeadForm, setCreateLeadForm] = useState(INITIAL_CREATE_FORM);
    const [activeCommunication, setActiveCommunication] = useState<{
        lead: LeadResponse;
        channel: "PHONE" | "WHATSAPP";
    } | null>(null);
    const [communicationLoading, setCommunicationLoading] = useState(false);
    const [communicationError, setCommunicationError] = useState<string | null>(null);
    const [communicationSuccess, setCommunicationSuccess] = useState<string | null>(null);
    const [callSession, setCallSession] = useState<LeadCallResult | null>(null);
    const [whatsAppMessage, setWhatsAppMessage] = useState("");
    const [whatsAppResult, setWhatsAppResult] =
        useState<LeadWhatsAppMessageResponse | null>(null);
    const [filteredBulkCount, setFilteredBulkCount] = useState<number | null>(null);

    // Call Modal State
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callLead, setCallLead] = useState<LeadResponse | null>(null);
    const [callResult, setCallResult] = useState<"CONNECTED" | "BUSY" | "WRONG_NUMBER" | "NO_ANSWER">("CONNECTED");
    const [callNote, setCallNote] = useState("");
    const [callLoading, setCallLoading] = useState(false);

    const debouncedSearch = useDebounce(search, 400);
    const isSearching = search !== debouncedSearch;
    const selectAllRef = useRef<HTMLInputElement>(null);
    const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
    const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

    const { user } = useAuth();


    const responseMinMinutes = useMemo(
        () => parseDurationToMinutes(actionDurationMin, actionDurationUnit),
        [actionDurationMin, actionDurationUnit],
    );
    const responseMaxMinutes = useMemo(
        () => parseDurationToMinutes(actionDurationMax, actionDurationUnit),
        [actionDurationMax, actionDurationUnit],
    );

    const canBulkAssign = user?.role === "SUPER_ADMIN";
    const canDeleteLead = user?.role === "ADMIN";
    const canCreateLead = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

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
        [],
    );

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const handleCloseDeleteModal = useCallback(() => {
        if (deleteLoading) return;
        setLeadToDelete(null);
    }, [deleteLoading]);

    const resolveAssignedUserId = useCallback(() => {
        if (assignedFilter === "__me__") return user?.id ?? undefined;
        if (assignedFilter && assignedFilter !== "__unassigned__")
            return assignedFilter;
        return undefined;
    }, [assignedFilter, user?.id]);

    const buildLeadListParams = useCallback(
        (pageValue: number, sizeValue: number): LeadListParams => ({
            page: pageValue,
            size: sizeValue,
            sort: `${sortBy},${sortOrder}`,
            search: debouncedSearch.trim() || undefined,
            statuses: statusFilter ? [statusFilter] : undefined,
            assignedUserId: resolveAssignedUserId(),
            unassigned: assignedFilter === "__unassigned__",
            dateFrom: createdFrom || undefined,
            dateTo: createdTo || undefined,
            firstResponseMinMinutes: responseMinMinutes,
            firstResponseMaxMinutes: responseMaxMinutes,
        }),
        [
            assignedFilter,
            createdFrom,
            createdTo,
            debouncedSearch,
            resolveAssignedUserId,
            responseMaxMinutes,
            responseMinMinutes,
            sortBy,
            sortOrder,
            statusFilter,
        ],
    );

    const applyClientFilters = useCallback(
        (source: LeadResponse[]): LeadResponse[] => {
            const searchValue = debouncedSearch.trim().toLowerCase();
            const campaignValue = campaignFilter.trim().toLowerCase();
            const createdFromDate = createdFrom ? toStartOfDay(createdFrom) : null;
            const createdToDate = createdTo ? toEndOfDay(createdTo) : null;

            return source.filter((lead) => {
                const matchesSearch = searchValue
                    ? [lead.name, lead.email, lead.campaign?.name]
                        .filter(Boolean)
                        .some((field) =>
                            String(field).toLowerCase().includes(searchValue),
                        )
                    : true;

                const adInfo = formatAdInfo(lead).toLowerCase();
                const matchesAd = campaignValue ? adInfo.includes(campaignValue) : true;

                const matchesStatus = statusFilter
                    ? lead.status === statusFilter
                    : true;

                const matchesAssigned = (() => {
                    if (!assignedFilter) return true;
                    if (assignedFilter === "__me__")
                        return lead.assignedToUser?.id === user?.id;
                    if (assignedFilter === "__unassigned__") return !lead.assignedToUser;
                    return lead.assignedToUser?.id === assignedFilter;
                })();

                const createdDateValue = new Date(lead.createdAt);
                const matchesFrom = createdFromDate
                    ? createdDateValue >= createdFromDate
                    : true;
                const matchesTo = createdToDate
                    ? createdDateValue <= createdToDate
                    : true;

                const responseMinutes = getFirstResponseMinutes(lead);
                const matchesMin =
                    responseMinMinutes !== undefined
                        ? responseMinutes != null && responseMinutes >= responseMinMinutes
                        : true;
                const matchesMax =
                    responseMaxMinutes !== undefined
                        ? responseMinutes != null && responseMinutes <= responseMaxMinutes
                        : true;

                return (
                    matchesSearch &&
                    matchesAd &&
                    matchesStatus &&
                    matchesAssigned &&
                    matchesFrom &&
                    matchesTo &&
                    matchesMin &&
                    matchesMax
                );
            });
        },
        [
            assignedFilter,
            campaignFilter,
            createdFrom,
            createdTo,
            debouncedSearch,
            responseMaxMinutes,
            responseMinMinutes,
            statusFilter,
            user?.id,
        ],
    );

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const userData = await getUsers();
                setUsers(userData ?? []);
            } catch (err) {
                console.error("Kullanıcı listesi alınamadı:", err);
            }
        };
        void fetchUsers();
    }, []);

    useEffect(() => {
        if (assignedFilter === "__me__" && !user?.id) {
            return;
        }

        const fetchLeads = async () => {
            setLoading(true);
            try {
                const leadPage = await getLeads(
                    buildLeadListParams(page, pageSize),
                );

                setLeads(leadPage?.content ?? []);
                setTotalPages(leadPage?.totalPages ?? 1);
                setTotalElements(
                    leadPage?.totalElements ?? leadPage?.content?.length ?? 0,
                );
            } catch (err) {
                console.error("Lead listesi alınamadı:", err);
            } finally {
                setLoading(false);
            }
        };

        void fetchLeads();
    }, [
        buildLeadListParams,
        assignedFilter,
        page,
        pageSize,
        user?.id,
    ]);



    const displayedLeads = useMemo(
        () => applyClientFilters(leads),
        [applyClientFilters, leads],
    );

    const selectedCount = selectedLeadIds.size;
    const filteredCount = displayedLeads.length;
    const allDisplayedSelected =
        displayedLeads.length > 0 &&
        displayedLeads.every((lead) => selectedLeadIds.has(lead.id));
    const someDisplayedSelected = displayedLeads.some((lead) =>
        selectedLeadIds.has(lead.id),
    );

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate =
            someDisplayedSelected && !allDisplayedSelected;
    }, [allDisplayedSelected, someDisplayedSelected, displayedLeads.length]);

    useEffect(() => {
        setFilteredBulkCount(null);
    }, [
        assignedFilter,
        campaignFilter,
        createdFrom,
        createdTo,
        debouncedSearch,
        responseMaxMinutes,
        responseMinMinutes,
        sortBy,
        sortOrder,
        statusFilter,
    ]);

    const fetchAllFilteredLeads = useCallback(async () => {
        const params = buildLeadListParams(0, BULK_ASSIGN_FETCH_SIZE);
        const firstPage = await getLeads(params);
        if (!firstPage) return [] as LeadResponse[];

        const totalPages = firstPage.totalPages ?? 1;
        const allLeads = applyClientFilters(firstPage.content ?? []);

        for (let pageIndex = 1; pageIndex < totalPages; pageIndex += 1) {
            const nextPage = await getLeads({ ...params, page: pageIndex });
            if (!nextPage) break;
            allLeads.push(...applyClientFilters(nextPage.content ?? []));
        }

        return allLeads;
    }, [applyClientFilters, buildLeadListParams]);

    const handleSort = (field: SortableColumn) => {
        if (sortBy === field)
            setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
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
                prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
            );
            const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
            await addLeadAction(
                leadId,
                "STATUS",
                `Lead durumu ${statusLabel} olarak güncellendi`,
            );
            showToast({
                title: "Durum güncellendi",
                description: `${targetLead.name ?? "Lead"} durumu "${STATUS_LABELS[newStatus] ?? newStatus
                    }" olarak işaretlendi.`,
                variant: "success",
            });

            if (newStatus === "SOLD") {
                router.push(`/leads/${leadId}`);
            }
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
                        : l,
                ),
            );

            const message = assignedUser
                ? `${formatUserName(assignedUser)} lead'e atandı.`
                : "Lead ataması kaldırıldı.";
            await addLeadAction(
                leadId,
                "ASSIGN",
                `Atama güncellendi: ${message}`,
            );
            showToast({
                title: userId ? "Lead atandı" : "Atama kaldırıldı",
                description: message,
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
            setSelectedLeadIds((prev) => {
                const next = new Set(prev);
                next.delete(leadToDelete.id);
                return next;
            });
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

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeadIds((prev) => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId);
            else next.add(leadId);
            return next;
        });
    };

    const toggleSelectAllDisplayed = () => {
        setSelectedLeadIds((prev) => {
            const next = new Set(prev);
            if (allDisplayedSelected) {
                displayedLeads.forEach((lead) => next.delete(lead.id));
            } else {
                displayedLeads.forEach((lead) => next.add(lead.id));
            }
            return next;
        });
    };



    const closeCommunication = () => {
        if (communicationLoading) return;
        setActiveCommunication(null);
        setCommunicationError(null);
        setCommunicationSuccess(null);
        setCallSession(null);
        setWhatsAppResult(null);
        setWhatsAppMessage("");
    };

    const handleCall = (lead: LeadResponse) => {
        if (!lead.phone) {
            showToast({
                title: "Telefon bilgisi bulunamadı",
                description: "Bu lead için telefon bilgisi mevcut değil.",
                variant: "error",
            });
            return;
        }
        setCallLead(lead);
        setIsCallModalOpen(true);
    };

    const handleLogCall = async () => {
        if (!callLead) return;
        setCallLoading(true);

        const resultLabels: Record<string, string> = {
            CONNECTED: "Ulaşıldı",
            BUSY: "Meşgul",
            WRONG_NUMBER: "Yanlış Numara",
            NO_ANSWER: "Cevap Vermedi",
        };

        const resultText = resultLabels[callResult] ?? callResult;
        let message = `Telefon araması: ${resultText}`;
        if (callNote.trim()) {
            message += ` - Not: ${callNote.trim()}`;
        }

        try {
            await addLeadAction(callLead.id, "PHONE", message);
            setIsCallModalOpen(false);
            setCallNote("");
            setCallResult("CONNECTED");
            setCallLead(null);
            showToast({
                title: "Arama Kaydedildi",
                description: "Arama sonucu lead tarihçesine eklendi.",
                variant: "success",
            });
        } catch {
            showToast({
                title: "Hata",
                description: "Arama kaydedilemedi.",
                variant: "error",
            });
        } finally {
            setCallLoading(false);
        }
    };

    const handleCopyPhone = () => {
        if (callLead?.phone) {
            void navigator.clipboard.writeText(callLead.phone);
            showToast({ title: "Kopyalandı", description: "Telefon numarası panoya kopyalandı", variant: "success" });
        }
    };

    const handleWhatsApp = (lead: LeadResponse) => {
        if (!lead.phone) {
            showToast({
                title: "Telefon bilgisi bulunamadı",
                description: "Bu lead için WhatsApp kanalına erişilemiyor.",
                variant: "error",
            });
            return;
        }
        const formatted = lead.phone.replace(/\D/g, "");
        window.open(`https://web.whatsapp.com/send?phone=${formatted}`, "_blank");
        void addLeadAction(
            lead.id,
            "WHATSAPP",
            `WhatsApp Web üzerinden mesaj başlatıldı.`,
        );
    };

    const handleInitiateSecureCall = async () => {
        if (!activeCommunication || activeCommunication.channel !== "PHONE") return;
        setCommunicationLoading(true);
        setCommunicationError(null);
        try {
            const result = await initiateLeadCall(activeCommunication.lead.id);
            if (!result) {
                throw new Error("Arama başlatılamadı. Lütfen tekrar deneyin.");
            }
            setCallSession(result);
            const statusLabel = result.status
                ? result.status.replace(/_/g, " ").toLowerCase()
                : "kuyruğa alındı";
            const formattedStatus =
                statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);
            const successMessage = `Güvenli arama ${formattedStatus}.`;
            setCommunicationSuccess(successMessage);
            showToast({
                title: "Arama başlatıldı",
                description: "Güvenli arama kuyruğa alındı.",
                variant: "success",
            });
            void addLeadAction(
                activeCommunication.lead.id,
                "PHONE",
                `Güvenli arama oturumu başlatıldı (#${result.callId || ""}).`,
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Arama başlatılamadı. Lütfen tekrar deneyin.";
            setCommunicationError(message);
        } finally {
            setCommunicationLoading(false);
        }
    };

    const handleSendSecureWhatsApp = async () => {
        if (!activeCommunication || activeCommunication.channel !== "WHATSAPP") return;
        const trimmedMessage = whatsAppMessage.trim();
        if (!trimmedMessage) {
            setCommunicationError("Mesaj metni zorunludur.");
            return;
        }
        setCommunicationLoading(true);
        setCommunicationError(null);
        try {
            const result = await sendLeadWhatsAppMessage(activeCommunication.lead.id, {
                message: trimmedMessage,
            });
            if (!result) {
                throw new Error("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
            }
            setWhatsAppResult(result);
            setCommunicationSuccess("Mesaj güvenli hat üzerinden gönderildi.");
            showToast({
                title: "Mesaj gönderildi",
                description: "WhatsApp mesajı başarıyla gönderildi.",
                variant: "success",
            });
            setWhatsAppMessage("");
            void addLeadAction(
                activeCommunication.lead.id,
                "WHATSAPP",
                `Ürün içinden WhatsApp mesajı gönderildi (#${result.messageId || ""}).`,
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Mesaj gönderilemedi. Lütfen tekrar deneyin.";
            setCommunicationError(message);
        } finally {
            setCommunicationLoading(false);
        }
    };

    const handleMessenger = async (lead: LeadResponse) => {
        const messengerTarget = lead.pageId;
        if (messengerTarget) {
            window.open(`https://m.me/${messengerTarget}`, "_blank");
            void addLeadAction(
                lead.id,
                "MESSENGER",
                "Messenger üzerinden mesaj gönderildi",
            );
        } else {
            window.open(`https://www.facebook.com/search/top?q=${encodeURIComponent(lead.name || "")}`, "_blank");
            void addLeadAction(lead.id, "MESSENGER", "Facebook'ta arama yapıldı");
        }
    };

    const handleStatusFilterChange = (
        event: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const { value } = event.target;
        setStatusFilter(value as LeadStatus | "");
        setPage(0);
    };

    const handleBulkAssignConfirm = async () => {
        if (!bulkAssignUserId) {
            showToast({
                title: "Kullanıcı seçiniz",
                description: "Aktarım için bir kullanıcı seçmelisiniz.",
                variant: "error",
            });
            return;
        }

        setBulkAssignLoading(true);
        try {
            const leadIds =
                bulkAssignScope === "selected"
                    ? Array.from(selectedLeadIds)
                    : (await fetchAllFilteredLeads()).map((lead) => lead.id);

            if (leadIds.length === 0) {
                showToast({
                    title: "Lead bulunamadı",
                    description: "Geçerli filtrelere uyan lead bulunamadı.",
                    variant: "error",
                });
                return;
            }

            if (bulkAssignScope === "filtered") {
                setFilteredBulkCount(leadIds.length);
            }

            const assignedUser = users.find((u) => u.id === bulkAssignUserId) || null;
            const results: Array<{ leadId: string; ok: boolean }> = [];

            for (const leadId of leadIds) {
                const ok = await patchLeadAssign(leadId, bulkAssignUserId);
                if (ok) {
                    setLeads((prev) =>
                        prev.map((lead) =>
                            lead.id === leadId
                                ? { ...lead, assignedToUser: assignedUser }
                                : lead,
                        ),
                    );
                    await addLeadAction(
                        leadId,
                        "ASSIGN",
                        `${formatUserName(assignedUser)} toplu aktarım ile atandı`,
                    );
                }
                results.push({ leadId, ok });
            }

            const successCount = results.filter((r) => r.ok).length;
            const failureCount = results.length - successCount;

            if (successCount > 0) {
                showToast({
                    title: "Lead'ler aktarıldı",
                    description: `${successCount} lead başarıyla aktarıldı.`,
                    variant: "success",
                });
            }
            if (failureCount > 0) {
                showToast({
                    title: "Aktarım hatası",
                    description: `${failureCount} lead aktarılırken hata oluştu.`,
                    variant: "error",
                });
            }

            if (successCount > 0) {
                setSelectedLeadIds(new Set());
                setBulkAssignUserId("");
                setIsBulkAssignOpen(false);
            }
        } finally {
            setBulkAssignLoading(false);
        }
    };

    const handleCreateLead = async () => {
        const trimmedName = createLeadForm.name.trim();
        if (!trimmedName) {
            setCreateLeadError("İsim soyisim alanı zorunludur.");
            return;
        }

        setCreateLeadLoading(true);
        setCreateLeadError(null);

        try {
            const payload = {
                name: trimmedName,
                email: createLeadForm.email.trim() || undefined,
                phone: createLeadForm.phone.trim() || undefined,

            };

            const newLead = await createLead(payload);
            if (!newLead) {
                setCreateLeadError(
                    "Lead oluşturulamadı. Lütfen tekrar deneyiniz.",
                );
                return;
            }

            if (page === 0) {
                setLeads((prev) => {
                    const withoutNew = prev.filter((lead) => lead.id !== newLead.id);
                    return [newLead, ...withoutNew].slice(0, pageSize);
                });
            } else {
                setPage(0);
            }

            setTotalElements((prev) => prev + 1);
            setCreateLeadForm(INITIAL_CREATE_FORM);
            setIsCreateModalOpen(false);
            showToast({
                title: "Yeni lead oluşturuldu",
                description: `${newLead.name ?? "Lead"} sisteme eklendi.`,
                variant: "success",
            });
        } catch (error) {
            setCreateLeadError(
                error instanceof Error
                    ? error.message
                    : "Lead oluşturulamadı.",
            );
        } finally {
            setCreateLeadLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setCreateLeadError(null);
        setCreateLeadForm(INITIAL_CREATE_FORM);
        setIsCreateModalOpen(true);
    };

    const handleCreateModalClose = () => {
        if (createLeadLoading) return;
        setIsCreateModalOpen(false);
    };

    const handleResetFilters = useCallback(() => {
        setSearch("");
        setCampaignFilter("");
        setAssignedFilter("");
        setCreatedFrom("");
        setCreatedTo("");
        setActionDurationMin("");
        setActionDurationMax("");
        setActionDurationUnit("minutes");
        setStatusFilter("");
        setPage(0);
    }, []);

    const hasActiveFilters =
        Boolean(debouncedSearch.trim()) ||
        Boolean(campaignFilter.trim()) ||
        Boolean(assignedFilter) ||
        Boolean(createdFrom) ||
        Boolean(createdTo) ||
        Boolean(statusFilter) ||
        responseMinMinutes !== undefined ||
        responseMaxMinutes !== undefined;

    const bulkAssignCount =
        bulkAssignScope === "selected"
            ? selectedCount
            : filteredBulkCount ?? filteredCount;

    return (
        <>
            <Layout
                title="Lead Yönetimi"
                subtitle="Tüm lead’leri görüntüle ve yönet"
            >
                <div className="col-span-12">
                    <Card className="shadow-md rounded-xl">
                        <CardHeader className="flex flex-col gap-3 border-b pb-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                    <span>Toplam {totalElements} lead</span>
                                    {hasActiveFilters && (
                                        <span className="text-gray-500">
                                            Filtrelenen: {displayedLeads.length}
                                        </span>
                                    )}
                                    {selectedCount > 0 && (
                                        <span className="font-medium text-blue-600">
                                            {selectedCount} lead seçildi
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {canBulkAssign && (
                                        <Button
                                            variant="secondary"
                                            disabled={selectedCount === 0}
                                            onClick={() => {
                                                setBulkAssignScope("selected");
                                                setIsBulkAssignOpen(true);
                                            }}
                                        >
                                            Aktar
                                        </Button>
                                    )}
                                    {canBulkAssign && hasActiveFilters && (
                                        <Button
                                            variant="secondary"
                                            disabled={filteredCount === 0}
                                            onClick={() => {
                                                setBulkAssignScope("filtered");
                                                setIsBulkAssignOpen(true);
                                            }}
                                        >
                                            Filtrelenenleri Aktar
                                        </Button>
                                    )}
                                    {canCreateLead && (
                                        <Button onClick={handleOpenCreateModal}>
                                            Yeni Lead Ekle
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700">Filtreler</h3>
                                        <p className="text-xs text-gray-500">
                                            Aradığınız lead’i hızlıca bulun.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedLeadIds(new Set())}
                                            >
                                                Seçimleri temizle
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={!hasActiveFilters}
                                            onClick={handleResetFilters}
                                        >
                                            Filtreleri sıfırla
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                    <div className="md:col-span-1 xl:col-span-3">
                                        <Input
                                            label="Arama"
                                            placeholder="İsim, email veya telefon..."
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(0);
                                            }}
                                            hint={isSearching ? "Aranıyor..." : undefined}
                                        />
                                    </div>
                                    <div className="md:col-span-1 xl:col-span-3">
                                        <Input
                                            label="Reklam"
                                            placeholder="Reklam adı..."
                                            value={campaignFilter}
                                            onChange={(e) => {
                                                setCampaignFilter(e.target.value);
                                                setPage(0);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-1 xl:col-span-2">
                                        <label
                                            htmlFor="lead-status-filter"
                                            className="block text-sm font-medium text-gray-800"
                                        >
                                            Lead Durumu
                                        </label>
                                        <select
                                            id="lead-status-filter"
                                            className={FILTER_SELECT_CLASSES}
                                            value={statusFilter}
                                            onChange={handleStatusFilterChange}
                                        >
                                            <option value="">Tümü</option>
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2 xl:col-span-2">
                                        <label
                                            htmlFor="lead-assigned-filter"
                                            className="block text-sm font-medium text-gray-800"
                                        >
                                            Danışman
                                        </label>
                                        <select
                                            id="lead-assigned-filter"
                                            className={FILTER_SELECT_CLASSES}
                                            value={assignedFilter}
                                            onChange={(e) => {
                                                setAssignedFilter(e.target.value);
                                                setPage(0);
                                            }}
                                        >
                                            <option value="">Tümü</option>
                                            <option value="__me__">Bana Atananlar</option>
                                            <option value="__unassigned__">Atanmamış</option>
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2 xl:col-span-6">
                                        <span className="text-sm font-medium text-gray-800">
                                            Lead Geliş Tarihi
                                        </span>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <Input
                                                label="Başlangıç"
                                                type="date"
                                                value={createdFrom}
                                                onChange={(e) => {
                                                    setCreatedFrom(e.target.value);
                                                    setPage(0);
                                                }}
                                            />
                                            <Input
                                                label="Bitiş"
                                                type="date"
                                                value={createdTo}
                                                onChange={(e) => {
                                                    setCreatedTo(e.target.value);
                                                    setPage(0);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2 xl:col-span-6">
                                        <span className="text-sm font-medium text-gray-800">
                                            İlk Aksiyon Süresi
                                        </span>
                                        <div className="grid gap-2 sm:[grid-template-columns:repeat(2,minmax(0,1fr))_auto]">
                                            <Input
                                                label="Min"
                                                type="number"
                                                min={0}
                                                value={actionDurationMin}
                                                onChange={(e) => {
                                                    setActionDurationMin(e.target.value);
                                                    setPage(0);
                                                }}
                                            />
                                            <Input
                                                label="Maks"
                                                type="number"
                                                min={0}
                                                value={actionDurationMax}
                                                onChange={(e) => {
                                                    setActionDurationMax(e.target.value);
                                                    setPage(0);
                                                }}
                                            />
                                            <div className="space-y-2 sm:self-end sm:justify-self-start sm:w-40">
                                                <label
                                                    htmlFor="lead-response-unit"
                                                    className="block text-sm font-medium text-gray-800"
                                                >
                                                    Birim
                                                </label>
                                                <select
                                                    id="lead-response-unit"
                                                    className={FILTER_SELECT_CLASSES}
                                                    value={actionDurationUnit}
                                                    onChange={(e) => {
                                                        setActionDurationUnit(e.target.value as DurationUnit);
                                                        setPage(0);
                                                    }}
                                                >
                                                    <option value="minutes">Dakika</option>
                                                    <option value="hours">Saat</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                                            <thead>
                                                <tr className="bg-gray-50 text-left text-gray-700 font-medium">
                                                    <th className="p-3 w-10">
                                                        <Skeleton className="h-4 w-4" />
                                                    </th>
                                                    {TABLE_COLUMNS.map((column) => (
                                                        <th key={column.key} className="p-3">
                                                            <Skeleton className="h-4 w-28" />
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.from({ length: pageSize }).map((_, idx) => (
                                                    <tr key={idx} className="border-t">
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-4 rounded" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-32" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-28" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-40" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-7 w-32" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-7 w-32" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-32" />
                                                        </td>
                                                        <td className="p-3">
                                                            <Skeleton className="h-4 w-28" />
                                                        </td>
                                                        <td className="p-3">
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
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-4 w-24" />
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
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                                            <thead>
                                                <tr className="bg-gray-50 text-left text-gray-700 font-medium">
                                                    <th className="p-3 w-12">
                                                        <input
                                                            ref={selectAllRef}
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300"
                                                            checked={allDisplayedSelected}
                                                            onChange={toggleSelectAllDisplayed}
                                                        />
                                                    </th>
                                                    {TABLE_COLUMNS.map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className="p-3 cursor-pointer select-none"
                                                            onClick={() =>
                                                                column.sortable &&
                                                                handleSort(column.key as SortableColumn)
                                                            }
                                                        >
                                                            {column.label}
                                                            {column.sortable && (
                                                                <ArrowUpDown className="inline h-3 w-3 ml-1 text-gray-400" />
                                                            )}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedLeads.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            className="p-8 text-center text-gray-500"
                                                            colSpan={TABLE_COLUMNS.length + 1}
                                                        >
                                                            Kayıt bulunamadı.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    displayedLeads.map((lead) => {
                                                        const isSelected = selectedLeadIds.has(lead.id);
                                                        const firstResponseMinutes = getFirstResponseMinutes(lead);
                                                        return (
                                                            <tr
                                                                key={lead.id}
                                                                className={`border-t transition-colors ${isSelected
                                                                    ? "bg-blue-50"
                                                                    : "hover:bg-blue-50 even:bg-gray-50"
                                                                    }`}
                                                            >
                                                                <td className="p-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 rounded border-gray-300"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleLeadSelection(lead.id)}
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Link
                                                                            href={`/leads/${lead.id}`}
                                                                            className="text-blue-600 hover:underline"
                                                                        >
                                                                            {lead.name ?? "-"}
                                                                        </Link>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {getEmailDisplay(lead)}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-gray-700">
                                                                    <span className="block whitespace-nowrap">
                                                                        {lead.phone ?? "-"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-gray-700">
                                                                    {formatAdInfo(lead) || lead.campaign?.name || "-"}
                                                                </td>
                                                                <td className="p-3">
                                                                    <select
                                                                        className={`border rounded-lg p-1.5 text-xs font-medium ${STATUS_COLORS[
                                                                            lead.status as LeadStatus
                                                                        ]
                                                                            } focus:ring-2 focus:ring-blue-200`}
                                                                        value={lead.status}
                                                                        onChange={(e) =>
                                                                            handleStatusChange(
                                                                                lead.id,
                                                                                e.target
                                                                                    .value as LeadStatus,
                                                                            )
                                                                        }
                                                                    >
                                                                        {Object.entries(STATUS_LABELS).map(
                                                                            ([val, label]) => (
                                                                                <option
                                                                                    key={val}
                                                                                    value={val}
                                                                                >
                                                                                    {label}
                                                                                </option>
                                                                            ),
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
                                                                                e.target.value
                                                                                    ? e.target.value
                                                                                    : null,
                                                                            )
                                                                        }
                                                                    >
                                                                        <option value="">Atanmadı</option>
                                                                        {users.map((u) => (
                                                                            <option
                                                                                key={u.id}
                                                                                value={u.id}
                                                                            >
                                                                                {u.firstName} {u.lastName}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="p-3 text-gray-700">
                                                                    {new Date(lead.createdAt).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-gray-700">
                                                                    {formatFirstResponseDuration(
                                                                        firstResponseMinutes,
                                                                    )}
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex flex-nowrap items-center justify-end gap-2">
                                                                        {lead.phone && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handleCall(lead)
                                                                                }
                                                                                title="Telefon ile arama yap"
                                                                            >
                                                                                <Phone className="h-4 w-4 text-blue-600" />
                                                                            </Button>
                                                                        )}
                                                                        {lead.phone && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handleWhatsApp(lead)
                                                                                }
                                                                                title="WhatsApp ile mesaj gönder"
                                                                            >
                                                                                <MessageCircle className="h-4 w-4 text-green-600" />
                                                                            </Button>
                                                                        )}
                                                                        {(lead.pageId || lead.email) && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handleMessenger(lead)
                                                                                }
                                                                                title="Messenger üzerinden mesaj gönder"
                                                                            >
                                                                                <Facebook className="h-4 w-4 text-indigo-600" />
                                                                            </Button>
                                                                        )}
                                                                        {canDeleteLead && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="text-red-600 hover:bg-red-50"
                                                                                onClick={() =>
                                                                                    handleDeleteRequest(lead)
                                                                                }
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="md:hidden flex flex-col gap-4">
                                        {displayedLeads.length === 0 ? (
                                            <div className="text-center text-gray-500 py-10">
                                                Kayıt bulunamadı.
                                            </div>
                                        ) : (
                                            displayedLeads.map((lead) => {
                                                const isSelected = selectedLeadIds.has(lead.id);
                                                const firstResponseMinutes =
                                                    getFirstResponseMinutes(lead);
                                                return (
                                                    <div
                                                        key={lead.id}
                                                        className={`border rounded-lg bg-white shadow-sm p-3 flex flex-col gap-3 ${isSelected ? "border-blue-400" : ""
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded border-gray-300"
                                                                    checked={isSelected}
                                                                    onChange={() =>
                                                                        toggleLeadSelection(
                                                                            lead.id,
                                                                        )
                                                                    }
                                                                />
                                                                <Link href={`/leads/${lead.id}`}>
                                                                    {lead.name ?? "-"}
                                                                </Link>
                                                            </label>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(lead.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {getEmailDisplay(lead)}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Telefon: {lead.phone ?? "-"}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Reklam: {formatAdInfo(lead) || lead.campaign?.name || "-"}
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <select
                                                                className={`border rounded-lg p-1.5 text-xs font-medium ${STATUS_COLORS[
                                                                    lead.status as LeadStatus
                                                                ]
                                                                    } focus:ring-2 focus:ring-blue-200`}
                                                                value={lead.status}
                                                                onChange={(e) =>
                                                                    handleStatusChange(
                                                                        lead.id,
                                                                        e.target
                                                                            .value as LeadStatus,
                                                                    )
                                                                }
                                                            >
                                                                {Object.entries(STATUS_LABELS).map(
                                                                    ([val, label]) => (
                                                                        <option
                                                                            key={val}
                                                                            value={val}
                                                                        >
                                                                            {label}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <select
                                                                className="border rounded-lg bg-white shadow-sm text-xs p-1.5"
                                                                value={lead.assignedToUser?.id || ""}
                                                                onChange={(e) =>
                                                                    handleAssign(
                                                                        lead.id,
                                                                        e.target.value
                                                                            ? e.target.value
                                                                            : null,
                                                                    )
                                                                }
                                                            >
                                                                <option value="">Atanmadı</option>
                                                                {users.map((u) => (
                                                                    <option
                                                                        key={u.id}
                                                                        value={u.id}
                                                                    >
                                                                        {u.firstName} {u.lastName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Aksiyon Süresi: {" "}
                                                            {formatFirstResponseDuration(
                                                                firstResponseMinutes,
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap">
                                                            {lead.phone && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleCall(lead)}
                                                                >
                                                                    <Phone className="h-4 w-4 text-blue-600" />
                                                                </Button>
                                                            )}
                                                            {lead.phone && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleWhatsApp(lead)}
                                                                >
                                                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                            )}
                                                            {(lead.pageId || lead.email) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleMessenger(lead)}
                                                                >
                                                                    <Facebook className="h-4 w-4 text-indigo-600" />
                                                                </Button>
                                                            )}
                                                            {canDeleteLead && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDeleteRequest(lead)}
                                                                    className="text-red-600 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-12 flex flex-col lg:flex-row lg:items-center gap-4 justify-between mt-6 mb-8">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm w-full sm:w-auto">
                        <span className="text-sm text-gray-600">Sayfa başına:</span>
                        <select
                            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={pageSize}
                            onChange={(e) => {
                                const nextSize = Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number];
                                setPageSize(nextSize);
                                setPage(0);
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-center gap-4 bg-white border border-gray-200 rounded-lg px-6 py-2.5 shadow-sm w-full sm:w-auto">
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
                isOpen={!!activeCommunication}
                onClose={closeCommunication}
                closeOnBackdrop={!communicationLoading}
                showCloseButton={!communicationLoading}
                title={
                    activeCommunication?.channel === "PHONE"
                        ? "Güvenli Arama Başlat"
                        : "WhatsApp Mesajı Gönder"
                }
                description={
                    activeCommunication?.channel === "PHONE"
                        ? "Arama, sistem tarafından maskelenmiş numara üzerinden yönlendirilecektir."
                        : "WhatsApp mesajınızı ürün içerisinden gönderin; numara kullanıcıya gösterilmeyecektir."
                }
                actions={
                    activeCommunication
                        ? [
                            {
                                label: "Kapat",
                                variant: "ghost",
                                onClick: closeCommunication,
                                disabled: communicationLoading,
                            },
                            activeCommunication.channel === "PHONE"
                                ? {
                                    label: callSession ? "Aramayı Yenile" : "Aramayı Başlat",
                                    onClick: () => {
                                        void handleInitiateSecureCall();
                                    },
                                    isLoading: communicationLoading,
                                    disabled: communicationLoading,
                                }
                                : {
                                    label: "Mesaj Gönder",
                                    onClick: () => {
                                        void handleSendSecureWhatsApp();
                                    },
                                    isLoading: communicationLoading,
                                    disabled:
                                        communicationLoading ||
                                        !whatsAppMessage.trim().length,
                                },
                        ]
                        : []
                }
            >
                {activeCommunication?.channel === "PHONE" ? (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                            <p className="font-semibold">Numara maskelenmiştir.</p>
                            <p className="mt-1">
                                Arama, CRM üzerinden başlatılır ve ajanlara gerçek telefon
                                bilgisi gösterilmez. Aramayı başlattığınızda sistem size
                                yönlendirme yapacaktır.
                            </p>
                        </div>
                        {communicationError && (
                            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                                {communicationError}
                            </div>
                        )}
                        {communicationSuccess && (
                            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                                {communicationSuccess}
                            </div>
                        )}
                        {callSession && (
                            <div className="space-y-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">
                                        Oturum Kodu
                                    </span>
                                    <span>{callSession.callId}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Durum</span>
                                    <span className="uppercase tracking-wide text-xs text-blue-600">
                                        {callSession.status}
                                    </span>
                                </div>
                                {callSession.expiresAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Geçerlilik</span>
                                        <span>
                                            {new Date(callSession.expiresAt).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="whatsapp-message"
                                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                            >
                                Mesaj İçeriği
                            </label>
                            <textarea
                                id="whatsapp-message"
                                className="h-32 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                value={whatsAppMessage}
                                onChange={(event) => {
                                    setWhatsAppMessage(event.target.value);
                                    setCommunicationError(null);
                                }}
                                placeholder="Merhaba, sizinle en kısa sürede iletişime geçeceğiz..."
                                disabled={communicationLoading}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Mesaj, WhatsApp Business API üzerinden güvenli şekilde
                                iletilecek ve numara maskeli kalacaktır.
                            </p>
                        </div>
                        {communicationError && (
                            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                                {communicationError}
                            </div>
                        )}
                        {communicationSuccess && (
                            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                                {communicationSuccess}
                            </div>
                        )}
                        {whatsAppResult && (
                            <div className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                                <Send className="mt-0.5 h-4 w-4 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Mesaj gönderildi.</p>
                                    <p className="text-xs text-gray-500">
                                        ID: {whatsAppResult.messageId} · Durum: {whatsAppResult.status}
                                    </p>
                                    {whatsAppResult.deliveredAt && (
                                        <p className="text-xs text-gray-500">
                                            Teslim: {new Date(whatsAppResult.deliveredAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

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
                        onClick: () => {
                            void handleDeleteConfirm();
                        },
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
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Telefon: {leadToDelete.phone}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isBulkAssignOpen}
                onClose={() => {
                    if (bulkAssignLoading) return;
                    setIsBulkAssignOpen(false);
                }}
                closeOnBackdrop={!bulkAssignLoading}
                showCloseButton={!bulkAssignLoading}
                title="Lead'leri Aktar"
                description={
                    bulkAssignScope === "filtered"
                        ? "Filtrelenen lead'leri aktaracağınız kullanıcıyı seçiniz."
                        : "Seçili lead'leri aktaracağınız kullanıcıyı seçiniz."
                }
                actions={[
                    {
                        label: "İptal",
                        variant: "ghost",
                        onClick: () => setIsBulkAssignOpen(false),
                        disabled: bulkAssignLoading,
                    },
                    {
                        label: "Aktar",
                        onClick: () => {
                            void handleBulkAssignConfirm();
                        },
                        isLoading: bulkAssignLoading,
                        disabled: bulkAssignLoading,
                    },
                ]}
            >
                <div className="space-y-3 text-sm">
                    <p className="text-gray-600">
                        Toplam {bulkAssignCount} lead aktarılacak. Aktarımı yapmak istediğiniz kullanıcıyı seçiniz.
                    </p>
                    {bulkAssignScope === "filtered" && (
                        <p className="text-xs text-gray-500">
                            Aktarım, mevcut filtrelere uyan tüm lead’ler için uygulanacaktır.
                        </p>
                    )}
                    <select
                        className="w-full border rounded-md p-2"
                        value={bulkAssignUserId}
                        onChange={(e) => setBulkAssignUserId(e.target.value)}
                    >
                        <option value="">Kullanıcı seçiniz</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={handleCreateModalClose}
                closeOnBackdrop={!createLeadLoading}
                showCloseButton={!createLeadLoading}
                title="Yeni Lead Oluştur"
                description="Yeni lead bilgilerini giriniz."
                actions={[
                    {
                        label: "İptal",
                        variant: "ghost",
                        onClick: handleCreateModalClose,
                        disabled: createLeadLoading,
                    },
                    {
                        label: "Kaydet",
                        onClick: () => {
                            void handleCreateLead();
                        },
                        isLoading: createLeadLoading,
                        disabled: createLeadLoading,
                    },
                ]}
            >
                <div className="space-y-3 text-sm text-gray-700">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            İsim Soyisim
                        </label>
                        <Input
                            value={createLeadForm.name}
                            onChange={(e) => {
                                setCreateLeadForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }));
                                setCreateLeadError(null);
                            }}
                            placeholder="İsim Soyisim"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Email
                            </label>
                            <Input
                                type="email"
                                value={createLeadForm.email}
                                onChange={(e) =>
                                    setCreateLeadForm((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                placeholder="Email"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Telefon
                            </label>
                            <Input
                                value={createLeadForm.phone}
                                onChange={(e) =>
                                    setCreateLeadForm((prev) => ({
                                        ...prev,
                                        phone: e.target.value,
                                    }))
                                }
                                placeholder="Telefon"
                            />
                        </div>
                    </div>

                    {createLeadError && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                            {createLeadError}
                        </div>
                    )}
                    <p className="text-xs text-gray-500">
                        Lead oluşturulduktan sonra detay sayfasından kampanya bilgilerini ve diğer alanları güncelleyebilirsiniz.
                    </p>
                </div>
            </Modal>

            {isCallModalOpen && callLead && (
                <Modal
                    isOpen={isCallModalOpen}
                    onClose={() => setIsCallModalOpen(false)}
                    title="Arama Sonucu Kaydet"
                    description={(
                        <div className="flex items-center gap-2 mt-2 bg-gray-50 p-3 rounded-lg border">
                            <Phone className="h-5 w-5 text-gray-500" />
                            <span className="text-lg font-mono font-semibold text-gray-800">{callLead.phone}</span>
                            <Button size="sm" variant="ghost" onClick={handleCopyPhone} title="Kopyala">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    actions={[
                        {
                            label: "İptal",
                            onClick: () => setIsCallModalOpen(false),
                            variant: "ghost",
                        },
                        {
                            label: "Kaydet",
                            onClick: () => void handleLogCall(),
                            variant: "primary",
                            isLoading: callLoading,
                        },
                    ]}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Arama Sonucu</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { val: "CONNECTED", label: "✅ Ulaşıldı" },
                                    { val: "BUSY", label: "⛔ Meşgul" },
                                    { val: "WRONG_NUMBER", label: "❌ Yanlış No" },
                                    { val: "NO_ANSWER", label: "🔕 Cevap Yok" },
                                ].map((opt) => (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => setCallResult(opt.val as "CONNECTED" | "BUSY" | "WRONG_NUMBER" | "NO_ANSWER")}
                                        className={`
                                            p-2 rounded-md text-sm border text-left transition
                                            ${callResult === opt.val
                                                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700"
                                                : "hover:bg-gray-50 border-gray-200 text-gray-700"}
                                        `}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Not (Opsiyonel)</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm h-24"
                                placeholder="Görüşme notlarınızı buraya ekleyin..."
                                value={callNote}
                                onChange={(e) => setCallNote(e.target.value)}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

