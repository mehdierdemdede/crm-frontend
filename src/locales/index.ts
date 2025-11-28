import en from "./en";
import tr from "./tr";

export const translations = {
    en,
    tr,
};

export type LocaleCode = keyof typeof translations;
export type TranslationDictionary = (typeof translations)[LocaleCode];

type LeafPaths<T> = T extends string
    ? ""
    : {
          [K in Extract<keyof T, string>]: T[K] extends string
              ? K
              : `${K}.${Exclude<LeafPaths<T[K]>, "">}` | K;
      }[Extract<keyof T, string>];

export type TranslationPath = LeafPaths<TranslationDictionary>;
