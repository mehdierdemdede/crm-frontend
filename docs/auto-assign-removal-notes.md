# Auto-Assign Sayfası Kaldırma Notları

- `src/app/auto-assign/page.tsx` kaldırılarak istatistik ekranı devre dışı bırakıldı.
- Kenar menüsündeki ilgili yönlendirmeler temizlendi.
- Frontend içerisinde yalnızca `getAgentStats` fonksiyonu bu ekran için kullanılıyordu; bu fonksiyon da kaldırıldı.
- Backend tarafında `GET /auto-assign/stats` servisi üyeler ve lead auto-assign ekranlarında kullanılmaya devam ettiği için şu an **kaldırılmamalıdır**.
