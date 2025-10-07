import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {api, LoginResponse, getAuthHeaders, getCurrentUser} from "../lib/api";

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
}

export function useAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const router = useRouter();

    // 🔹 Giriş işlemi
    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const loginRequest = { email, password };
            const response = await api.post<LoginResponse>("/auth/login", loginRequest);

            if (response.status >= 200 && response.status < 300 && response.data) {
                localStorage.setItem("authToken", response.data.accessToken);
                localStorage.setItem("tokenType", response.data.tokenType || "Bearer");

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
    const fetchCurrentUser = async () => {
        const data = await getCurrentUser();
        if (data) setUser(data);
    };

    // 🔹 Oturumdan çıkış (logout)
    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("tokenType");
        setUser(null);
        router.push("/login");
    };

    // 🔹 Sayfa yenilendiğinde token varsa kullanıcıyı yükle
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (token && !user) {
            fetchCurrentUser();
        }
    }, []);

    return { login, logout, isLoading, error, user, fetchCurrentUser };
}
