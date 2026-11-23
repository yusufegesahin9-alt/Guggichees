# guggichees: online kurulum

Klasörde şu 4 dosya olmalı: `server.js`, `satranc.html`, `package.json`, `render.yaml`.

## Yol 1: Render (ücretsiz, herkes girebilir)
1. github.com'da yeni bir depo aç ve 4 dosyayı yükle ("Add file > Upload files").
2. render.com'a GitHub ile giriş yap > **New > Web Service** > depoyu seç.
3. Ayarlar: Runtime **Node**, Build Command boş (veya `echo hazir`), Start Command `node server.js`, Plan **Free**.
4. **Deploy**'a bas. Birkaç dakika sonra `https://guggichees-xxxx.onrender.com` adresi çıkar.
5. Bu adresi arkadaşlarına gönder. Odaya girme, otomatik eşleşme ve puan tablosu herkes için çalışır.

Ücretsiz planda notlar:
- 15 dakika kimse girmezse sunucu uyur; ilk giriş yaklaşık 50 saniye sürer.
- Sunucu yeniden başlayınca `players.json` silinir, yani puan tablosu sıfırlanır. Kalıcı olsun istersen Render'da ücretli "Disk" ekle.

## Yol 2: Kendi bilgisayarın + ngrok (hızlı deneme)
1. nodejs.org'dan Node.js (18 veya üstü) kur.
2. Klasörde terminal aç: `node server.js`
3. Başka bir terminalde: `ngrok http 3000` (ngrok.com'dan ücretsiz hesap ve kurulum gerekir).
4. ngrok'un gösterdiği `https://....ngrok-free.app` adresini arkadaşlarına gönder.
5. Bilgisayarın ve terminaller açık kaldığı sürece çalışır. Puanlar `players.json`'da kalıcıdır.

## Sorun giderme
- "Oda bulunamadı": kod yanlış olabilir ya da oda kuran çıkmış olabilir.
- Sayfa açılıyor ama online çalışmıyor: adresi `localhost` yerine paylaşılan genel adresten açtığından emin ol.
