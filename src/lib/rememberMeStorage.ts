const REMEMBER_ME_KEY = "rememberMe";
const REMEMBERED_EMAIL_KEY = "rememberedEmail";

const isBrowser = () => typeof window !== "undefined";

export interface RememberedCredentials {
    rememberMe: boolean;
    email: string;
}

export const readRememberedCredentials = (): RememberedCredentials => {
    if (!isBrowser()) {
        return { rememberMe: false, email: "" };
    }

    const rememberMe = window.localStorage.getItem(REMEMBER_ME_KEY) === "true";
    const email = rememberMe
        ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""
        : "";

    return { rememberMe, email };
};

export const persistRememberPreference = (remember: boolean) => {
    if (!isBrowser()) return;

    if (remember) {
        window.localStorage.setItem(REMEMBER_ME_KEY, "true");
        return;
    }

    clearRememberedCredentials();
};

export const persistRememberedEmail = (email: string) => {
    if (!isBrowser()) return;

    const normalizedEmail = email.trim();

    if (normalizedEmail.length === 0) {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        return;
    }

    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
};

export const clearRememberedCredentials = () => {
    if (!isBrowser()) return;

    window.localStorage.removeItem(REMEMBER_ME_KEY);
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
};
