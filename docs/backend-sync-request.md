# Backend Güncelleme Talebi Taslağı

Aşağıdaki metni Codex üzerinden backend ekibine ileterek front-end tarafında kaldırılan localStorage cache davranışıyla uyumlu bir API sağlanmasını isteyebilirsin. Taslak, mevcut front-end beklentilerini ve gerekli uç noktaları adım adım anlatır.

---

## Amaç
Lead detay sayfası artık satış bilgisini yalnızca backend üzerinden okuyup güncelliyor. Bu nedenle aşağıdaki API sözleşmelerinin doğrulanması ve gerekirse güncellenmesi gerekiyor:

1. `GET /api/leads/:id`
   - Response içinde `lastSale` (satış objesi) ve/veya `lastSaleId` (string) alanları bulunmalı.
   - `lastSale` döndürülüyorsa aşağıdaki satış şemasını kullanmalı.

2. `GET /api/sales/:saleId`
   - `lastSale` boş olduğunda front-end bu endpoint'i çağırarak satış detayını dolduruyor.
   - Endpoint, verilen `saleId` için satış verisini döndürmeli; kayıt yoksa `404` dönmeli.

3. `PATCH /api/leads/:id/status`
   - Lead'in durumunu güncellemek için kullanılıyor. `status` alanı `UNCONTACTED | HOT | SOLD | NOT_INTERESTED | BLOCKED | WRONG_INFO` değerlerini alıyor.

4. `POST /api/leads/:id/actions`
   - Lead için aksiyon (not/log) eklemek amacıyla çağrılıyor. `actionType` ve `message` alanlarını kabul edip oluşturulan kaydı geri döndürmeli.

## Veri Şemaları
### LeadResponse
```json
{
  "id": "string",
  "name": "string",
  "status": "UNCONTACTED | HOT | SOLD | NOT_INTERESTED | BLOCKED | WRONG_INFO",
  "phone": "string | null",
  "messengerPageId": "string | null",
  "lastSaleId": "string | null",
  "lastSale": SaleResponse | null
}
```

### SaleResponse
```json
{
  "id": "string",
  "leadId": "string",
  "productName": "string",
  "amount": number,
  "currency": "string",
  "createdAt": "ISO string"
}
```

### LeadAction (POST dönüşü)
```json
{
  "id": "string",
  "actionType": "STATUS | PHONE | WHATSAPP | MESSENGER | NOTE | ...",
  "message": "string",
  "createdAt": "ISO string"
}
```

## Kabul Kriterleri
- `/api/leads/:id` çağrısı, satış bilgisi varsa `lastSale` alanını dolu olarak döndürmeli. Eğer sadece `lastSaleId` dönecekse, karşı endpoint `GET /api/sales/:saleId` üzerinden erişilebilir olmalı.
- Front-end `GET /api/leads/:id` + `GET /api/sales/:saleId` çağrılarından sonra satış verisini tek seferde doldurabilmeli.
- Yanıtlar `application/json` formatında olmalı ve uygun hata kodları (`400`, `404`, `500`) kullanılmalı.

## Doğrulama Komutları
Geliştirme tamamlandıktan sonra aşağıdaki curl komutlarıyla API'yı test edebilirsin:

```bash
# Lead detayını kontrol et
curl -X GET "https://<backend-host>/api/leads/<leadId>" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"

# Satış kaydını kontrol et
curl -X GET "https://<backend-host>/api/sales/<saleId>" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

---

Bu taslak üzerinden backend ekibinden talepte bulunabilirsin; gerektiğinde ürün/alan adlarını kendi sistemine göre uyarlamayı unutma.
