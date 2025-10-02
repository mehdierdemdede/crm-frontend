"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Facebook, Globe, PlugZap } from "lucide-react";

export default function IntegrationsPage() {
    const [fbConnected, setFbConnected] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);

    return (
        <Layout title="Integrations" subtitle="Facebook ve Google bağlantılarınızı yönetin">
            {/* Facebook */}
            <div className="col-span-12 md:col-span-6">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Facebook className="h-5 w-5 text-blue-600" />
                        Facebook Integration
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <p>
                            Facebook Ads üzerinden gelen lead’leri CRM’e otomatik olarak aktarın.
                        </p>
                        <div className="flex justify-between items-center">
              <span
                  className={`text-sm font-medium ${
                      fbConnected ? "text-green-600" : "text-red-600"
                  }`}
              >
                {fbConnected ? "Bağlı" : "Bağlı Değil"}
              </span>
                            <Button
                                variant={fbConnected ? "danger" : "primary"}
                                onClick={() => setFbConnected(!fbConnected)}
                            >
                                {fbConnected ? "Disconnect" : "Connect"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Google */}
            <div className="col-span-12 md:col-span-6">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-red-500" />
                        Google Integration
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <p>
                            Google Ads üzerinden gelen lead’leri CRM’e otomatik olarak aktarın.
                        </p>
                        <div className="flex justify-between items-center">
              <span
                  className={`text-sm font-medium ${
                      googleConnected ? "text-green-600" : "text-red-600"
                  }`}
              >
                {googleConnected ? "Bağlı" : "Bağlı Değil"}
              </span>
                            <Button
                                variant={googleConnected ? "danger" : "primary"}
                                onClick={() => setGoogleConnected(!googleConnected)}
                            >
                                {googleConnected ? "Disconnect" : "Connect"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Excel Import yönlendirme */}
            <div className="col-span-12">
                <Card>
                    <CardHeader className="flex items-center gap-2">
                        <PlugZap className="h-5 w-5 text-amber-500" />
                        Excel Import
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <p>Excel dosyalarınızı yükleyerek manuel lead ekleyin.</p>
                        <Button variant="primary" onClick={() => window.location.href = "/integrations/excel"}>
                            Excel Import Başlat
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
