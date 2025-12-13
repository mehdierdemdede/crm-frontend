"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/Button";

export default function SignupPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-gray-100/50">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 rounded-full bg-blue-50 p-4 text-blue-600 ring-8 ring-blue-50/50">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <h1 className="mb-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        Kayıt Ol
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Bu sisteme şu anda yalnızca davetiye ile kayıt olunabilmektedir.
                        <br />
                        Kayıt olmak için lütfen sistem yöneticinizle iletişime geçiniz.
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <Link href="/login" className="w-full block">
                        <Button variant="outline" className="w-full h-11 text-base font-medium group">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Giriş Ekranına Dön
                        </Button>
                    </Link>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} CRM Pro. Tüm hakları saklıdır.
                    </p>
                </div>
            </div>
        </div>
    );
}
