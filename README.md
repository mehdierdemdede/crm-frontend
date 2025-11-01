# CRM Frontend

Bu proje, CRM uygulaması için hazırlanan Next.js tabanlı front-end kodunu içerir. Yönetim paneli aracılığıyla lead listelerini görüntüleyebilir, satış kayıtlarını güncelleyebilir ve kampanya bazlı raporlar alabilirsiniz. Depoya backend ile birlikte kurulumu ve dağıtımı kolaylaştıracak yönergeler eklenmiştir.

## Ön Gereksinimler

- Node.js 18 veya üstü (Next.js 15 ile uyumlu sürüm)
- npm 9+ (alternatif olarak `pnpm`, `yarn` veya `bun` kullanabilirsiniz)

## Kurulum

```bash
npm install
```

Kurulum tamamlandıktan sonra projeyi geliştirme modunda başlatmak için:

```bash
npm run dev
```

Ardından [http://localhost:3000](http://localhost:3000) adresini ziyaret ederek uygulamayı görebilirsiniz. Kodda yaptığınız değişiklikler otomatik olarak yansır.

## Ortam Değişkenleri

Front-end, backend API adresini `NEXT_PUBLIC_API_URL` değişkeni üzerinden okur. Değer, backend servisinin kök URL'si olmalıdır; `/api` eki otomatik olarak eklenir.

`.env.local` dosyası oluşturup aşağıdaki gibi yapılandırabilirsiniz:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> **Not:** Eğer backend `https://crm.example.com/api` gibi doğrudan `/api` uzantısına sahip bir adres üzerinden servis veriyorsa, `NEXT_PUBLIC_API_URL=https://crm.example.com/api` şeklinde de tanımlayabilirsiniz. Uygulama gerekirse sondaki `/api` kısmını korur.

## Backend ile Beraber Çalıştırma

1. Backend uygulamasını yerelde `http://localhost:8080` (veya kendi belirlediğiniz port) üzerinde başlatın. Backend API sözleşmesiyle ilgili ayrıntılar için [`docs/backend-sync-request.md`](./docs/backend-sync-request.md) dosyasına göz atabilirsiniz.
2. Front-end projesinin kök dizininde `.env.local` dosyasını oluşturup `NEXT_PUBLIC_API_URL` değerini backend adresinize göre ayarlayın.
3. `npm run dev` komutu ile front-end'i ayağa kaldırın. Geliştirme sırasında API çağrıları belirtilen backend adresine yönlenecektir.

### Docker Compose ile Örnek Kullanım

Frontend ve backend'i birlikte dağıtmak için örnek bir `docker-compose.yml` dosyası şu şekilde olabilir:

```yaml
version: "3.9"
services:
  backend:
    image: ghcr.io/organisation/crm-backend:latest
    environment:
      - SPRING_PROFILES_ACTIVE=prod
    ports:
      - "8080:8080"

  frontend:
    build: .
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Bu yapılandırma, Docker ağı içinde `backend` servisini `frontend` için erişilebilir kılar. Üretim ortamında bir ters proxy (Nginx, Traefik vb.) kullanarak iki servisi aynı etki alanı altında sunabilirsiniz.

## Üretim İçin Derleme ve Çalıştırma

Üretime çıkmadan önce Next.js uygulamasını derleyip statik asset'leri oluşturun:

```bash
npm run build
npm run start
```

`npm run start` komutu, daha önce oluşturulan üretim paketini 3000 portunda servis eder. Başka bir portta çalıştırmak için `PORT` ortam değişkenini kullanabilirsiniz.

## Dağıtım İpuçları

- **Vercel / Netlify:** Uygulamayı Vercel veya Netlify gibi sunucusuz ortamlara dağıtıyorsanız, proje ayarlarında `NEXT_PUBLIC_API_URL` değerini backend'in halka açık URL'sine yönlendirin. Vercel üzerinde build sırasında kullanılan değer, çalışırken de aynen kullanılır.
- **Kendi Sunucunuz:** Node.js sürecini `pm2`, `systemd` veya Docker ile yönetebilirsiniz. Reverse proxy üzerinden `/api` isteklerini backend'e, diğer tüm istekleri Next.js uygulamasına yönlendirecek şekilde yapılandırmanız yeterlidir.
- **Ön Bellekleme / CDN:** Backend çağrıları doğrudan tarayıcıdan yapıldığı için CDN üzerinden sadece statik front-end varlıklarını önbelleğe almanız gerekir. API çağrılarının backend tarafından CORS izinlerini doğru şekilde tanımladığından emin olun.

## Ek Kaynaklar

- [Next.js Dokümantasyonu](https://nextjs.org/docs)
- [Next.js ile Deploy Rehberi](https://nextjs.org/docs/app/building-your-application/deploying)
- Backend API gereksinimleri: [`docs/backend-sync-request.md`](./docs/backend-sync-request.md)
