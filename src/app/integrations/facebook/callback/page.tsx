"use client";

import { useEffect } from "react";

import { FACEBOOK_OAUTH_MESSAGE_TYPE } from "@/lib/facebookOAuth";

const FacebookCallbackPage = () => {
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const status = searchParams?.get("status");
    const message = searchParams?.get("message");

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (status === "error") {
            // Hata durumunda pencereyi kapatma, hatayı göster
            return;
        }

        const successMessage = { type: FACEBOOK_OAUTH_MESSAGE_TYPE } as const;

        try {
            window.opener?.postMessage(successMessage, window.location.origin);
        } catch {
            window.opener?.postMessage(successMessage, "*");
        }

        const timer = window.setTimeout(() => {
            window.close();
        }, 1500); // Kullanıcı başarı mesajını görebilsin diye biraz bekle

        return () => {
            window.clearTimeout(timer);
        };
    }, [status]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
            {status === "error" ? (
                <>
                    <div className="rounded-full bg-red-100 p-3">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">Bağlantı Başarısız</h1>
                    <p className="text-sm text-gray-600">
                        {message ? decodeURIComponent(message) : "Facebook bağlantısı sırasında bir hata oluştu."}
                    </p>
                    <button
                        onClick={() => window.close()}
                        className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                    >
                        Pencereyi Kapat
                    </button>
                </>
            ) : (
                <>
                    <h1 className="text-xl font-semibold text-gray-900">Facebook bağlantısı tamamlandı!</h1>
                    <p className="text-sm text-gray-600">
                        Bu pencere birazdan otomatik olarak kapanacaktır.
                    </p>
                    <button
                        onClick={() => window.close()}
                        className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                    >
                        Şimdi Kapat
                    </button>
                </>
            )}
        </div>
    );
};

export default FacebookCallbackPage;
