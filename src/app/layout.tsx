import PublicHeader from "@/components/PublicHeader";

import "./globals.css";
import { Providers } from "./providers";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Patient Trace",
  description: "Hasta ilişkilerini tek noktadan yönetin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <PublicHeader />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
