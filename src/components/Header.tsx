"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { LogOut } from "lucide-react";

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        router.push("/login");
    };

    return (
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white border-b sticky top-0 z-10">
            {/* Sol: Başlık */}
            <div>
                <h1 className="text-2xl font-bold mb-1">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>

            {/* Sağ: Kullanıcı info + çıkış */}
            <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="text-right text-sm text-gray-700">
                    <div>
                        Hoş geldiniz, <strong>Admin</strong>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                </Button>
            </div>
        </header>
    );
}
