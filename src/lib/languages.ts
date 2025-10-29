import {
    resolveLanguageFlag,
    resolveLanguageFlagImageUrl,
    resolveLanguageFlagImageSrcSet,
} from "./flag-utils";

export interface LanguageOption {
    id?: string;
    value: string;
    label: string;
    flag?: string;
    active?: boolean;
    flagImageUrl?: string;
    flagImageSrcSet?: string;
}

const applyFlagMetadata = (option: LanguageOption): LanguageOption => {
    const resolvedFlag = resolveLanguageFlag(option.value, option.flag);
    const resolvedImageUrl =
        option.flagImageUrl ?? resolveLanguageFlagImageUrl(option.value, option.flag);
    const resolvedSrcSet =
        option.flagImageSrcSet ?? resolveLanguageFlagImageSrcSet(option.value, option.flag);

    return {
        ...option,
        flag: resolvedFlag,
        flagImageUrl: resolvedImageUrl ?? undefined,
        flagImageSrcSet: resolvedSrcSet ?? undefined,
    };
};

export const enhanceLanguageOption = (option: LanguageOption): LanguageOption =>
    applyFlagMetadata(option);

const defaultLanguageSeed: LanguageOption[] = [
    { value: "TR", label: "Türkçe" },
    { value: "EN", label: "İngilizce" },
    { value: "DE", label: "Almanca" },
    { value: "AR", label: "Arapça" },
    { value: "AL", label: "Arnavutça" },
];

export const DEFAULT_LANGUAGE_OPTIONS: LanguageOption[] =
    defaultLanguageSeed.map(applyFlagMetadata);

let registry: LanguageOption[] = [...DEFAULT_LANGUAGE_OPTIONS];

export const registerLanguageOptions = (options: LanguageOption[]): void => {
    registry = options.length > 0
        ? options.map(applyFlagMetadata)
        : [...DEFAULT_LANGUAGE_OPTIONS];
};

export const getRegisteredLanguageOptions = (): LanguageOption[] => registry;

export const getLanguageOption = (code: string): LanguageOption | undefined =>
    registry.find((option) => option.value === code) ??
    DEFAULT_LANGUAGE_OPTIONS.find((option) => option.value === code);
