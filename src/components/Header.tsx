"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

import { Button } from "./Button";

interface HeaderProps {
    className?: string;
    title?: string;
    subtitle?: string;
}

export default function Header({ className, title, subtitle }: HeaderProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const isPlansActive = pathname?.startsWith("/planlar");

    return (
        <header
            className={cn(
                "sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
                className
            )}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <Link
                        href="/"
                        className="text-lg font-semibold text-slate-900 transition hover:text-blue-600"
                    >
                        CRM Platformu
                    </Link>

                    <nav className="flex flex-1 justify-center md:justify-center">
                        <Link
                            href="/planlar"
                            className={cn(
                                "text-sm font-medium text-slate-600 transition hover:text-blue-600",
                                isPlansActive && "text-blue-600"
                            )}
                        >
                            Planlar
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3 text-sm font-medium">
                        {user ? (
                            <>
                                <Link
                                    href="/hesap"
                                    className="text-slate-600 transition hover:text-blue-600"
                                >
                                    Hesap
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={logout}
                                    className="border-slate-300 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                >
                                    Çıkış
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-slate-600 transition hover:text-blue-600"
                                >
                                    Giriş
                                </Link>
                                <Link
                                    href="/planlar"
                                    className="inline-flex items-center rounded-md border border-blue-600 px-3 py-1.5 text-blue-600 transition hover:bg-blue-50"
                                >
                                    Kaydol
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {title ? (
                    <div className="flex flex-col gap-1 text-left">
                        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
                        {subtitle ? (
                            <p className="text-sm text-slate-600 md:text-base">{subtitle}</p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
