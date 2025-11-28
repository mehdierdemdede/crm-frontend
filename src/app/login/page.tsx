import Link from "next/link";

import { Users, RefreshCw, BarChart2, Shield, Lock, ArrowUpRight } from "lucide-react";

import { useI18n } from "@/contexts/I18nContext";

import LoginForm from "./LoginForm";

export default function LoginPage() {
    const { t } = useI18n();

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="left-panel">
                    {/* dekorasyon ikonlarını da Lucide ile değiştirebiliriz veya basit div olarak bırakabiliriz */}
                    <div>
                        <div className="logo flex items-center gap-2 text-lg font-bold">
                            <Users className="h-6 w-6" />
                            {t("common.brand")}
                    </div>

                    <h2>{t("loginPage.hero.title")}</h2>
                </div>

                <div>
                    <div className="feature-list">
                        <div className="feature">
                            <div className="feature-icon">
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>{t("loginPage.features.realtime.title")}</h3>
                                <p>{t("loginPage.features.realtime.description")}</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <BarChart2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>{t("loginPage.features.analytics.title")}</h3>
                                <p>{t("loginPage.features.analytics.description")}</p>
                            </div>
                        </div>

                        <div className="feature">
                            <div className="feature-icon">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>{t("loginPage.features.security.title")}</h3>
                                <p>{t("loginPage.features.security.description")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="security-badge">
                        <Lock className="h-5 w-5 text-green-500" />
                        <div>
                            <h3>{t("loginPage.securityBadge.title")}</h3>
                            <p>{t("loginPage.securityBadge.description")}</p>
                        </div>
                    </div>
                </div>
                </div>

                <div className="right-panel gap-6">
                    <div className="form-header order-1">
                        <h1>{t("common.brand")}</h1>
                        <p>{t("loginPage.hero.subtitle")}</p>
                    </div>

                    <div className="info-bar order-3 md:order-2">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-blue-700">{t("loginPage.cta.title")}</p>
                            <p className="text-sm font-semibold text-blue-900">{t("loginPage.cta.subtitle")}</p>
                        </div>
                        <Link
                            href="/planlar"
                            className="info-bar-link"
                        >
                            {t("loginPage.cta.button")}
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="order-2 md:order-3">
                        <LoginForm />
                    </div>

                    <div className="admin-note order-4 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        {t("loginPage.adminNote")}
                    </div>
                </div>
            </div>
        </div>
    );
}
