import LoginForm from './LoginForm';
import { Users, RefreshCw, BarChart2, Shield, Lock } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="login-container">
            <div className="left-panel">
                {/* dekorasyon ikonlarını da Lucide ile değiştirebiliriz veya basit div olarak bırakabiliriz */}
                <div>
                    <div className="logo flex items-center gap-2 text-lg font-bold">
                        <Users className="h-6 w-6" />
                        CRM Pro
                    </div>

                    <h2>Google & Facebook Entegrasyonlu CRM Çözümü</h2>
                </div>

                <div>
                    <div className="feature-list">
                        <div className="feature">
                            <div className="feature-icon">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>Gerçek Zamanlı Veri Senkronizasyonu</h3>
                                <p>Google ve Facebooktan anlık lead çekme</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <BarChart2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>Detaylı Analiz ve Raporlama</h3>
                                <p>Kapsamlı müşteri analizleri ve raporlar</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>Güvenli Veri Saklama</h3>
                                <p>Bankacılık düzeyinde şifreleme</p>
                            </div>
                        </div>
                    </div>

                    <div className="security-badge">
                        <Lock className="h-5 w-5 text-green-500" />
                        <div>
                            <h3>%100 Güvenli Giriş</h3>
                            <p>SSL şifreli bağlantı ile korunmaktasınız</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="right-panel">
                <div className="form-header">
                    <h1>CRM Proya Hoş Geldiniz</h1>
                    <p>Lütfen hesabınıza giriş yapın</p>
                </div>

                <LoginForm />

                <div className="admin-note flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Sadece yönetici tarafından oluşturulmuş hesaplarla giriş yapılabilir
                </div>
            </div>
        </div>
    );
}
