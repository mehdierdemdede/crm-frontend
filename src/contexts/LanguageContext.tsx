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
    type LanguageOption,
} from "@/lib/languages";

const mapLanguage = (language: LanguageResponse): LanguageOption => ({
    id: language.id,
    value: language.code,
    label: language.name,
    flag: language.flagEmoji ?? "🏳️",
    active: language.active ?? true,
});

const normaliseOptions = (options: LanguageOption[]): LanguageOption[] => {
    if (options.length === 0) {
        registerLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);
        return [...DEFAULT_LANGUAGE_OPTIONS];
    }

    const unique = new Map<string, LanguageOption>();
    options.forEach((option) => {
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

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getLanguages();
            if (response.length === 0) {
                setLanguages(normaliseOptions(DEFAULT_LANGUAGE_OPTIONS));
                return;
            }
            const mapped = response.map(mapLanguage);
            setLanguages(normaliseOptions(mapped));
        } catch (error) {
            console.error("Languages could not be refreshed", error);
            setLanguages(normaliseOptions(DEFAULT_LANGUAGE_OPTIONS));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const addLanguage = useCallback(
        async (payload: UpsertLanguageRequest) => {
            try {
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
                throw error;
            }
        },
        []
    );

    const updateLanguageEntry = useCallback(
        async (id: string, payload: UpsertLanguageRequest) => {
            try {
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
                throw error;
            }
        },
        []
    );

    const removeLanguage = useCallback(async (id: string) => {
        try {
            await deleteLanguage(id);
            setLanguages((prev) =>
                normaliseOptions(prev.filter((language) => language.id !== id))
            );
            return true;
        } catch (error) {
            console.error("removeLanguage error", error);
            throw error;
        }
    }, []);

    const getOptionByCode = useCallback(
        (code: string) => languages.find((language) => language.value === code),
        [languages]
    );

    const value = useMemo(
        () => ({
            languages,
            loading,
            refresh,
            addLanguage,
            updateLanguage: updateLanguageEntry,
            removeLanguage,
            getOptionByCode,
        }),
        [
            languages,
            loading,
            refresh,
            addLanguage,
            updateLanguageEntry,
            removeLanguage,
            getOptionByCode,
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
