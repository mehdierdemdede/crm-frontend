"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {Home, Users, BarChart2, FileText, Settings, Menu, X, Plug} from "lucide-react"; // Shuffle kaldırıldı

export default function Sidebar() {
    const pathname = usePathname() || "/dashboard";
    const [open, setOpen] = useState(false);

    const item = (
        href: string,
        label: string,
        Icon: React.ComponentType<{ className?: string }>
    ) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
            <li key={href}>
                <Link
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                        active
                            ? "bg-blue-100 font-semibold text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setOpen(false)} // mobilde tıklayınca kapanması için
                >
                    <Icon className="h-4 w-4" />
                    {label}
                </Link>
            </li>
        );
    };

    return (
        <>
            {/* Masaüstü Sidebar */}
            <aside className="h-screen border-r bg-white w-64 p-4 hidden md:block">
                <div className="mb-6 text-xl font-bold">CRM Pro</div>
                <ul className="space-y-1">
                    {item("/dashboard", "Dashboard", Home)}
                    {item("/leads", "Leads", FileText)}
                    {item("/members", "Members", Users)}
                    {item("/integrations", "Integrations", Plug)} {/* yeni */}
                    {item("/reports", "Reports", BarChart2)}
                </ul>
            </aside>

            {/* Mobil Navbar */}
            <div className="md:hidden flex items-center justify-between bg-white border-b p-4 sticky top-0 z-20">
                <div className="font-bold text-lg">CRM Pro</div>
                <button onClick={() => setOpen(true)}>
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Mobil Drawer */}
            {open && (
                <div className="fixed inset-0 z-30">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xl font-bold">CRM Pro</span>
                            <button onClick={() => setOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <ul className="space-y-1">
                            {item("/dashboard", "Dashboard", Home)}
                            {item("/leads", "Leads", FileText)}
                            {item("/members", "Members", Users)}
                            {item("/integrations", "Integrations", Plug)} {/* yeni */}
                            {item("/reports", "Reports", BarChart2)}
                        </ul>
                    </div>
                </div>
            )}
        </>
    );
}
