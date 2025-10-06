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
    LeadResponse as Lead,
} from "@/lib/api";

type LeadStatus =
    | "UNCONTACTED"
    | "HOT"
    | "SOLD"
    | "NOT_INTERESTED"
    | "BLOCKED"
    | "WRONG_INFO";

const STATUS_COLORS: Record<LeadStatus, string> = {
    UNCONTACTED: "bg-gray-300 text-gray-800",
    HOT: "bg-yellow-100 text-yellow-800",
    SOLD: "bg-green-100 text-green-800",
    NOT_INTERESTED: "bg-gray-200 text-gray-700",
    BLOCKED: "bg-red-100 text-red-700",
    WRONG_INFO: "bg-amber-100 text-amber-800",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    UNCONTACTED: "İlk Temas Yok",
    HOT: "Sıcak Hasta",
    SOLD: "Satış",
    NOT_INTERESTED: "İlgisiz",
    BLOCKED: "Engellendi",
    WRONG_INFO: "Yanlış Bilgi",
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

    const [lead, setLead] = useState<Lead | null>(null);
    const [actions, setActions] = useState<LeadAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<LeadStatus>("UNCONTACTED");
    const [noteText, setNoteText] = useState("");
    const [infoMessage, setInfoMessage] = useState("");

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setLoading(true);
            const leadData = await getLeadById(id);
            const actionsData = await getLeadActions(id);
            if (leadData) {
                setLead(leadData);
                setStatus(leadData.status as LeadStatus);
            }
            setActions(actionsData || []);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleStatusChange = async (newStatus: LeadStatus) => {
        if (!lead) return;
        const ok = await updateLeadStatus(lead.id, newStatus);
        if (ok) {
            setStatus(newStatus);
            setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
            setInfoMessage(`Durum "${STATUS_LABELS[newStatus]}" olarak güncellendi ✅`);
        } else {
            setInfoMessage("Durum güncellenemedi ❌");
        }
    };

    const handleAddAction = async (actionType: string, message: string) => {
        if (!lead || !message.trim()) return;
        const ok = await addLeadAction(lead.id, actionType, message);
        if (ok) {
            setActions((prev) => [
                {
                    id: Math.random().toString(36).substring(2, 9),
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
        <Layout title={`Lead Detayı`} subtitle={lead.name}>
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                            </Button>
                            <span className="font-semibold">{lead.name}</span>
                            <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    STATUS_COLORS[status]
                                }`}
                            >
                {STATUS_LABELS[status]}
              </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddAction("PHONE", "Telefon araması yapıldı.")}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddAction("WHATSAPP", "WhatsApp mesajı gönderildi.")}
                            >
                                <MessageCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    handleAddAction("MESSENGER", "Messenger üzerinden mesaj gönderildi.")
                                }
                            >
                                <Facebook className="h-4 w-4 text-blue-600" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p><b>Email:</b> {lead.email || "-"}</p>
                            <p><b>Telefon:</b> {lead.phone || "-"}</p>
                            <p><b>Kampanya:</b> {lead.campaign?.name || "-"}</p>
                            <p><b>Dil:</b> {lead.language || "-"}</p>
                            <p>
                                <b>Atanan Kullanıcı:</b>{" "}
                                {lead.assignedToUser
                                    ? `${lead.assignedToUser.firstName} ${lead.assignedToUser.lastName}`
                                    : "-"}
                            </p>
                            <p><b>Oluşturulma:</b> {new Date(lead.createdAt).toLocaleString()}</p>
                        </div>

                        {infoMessage && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                <Info className="h-4 w-4" /> {infoMessage}
                            </div>
                        )}

                        <div>
                            <label className="block mb-1 text-sm font-medium">Durum</label>
                            <select
                                className="border rounded-md p-2"
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                            >
                                {Object.keys(STATUS_LABELS).map((s) => (
                                    <option key={s} value={s}>
                                        {STATUS_LABELS[s as LeadStatus]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sağ kolon */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>Aksiyon Geçmişi</CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {actions.map((a) => (
                                <li key={a.id} className="border-b pb-2 flex items-start gap-2">
                                    {a.actionType === "PHONE" && <Phone className="h-4 w-4 text-green-600" />}
                                    {a.actionType === "WHATSAPP" && <MessageCircle className="h-4 w-4 text-green-500" />}
                                    {a.actionType === "MESSENGER" && <Facebook className="h-4 w-4 text-blue-600" />}
                                    {a.actionType === "NOTE" && <Info className="h-4 w-4 text-gray-500" />}
                                    <div>
                                        <div>{a.message}</div>
                                        <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                                    </div>
                                </li>
                            ))}
                            {actions.length === 0 && (
                                <div className="text-gray-500 text-center py-3 text-sm">
                                    Henüz aksiyon yok.
                                </div>
                            )}
                        </ul>

                        {/* Not alanı */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!noteText.trim()) return;
                                handleAddAction("NOTE", noteText.trim());
                            }}
                            className="mt-4 space-y-2"
                        >
                            <label className="text-sm font-medium">Yeni Not</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm"
                                rows={2}
                                placeholder="Not girin..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                            />
                            <Button type="submit" variant="primary" size="sm">
                                Ekle
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
