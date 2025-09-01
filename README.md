
# EduBoss – Öğretmen Asistanı (Statik PWA)

Mehmet Ertürk'ün iş akışları için tek sayfalık, **build gerektirmeyen**, Vercel'e **tek tıkla** deploy edilebilen bir PWA.
- Okul, dershane, özel ders, dükkan görevleri
- Öğrenci ve ders oturum takibi
- Evrak/kurum işlemleri takibi (Vergi Dairesi, Adliye, MEB…)
- Online ders **fiyat kartları** ve **WhatsApp başvuru** sayfası
- Tamamı **tarayıcıda** (offline), veriler **cihazda** (localStorage)
- **Dışa/İçe aktar** (JSON) ve **tam yedek**

## Kurulum (GitHub → Vercel)
1. Bu depoyu zip olarak indirin ya da kendi GitHub hesabınıza yeni bir repo açıp bu dosyaları yükleyin.
2. [Vercel](https://vercel.com) → **Add New** → **Project** → GitHub reposunuzu seçin.
3. Framework seçimi: **Other** (ya da Auto/Static).
4. **Build Command**: (boş bırakın) • **Output Directory**: `/` (kök).
5. Deploy. Bitti. URL'nizi açınca PWA otomatik yüklenir (Ana ekrana ekleyebilirsiniz).

## Gelişim Notları
- Veriler localStorage'da: `eduboss_data` anahtarında saklanır.
- Toplu yedek almak için: **Ayarlar → Tüm verileri dışa aktar**.
- Online öğrenci görünümü için: **Online Ders** sekmesinde planları düzenleyin, **Öğrenci Görünümü Aç** butonuna tıklayın.

> Gerektiğinde `vercel.json` ile temiz URL desteği açık (`/index` yerine `/`).

