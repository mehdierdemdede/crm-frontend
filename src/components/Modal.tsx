"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";

export interface ModalAction {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
    isLoading?: boolean;
    disabled?: boolean;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: ReactNode;
    children?: ReactNode;
    actions?: ModalAction[];
    closeOnBackdrop?: boolean;
    showCloseButton?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    actions = [],
    closeOnBackdrop = true,
    showCloseButton = true,
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        document.body.classList.add("overflow-hidden");

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.classList.remove("overflow-hidden");
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50"
                aria-hidden
                onClick={closeOnBackdrop ? onClose : undefined}
            />

            <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        {title && (
                            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        )}
                        {description && (
                            <div className="mt-1 text-sm text-gray-500">{description}</div>
                        )}
                    </div>

                    {showCloseButton && (
                        <button
                            type="button"
                            className="ml-4 rounded-md p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={onClose}
                            aria-label="Kapat"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {children && <div className="px-6 py-5 text-sm text-gray-700">{children}</div>}

                {actions.length > 0 && (
                    <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                        {actions.map((action, index) => (
                            <Button
                                key={`${action.label}-${index}`}
                                variant={action.variant ?? "primary"}
                                onClick={action.onClick}
                                isLoading={action.isLoading}
                                disabled={action.disabled}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
