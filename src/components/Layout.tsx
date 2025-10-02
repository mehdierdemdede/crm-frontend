"use client";
import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar/>

                {/* Sağ taraf */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
                <Header title={title} subtitle={subtitle}/>

                <main className="flex-1 p-6">
                        {/* 🔹 max-w-* kaldırıldı */}
                        <div className="w-full px-6">
                            <div className="grid grid-cols-12 gap-6">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            );
            }
