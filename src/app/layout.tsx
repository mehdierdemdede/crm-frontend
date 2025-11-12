import Link from "next/link";

import "./globals.css";
import { Providers } from "./providers";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CRM Platformu",
  description: "Müşteri ilişkilerini tek noktadan yönetin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/80">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  CRM Platformu
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-200">
                  <Link href="/plans" className="transition hover:text-primary">
                    Planlar
                  </Link>
                  <Link href="/login" className="transition hover:text-primary">
                    Giriş/Kaydol
                  </Link>
                  <Link href="/account" className="transition hover:text-primary">
                    Hesap/Çıkış
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
