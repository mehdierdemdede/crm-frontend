"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import type { LeadResponse as Lead } from "@/lib/api";

import {
    Phone,
    MessageCircle,
    Facebook,
    ArrowLeft,
    Info,
} from "lucide-react";
import {
    getLeadById,
    getLeadLogs,
    addLeadLog,
    updateLeadStatus,
} from "@/lib/api";


interface LeadLog {
    id: string;
    actionType: string;
    message: string;
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    NEW: "bg-gray-300 text-gray-800",
    CONTACTED: "bg-blue-100 text-blue-800",
    QUALIFIED: "bg-yellow-100 text-yellow-800",
    PROPOSAL_SENT: "bg-indigo-100 text-indigo-800",
    NEGOTIATION: "bg-amber-100 text-amber-800",
    CLOSED_WON: "bg-green-100 text-green-800",
    CLOSED_LOST: "bg-red-100 text-red-800",
};

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [lead, setLead] = useState<Lead | null>(null);
    const [logs, setLogs] = useState<LeadLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [noteText, setNoteText] = useState("");
    const [infoMessage, setInfoMessage] = useState("");

    // 📦 Lead & Logs yükleme
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setLoading(true);
            const leadData = await getLeadById(id);
            const logsData = await getLeadLogs(id);
            if (leadData) {
                setLead(leadData);
                setStatus(leadData.status);
            }
            setLogs(logsData);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    // 🟢 Durum değişikliği
    const handleStatusChange = async (newStatus: string) => {
        if (!lead) return;
        const success = await updateLeadStatus(lead.id, newStatus);
        if (success) {
            setStatus(newStatus);
            setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
            setInfoMessage(`Durum "${newStatus}" olarak güncellendi ✅`);
        } else {
            setInfoMessage("Durum güncellenemedi ❌");
        }
    };

    // 📝 Log ekleme
    const handleAddLog = async (actionType: string, message: string) => {
        if (!lead) return;
        const success = await addLeadLog(lead.id, actionType, message);
        if (success) {
            const newLog = {
                id: Math.random().toString(36).substring(2, 9),
                actionType,
                message,
                createdAt: new Date().toISOString(),
            };
            setLogs((prev) => [newLog, ...prev]);
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
            {/* Sol kolon */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push("/leads")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                            </Button>
                            <span className="font-semibold">{lead.name}</span>
                            <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[status]}`}
                            >
                {status.replace("_", " ")}
              </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                title="Telefon"
                                onClick={() => handleAddLog("PHONE", "Telefon araması yapıldı.")}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="WhatsApp"
                                onClick={() =>
                                    handleAddLog("WHATSAPP", "WhatsApp mesajı gönderildi.")
                                }
                            >
                                <MessageCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Messenger"
                                onClick={() =>
                                    handleAddLog("MESSENGER", "Messenger üzerinden mesaj gönderildi.")
                                }
                            >
                                <Facebook className="h-4 w-4 text-blue-600" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p>
                                <b>Email:</b> {lead.email || "-"}
                            </p>
                            <p>
                                <b>Telefon:</b> {lead.phone || "-"}
                            </p>
                            <p>
                                <b>Kampanya:</b> {lead.campaign?.name || "-"}
                            </p>
                            <p>
                                <b>Dil:</b> {lead.language || "-"}
                            </p>
                            <p>
                                <b>Atanan Kullanıcı:</b>{" "}
                                {lead.assignedToUser
                                    ? `${lead.assignedToUser.firstName} ${lead.assignedToUser.lastName}`
                                    : "-"}
                            </p>
                            <p>
                                <b>Oluşturulma:</b>{" "}
                                {new Date(lead.createdAt).toLocaleString()}
                            </p>
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
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                {Object.keys(STATUS_COLORS).map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sağ kolon - Aksiyon geçmişi */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>Aksiyon Geçmişi</CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {logs.map((log) => (
                                <li key={log.id} className="border-b pb-2 flex items-start gap-2">
                                    {log.actionType === "PHONE" && (
                                        <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                                    )}
                                    {log.actionType === "WHATSAPP" && (
                                        <MessageCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    )}
                                    {log.actionType === "MESSENGER" && (
                                        <Facebook className="h-4 w-4 text-blue-600 mt-0.5" />
                                    )}
                                    {log.actionType === "NOTE" && (
                                        <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                                    )}
                                    <div>
                                        <div>{log.message}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-gray-500 text-center py-3 text-sm">
                                    Henüz aksiyon geçmişi yok.
                                </div>
                            )}
                        </ul>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!noteText.trim()) return;
                                handleAddLog("NOTE", noteText.trim());
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
