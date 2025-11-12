"use client";

import { useEffect, useId, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/hooks/useAuth";
import {
    clearRememberedCredentials,
    persistRememberedEmail,
    persistRememberPreference,
    readRememberedCredentials,
} from "@/lib/rememberMeStorage";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading, error } = useAuth();
    const router = useRouter();
    const rememberMeId = useId();

    useEffect(() => {
        const { rememberMe: storedRemember, email: storedEmail } =
            readRememberedCredentials();

        if (storedRemember) {
            setRememberMe(true);
            setEmail(storedEmail);
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const success = await login(email, password, rememberMe);
        if (success) {
            if (rememberMe) {
                persistRememberPreference(true);
                persistRememberedEmail(email);
            } else {
                clearRememberedCredentials();
            }
            router.push("/dashboard");
        }
    };

    return (
        <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-4">
            {error && (
                <div
                    className="text-red-700 bg-red-50 p-3 rounded-md border border-red-200"
                    aria-live="polite"
                    role="alert"
                >
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
                <div className="inline-flex items-center gap-2 select-none">
                    <input
                        type="checkbox"
                        id={rememberMeId}
                        checked={rememberMe}
                        onChange={(e) => {
                            const isChecked = e.target.checked;
                            setRememberMe(isChecked);

                            if (!isChecked) {
                                clearRememberedCredentials();
                            } else {
                                persistRememberPreference(true);
                            }
                        }}
                        disabled={isLoading}
                        className="rounded border-gray-300"
                    />
                    <label htmlFor={rememberMeId}>Beni hatırla</label>
                </div>
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
