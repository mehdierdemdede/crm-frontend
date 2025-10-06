"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Info, Phone, MessageCircle, Facebook, ArrowLeft } from "lucide-react";
import {
    getLeadById,
    updateLeadStatus,
    getLeadActions,
    addLeadAction,
    patchLeadAssign,
    type LeadResponse,
    type LeadStatus,
} from "@/lib/api";
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

    // 📦 Veriyi yükle
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setLoading(true);
            const leadData = await getLeadById(id);
            const actionsData = await getLeadActions(id);
            if (leadData) {
                setLead(leadData);
                setStatus(leadData.status);
                if (leadData.status === "SOLD") setShowSalesForm(true);
            }
            setActions(actionsData || []);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    // 🔁 Durum değiştir
    const handleStatusChange = async (newStatus: LeadStatus) => {
        if (!lead) return;
        const success = await updateLeadStatus(lead.id, newStatus);
        if (success) {
            setStatus(newStatus);
            setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
            setShowSalesForm(newStatus === "SOLD");
        } else {
            alert("Durum güncellenemedi!");
        }
    };

    // 👤 Lead atama
    const handleAssign = async (userId: string | null) => {
        if (!lead) return;
        const success = await patchLeadAssign(lead.id, userId);
        if (success) {
            alert("Lead ataması başarıyla güncellendi");
        } else {
            alert("Lead atama işlemi başarısız!");
        }
    };


    // 📝 Yeni aksiyon
    const handleAddAction = async (actionType: string, message: string) => {
        if (!lead || !message.trim()) return;
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
            {/* Sol taraf */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                            </Button>
                            <span className="font-semibold">{lead.name}</span>
                            <span
                                className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[status]}`}
                            >
                {STATUS_LABELS[status]}
              </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddAction("PHONE", "Telefon araması yapıldı")}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddAction("WHATSAPP", "WhatsApp mesajı gönderildi")}
                            >
                                <MessageCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    handleAddAction("MESSENGER", "Messenger üzerinden mesaj gönderildi")
                                }
                            >
                                <Facebook className="h-4 w-4 text-blue-600" />
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

                {/* 💵 Satış formu inline */}
                {showSalesForm && (
                    <div className="mt-6">
                        <SalesForm
                            leadId={Number(lead.id)}
                            onSubmit={(data) => {
                                console.log("🧾 Satış kaydedildi:", data);
                                setShowSalesForm(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Sağ taraf: Notlar */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
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
                            <Button type="submit" size="sm" variant="primary">
                                Kaydet
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
