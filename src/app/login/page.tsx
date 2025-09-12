import LoginForm from './LoginForm';

export default function LoginPage() {
    return (
        <div className="container">
            <div className="left-panel">
                <i className="fas fa-circle decoration decoration-1"></i>
                <i className="fas fa-square decoration decoration-2"></i>

                <div>
                    <div className="logo">
                        <i className="fas fa-users"></i>
                        CRM Pro
                    </div>

                    <h2>Google & Facebook Entegrasyonlu CRM Çözümü</h2>
                </div>

                <div>
                    <div className="feature-list">
                        <div className="feature">
                            <div className="feature-icon">
                                <i className="fas fa-sync-alt"></i>
                            </div>
                            <div>
                                <h3>Gerçek Zamanlı Veri Senkronizasyonu</h3>
                                <p>Google ve Facebooktan anlık lead çekme</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <i className="fas fa-chart-line"></i>
                            </div>
                            <div>
                                <h3>Detaylı Analiz ve Raporlama</h3>
                                <p>Kapsamlı müşteri analizleri ve raporlar</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <i className="fas fa-shield-alt"></i>
                            </div>
                            <div>
                                <h3>Güvenli Veri Saklama</h3>
                                <p>Bankacılık düzeyinde şifreleme</p>
                            </div>
                        </div>
                    </div>

                    <div className="security-badge">
                        <i className="fas fa-lock"></i>
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

                <div className="admin-note">
                    <i className="fas fa-info-circle"></i>
                    Sadece yönetici tarafından oluşturulmuş hesaplarla giriş yapılabilir
                </div>
            </div>
        </div>
    );
}