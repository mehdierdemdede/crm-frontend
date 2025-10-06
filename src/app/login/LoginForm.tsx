"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock } from "lucide-react";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading, error } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) {
            // 🔹 Beni hatırla seçiliyse token süresini uzatabiliriz
            if (rememberMe) localStorage.setItem("rememberMe", "true");
            router.push("/dashboard");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="text-red-700 bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <Input
                label="E-posta Adresi"
                type="email"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                icon={<Mail className="h-4 w-4 text-gray-400" />}
            />

            <Input
                label="Şifre"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                icon={<Lock className="h-4 w-4 text-gray-400" />}
            />

            <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 select-none">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                        className="rounded border-gray-300"
                    />
                    Beni hatırla
                </label>
                <a href="#" className="text-blue-600 hover:underline">
                    Şifremi unuttum?
                </a>
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
                Giriş Yap
            </Button>
        </form>
    );
}
