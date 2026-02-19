"use client";
import React from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface LayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export default function Layout({ children, title, subtitle, actions }: LayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar hem desktop (fixed) hem mobil navbar/drawer'ı içeriyor */}
            <Sidebar />

            {/* Sağ taraf: Desktop'ta sidebar genişliği kadar soldan boşluk bırak */}
            <div className="md:ml-64 flex min-h-screen flex-col">
                {/* Header: mobilde gizli, desktop'ta görünür */}
                <Header title={title} subtitle={subtitle} actions={actions} />

                <main className="flex-1 px-3 sm:px-4 md:px-6 py-4 sm:py-6 overflow-y-auto">
                    <div className="w-full mx-auto max-w-screen-2xl">
                        <div className="grid grid-cols-12 gap-4 sm:gap-6">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
