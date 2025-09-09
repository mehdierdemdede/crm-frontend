'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthInput } from '../../components/forms/AuthInput';
import { Button } from '../../components/ui/Button';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login(email, password, rememberMe);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="email">E-posta Adresi</label>
                <AuthInput
                    type="email"
                    id="email"
                    placeholder="ornek@firma.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon="envelope"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">Şifre</label>
                <AuthInput
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon="lock"
                    required
                />
            </div>

            <div className="remember-forgot">
                <div className="remember">
                    <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember">Beni hatırla</label>
                </div>

                <a href="#" className="forgot-password">Şifremi unuttum?</a>
            </div>

            <Button
                type="submit"
                className="login-button"
                disabled={isLoading}
            >
                {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                {isLoading && <span className="loading"></span>}
            </Button>
        </form>
    );
}