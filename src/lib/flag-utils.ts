export const LANGUAGE_TO_COUNTRY_MAP: Record<string, string> = {
    TR: "TR",
    EN: "GB",
    DE: "DE",
    AR: "SA",
    AL: "AL",
    FR: "FR",
    ES: "ES",
    IT: "IT",
    RU: "RU",
    FA: "IR",
    KU: "TR",
    AZ: "AZ",
    NL: "NL",
    PT: "PT",
    PL: "PL",
    RO: "RO",
    BG: "BG",
    EL: "GR",
    HU: "HU",
    HR: "HR",
    CS: "CZ",
    SK: "SK",
    SV: "SE",
    NO: "NO",
    DA: "DK",
    FI: "FI",
    ZH: "CN",
    JA: "JP",
    KO: "KR",
    HI: "IN",
    UR: "PK",
    KK: "KZ",
    KY: "KG",
    BS: "BA",
    SR: "RS",
    MK: "MK",
    ARZ: "EG",
};

const isEmoji = (value: string): boolean => /\p{Extended_Pictographic}/u.test(value);

const toCountryCode = (languageCode: string): string | null => {
    if (!languageCode) return null;
    const trimmed = languageCode.trim().toUpperCase();
    if (trimmed.length === 0) return null;
    return LANGUAGE_TO_COUNTRY_MAP[trimmed] ?? (trimmed.length === 2 ? trimmed : null);
};

const countryCodeToFlagEmoji = (countryCode: string | null): string | null => {
    if (!countryCode) return null;
    const normalised = countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalised)) return null;
    const codePoints = Array.from(normalised).map(
        (char) => 0x1f1a5 + char.charCodeAt(0)
    );
    return String.fromCodePoint(...codePoints);
};

export const resolveLanguageFlag = (
    languageCode: string,
    providedFlag?: string | null
): string => {
    const fallback = providedFlag?.trim();
    if (fallback && isEmoji(fallback)) {
        return fallback;
    }

    const flagFromProvided = countryCodeToFlagEmoji(fallback ?? null);
    if (flagFromProvided) {
        return flagFromProvided;
    }

    const countryCode = toCountryCode(languageCode);
    const derivedFlag = countryCodeToFlagEmoji(countryCode);
    if (derivedFlag) {
        return derivedFlag;
    }

    if (fallback && fallback.length > 0) {
        return fallback.toUpperCase();
    }

    return "🏳️";
};
