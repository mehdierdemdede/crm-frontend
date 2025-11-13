# Billing - Public Plan Listesi API Beklentileri

Bu doküman, hem **/planlar** vitrini hem de onboarding akışında kullanılan `GET /billing/public/plans` çağrısının backend tarafından nasıl implemente edilmesi gerektiğini özetler. Front-end tarafındaki `useQuery(["public-plans"], getPublicPlans)` sorgusu bu sözleşmeye uymayan bir yanıt aldığında hata üretir ve kullanıcı "Planlar yüklenirken bir sorun oluştu" uyarısını görür. Bu nedenle aşağıdaki kuralların tamamı sağlanmalıdır.

## Endpoint Özeti
- **Metot:** `GET`
- **URL:** `<API_BASE_URL>/billing/public/plans`
  - Front-end tarafında `API_BASE_URL`, `.env` üzerinden gelen backend adresine `/api` eki eklenmiş halidir. Dolayısıyla üretimde tipik tam yol `https://{host}/api/billing/public/plans` olacaktır.
- **Kimlik Doğrulama:** Gerekmez; endpoint herkese açık olmalıdır.
- **Cache:** Front-end tarafı sonuçları 5 dakika boyunca bellekte tutar, bu yüzden idempotent/deterministik bir yanıt beklenir.

## Response Şeması
Yanıt gövdesi JSON formatında bir plan dizisi olmalıdır. Her plan aşağıdaki yapıya uyar:

```jsonc
[
  {
    "id": "growth",
    "name": "Growth",
    "description": "Orta ölçekli ekipler için.",
    "features": ["Sınırsız pipeline", "Gelişmiş raporlar"],
    "metadata": {
      "basePrice": 750,
      "basePrice_month": 750,
      "basePrice_year": 7200,
      "perSeatPrice": 120,
      "perSeatPrice_month": 120,
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
]
```

### Alan Detayları
| Alan | Tip | Zorunluluk | Açıklama |
| --- | --- | --- | --- |
| `id` | `string` | ✔ | Planın benzersiz anahtarı. |
| `name` | `string` | ✔ | Kart başlığı olarak gösterilir. |
| `description` | `string \| null` | ✖ | Varsa açıklama olarak gösterilir. |
| `features` | `string[]` | ✖ | Opsiyonel; gönderilmezse boş dizi varsayılır. Null değil, gerçek bir dizi olmalıdır. |
| `metadata` | `object` | ✖ | Taban ve koltuk başı ücretleri override etmek için kullanılır. `basePrice`, `perSeatPrice` veya dönem bazlı (`basePrice_month`, `perSeatPrice_year` gibi) anahtarlar sayısal değerler içermelidir. |
| `prices` | `array<Price>` | ✔ | En az bir fiyat kaydı içermelidir. Her fiyat kaydı aşağıdaki gereksinimleri karşılar. |

#### Price Nesnesi
| Alan | Tip | Zorunluluk | Açıklama |
| --- | --- | --- | --- |
| `id` | `string` | ✔ | Stripe/iyzico vb. sistemdeki price kimliği. |
| `amount` | `number` | ✔ | İlgili dönem için koltuk başı ücret. Backend bu değeri numerik olarak göndermelidir (string kabul edilmez). |
| `currency` | `string` | ✔ | ISO para birimi kodu (ör. `TRY`, `USD`). |
| `billingPeriod` | `"MONTH" \| "YEAR"` | ✔ | Front-end yalnızca bu iki değeri kabul eder. |
| `seatLimit` | `number \| null` | ✖ | Koltuk sınırı varsa pozitif bir tam sayı; yoksa `null` veya alanı tamamen atlayabilirsiniz. |
| `trialDays` | `number \| null` | ✖ | Deneme süresini gün cinsinden dönebilirsiniz. |

## Hesaplama Mantığı
Front-end, her plan için seçilen faturalama dönemine göre ilgili `price` kaydını bulur ve toplamı şu şekilde hesaplar:
```
total = basePrice + perSeatPrice * seatCount
```
- `basePrice` değeri önce metadata içindeki `basePrice_{month|year}` anahtarlarından, sonra `basePrice` alanından okunur. Bu anahtarlar yoksa 0 kabul edilir.
- `perSeatPrice` değeri metadata içinde ilgili anahtarlar varsa oradan, yoksa `prices[].amount` değerinden alınır.
- Para birimi `prices[].currency` alanından gelir ve tüm hesaplamalarda aynı para birimi kullanılır.

Bu nedenle backend:
1. Her plan için seçilen faturalama dönemine karşılık gelen bir `price` kaydı döndürmelidir.
2. Metadata değerlerini sayı (veya sayı olarak parse edilebilen string) şeklinde sağlamalıdır.
3. Para birimi ve miktar tutarlılığını korumalıdır.

## Hata Durumları
- `200 OK` dışındaki her HTTP statüsü front-end'de hata ekranına düşer.
- Yanıt şema validasyonundan geçmezse front-end `ApiError("Invalid response payload")` fırlatır. Bu yüzden alan isimlerini ve veri tiplerini bire bir koruyun.

## İlgili Kod Referansları
- API çağrısı ve zod şeması: `src/lib/api.ts#getPublicPlans` ve `src/lib/types.ts#ZPlan`
- Verilerin kullanıldığı vitrin: `src/app/planlar/page.tsx`
