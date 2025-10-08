import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    isLoading?: boolean;
}

export function Button({
                           variant = "primary",
                           size = "md",
                           isLoading,
                           className,
                           children,
                           ...rest
                       }: ButtonProps) {
    const base =
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
    const variants: Record<Variant, string> = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600",
        secondary:
            "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900",
        outline:
            "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:ring-gray-300",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-200",
    };
    const sizes: Record<Size, string> = {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
    };

    return (
        <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
            {isLoading && (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
