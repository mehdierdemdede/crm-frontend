export interface LanguageOption {
    id?: string;
    value: string;
    label: string;
    flag?: string;
    active?: boolean;
}

export const DEFAULT_LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: "TR", label: "Türkçe", flag: "🇹🇷" },
    { value: "EN", label: "İngilizce", flag: "🇬🇧" },
    { value: "DE", label: "Almanca", flag: "🇩🇪" },
    { value: "AR", label: "Arapça", flag: "🇸🇦" },
    { value: "AL", label: "Arnavutça", flag: "🇦🇱" },
];

let registry: LanguageOption[] = [...DEFAULT_LANGUAGE_OPTIONS];

export const registerLanguageOptions = (options: LanguageOption[]): void => {
    registry = options.length > 0 ? options : [...DEFAULT_LANGUAGE_OPTIONS];
};

export const getRegisteredLanguageOptions = (): LanguageOption[] => registry;

export const getLanguageOption = (code: string): LanguageOption | undefined =>
    registry.find((option) => option.value === code) ??
    DEFAULT_LANGUAGE_OPTIONS.find((option) => option.value === code);
