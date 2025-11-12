import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    icon?: React.ReactNode; // örn: <Mail className="h-4 w-4" />
}

export function Input({
                          label,
                          hint,
                          error,
                          icon,
                          className,
                          id,
                          ...props
                      }: InputProps) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const descriptionId = error ? errorId : hint ? hintId : undefined;

    return (
        <div className="block">
            {label && (
                <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-800">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        {icon}
                    </span>
                )}
                <input
                    {...props}
                    id={inputId}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={descriptionId}
                    className={cn(
                        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500",
                        icon ? "pl-9" : undefined,
                        error ? "border-red-500 focus:ring-red-500" : undefined,
                        className
                    )}
                />
            </div>
            {error ? (
                <p id={errorId} className="mt-1 text-xs text-red-600" aria-live="polite" role="status">
                    {error}
                </p>
            ) : hint ? (
                <p id={hintId} className="mt-1 text-xs text-gray-500">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
