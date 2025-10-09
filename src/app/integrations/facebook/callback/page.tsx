"use client";

import { useEffect } from "react";
import { FACEBOOK_OAUTH_MESSAGE_TYPE } from "@/lib/facebookOAuth";

const FacebookCallbackPage = () => {
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const message = { type: FACEBOOK_OAUTH_MESSAGE_TYPE } as const;

        try {
            window.opener?.postMessage(message, window.location.origin);
        } catch {
            window.opener?.postMessage(message, "*");
        }

        const timer = window.setTimeout(() => {
            window.close();
        }, 300);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900">Facebook bağlantısı tamamlanıyor…</h1>
            <p className="text-sm text-gray-600">
                Bu pencere otomatik olarak kapanacaktır. Eğer kapanmazsa manuel olarak kapatabilirsiniz.
            </p>
        </div>
    );
};

export default FacebookCallbackPage;
