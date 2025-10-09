export interface LanguageOption {
    value: string;
    label: string;
    flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: "TR", label: "Türkçe", flag: "🇹🇷" },
    { value: "EN", label: "İngilizce", flag: "🇬🇧" },
    { value: "DE", label: "Almanca", flag: "🇩🇪" },
    { value: "AR", label: "Arapça", flag: "🇸🇦" },
    { value: "AL", label: "Arnavutça", flag: "🇦🇱" },
];

const FLAG_BASE = 0x1f1e6;
const ALPHA_BASE = "A".charCodeAt(0);

export const normalizeLanguageCode = (code: string): string =>
    (code || "").trim().replace(/\s+/g, "").toUpperCase();

const codeToFlagEmoji = (code: string): string => {
    const normalized = normalizeLanguageCode(code);
    if (!/^[A-Z]{2}$/.test(normalized)) {
        return "🏳️";
    }

    const points = normalized.split("").map((char) =>
        FLAG_BASE + char.charCodeAt(0) - ALPHA_BASE
    );

    try {
        return String.fromCodePoint(...points);
    } catch {
        return "🏳️";
    }
};

export const getLanguageOption = (
    code: string
): LanguageOption | undefined => {
    const normalized = normalizeLanguageCode(code);
    return LANGUAGE_OPTIONS.find(
        (option) => normalizeLanguageCode(option.value) === normalized
    );
};

export const getLanguageDisplay = (code: string): LanguageOption => {
    const normalized = normalizeLanguageCode(code);
    const option = getLanguageOption(normalized);

    if (option) {
        return option;
    }

    return {
        value: normalized || code,
        label: normalized || code,
        flag: codeToFlagEmoji(normalized),
    };
};
