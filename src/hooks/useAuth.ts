import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, LoginResponse, getCurrentUser } from "../lib/api";

const AUTH_TOKEN_KEY = "authToken";
const TOKEN_TYPE_KEY = "tokenType";

const getBrowserStorage = () => (typeof window === "undefined" ? null : window);

const persistAuthData = (token: string, tokenType: string, remember: boolean) => {
    const browser = getBrowserStorage();
    if (!browser) return;

    const primaryStorage = remember ? browser.localStorage : browser.sessionStorage;
    const secondaryStorage = remember ? browser.sessionStorage : browser.localStorage;

    secondaryStorage.removeItem(AUTH_TOKEN_KEY);
    secondaryStorage.removeItem(TOKEN_TYPE_KEY);

    primaryStorage.setItem(AUTH_TOKEN_KEY, token);
    primaryStorage.setItem(TOKEN_TYPE_KEY, tokenType);
};

const clearAuthData = () => {
    const browser = getBrowserStorage();
    if (!browser) return;

    browser.localStorage.removeItem(AUTH_TOKEN_KEY);
    browser.localStorage.removeItem(TOKEN_TYPE_KEY);
    browser.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    browser.sessionStorage.removeItem(TOKEN_TYPE_KEY);
};

const readAuthData = (key: string) => {
    const browser = getBrowserStorage();
    if (!browser) return null;

    return (
        browser.localStorage.getItem(key) ?? browser.sessionStorage.getItem(key)
    );
};

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    organizationId?: string;
}

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const router = useRouter();

    // 🔹 Giriş işlemi
    const login = async (
        email: string,
        password: string,
        remember = false
    ): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const loginRequest = { email, password };
            const response = await api.post<LoginResponse>("/auth/login", loginRequest);

            if (response.status >= 200 && response.status < 300 && response.data) {
                persistAuthData(
                    response.data.accessToken,
                    response.data.tokenType || "Bearer",
                    remember
                );

                await fetchCurrentUser();
                return true;
            } else {
                throw new Error(response.message || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Giriş sırasında bir hata oluştu";
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // 🔹 Mevcut kullanıcıyı getir
    const fetchCurrentUser = useCallback(async () => {
        const data = await getCurrentUser();
        if (data) setUser(data);
    }, []);

    // 🔹 Oturumdan çıkış (logout)
    const logout = () => {
        clearAuthData();
        setUser(null);
        router.push("/login");
    };

    // 🔹 Sayfa yenilendiğinde token varsa kullanıcıyı yükle
    useEffect(() => {
        const token = readAuthData(AUTH_TOKEN_KEY);
        if (token && !user) {
            void fetchCurrentUser();
        }
    }, [fetchCurrentUser, user]);

    return { login, logout, isLoading, error, user, fetchCurrentUser };
}
