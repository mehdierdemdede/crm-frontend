# Plan Yönetimi Backend Gereksinimleri

Front-end tarafında sadece **SUPER_ADMIN** rolündeki kullanıcıların erişebildiği yeni bir plan oluşturma ekranı eklendi.
Bu ekran aşağıdaki API sözleşmesine göre çalışır. Backend ekibinin ilgili servisleri tamamlaması ve mevcut uç noktaları
zenginleştirmesi gerekir.

## 1. Yetkilendirme
- `POST /billing/plans` uç noktası **kimlik doğrulaması** istemeli ve isteği gönderen kullanıcının `SUPER_ADMIN` rolüne
  sahip olduğunu doğrulamalıdır.
- Yetkisiz isteklerde `403 Forbidden` dönülmelidir.

## 2. Endpoint: `POST /billing/plans`
- **Body** aşağıdaki şemaya uymalıdır (tüm sayısal alanlar numerik tipte beklenir):

| Alan | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `id` | `string` | ✔ | Planın benzersiz anahtarı (ör. `growth`). |
| `name` | `string` | ✔ | Plan adı. |
| `description` | `string \| null` | ✖ | Kart açıklaması. |
| `features` | `string[]` | ✖ | Kart üzerinde gösterilen özellik listesi. |
| `prices` | `array<Price>` | ✔ | En az bir fiyat kaydı. |
| `metadata.basePrice` | `number` | ✖ | Varsayılan taban ücret. |
| `metadata.perSeatPrice` | `number` | ✖ | Varsayılan koltuk başı ücret. |
| `metadata.basePrice_month` | `number` | ✖ | Aylık dönem için taban ücret. |
| `metadata.perSeatPrice_month` | `number` | ✖ | Aylık dönem için koltuk başı ücret. |
| `metadata.basePrice_year` | `number` | ✖ | Yıllık dönem için taban ücret. |
| `metadata.perSeatPrice_year` | `number` | ✖ | Yıllık dönem için koltuk başı ücret. |

`Price` nesnesi mevcut `GET /billing/public/plans` sözleşmesiyle aynı yapıyı kullanır:

```jsonc
{
  "id": "growth-monthly",
  "amount": 120,
  "currency": "TRY",
  "billingPeriod": "MONTH",
  "seatLimit": null,
  "trialDays": 14
}
```

## 3. Yanıt
- Başarılı isteklerde oluşturulan plan objesini ( `GET /billing/public/plans` yanıtındaki ile aynı şema ) döndürün.
- `409 Conflict` ile çakışan `id` veya `priceId` durumlarını bildirin.
- Geçersiz payload için `400 Bad Request` ve alan bazlı hata mesajları beklenir.

## 4. İlave Gereksinimler
- Yeni plan oluşturulduğunda `GET /billing/public/plans` uç noktası aynı veriyi döndürmelidir.
  (Örn. cache varsa invalidasyon yapılmalı.)
- Fiyat kayıtlarının `billingPeriod` alanı sadece `MONTH` veya `YEAR` olmalıdır.
- `seatLimit` ve `trialDays` alanları isteğe bağlıdır; gönderilirse tam sayı olarak saklanmalıdır.
- Metadata değerleri numerik saklanmalı ve front-end'in hesaplama yaparken doğrudan kullanabileceği formatta dönmelidir.

## 5. Örnek İstek
```http
POST /api/billing/plans HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "growth",
  "name": "Growth",
  "description": "Orta ölçekli ekipler için",
  "features": ["Sınırsız pipeline", "Gelişmiş raporlar"],
  "metadata": {
    "basePrice": 750,
    "perSeatPrice": 120,
    "basePrice_month": 750,
    "perSeatPrice_month": 120,
    "basePrice_year": 7200,
    "perSeatPrice_year": 99
  },
  "prices": [
    {
      "id": "growth-monthly",
      "amount": 120,
      "currency": "TRY",
      "billingPeriod": "MONTH",
      "seatLimit": null,
      "trialDays": 14
    },
    {
      "id": "growth-yearly",
      "amount": 99,
      "currency": "TRY",
      "billingPeriod": "YEAR",
      "seatLimit": null,
      "trialDays": 30
    }
  ]
}
```

## 6. Test Senaryoları
- ✅ SUPER_ADMIN token'ı ile yeni plan oluşturulabilmeli ve `GET /billing/public/plans` çağrısında listelenmelidir.
- ❌ ADMIN veya USER rolü ile yapılan `POST /billing/plans` istekleri `403` dönmelidir.
- ❌ Aynı `id` veya `priceId` ile tekrar plan oluşturma girişimi `409` döndürmelidir.
- ❌ Geçersiz numerik alan (örn. negatif `trialDays`) içeren istekler `400` dönmelidir.
