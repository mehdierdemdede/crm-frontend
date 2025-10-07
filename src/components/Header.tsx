"use client";
import React from "react";

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="hidden md:flex items-center justify-between bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
            <div>
                <h1 className="text-2xl font-bold mb-1">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
        </header>
    );
}
