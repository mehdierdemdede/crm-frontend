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
    const [imageFailed, setImageFailed] = React.useState(false);
    const flagImageUrl = option?.flagImageUrl ?? null;

    React.useEffect(() => {
        setImageFailed(false);
    }, [flagImageUrl]);

    const height = size > 0 ? size : DEFAULT_SIZE;
    const width = computeWidth(height);
    const alt = title ?? (option?.label ? `${option.label} bayrağı` : "Dil bayrağı");

    const shouldRenderImage = Boolean(flagImageUrl && !imageFailed);

    if (shouldRenderImage && flagImageUrl) {
        return (
            <Image
                src={flagImageUrl}
                alt={alt}
                width={width}
                height={height}
                sizes={`${width}px`}
                loading="lazy"
                className={`inline-block rounded-sm border border-gray-200 bg-white object-cover ${className}`.trim()}
                title={title ?? option.label}
                onError={() => {
                    setImageFailed(true);
                }}
            />
        );
    }

    const text = option?.flag ?? option?.label ?? option?.value ?? "";

    const fallbackClassName = [
        "inline-flex",
        "items-center",
        "justify-center",
        "rounded-sm",
        "border",
        "border-gray-200",
        "bg-gray-100",
        "px-1",
        "text-xs",
        "font-medium",
        "leading-none",
        "text-gray-600",
    ]
        .join(" ")
        .trim();

    return (
        <span
            className={`${fallbackClassName} ${className}`.trim()}
            aria-label={alt}
            role="img"
            title={title ?? option?.label}
            style={{ width, height, lineHeight: `${height}px` }}
        >
            {text || option?.label || ""}
        </span>
    );
}
