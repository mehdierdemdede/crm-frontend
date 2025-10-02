"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    Phone,
    MessageCircle,
    Facebook,
    ArrowLeft,
    Info,
} from "lucide-react";
import SalesForm from "@/app/leads/[id]/SalesForm";

type LeadStatus =
    | "Uncontacted"
    | "Positive"
    | "Solded"
    | "No Interest"
    | "Blocked"
    | "Wrong Number"
    | "No Answer";

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

// Dummy tek lead
const DUMMY_LEADS = [
    {
        id: 1,
        name: "Dummy Leadsey",
        adSource: "Facebook",
        campaign: "TR/TR/DEU/€800/2.6.25",
        createdAt: "2025-06-22 18:03",
        status: "Positive" as LeadStatus,
        lang: "TR",
        firstRespond: "18 dk",
        notes: [
            {
                id: 1,
                type: "phone",
                text: "Telefon arandı, ulaşılamadı.",
                date: "2025-06-22 19:10",
            },
            {
                id: 2,
                type: "whatsapp",
                text: "WhatsApp mesajı gönderildi.",
                date: "2025-06-22 19:25",
            },
        ],
    },
];

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const lead = useMemo(
        () => DUMMY_LEADS.find((l) => String(l.id) === String(id)) ?? DUMMY_LEADS[0],
        [id]
    );

    const [status, setStatus] = useState<LeadStatus>(lead.status);
    const [showSales, setShowSales] = useState(lead.status === "Solded");
    const [notes, setNotes] = useState(lead.notes);
    const [noteText, setNoteText] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        if (status === "Solded") {
            setStatusMessage("Lead Satış olarak işaretlendi. Satış formu açıldı ✅");
        } else if (status === "No Interest") {
            setStatusMessage("Lead ilgisiz olarak işaretlendi. Admin bilgilendirilecek.");
        } else if (status === "Blocked") {
            setStatusMessage("Lead blocked. Başka kullanıcıya aktarılacak.");
        } else {
            setStatusMessage("");
        }
    }, [status]);

    const handleStatusChange = (val: LeadStatus) => {
        setStatus(val);
        setShowSales(val === "Solded");
        // TODO: PATCH /leads/:id { status: val }
    };

    const addActionLog = (type: string, message: string) => {
        setNotes((prev) => [
            ...prev,
            {
                id: (prev[prev.length - 1]?.id || 0) + 1,
                type,
                text: message,
                date: new Date().toLocaleString(),
            },
        ]);
        // TODO: POST /leads/:id/notes
    };

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        addActionLog("note", noteText.trim());
        setNoteText("");
    };

    return (
        <Layout title="Lead Detayı" subtitle={`Lead #${id}`}>
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
                {status}
              </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                title="Telefon"
                                onClick={() => addActionLog("phone", "Telefon araması başlatıldı.")}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="WhatsApp"
                                onClick={() => addActionLog("whatsapp", "WhatsApp mesajı gönderildi.")}
                            >
                                <MessageCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Messenger"
                                onClick={() =>
                                    addActionLog("messenger", "Facebook Messenger üzerinden mesaj gönderildi.")
                                }
                            >
                                <Facebook className="h-4 w-4 text-blue-600" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p>
                                <b>Kaynak:</b> {lead.adSource}
                            </p>
                            <p>
                                <b>Kampanya:</b> {lead.campaign}
                            </p>
                            <p>
                                <b>Oluşturulma:</b> {lead.createdAt}
                            </p>
                            <p>
                                <b>Dil:</b> {lead.lang}
                            </p>
                            <p>
                                <b>First Respond:</b>{" "}
                                <span className="text-green-600 font-medium">
                  {lead.firstRespond}
                </span>
                            </p>
                        </div>

                        {statusMessage && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                <Info className="h-4 w-4" /> {statusMessage}
                            </div>
                        )}

                        <div>
                            <label className="block mb-1 text-sm font-medium">Durum</label>
                            <select
                                className="border rounded-md p-2"
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {showSales && (
                    <div>
                        <SalesForm
                            leadId={Number(id)}
                            onSubmit={(payload) => {
                                console.log("Sales submit payload", payload);
                                // TODO: POST /sales
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Sağ kolon: Loglar */}
            <div className="col-span-12 lg:col-span-4">
                <Card>
                    <CardHeader>Aksiyon Geçmişi</CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            {notes.map((n) => (
                                <li key={n.id} className="border-b pb-2 flex items-start gap-2">
                                    {n.type === "phone" && (
                                        <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                                    )}
                                    {n.type === "whatsapp" && (
                                        <MessageCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    )}
                                    {n.type === "messenger" && (
                                        <Facebook className="h-4 w-4 text-blue-600 mt-0.5" />
                                    )}
                                    {n.type === "note" && (
                                        <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                                    )}
                                    <div>
                                        <div>{n.text}</div>
                                        <div className="text-xs text-gray-500">{n.date}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <form onSubmit={handleAddNote} className="mt-4 space-y-2">
                            <label className="text-sm font-medium">Yeni Not</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm"
                                rows={2}
                                placeholder="Not girin..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && e.ctrlKey) {
                                        handleAddNote(e as any);
                                    }
                                }}
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
