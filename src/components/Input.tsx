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
                          ...props
                      }: InputProps) {
    return (
        <label className="block">
            {label && (
                <span className="mb-1 block text-sm font-medium text-gray-800">
          {label}
        </span>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </span>
                )}
                <input
                    {...props}
                    className={cn(
                        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500",
                        icon && "pl-9",
                        error ? "border-red-500 focus:ring-red-500" : "",
                        className
                    )}
                />
            </div>
            {error ? (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-gray-500">{hint}</p>
            ) : null}
        </label>
    );
}
