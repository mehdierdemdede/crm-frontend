"use client";

import { useEffect } from "react";

import { useI18n } from "@/contexts/I18nContext";

export function LanguageAttributes() {
    const { locale, direction } = useI18n();

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = direction;
    }, [direction, locale]);

    return null;
}
