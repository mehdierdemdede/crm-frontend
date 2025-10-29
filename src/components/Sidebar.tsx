"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
    Home,
    Users,
    BarChart2,
    FileText,
    Plug,
    Activity,
    Globe,
    Menu,
    X,
    LogOut,
} from "lucide-react";
import { Button } from "./Button";
import {useAuth} from "@/hooks/useAuth";

export default function Sidebar() {
    const pathname = usePathname() || "/dashboard";
    const [open, setOpen] = useState(false);
    const { user, isLoading, logout } = useAuth();

    const NavItem = (
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
                        active ? "bg-blue-100 font-semibold text-blue-800"
                            : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setOpen(false)}
                >
                    <Icon className="h-4 w-4" />
                    {label}
                </Link>
            </li>
        );
    };

    const initials =
        user?.firstName && user?.lastName
            ? `${user.firstName[0]}${user.lastName[0]}`
            : "U";

    const UserBlock = (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-md bg-gray-50 border">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                {initials}
            </div>
            <div className="leading-tight">
                {isLoading ? (
                    <div className="text-gray-400 text-sm">Yükleniyor...</div>
                ) : (
                    <>
                        <div className="font-medium text-gray-900">
                            {user
                                ? `${user.firstName ?? ""} ${user.lastName ?? ""}`
                                : "Kullanıcı"}
                        </div>
                        <div className="text-xs text-gray-500">{user?.email ?? "-"}</div>
                    </>
                )}
            </div>
        </div>
    );

    const LogoutBtn = (
        <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
            onClick={logout}
        >
            <LogOut className="h-4 w-4" /> Çıkış Yap
        </Button>
    );

    return (
        <>
            {/* DESKTOP SIDEBAR (fixed) */}
            <aside className="hidden md:flex flex-col justify-between h-screen w-64 p-4 border-r bg-white fixed left-0 top-0 z-20">
                <div className="overflow-y-auto">
                    <div className="mb-4 text-xl font-bold">CRM Pro</div>
                    {UserBlock}
                    <ul className="space-y-1">
                        {NavItem("/dashboard", "Dashboard", Home)}
                        {NavItem("/leads", "Leads", FileText)}
                        {NavItem("/members", "Members", Users)}
                        {NavItem("/integrations", "Integrations", Plug)}
                        {NavItem("/settings/languages", "Dil Yönetimi", Globe)}
                        {NavItem("/reports", "Reports", BarChart2)}
                        {NavItem("/auto-assign", "Auto Assign", Activity)}
                    </ul>
                </div>
                <div className="pt-4 border-t">{LogoutBtn}</div>
            </aside>

            {/* MOBILE TOP BAR */}
            <div className="md:hidden flex items-center justify-between bg-white border-b px-4 py-3 sticky top-0 z-30 shadow-sm">
                <div className="font-bold text-lg">CRM Pro</div>
                <button aria-label="Open menu" onClick={() => setOpen(true)}>
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* MOBILE DRAWER */}
            {open && (
                <div className="fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4 flex flex-col justify-between">
                        <div className="overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xl font-bold">CRM Pro</span>
                                <button aria-label="Close menu" onClick={() => setOpen(false)}>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            {UserBlock}
                            <ul className="space-y-1">
                                {NavItem("/dashboard", "Dashboard", Home)}
                                {NavItem("/leads", "Leads", FileText)}
                                {NavItem("/members", "Members", Users)}
                                {NavItem("/integrations", "Integrations", Plug)}
                                {NavItem("/settings/languages", "Dil Yönetimi", Globe)}
                                {NavItem("/reports", "Reports", BarChart2)}
                                {NavItem("/auto-assign", "Auto Assign", Activity)}
                            </ul>
                        </div>
                        <div className="pt-4 border-t">{LogoutBtn}</div>
                    </div>
                </div>
            )}
        </>
    );
}
