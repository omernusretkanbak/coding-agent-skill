# UX sınama raporu: {{senaryo_ad}}

> Bu dosya `senaryo-kos.mjs` tarafından `sonuc.json`'dan üretilir; elle düzenlenmez. Sınayıcı yalnız gözlemler: kod değiştirmez; düzeltmeyi yazar yapar (öneri bulgu başına en çok bir cümledir).

- **Hedef:** {{hedef}}
- **Matris:** {{matris}} · tema: {{tema}} · tekrar: {{tekrar}}
- **Koşu tamamlandı mı:** {{tamamlandi}}
- **Özet:** ENGELLEYİCİ {{engelleyici}} · ÖNEMLİ {{onemli}} · KÜÇÜK {{kucuk}}
- **Karar:** {{karar}}

## Bulgular

Her bulgu = senaryo adı + sayısal ölçüm + kare. Şiddet ölçütü için `SKILL.md` "Bulgu şiddeti".

{{bulgu_tablosu}}

{{bulgu_mesajlari}}

## Kararsız senaryo uyarıları

Tekrarlar arasında farklı çıkan hücreler ürün bulgusu SAYILMAZ; önce senaryo/ortam kararlılığı düzeltilir (sabit veri, `--setup` ile saat sabitleme, `waitFor` koşulları).

{{kararsiz}}

## Beklentiler (sayfa açılmadan yazılan `beklenti.json`)

{{beklenti_tablosu}}

## Matris hücreleri

{{matris_tablosu}}

## Ölçüm uyarıları

Bir denetim çalıştırılamadıysa burada yazar; sessizce atlanmaz.

{{olcum_uyarilari}}

## Kapsam ve sınırlar

- Yalnız `127.0.0.1` üzerinde, başsız tarayıcıyla, belirtilen senaryo ve matris için geçerlidir; olmayan senaryo "sorunsuz" demek değildir.
- Görsel fark (piksel karşılaştırma) bu sürümde yoktur; kareler insan/inceleyici gözü içindir.
- Otomatik denetimler: konsol hatası/istisna, ağ 4xx/5xx, 127.0.0.1 dışı istek, yatay taşma, adsız etkileşimli öğe, `alt`sız görsel, başlık atlaması, dokunmatik hedef (<44 px, yalnız ≤480 px genişlikte), Tab odağı, yazı <12 px.
