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

const FLAG_CDN_BASE_URL = "https://flagcdn.com";
const FLAG_BASE_HEIGHT = 18;
const FLAG_HEIGHTS = [FLAG_BASE_HEIGHT, FLAG_BASE_HEIGHT * 2, FLAG_BASE_HEIGHT * 3] as const;

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

const normaliseCountryCode = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const directMatch = /^[a-zA-Z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : null;
    if (directMatch) return directMatch;
    return null;
};

const flagEmojiToCountryCode = (emoji: string | null | undefined): string | null => {
    if (!emoji) return null;
    const characters = Array.from(emoji);
    if (characters.length !== 2) return null;
    const letters = characters.map((char) => {
        const codePoint = char.codePointAt(0);
        if (!codePoint) return null;
        const letterCode = codePoint - 0x1f1a5;
        if (letterCode < 65 || letterCode > 90) return null;
        return String.fromCharCode(letterCode);
    });
    if (letters.some((letter) => letter === null)) return null;
    return (letters as string[]).join("");
};

const resolveCountryCode = (
    languageCode: string,
    providedFlag?: string | null
): string | null => {
    const fromFlag =
        flagEmojiToCountryCode(providedFlag) ?? normaliseCountryCode(providedFlag ?? null);
    if (fromFlag) return fromFlag;
    return toCountryCode(languageCode);
};

const computeWidthForHeight = (height: number): number => Math.round((height * 4) / 3);

const getImageSizeToken = (height: number): string => {
    const fallbackHeight = FLAG_HEIGHTS[FLAG_HEIGHTS.length - 1] ?? height;
    const normalisedHeight = FLAG_HEIGHTS.find((candidate) => height <= candidate) ?? fallbackHeight;
    const width = computeWidthForHeight(normalisedHeight);
    return `${width}x${normalisedHeight}`;
};

const buildFlagImageUrl = (countryCode: string, sizeToken: string): string =>
    `${FLAG_CDN_BASE_URL}/${sizeToken}/${countryCode.toLowerCase()}.png`;

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

export const resolveLanguageFlagImageUrl = (
    languageCode: string,
    providedFlag?: string | null,
    height: number = FLAG_BASE_HEIGHT
): string | null => {
    const countryCode = resolveCountryCode(languageCode, providedFlag);
    if (!countryCode) return null;
    const sizeToken = getImageSizeToken(height);
    return buildFlagImageUrl(countryCode, sizeToken);
};

export const resolveLanguageFlagImageSrcSet = (
    languageCode: string,
    providedFlag?: string | null
): string | null => {
    const countryCode = resolveCountryCode(languageCode, providedFlag);
    if (!countryCode) return null;
    const sources = FLAG_HEIGHTS.map((height, index) => {
        const sizeToken = getImageSizeToken(height);
        const url = buildFlagImageUrl(countryCode, sizeToken);
        const density = `${index + 1}x`;
        return `${url} ${density}`;
    });
    return sources.join(", ");
};
