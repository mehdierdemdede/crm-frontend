"use client";
import React from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar only visible on md+ */}
            <Sidebar />
            {/* Main content */}
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}
