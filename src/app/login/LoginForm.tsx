'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading, error } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const success = await login(email, password);
        if (success) {
            // Başarılı giriş - dashboard'a yönlendir
            router.push('/dashboard');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div style={{
                    color: 'var(--error)',
                    backgroundColor: '#fee',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid var(--error)'
                }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                    {error}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="email">E-posta Adresi</label>
                <div className="input-with-icon">
                    <i className="fas fa-envelope"></i>
                    <input
                        type="email"
                        id="email"
                        placeholder="ornek@firma.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="password">Şifre</label>
                <div className="input-with-icon">
                    <i className="fas fa-lock"></i>
                    <input
                        type="password"
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="remember-forgot">
                <div className="remember">
                    <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                    />
                    <label htmlFor="remember">Beni hatırla</label>
                </div>

                <a href="#" className="forgot-password">Şifremi unuttum?</a>
            </div>

            <button
                type="submit"
                className="login-button"
                disabled={isLoading}
            >
                {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                {isLoading && <span className="loading"></span>}
            </button>
        </form>
    );
}