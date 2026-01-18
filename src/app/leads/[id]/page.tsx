"use client";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Check, Copy, Facebook, MessageCircle, Pencil, Phone, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import {
    getLeadById,
    updateLeadStatus,
    updateLead,
    getLeadActions,
    addLeadAction,
    getSaleById,
    getUsers,
    getHotels,
    patchLeadAssign,
    type LeadResponse,
    type LeadStatus,
    type UserResponse,
    type SimpleUser,
    type SaleResponse,
    type Hotel,
} from "@/lib/api";
import {
    resolveDocumentUrl,
    inferDocumentFileName,
    downloadDocumentWithAuth,
} from "@/lib/document";

import SalesForm from "./SalesForm";

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

const SALE_CACHE_PREFIX = "lead-sale:";

const saveCachedSale = (leadId: string, sale: SaleResponse) => {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(
            `${SALE_CACHE_PREFIX}${leadId}`,
            JSON.stringify({
                ...sale,
                cachedAt: Date.now(),
            })
        );
    } catch (error) {
        console.warn("Satış bilgisi önbelleğe alınamadı", error);
    }
};

const clearCachedSale = (leadId: string) => {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.removeItem(`${SALE_CACHE_PREFIX}${leadId}`);
    } catch (error) {
        console.warn("Satış önbelleği temizlenemedi", error);
    }
};

interface LeadAction {
    id: string;
    actionType: string;
    message: string;
    createdAt: string;
}

const ACTION_BUTTON_TYPES = new Set<LeadAction["actionType"]>([
    "PHONE",
    "WHATSAPP",
    "MESSENGER",
]);

const formatAdInfo = (lead: LeadResponse): string => {
    // 1. Organik mi?
    if (lead.organic) return "Organik";

    // 2. Raw Ad Info & List Logic
    const legacyLead = lead as unknown as {
        ad_name?: unknown;
        ad_info?: unknown;
        campaign_name?: unknown;
        adset_name?: unknown;
    };

    const rawAdInfo = lead.adInfo ?? legacyLead.ad_info;
    const adInfo = typeof rawAdInfo === "string" ? rawAdInfo.trim() : "";
    if (adInfo) return adInfo;

    const rawAdName = lead.adName ?? legacyLead.ad_name;
    const adName = typeof rawAdName === "string" ? rawAdName.trim() : "";
    if (adName) return adName;
    const rawCampaignName =
        (typeof lead.campaign === 'object' && lead.campaign !== null ? lead.campaign.name : undefined) ??
        lead.campaignName ??
        lead.fbCampaignName ??
        legacyLead.campaign_name;
    const campaignName = typeof rawCampaignName === "string" ? rawCampaignName.trim() : "";

    const rawAdsetName = lead.adsetName ?? legacyLead.adset_name;
    const adsetName = typeof rawAdsetName === "string" ? rawAdsetName.trim() : "";

    const parts = [campaignName, adsetName].filter(Boolean);

    if (parts.length > 0) return parts.join(" / ");

    return "-";
};

const formatUserName = (user?: SimpleUser | null): string => {
    if (!user) return "Atanmadı";
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (fullName) return fullName;
    return user.email || "Atanmadı";
};

