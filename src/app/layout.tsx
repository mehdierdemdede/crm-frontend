'use client';

import './globals.css';
import { useEffect } from 'react';

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        // Client-side'da Font Awesome yükle
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, []);

    return (
        <html lang="tr">
        <body>{children}</body>
        </html>
    );
}