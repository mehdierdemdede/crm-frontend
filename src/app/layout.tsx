"use client";

import './globals.css';
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="tr">
        <body>
            <LanguageProvider>{children}</LanguageProvider>
        </body>
        </html>
    );
}
