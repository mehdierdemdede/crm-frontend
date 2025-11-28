"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    translations,
    type LocaleCode,
    type TranslationDictionary,
    type TranslationPath,
} from "@/locales";

import { useLanguages } from "./LanguageContext";

const STORAGE_KEY = "crm.locale";
const DEFAULT_LOCALE: LocaleCode = "en";
const RTL_LANGS = new Set<LocaleCode>([]);

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
    locale: LocaleCode;
    direction: "ltr" | "rtl";
    availableLocales: LocaleCode[];
    t: (key: TranslationPath, values?: TranslationValues) => string;
    setLocale: (locale: LocaleCode) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const interpolate = (
    template: string,
    values: TranslationValues | undefined
): string => {
    if (!values) return template;
    return Object.keys(values).reduce(
        (acc, key) => acc.replaceAll(`{{${key}}}`, String(values[key])),
        template,
    );
};

const getTranslationValue = (
    locale: LocaleCode,
    key: TranslationPath
): string => {
    const dictionary: TranslationDictionary = translations[locale];
    const segments = key.split(".");

    let value: unknown = dictionary;
    for (const segment of segments) {
        if (typeof value !== "object" || value === null) break;
        value = (value as Record<string, unknown>)[segment];
    }

    if (typeof value === "string") {
        return value;
    }

    return key;
};

const normaliseLocale = (code: string | undefined): LocaleCode | null => {
    if (!code) return null;
    const normalised = code.toLowerCase() as LocaleCode;
    return normalised in translations ? normalised : null;
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const { languages } = useLanguages();
    const supportedLocales = useMemo(
        () => Object.keys(translations) as LocaleCode[],
        [],
    );

    const availableLocales = useMemo(() => {
        const activeLocales = languages
            .filter((language) => language.active !== false)
            .map((language) => normaliseLocale(language.value) ?? undefined)
            .filter((locale): locale is LocaleCode => Boolean(locale));

        const filteredActiveLocales = activeLocales.filter((locale) =>
            supportedLocales.includes(locale),
        );

        if (filteredActiveLocales.length >= 2) {
            return filteredActiveLocales;
        }

        const mergedLocales = new Set<LocaleCode>([
            ...filteredActiveLocales,
            ...supportedLocales,
        ]);

        return Array.from(mergedLocales);
    }, [languages, supportedLocales]);

    const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

    useEffect(() => {
        const stored = normaliseLocale(
            typeof window !== "undefined"
                ? window.localStorage.getItem(STORAGE_KEY) ?? undefined
                : undefined,
        );

        if (stored && availableLocales.includes(stored)) {
            setLocaleState(stored);
            return;
        }

        const navigatorLocale = normaliseLocale(
            typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : undefined,
        );

        if (navigatorLocale && availableLocales.includes(navigatorLocale)) {
            setLocaleState(navigatorLocale);
            return;
        }

        if (availableLocales.length > 0) {
            setLocaleState(availableLocales[0]);
        }
    }, [availableLocales]);

    useEffect(() => {
        if (availableLocales.length === 0) return;
        if (availableLocales.includes(locale)) return;
        setLocaleState(availableLocales[0]);
    }, [availableLocales, locale]);

    const setLocale = useCallback(
        (newLocale: LocaleCode) => {
            if (!availableLocales.includes(newLocale)) return;
            setLocaleState(newLocale);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEY, newLocale);
            }
        },
        [availableLocales],
    );

    const t = useCallback(
        (key: TranslationPath, values?: TranslationValues) => {
            const message = getTranslationValue(locale, key);
            return interpolate(message, values);
        },
        [locale],
    );

    const direction = RTL_LANGS.has(locale) ? "rtl" : "ltr";

    const value = useMemo(
        () => ({ locale, setLocale, t, direction, availableLocales }),
        [locale, setLocale, t, direction, availableLocales],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18nContextValue => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
};
