"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Phone, MessageCircle, Facebook, ArrowLeft } from "lucide-react";
import {
    getLeadById,
    updateLeadStatus,
    getLeadActions,
    addLeadAction,
    getSaleById,
    type LeadResponse,
    type LeadStatus,
    type SaleResponse,
} from "@/lib/api";
import { resolveDocumentUrl } from "@/lib/document";
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

interface LeadAction {
    id: string;
    actionType: string;
    message: string;
    createdAt: string;
}

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [lead, setLead] = useState<LeadResponse | null>(null);
    const [actions, setActions] = useState<LeadAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<LeadStatus>("UNCONTACTED");
    const [noteText, setNoteText] = useState("");
    const [showSalesForm, setShowSalesForm] = useState(false);
    const [sale, setSale] = useState<SaleResponse | null>(null);

    // 📦 verileri yükle
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setLoading(true);
            const leadData = await getLeadById(id);
            const actionsData = await getLeadActions(id);
            if (leadData) {
                setLead(leadData);
                setStatus(leadData.status);
                let hasSale = false;
                if (leadData.lastSale) {
                    setSale(leadData.lastSale);
                    hasSale = true;
                } else if (leadData.lastSaleId) {
                    const saleData = await getSaleById(leadData.lastSaleId);
                    setSale(saleData);
                    hasSale = Boolean(saleData);
                } else {
                    setSale(null);
                }
                setShowSalesForm(leadData.status === "SOLD" && !hasSale);
            }
            setActions(actionsData || []);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    // 🔁 durum değiştir
    const handleStatusChange = async (newStatus: LeadStatus) => {
        if (!lead) return;
        const success = await updateLeadStatus(lead.id, newStatus);
        if (success) {
            setStatus(newStatus);
            setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
            setShowSalesForm(newStatus === "SOLD" && !sale);

            // Satışa geçtiyse logla
            if (newStatus === "SOLD") {
                handleAddAction("STATUS", "Lead durumu Satış olarak güncellendi");
            }
        } else alert("Durum güncellenemedi!");
    };

    // 📝 aksiyon ekleme
    const handleAddAction = async (actionType: string, message: string) => {
        if (!lead) return;
        const ok = await addLeadAction(lead.id, actionType, message);
        if (ok) {
            setActions((prev) => [
                {
                    id: Math.random().toString(36),
                    actionType,
                    message,
                    createdAt: new Date().toISOString(),
                },
                ...prev,
            ]);
            setNoteText("");
        }
    };

    // ☎️ iletişim butonları
    const handleCall = (phone?: string) => {
        if (!phone) return alert("Telefon numarası bulunamadı.");
        window.open(`tel:${phone}`, "_self");
        handleAddAction("PHONE", "Telefon araması başlatıldı");
    };

    const handleWhatsApp = (phone?: string) => {
        if (!phone) return alert("Telefon numarası bulunamadı.");
        const formatted = phone.replace(/\D/g, "");
        window.open(`https://wa.me/${formatted}`, "_blank");
        handleAddAction("WHATSAPP", "WhatsApp mesajı gönderildi");
    };

    const handleMessenger = (pageId?: string) => {
        if (!pageId) return alert("Messenger bağlantısı bulunamadı.");
        window.open(`https://m.me/${pageId}`, "_blank");
        handleAddAction("MESSENGER", "Messenger üzerinden mesaj gönderildi");
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
                                size="icon"
                                variant="outline"
                                title="Telefon"
                                onClick={() => handleCall(lead.phone)}
                            >
                                <Phone className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                title="WhatsApp"
                                onClick={() => handleWhatsApp(lead.phone)}
                            >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="icon"
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
                        <p><b>Kampanya:</b> {lead.campaign?.name ?? "-"}</p>
                        <p><b>Dil:</b> {lead.language ?? "-"}</p>
                        <p>
                            <b>Durum:</b>{" "}
                            <select
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
                            onSubmit={async (_data, { sale: createdSale, saleId }) => {
                                console.log("🧾 Satış kaydedildi:", createdSale?.id ?? saleId);
                                setShowSalesForm(false);

                                const fetchedSale =
                                    createdSale ?? (saleId ? await getSaleById(saleId) : null);

                                if (fetchedSale) {
                                    const resolvedSaleId = fetchedSale.id ?? saleId ?? null;
                                    setSale(fetchedSale);
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
                                <b>Otel:</b> {sale.hotel ?? "-"}
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
                                const documentUrl = resolveDocumentUrl(
                                    sale.documentPath ?? lead?.lastSale?.documentPath ?? null,
                                    sale.id ?? lead?.lastSaleId ?? null
                                );

                                if (!documentUrl) {
                                    return null;
                                }

                                return (
                                    <div className="pt-2">
                                        <a
                                            href={documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            📎 Satış Belgesini Görüntüle
                                        </a>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}

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

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (noteText.trim()) handleAddAction("NOTE", noteText.trim());
                            }}
                            className="mt-3 space-y-2"
                        >
              <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  placeholder="Not ekle..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
              />
                            <Button type="submit" size="sm" variant="primary" className="w-full">
                                Kaydet
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
