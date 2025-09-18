"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function Sidebar() {
    const pathname = usePathname() || "/dashboard";

    const item = (href: string, label: string) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
            <li key={href}>
                <Link
                    href={href}
                    className={`block px-3 py-2 rounded-md text-sm ${
                        active ? "bg-blue-100 font-semibold text-blue-800" : "hover:bg-gray-100"
                    }`}
                >
                    {label}
                </Link>
            </li>
        );
    };

    return (
        <aside className="h-screen border-r bg-white w-64 p-4 hidden md:block">
            <div className="mb-6 text-xl font-bold">CRM Pro</div>
            <ul className="space-y-1">
                {item("/dashboard", "Dashboard")}
                {item("/leads", "Leads")}
                {item("/members", "Members")}
                {item("/reports", "Reports")}
                {item("/settings", "Settings")}
            </ul>
        </aside>
    );
}
