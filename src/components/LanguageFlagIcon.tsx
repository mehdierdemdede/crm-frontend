import React from "react";
import Image from "next/image";
import { type LanguageOption } from "@/lib/languages";

interface LanguageFlagIconProps {
    option?: LanguageOption | null;
    size?: number;
    className?: string;
    title?: string;
}

const DEFAULT_SIZE = 18;
const computeWidth = (height: number): number => Math.round((height * 4) / 3);

export function LanguageFlagIcon({
    option,
    size = DEFAULT_SIZE,
    className = "",
    title,
}: LanguageFlagIconProps) {
    const height = size > 0 ? size : DEFAULT_SIZE;
    const width = computeWidth(height);
    const alt = title ?? (option?.label ? `${option.label} bayrağı` : "Dil bayrağı");

    if (option?.flagImageUrl) {
        return (
            <Image
                src={option.flagImageUrl}
                alt={alt}
                width={width}
                height={height}
                sizes={`${width}px`}
                loading="lazy"
                className={`inline-block rounded-sm border border-gray-200 bg-white object-cover ${className}`.trim()}
                title={title ?? option.label}
            />
        );
    }

    const text = option?.flag ?? "🏳️";

    return (
        <span
            className={`inline-block leading-none ${className}`.trim()}
            aria-label={alt}
            role="img"
            title={title ?? option?.label}
        >
            {text}
        </span>
    );
}
