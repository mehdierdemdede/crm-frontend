# Backend Gereksinimleri: Otel ve Transfer Tanımları

Yeni otel ve transfer tanımları arayüzü aşağıdaki veri alanlarını destekler. Backend servislerinin bu alanlarla uyumlu olması gerekir.

## Otel Tanımları
- **Yeni zorunlu alanlar**: `name`, `starRating` (1-5 arası tamsayı), `nightlyRate` (pozitif sayı), `address`.
- **Opsiyonel alan**: `currency` (varsayılan `EUR`).
- **API güncellemeleri**:
  - `POST /hotels` ve `PUT /hotels/:id` istek gövdeleri aşağıdaki örnekte olduğu gibi olmalıdır:
    ```json
    {
      "name": "Panorama Resort",
      "starRating": 5,
      "nightlyRate": 140,
      "currency": "EUR",
      "address": "Atatürk Cad. No:12, Antalya"
    }
    ```
  - `GET /hotels` yanıtı her kayıt için yukarıdaki alanları döndürmelidir.
- **Veritabanı**: `hotels` tablosuna `star_rating`, `nightly_rate`, `currency`, `address` sütunları eklenmeli ve validasyonlar API katmanında sağlanmalıdır.

## Transfer Tanımları
- **Yeni alanlar**:
  - Zorunlu: `start`, `final`, `price`.
  - Opsiyonel: `stops` (maksimum üç adet, sıralı string dizi) ve `currency` (varsayılan `EUR`).
  - Geriye dönük uyumluluk için `name` alanı, `start → … → final` formatında otomatik üretilerek tutulmalıdır.
- **API güncellemeleri**:
  - `POST /transfer-routes` ve `PUT /transfer-routes/:id` gövdesi:
    ```json
    {
      "start": "Havalimanı",
      "stops": ["Klinik"],
      "final": "Otel",
      "price": 100,
      "currency": "EUR",
      "name": "Havalimanı → Klinik → Otel"
    }
    ```
  - `GET /transfer-routes` yanıtı yukarıdaki alanları döndürmelidir.
- **Veritabanı**: Transfer rotaları için başlangıç, duraklar (JSON/array), final, fiyat ve para birimi alanlarını içerecek şekilde şema güncellenmelidir. `stops` alanı boş olabildiğinden uygun varsayılan (ör. boş dizi) kullanılmalıdır.

## Satış Entegrasyonu
- Satış oluşturma veya güncelleme akışlarında yeni hotel ve transfer alanları kullanılacağından, backend üzerindeki doğrulamalar yeni veri şemasını desteklemelidir.
- `transfer` seçimleri birden fazla rota ID'si döndürmeye devam eder. Rota detayları ihtiyaç halinde yeni alanlardan okunabilir.

Bu gereksinimler karşılandığında frontend ile backend arasındaki veri akışı tutarlı hale gelecektir.
