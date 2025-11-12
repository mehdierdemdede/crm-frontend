"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { icon: ReactNode; container: string; title: string }> = {
    success: {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        container: "border-emerald-200 bg-emerald-50/95",
        title: "text-emerald-900",
    },
    error: {
        icon: <TriangleAlert className="h-5 w-5 text-red-500" />,
        container: "border-red-200 bg-red-50/95",
        title: "text-red-900",
    },
    info: {
        icon: <Info className="h-5 w-5 text-blue-500" />,
        container: "border-blue-200 bg-blue-50/95",
        title: "text-blue-900",
    },
};

function Toast({ toast, onDismiss }: ToastProps) {
    const variant = toast.variant ?? "info";
    const { icon, container, title } = variantStyles[variant];

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration ?? 4000);

        return () => window.clearTimeout(timeout);
    }, [toast, onDismiss]);

    return (
        <div
            className={`relative flex w-80 items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${container}`}
            role="status"
        >
            <div className="mt-0.5 flex-shrink-0">{icon}</div>
            <div className="flex-1 text-sm">
                {toast.title && <p className={`font-semibold ${title}`}>{toast.title}</p>}
                {toast.description && (
                    <p className="mt-0.5 text-sm text-gray-700">{toast.description}</p>
                )}
            </div>
            <button
                type="button"
                className="rounded-md p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => onDismiss(toast.id)}
                aria-label="Bildirimi kapat"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:justify-end">
            <div className="flex w-full max-w-sm flex-col gap-3 sm:mr-4">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast toast={toast} onDismiss={onDismiss} />
                    </div>
                ))}
            </div>
        </div>
    );
}
