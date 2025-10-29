import { resolveLanguageFlag } from "./flag-utils";

export interface LanguageOption {
    id?: string;
    value: string;
    label: string;
    flag?: string;
    active?: boolean;
}

export const DEFAULT_LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: "TR", label: "Türkçe" },
    { value: "EN", label: "İngilizce" },
    { value: "DE", label: "Almanca" },
    { value: "AR", label: "Arapça" },
    { value: "AL", label: "Arnavutça" },
].map((option) => ({
    ...option,
    flag: resolveLanguageFlag(option.value, option.flag),
}));

let registry: LanguageOption[] = [...DEFAULT_LANGUAGE_OPTIONS];

export const registerLanguageOptions = (options: LanguageOption[]): void => {
    registry = options.length > 0 ? options : [...DEFAULT_LANGUAGE_OPTIONS];
};

export const getRegisteredLanguageOptions = (): LanguageOption[] => registry;

export const getLanguageOption = (code: string): LanguageOption | undefined =>
    registry.find((option) => option.value === code) ??
    DEFAULT_LANGUAGE_OPTIONS.find((option) => option.value === code);
