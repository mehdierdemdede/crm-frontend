"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import Layout from "@/components/Layout"; // Layout bileşenini import edin
import Sidebar from "@/components/Sidebar"; // Sidebar bileşenini import edin

// Recharts'ı sadece client-side yüklemek için dynamic wrapper (ssr: false)
const DynamicBarChart = dynamic(
    async () => {
        const R = await import("recharts");
        // Return a React component that renders the chart using the imported recharts
        return function BarChartClient({ data }: { data: any[] }) {
            const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = R;
            return (
                <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="conversionRate" name="Dönüşüm %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        };
    },
    { ssr: false }
);

/* -------------------------
   Dummy data (sabit, deterministic)
   ------------------------- */
const DUMMY_STATS = {
    totalLeads: 120,
    contactedLeads: 80,
    conversionRate: 35,
    responseTime: "2.4 saat",
};

const DUMMY_TEAM = [
    {
        id: 1,
        name: "Ahmet Yılmaz",
        email: "ahmet@example.com",
        group: "Sales",
        assignedLeads: 30,
        contacted: 20,
        convertedLeads: 12,
        responseTime: "3s",
        totalActivities: 25,
        conversionRate: 40,
        sourceBreakdown: { facebook: 12, google: 10, organic: 8 },
    },
    {
        id: 2,
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        group: "Marketing",
        assignedLeads: 25,
        contacted: 15,
        convertedLeads: 8,
        responseTime: "2s",
        totalActivities: 18,
        conversionRate: 32,
        sourceBreakdown: { facebook: 10, google: 8, organic: 7 },
    },
    {
        id: 3,
        name: "Mehmet Demir",
        email: "mehmet@example.com",
        group: "Sales",
        assignedLeads: 20,
        contacted: 17,
        convertedLeads: 6,
        responseTime: "4s",
        totalActivities: 15,
        conversionRate: 28,
        sourceBreakdown: { facebook: 8, google: 6, organic: 6 },
    },
    {
        id: 4,
        name: "Kübra Koral",
        email: "kubra@example.com",
        group: "Support",
        assignedLeads: 28,
        contacted: 11,
        convertedLeads: 11,
        responseTime: "19h 27m",
        totalActivities: 12,
        conversionRate: 39,
        sourceBreakdown: { facebook: 9, google: 9, organic: 10 },
    },
];

const DUMMY_ACTIVITIES = [
    { id: 1, text: "Ahmet Yılmaz yeni bir lead ekledi", time: "2 dakika önce", type: "phone" },
    { id: 2, text: "Ayşe Kaya bir e-posta gönderdi", time: "15 dakika önce", type: "mail" },
    { id: 3, text: "Mehmet Demir bir leadi kapattı", time: "1 saat önce", type: "success" },
    { id: 4, text: "Zeynep Çelik yorum ekledi", time: "2 saat önce", type: "comment" },
];

/* -------------------------
   Utility: CSV Export
   ------------------------- */
function exportCSV(filename: string, rows: Record<string, any>[]) {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    a.click();
    URL.revokeObjectURL(url);
}

/* -------------------------
   Small helper components
   ------------------------- */
function Icon({ name }: { name: string }) {
    /* Basit inline SVG ikonlar, herhangi external icon pack gerekmez */
    if (name === "users")
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline-block mr-2">
                <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11z" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 20c0-2.5 4-4.5 6-4.5s6 2 8 2 6-2 6 2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    if (name === "phone")
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline-block mr-2">
                <path d="M22 16.92V20a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2 4.18 2 2 0 0 1 4 2h3.09a2 2 0 0 1 2 1.72c.12 1.05.42 2.07.89 3.02a2 2 0 0 1-.45 2.11L8.91 11.09a16 16 0 0 0 6 6l1.24-1.24a2 2 0 0 1 2.11-.45c.95.47 1.97.77 3.02.89A2 2 0 0 1 22 16.92z" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    if (name === "chart")
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline-block mr-2">
                <path d="M3 3v18h18" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 17V9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 17V5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 17v-6" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    return null;
}

/* -------------------------
   Dashboard main component
   ------------------------- */
export default function DashboardPage() {
    const router = useRouter();

    // client-only redirect check
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    // state: data + UI
    const [stats] = useState(DUMMY_STATS);
    const [team] = useState(DUMMY_TEAM);
    const [activities] = useState(DUMMY_ACTIVITIES);

    // filters & UI state
    const [groupFilter, setGroupFilter] = useState<string>("All");
    const [dateRange, setDateRange] = useState<string>("Last 7 Days");
    const [search, setSearch] = useState<string>("");
    const [sortBy, setSortBy] = useState<"conversion" | "assigned" | "name">("conversion");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // pagination
    const [page, setPage] = useState<number>(1);
    const PAGE_SIZE = 5;

    // groups list derived from team
    const groups = useMemo(() => {
        const g = Array.from(new Set(team.map((t) => t.group)));
        return ["All", ...g];
    }, [team]);

    // Derived filtered + sorted list
    const filteredTeam = useMemo(() => {
        let list = team.slice();

        if (groupFilter !== "All") {
            list = list.filter((t) => t.group === groupFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
        }

        // sorting
        list.sort((a, b) => {
            let v = 0;
            if (sortBy === "conversion") v = a.conversionRate - b.conversionRate;
            if (sortBy === "assigned") v = a.assignedLeads - b.assignedLeads;
            if (sortBy === "name") v = a.name.localeCompare(b.name);
            return sortDir === "asc" ? v : -v;
        });

        return list;
    }, [team, groupFilter, search, sortBy, sortDir]);

    // pagination slice
    const totalPages = Math.max(1, Math.ceil(filteredTeam.length / PAGE_SIZE));
    const visibleTeam = filteredTeam.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

    // chart data: map team -> {name, conversionRate}
    const chartData = useMemo(() => filteredTeam.map((t) => ({ name: t.name, conversionRate: t.conversionRate })), [filteredTeam]);

    /* Helper: toggle sort */
    const toggleSort = (key: "conversion" | "assigned" | "name") => {
        if (sortBy === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortBy(key);
            setSortDir("desc");
        }
        setPage(1);
    };

    return (
        <Layout>
            <div className="p-6 min-h-screen bg-gradient-to-b from-white to-blue-50">
                {/* Header area */}
                <header className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">CRM Pro Dashboard</h1>
                        <p className="text-sm text-gray-600">Genel bakış ve ekip performansı</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-gray-700 mr-2">
                            <div>Hoş geldiniz, <strong>Admin</strong></div>
                        </div>
                        <Button type="button" className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => {
                            localStorage.removeItem("authToken"); router.push("/login");
                        }}>
                            ⤺ Çıkış Yap
                        </Button>
                    </div>
                </header>

                {/* Top filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-5 items-center justify-between">
                    <div className="flex gap-3 items-center">
                        <select value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded border">
                            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>

                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 rounded border">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                            <option>Custom</option>
                        </select>

                        <input placeholder="Search name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-3 py-2 rounded border" />
                    </div>

                    <div className="flex gap-2 items-center">
                        <Button type="button" className="bg-gray-100 px-3 py-2 rounded" onClick={() => exportCSV("team.csv", filteredTeam.map(t => ({
                            name: t.name, email: t.email, group: t.group, assignedLeads: t.assignedLeads,
                            contacted: t.contacted, convertedLeads: t.convertedLeads, conversionRate: t.conversionRate
                        })))}>
                            Export CSV
                        </Button>

                        <Button type="button" className="bg-gray-100 px-3 py-2 rounded" onClick={() => {
                            // reset
                            setGroupFilter("All"); setDateRange("Last 7 Days"); setSearch(""); setSortBy("conversion"); setSortDir("desc");
                        }}>
                            Reset Filters
                        </Button>
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex items-center text-sm text-gray-700"><Icon name="users" />Toplam Lead</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.totalLeads}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Tüm leadler</div>
                    </Card>

                    <Card>
                        <CardHeader className="flex items-center text-sm text-gray-700"><Icon name="phone" />İletişime Geçilen</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.contactedLeads}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">{Math.round((stats.contactedLeads / stats.totalLeads) * 100)}% iletişime geçildi</div>
                    </Card>

                    <Card>
                        <CardHeader className="flex items-center text-sm text-gray-700"><Icon name="chart" />Dönüşüm Oranı</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.conversionRate}%</CardContent>
                        <div className="text-xs text-gray-500 mt-2">Son dönem başarı oranı</div>
                    </Card>

                    <Card>
                        <CardHeader className="flex items-center text-sm text-gray-700">⏱ Ort. Yanıt Süresi</CardHeader>
                        <CardContent className="text-2xl font-bold">{stats.responseTime}</CardContent>
                        <div className="text-xs text-gray-500 mt-2">İletişime geçilenler için ortalama</div>
                    </Card>
                </div>

                {/* Chart + Right side small summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>Ekip Performansı</CardHeader>
                            <CardContent>
                                {/* Chart is dynamic (client-only) */}
                                <DynamicBarChart data={chartData} />
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card>
                            <CardHeader>Kısa Özet</CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-700 mb-2">Toplam Üye: <strong>{team.length}</strong></div>
                                <div className="text-sm text-gray-700 mb-2">Toplam Aktiviteler: <strong>{team.reduce((s, t) => s + t.totalActivities, 0)}</strong></div>
                                <div className="text-sm text-gray-700 mb-2">En iyi dönüşüm: <strong>{team.reduce((best, t) => t.conversionRate > best.conversionRate ? t : best, team[0]).name}</strong></div>
                                <div className="text-sm text-gray-700 mt-3">Son aktiviteler:</div>
                                <ul className="mt-2 space-y-2">
                                    {activities.slice(0, 4).map((a) => (
                                        <li key={a.id} className="text-sm text-gray-600">• {a.text} <span className="text-xs text-gray-400">({a.time})</span></li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Team table */}
                <Card>
                    <CardHeader>Detaylı Ekip Tablosu</CardHeader>
                    <CardContent>
                        <table className="w-full text-left">
                            <thead>
                            <tr className="text-xs text-gray-500 border-b">
                                <th className="py-2">#</th>
                                <th className="py-2">Ekip Üyesi</th>
                                <th className="py-2 cursor-pointer" onClick={() => toggleSort("assigned")}>Atanan Leadler {sortBy === "assigned" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                                <th className="py-2">İletişime Geçilen</th>
                                <th className="py-2 cursor-pointer" onClick={() => toggleSort("conversion")}>Dönüşüm Oranı {sortBy === "conversion" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                                <th className="py-2">Yanıt Süresi</th>
                                <th className="py-2">Aktiviteler</th>
                            </tr>
                            </thead>
                            <tbody>
                            {visibleTeam.map((m, idx) => (
                                <tr key={m.id} className="border-b">
                                    <td className="py-3">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                                    <td className="py-3">
                                        <div className="font-medium">{m.name}</div>
                                        <div className="text-xs text-gray-500">{m.email}</div>
                                        <div className="text-xs text-gray-400 mt-1">Group: {m.group}</div>
                                    </td>
                                    <td className="py-3">{m.assignedLeads}</td>
                                    <td className="py-3">{m.contacted} <div className="text-xs text-gray-400">{Math.round((m.contacted / Math.max(1, m.assignedLeads)) * 100)}% of assigned</div></td>
                                    <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${m.conversionRate >= 40 ? "bg-green-100 text-green-700" : m.conversionRate >= 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {m.conversionRate}%
                        </span>
                                    </td>
                                    <td className="py-3">{m.responseTime}</td>
                                    <td className="py-3">{m.totalActivities}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredTeam.length)} of {filteredTeam.length}</div>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                                <div className="px-3 py-1">{page} / {totalPages}</div>
                                <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}