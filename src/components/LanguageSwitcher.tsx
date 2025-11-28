"use client";

import { useMemo } from "react";

import { useI18n } from "@/contexts/I18nContext";
import { useLanguages } from "@/contexts/LanguageContext";
import { getLanguageOption } from "@/lib/languages";

export function LanguageSwitcher() {
    const { locale, setLocale, availableLocales } = useI18n();
    const { languages } = useLanguages();

    const options = useMemo(() => {
        const registry = new Map(
            languages.map((language) => [language.value.toLowerCase(), language]),
        );

        return availableLocales.map((code) => {
            const option = registry.get(code);
            return option ?? getLanguageOption(code.toUpperCase());
        });
    }, [availableLocales, languages]);

    if (options.length <= 1) return null;

    return (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
            <span>{getLanguageOption(locale.toUpperCase())?.label ?? ""}</span>
            <select
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                value={locale}
                onChange={(event) => setLocale(event.target.value as typeof locale)}
            >
                {options.map((option) =>
                    option ? (
                        <option key={option.value} value={option.value.toLowerCase()}>
                            {option.flag ? `${option.flag} ` : ""}
                            {option.label}
                        </option>
                    ) : null,
                )}
            </select>
        </label>
    );
}