const formatHotelName = (hotelId: string | null | undefined, hotels: Hotel[]): string => {
    if (!hotelId) return "-";
    const found = hotels.find(h => h.id === hotelId);
    return found ? (found.name || hotelId) : hotelId;
};

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [lead, setLead] = useState<LeadResponse | null>(null);
    const [actions, setActions] = useState<LeadAction[]>([]);
    const [notes, setNotes] = useState<LeadAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<LeadStatus>("UNCONTACTED");
    const [noteText, setNoteText] = useState("");
    const [showSalesForm, setShowSalesForm] = useState(false);
    const [sale, setSale] = useState<SaleResponse | null>(null);
    const [isDownloadingDocument, setIsDownloadingDocument] = useState(false);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);

    // 🔹 Ad Name Editing State
    const [isEditingAd, setIsEditingAd] = useState(false);
    const [adNameValue, setAdNameValue] = useState("");
    const [adEditLoading, setAdEditLoading] = useState(false);

    // Call Modal State
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callResult, setCallResult] = useState<"CONNECTED" | "BUSY" | "WRONG_NUMBER" | "NO_ANSWER">("CONNECTED");
    const [callNote, setCallNote] = useState("");
    const [callLoading, setCallLoading] = useState(false);

    const statusSelectId = useId();
    const noteTextareaId = useId();
    const assignSelectId = useId();

    // 📦 verileri yükle
    useEffect(() => {
        if (!id) return;

        let ignore = false;
        const leadId = id;

        const fetchData = async () => {
            setLoading(true);

            const [leadData, actionsData] = await Promise.all([
                getLeadById(leadId),
                getLeadActions(leadId),
            ]);

            if (ignore) return;

            if (leadData) {
                setLead(leadData);
                setStatus(leadData.status);

                let resolvedSale: SaleResponse | null = leadData.lastSale ?? null;

                if (!resolvedSale && leadData.lastSaleId) {
                    const saleData = await getSaleById(leadData.lastSaleId);
                    if (ignore) return;
                    if (saleData) {
                        resolvedSale = saleData;
                    }
                }

                if (resolvedSale) {
                    setSale(resolvedSale);
                } else {
                    setSale(null);
                }

                setShowSalesForm(leadData.status === "SOLD" && !resolvedSale);
            } else {
                setSale(null);
                setShowSalesForm(false);
            }
            const actionItems = actionsData || [];
            const noteItems = actionItems.filter((item) => item.actionType === "NOTE");
            const buttonActions = actionItems.filter((item) =>
                ACTION_BUTTON_TYPES.has(item.actionType)
            );

            setActions(buttonActions);
            setNotes(noteItems);
            setLoading(false);
        };

        void fetchData();

        return () => {
            ignore = true;
        };
    }, [id]);

    useEffect(() => {
        let ignore = false;

        const loadData = async () => {
            const [userData, hotelData] = await Promise.all([
                getUsers(),
                getHotels(),
            ]);

            if (ignore) return;

            setUsers(userData ?? []);
            setHotels(hotelData ?? []);
        };

        void loadData();

        return () => {
            ignore = true;
        };
    }, []);

    // 🔁 durum değiştir
    const handleStatusChange = async (newStatus: LeadStatus) => {
        if (!lead || status === newStatus) return;
        const success = await updateLeadStatus(lead.id, newStatus);
        if (success) {
            setStatus(newStatus);
            setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
            setShowSalesForm(newStatus === "SOLD" && !sale);

            const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
            await handleAddAction(
                "STATUS",
                `Lead durumu ${statusLabel} olarak güncellendi`
            );
        } else alert("Durum güncellenemedi!");
    };

    // 📝 aksiyon ekleme
    const handleAddAction = async (actionType: string, message: string) => {
        if (!lead) return;
        const ok = await addLeadAction(lead.id, actionType, message);
        if (ok) {
            const newEntry: LeadAction = {
                id: Math.random().toString(36),
                actionType,
                message,
                createdAt: new Date().toISOString(),
            };

            if (actionType === "NOTE") {
                setNotes((prev) => [newEntry, ...prev]);
                setNoteText("");
                return;
            }

            if (ACTION_BUTTON_TYPES.has(actionType)) {
                setActions((prev) => [newEntry, ...prev]);
            }
        }
    };

    const handleAddNote = async () => {
        const trimmed = noteText.trim();
        if (trimmed) {
            await handleAddAction("NOTE", trimmed);
        }
    };

    // ☎️ iletişim butonları
    // ☎️ iletişim butonları
    const handleCall = () => {
        if (!lead?.phone) return alert("Telefon numarası bulunamadı.");
        setIsCallModalOpen(true);
    };

    const handleLogCall = async () => {
        if (!lead) return;
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
            await handleAddAction("PHONE", message);
            setIsCallModalOpen(false);
            setCallNote("");
            setCallResult("CONNECTED");
        } finally {
            setCallLoading(false);
        }
    };

    const handleCopyPhone = () => {
        if (lead?.phone) {
            void navigator.clipboard.writeText(lead.phone);
            alert("Telefon numarası kopyalandı!");
        }
    };

    const handleWhatsApp = (phone?: string) => {
        if (!phone) return alert("Telefon numarası bulunamadı.");
        const formatted = phone.replace(/\D/g, "");
        // Web WhatsApp
        window.open(`https://web.whatsapp.com/send?phone=${formatted}`, "_blank");
        void handleAddAction("WHATSAPP", "WhatsApp mesajı gönderildi");
    };

    const handleMessenger = (pageId?: string | null) => {
        if (pageId) {
            window.open(`https://m.me/${pageId}`, "_blank");
            void handleAddAction("MESSENGER", "Messenger üzerinden mesaj gönderildi");
        } else {
            // Facebook search fallback
            window.open(`https://www.facebook.com/search/top?q=${encodeURIComponent(lead?.name || "")}`, "_blank");
            void handleAddAction("MESSENGER", "Facebook'ta arama yapıldı");
        }
    };

    const handleAssign = async (userId: string | null) => {
        if (!lead || assignLoading) return;
        setAssignLoading(true);
        const ok = await patchLeadAssign(lead.id, userId);
        setAssignLoading(false);

        if (ok) {
            const assignedUser = userId
                ? users.find((u) => u.id === userId) || null
                : null;
            setLead((prev) => (prev ? { ...prev, assignedToUser: assignedUser } : prev));

            const message = assignedUser
                ? `${formatUserName(assignedUser)} lead'e atandı.`
                : "Lead ataması kaldırıldı.";

            await handleAddAction("ASSIGN", `Atama güncellendi: ${message}`);
        } else {
            alert("Lead ataması tamamlanamadı. Lütfen tekrar deneyin.");
        }
    };

    if (loading || !lead) {
        return (
            <Layout title="Lead Detayı">
                <div className="col-span-12 text-center text-gray-500 py-10">
                    Yükleniyor...
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={`Lead Detayı - ${lead.name}`}>
            <CallModal />
            {/* 🧱 Sol taraf */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                            </Button>
                            <span className="font-semibold text-base">{lead.name}</span>
                            <span
                                className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[status]}`}
                            >
                                {STATUS_LABELS[status]}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="h-10 w-10 p-0"
                                variant="outline"
                                title="Telefon"
                                onClick={() => handleCall()}
                            >
                                <Phone className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                                size="sm"
                                className="h-10 w-10 p-0"
                                variant="outline"
                                title="WhatsApp"
                                onClick={() => handleWhatsApp(lead.phone)}
                            >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="sm"
                                className="h-10 w-10 p-0"
                                variant="outline"
                                title="Messenger"
                                onClick={() => handleMessenger(lead.pageId)}
                            >
                                <Facebook className="h-4 w-4 text-indigo-600" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                        <p><b>Email:</b> {lead.email ?? "-"}</p>
                        <p><b>Telefon:</b> {lead.phone ?? "-"}</p>
                        <div className="flex items-center gap-2 h-7">
                            <b className="shrink-0">Reklam:</b>
                            {isEditingAd ? (
                                <div className="flex items-center gap-1 flex-1 max-w-xs">
                                    <input
                                        type="text"
                                        className="w-full border rounded px-1 py-0.5 text-xs"
                                        value={adNameValue}
                                        onChange={(e) => setAdNameValue(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        disabled={adEditLoading}
                                        onClick={async () => {
                                            if (!lead) return;
                                            setAdEditLoading(true);
                                            try {
                                                const updated = await updateLead(lead.id, { adName: adNameValue });
                                                if (updated) {
                                                    setLead(updated);
                                                    setIsEditingAd(false);
                                                    await handleAddAction("NOTE", `Reklam ismi değiştirildi: ${adNameValue}`);
                                                } else {
                                                    alert("Güncellenemedi!");
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert("Hata oluştu");
                                            } finally {
                                                setAdEditLoading(false);
                                            }
                                        }}
                                        className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingAd(false)}
                                        className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <span>{formatAdInfo(lead)}</span>
                                    <button
                                        onClick={() => {
                                            setAdNameValue(formatAdInfo(lead));
                                            setIsEditingAd(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600"
                                        title="Reklam ismini düzenle"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p>
                            <b>Danışman:</b>{" "}
                            <label className="sr-only" htmlFor={assignSelectId}>
                                Danışman atama
                            </label>
                            <select
                                id={assignSelectId}
                                className="border rounded-md p-1 text-xs"
                                value={lead.assignedToUser?.id || ""}
                                onChange={(e) =>
                                    handleAssign(e.target.value ? e.target.value : null)
                                }
                                disabled={assignLoading}
                            >
                                <option value="">Atanmadı</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {formatUserName(user)}
                                    </option>
                                ))}
                            </select>
                        </p>
                        <p>
                            <b>Durum:</b>{" "}
                            <label className="sr-only" htmlFor={statusSelectId}>
                                Durum
                            </label>
                            <select
                                id={statusSelectId}
                                className="border rounded-md p-1 text-xs"
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                            >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </p>
                    </CardContent>
                </Card>

                {/* 💵 Satış formu */}
                {showSalesForm && (
                    <div className="mt-6">
                        <SalesForm
                            leadId={lead.id} // ✅ String olarak gidiyor
                            onSubmit={async (_data, { saleId }) => {
                                console.log("🧾 Satış kaydedildi:", saleId);
                                setShowSalesForm(false);

                                const fetchedSale = saleId ? await getSaleById(saleId) : null;

                                if (fetchedSale) {
                                    const resolvedSaleId = fetchedSale.id ?? saleId ?? null;
                                    setSale(fetchedSale);
                                    saveCachedSale(id, fetchedSale);
                                    setLead((prev) =>
                                        prev
                                            ? {
                                                ...prev,
                                                status: "SOLD",
                                                lastSaleId: resolvedSaleId ?? undefined,
                                                lastSale: fetchedSale,
                                            }
                                            : prev
                                    );
                                } else {
                                    clearCachedSale(id);
                                    setLead((prev) =>
                                        prev
                                            ? {
                                                ...prev,
                                                status: "SOLD",
                                            }
                                            : prev
                                    );
                                }
                            }}
                        />
                    </div>
                )}

                {/* 📄 Satış bilgileri */}
                {sale && (
                    <Card className="shadow-sm mt-6">
                        <CardHeader className="font-semibold text-base">
                            Satış Bilgileri
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>
                                <b>Operasyon Tarihi:</b> {sale.operationDate
                                    ? new Date(sale.operationDate).toLocaleDateString()
                                    : "-"}
                            </p>
                            <p>
                                <b>Operasyon Türü:</b> {sale.operationType ?? "-"}
                            </p>
                            <p>
                                <b>Fiyat:</b> {sale.price != null
                                    ? `${Number(sale.price).toLocaleString("tr-TR")} ${sale.currency || ""}`.trim()
                                    : "-"}
                            </p>
                            <p>
                                <b>Otel:</b> {formatHotelName(sale.hotel, hotels)}
                            </p>
                            <p>
                                <b>Gece Sayısı:</b> {sale.nights ?? "-"}
                            </p>
                            <div>
                                <b>Transfer:</b>{" "}
                                {sale.transfer && sale.transfer.length > 0 ? (
                                    <span>{sale.transfer.join(", ")}</span>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>

                            {(() => {
                                const documentPath =
                                    sale.documentPath ?? lead?.lastSale?.documentPath ?? null;
                                const documentUrl = resolveDocumentUrl(
                                    documentPath,
                                    sale.id ?? lead?.lastSaleId ?? null
                                );

                                if (!documentUrl) {
                                    return null;
                                }

                                const fallbackFileName = inferDocumentFileName(documentPath);

                                const handleDocumentView = async () => {
                                    setIsDownloadingDocument(true);
                                    try {
                                        const result = await downloadDocumentWithAuth(
                                            documentUrl,
                                            fallbackFileName
                                        );

                                        if (!result.success) {
                                            if (result.status === 401) {
                                                alert(
                                                    "Belgeyi görüntülemek için yeniden oturum açmanız gerekiyor."
                                                );
                                            } else {
                                                alert(
                                                    "Satış belgesi indirilemedi. Lütfen daha sonra tekrar deneyiniz."
                                                );
                                            }
                                        }
                                    } finally {
                                        setIsDownloadingDocument(false);
                                    }
                                };

                                return (
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            className="text-sm text-blue-600 hover:underline disabled:opacity-60"
                                            onClick={handleDocumentView}
                                            disabled={isDownloadingDocument}
                                        >
                                            {isDownloadingDocument
                                                ? "Belge indiriliyor..."
                                                : "📎 Satış Belgesini Görüntüle"}
                                        </button>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}

                <Card className="shadow-sm">
                    <CardHeader>Notlar</CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {notes.length === 0 ? (
                            <div className="text-gray-500 text-sm">Henüz not yok.</div>
                        ) : (
                            <ul className="space-y-2">
                                {notes.map((note) => (
                                    <li key={note.id} className="border-b pb-2">
                                        <p>{note.message}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(note.createdAt).toLocaleString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleAddNote();
                            }}
                            className="space-y-2"
                        >
                            <div>
                                <label className="sr-only" htmlFor={noteTextareaId}>
                                    Not ekle
                                </label>
                                <textarea
                                    id={noteTextareaId}
                                    className="w-full border rounded-md p-2 text-sm"
                                    placeholder="Not ekle..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="sm" variant="primary" className="w-full">
                                Kaydet
                            </Button>
                        </form>
                    </CardContent>
                </Card>

            </div>

            {/* 🗒️ Sağ taraf: Aksiyon geçmişi */}
            <div className="col-span-12 lg:col-span-4">
                <Card className="shadow-sm">
                    <CardHeader>Aksiyon Geçmişi</CardHeader>
                    <CardContent>
                        {actions.length === 0 ? (
                            <div className="text-gray-500 text-center text-sm py-3">
                                Henüz aksiyon yok.
                            </div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {actions.map((a) => (
                                    <li key={a.id} className="border-b pb-2">
                                        <p>{a.message}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(a.createdAt).toLocaleString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );

    function CallModal() {
        if (!isCallModalOpen || !lead) return null;

        return (
            <Modal
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
                title="Arama Sonucu Kaydet"
                description={(
                    <div className="flex items-center gap-2 mt-2 bg-gray-50 p-3 rounded-lg border">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <span className="text-lg font-mono font-semibold text-gray-800">{lead.phone}</span>
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
        );
    }
}
