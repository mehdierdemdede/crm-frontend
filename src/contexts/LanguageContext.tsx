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
    createLanguage,
    deleteLanguage,
    getLanguages,
    updateLanguage,
    type LanguageResponse,
    type UpsertLanguageRequest,
} from "@/lib/api";
import {
    DEFAULT_LANGUAGE_OPTIONS,
    registerLanguageOptions,
    enhanceLanguageOption,
    type LanguageOption,
} from "@/lib/languages";

const mapLanguage = (language: LanguageResponse): LanguageOption =>
    enhanceLanguageOption({
        id: language.id,
        value: language.code,
        label: language.name,
        flag: language.flagEmoji ?? undefined,
        active: language.active,
    });

const normaliseOptions = (options: LanguageOption[]): LanguageOption[] => {
    if (options.length === 0) {
        registerLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);
        return [...DEFAULT_LANGUAGE_OPTIONS];
    }

    const unique = new Map<string, LanguageOption>();
    options.map(enhanceLanguageOption).forEach((option) => {
        unique.set(option.value, option);
    });

    const deduped = Array.from(unique.values());
    deduped.sort((a, b) => a.label.localeCompare(b.label, "tr"));
    registerLanguageOptions(deduped);
    return deduped;
};

interface LanguageContextValue {
    languages: LanguageOption[];
    loading: boolean;
    error: string | null;
    clearError: () => void;
    refresh: () => Promise<void>;
    addLanguage: (
        payload: UpsertLanguageRequest
    ) => Promise<LanguageOption | null>;
    updateLanguage: (
        id: string,
        payload: UpsertLanguageRequest
    ) => Promise<LanguageOption | null>;
    removeLanguage: (id: string) => Promise<boolean>;
    getOptionByCode: (code: string) => LanguageOption | undefined;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
    undefined
);

export function LanguageProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [languages, setLanguages] = useState<LanguageOption[]>(
        normaliseOptions(DEFAULT_LANGUAGE_OPTIONS)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const shouldUseLocalFallback = (maybeError: unknown): boolean => {
        const message =
            maybeError instanceof Error
                ? maybeError.message.toLowerCase()
                : "";

        return (
            message.includes("no static resource") ||
            message.includes("not found") ||
            message.includes("failed to fetch")
        );
    };

    const resolveErrorMessage = (maybeError: unknown, fallback: string): string =>
        maybeError instanceof Error && maybeError.message
            ? maybeError.message
            : fallback;

    const refresh = useCallback(async () => {
        setLoading(true);
        clearError();
        try {
            const response = await getLanguages();
            if (response.length === 0) {
                setLanguages(normaliseOptions(DEFAULT_LANGUAGE_OPTIONS));
                return;
            }
            const mapped = response.map(mapLanguage);
            setLanguages(normaliseOptions(mapped));
            setError(null);
        } catch (error) {
            console.error("Languages could not be refreshed", error);
            const message = resolveErrorMessage(
                error,
                "Diller yüklenirken bir hata oluştu.",
            );

            if (shouldUseLocalFallback(error)) {
                setLanguages(normaliseOptions(DEFAULT_LANGUAGE_OPTIONS));
                setError(
                    "Dil servisine ulaşılamadı. Varsayılan diller gösteriliyor.",
                );
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    }, [clearError]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const addLanguage = useCallback(
        async (payload: UpsertLanguageRequest) => {
            try {
                clearError();
                const created = await createLanguage(payload);
                const option = mapLanguage(created);
                setLanguages((prev) =>
                    normaliseOptions([
                        ...prev.filter((o) => o.value !== option.value),
                        option,
                    ])
                );
                return option;
            } catch (error) {
                console.error("addLanguage error", error);

                const fallback = shouldUseLocalFallback(error);
                const message = resolveErrorMessage(
                    error,
                    "Dil oluşturulurken bir hata oluştu.",
                );

                if (!fallback) {
                    setError(message);
                    throw error;
                }

                const option = enhanceLanguageOption({
                    value: payload.code,
                    label: payload.name,
                    flag: payload.flagEmoji ?? undefined,
                    active: payload.active,
                });

                setLanguages((prev) =>
                    normaliseOptions([
                        ...prev.filter((existing) => existing.value !== option.value),
                        option,
                    ])
                );

                setError(
                    "Dil servisine ulaşılamadı. Dil yerel olarak kaydedildi.",
                );

                return option;
            }
        },
        [clearError]
    );

    const updateLanguageEntry = useCallback(
        async (id: string, payload: UpsertLanguageRequest) => {
            try {
                clearError();
                const updated = await updateLanguage(id, payload);
                const option = mapLanguage(updated);
                setLanguages((prev) =>
                    normaliseOptions(
                        prev.map((existing) =>
                            existing.id === id || existing.value === option.value
                                ? option
                                : existing
                        )
                    )
                );
                return option;
            } catch (error) {
                console.error("updateLanguage error", error);
                setError(
                    resolveErrorMessage(
                        error,
                        "Dil güncellenirken bir hata oluştu.",
                    ),
                );
                throw error;
            }
        },
        [clearError]
    );

    const removeLanguage = useCallback(async (id: string) => {
        try {
            clearError();
            await deleteLanguage(id);
            setLanguages((prev) =>
                normaliseOptions(prev.filter((language) => language.id !== id))
            );
            return true;
        } catch (error) {
            console.error("removeLanguage error", error);
            setError(
                resolveErrorMessage(error, "Dil silinirken bir hata oluştu."),
            );
            throw error;
        }
    }, [clearError]);

    const getOptionByCode = useCallback(
        (code: string) => languages.find((language) => language.value === code),
        [languages]
    );

    const value = useMemo(
        () => ({
            languages,
            loading,
            error,
            clearError,
            refresh,
            addLanguage,
            updateLanguage: updateLanguageEntry,
            removeLanguage,
            getOptionByCode,
        }),
        [
            languages,
            loading,
            error,
            refresh,
            addLanguage,
            updateLanguageEntry,
            removeLanguage,
            getOptionByCode,
            clearError,
        ]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguages = (): LanguageContextValue => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguages must be used within a LanguageProvider");
    }
    return context;
};
