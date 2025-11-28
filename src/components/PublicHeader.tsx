"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/hooks/useAuth";

import { LanguageSwitcher } from "./LanguageSwitcher";

export default function PublicHeader() {
    const { user } = useAuth();
    const pathname = usePathname();
    const { t } = useI18n();

    const isLoginRoute = pathname === "/login" || pathname === "/";

    if (user || !isLoginRoute) {
        return null;
    }

    return (
        <header className="border-b border-border bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/80">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {t("common.brand")}
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-200">
                    <Link href="/planlar" className="transition hover:text-primary">
                        {t("common.nav.plans")}
                    </Link>
                    <Link href="/login" className="transition hover:text-primary">
                        {t("common.nav.login")}
                    </Link>
                    <Link href="/hesap" className="transition hover:text-primary">
                        {t("common.nav.account")}
                    </Link>
                    <LanguageSwitcher />
                </nav>
            </div>
        </header>
    );
}
