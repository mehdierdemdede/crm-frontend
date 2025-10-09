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

export const getLanguageOption = (code: string): LanguageOption | undefined =>
    LANGUAGE_OPTIONS.find((option) => option.value === code);
