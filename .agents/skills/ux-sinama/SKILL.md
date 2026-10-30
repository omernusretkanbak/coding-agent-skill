---
name: ux-sinama
description: >-
  Use after a writer has changed a web UI (screens, forms, navigation, layout,
  styles) and before the proof is accepted: an independent "sınayıcı" role,
  separate from the writer, probes the interface in a headless browser with
  scenario steps and produces a findings report. Keywords: UX sınama, arayüz
  testi, senaryo, sınayıcı, erişilebilirlik, yatay taşma, dokunmatik hedef,
  odak, karanlık tema, mobil görünüm, bulgu raporu, ux-sinama.
  Does not replace prove-it (which only verifies claims). Observes only: never
  edits code, never touches non-local sites.
---

# SINA — ux-sinama

**Duyuru:** "`ux-sinama` skill'ini kullanıyorum: arayüzü bağımsız bir sınayıcı gözüyle senaryo bazlı sınıyorum."

Arayüze dokunan her değişiklikte, yazar bittikten ve `prove-it` kanıtından önce; arka uç/betik/belge değişikliğinde değil. `prove-it` iddiayı kanıtlar; bu skill iddia edilmemiş kusurları arar. Rapor PROOF'a girdi olur.

## Rol sözleşmesi

Sınayıcı yazardan AYRI roldür (ayrı oturum ya da alt-ajan; yazarın bağlamını görmez).

- **Kod değiştirmez**, `git add/commit/push` yapmaz. Yazdığı tek şey senaryo, beklenti ve rapordur. Düzeltme yazarındır; bulgu satırına en çok bir cümle öneri yazılabilir.
- **Beklentiler sayfa AÇILMADAN yazılır** (`beklenti-sablonu.json`): beklenti sayfayı değil görevi izler.
- **Kırmızı-önce:** yeni davranış adımları mümkünse değişiklik öncesi tabanda KIRMIZI görülür; taban yoksa nedeni rapora yazılır.
- **Her beklenti kanıtlanır:** adıma `"beklenti": "B1"` yazılır; bağlanmayan beklenti ÖNEMLİ bulgudur.

## Akış

1. Görev tanımından kullanıcı yolculuklarını (en çok 6 senaryo) ve beklentileri yaz.
2. Senaryoyu yaz (`senaryo-sablonu.json`; adım türleri ve alanları `--help`'te). Hedef yalnız `role`+`name` ya da görünür `metin`; CSS/XPath reddedilir. Sahte değer kullan.
3. Koş: `node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs --senaryo s.json --beklenti b.json --sun <dizin> --out <çıktı> --tekrar 2` (`--sun` yerine `--url http://127.0.0.1:<port>/`). Diğer seçenekler ve çıkış kodları `--help`'te. `--tekrar 2`: sonuç farklıysa hücre "kararsız" sayılır, ürün bulgusu olmaz.
4. `RAPOR.md` özetini ve bulgu tablosunu oku; kareleri yalnız bulguyu doğrulamak için aç.
5. Çıktılar yazarın PROOF'una (`docs/proof/<dal-slug>/`) bağlanır. ENGELLEYİCİ/ÖNEMLİ bulgu yazara döner; düzeltmeden sonra yeniden koşulur.

## Bulgu şiddeti

- **ENGELLEYİCİ:** görev tamamlanamaz ya da güvenlik sınırı aşılır (başarısız adım, 127.0.0.1 dışına istek).
- **ÖNEMLİ:** görev tamamlanır ama belirgin kusur (konsol hatası, 4xx/5xx, taşma, adsız düğme, `alt`sız görsel, odak yok, 24 px altı hedef, kanıtsız beklenti).
- **KÜÇÜK:** cila (başlık atlaması, 24–44 px hedef, 12 px altı yazı). Dokunmatik hedef denetimi yalnız ≤480 px genişlikte.

Her bulgu = **senaryo adı + sayısal ölçüm + kare**; ölçümsüz bulgu yazılmaz.

## Sınır

- **Kişisel ya da sağlık verisi taşıyan arayüzlerde çalıştırılmaz: kareler ekrandaki her şeyi alır, rapor konsol ve öğe metnini içerir; bu ekranları insan gözle sına.**
- Yalnız `http://127.0.0.1:<port>/`; `localhost`, başka IP, `https`, `file:` çıkış 2. `--sun` dizini salt-okunur sunulur.
- Ana sayfanın HTTP(S) istek ve yönlendirmeleri 127.0.0.1 dışına gönderilmeden engellenir (ENGELLEYİCİ `dis-istek`). Yeni pencere/sekme (`window.open`, `_blank`) bu bekçiden geçmez; onların loopback dışı trafiği ölü proxy'de ölür. WebSocket/WebRTC kapsam dışıdır: garanti yok.
- **Yasak desen bekçisi** girdiyi (senaryo, beklenti, `--setup`, `--sun` metinleri) ve ÇIKTIYI (`sonuc.json`, `RAPOR.md`) tarar; şu biçimleri kodda yakalar: 11 hane, TR cep telefonu, e-posta, `--yasak-desen` desenleri. Eşleşmede iş başlamaz/dosya yazılmaz (çıkış 2); yalnız `dosya:satır` yazılır. Ad/adres gibi gerisi sınayıcının sorumluluğudur.

## Bağlam disiplini

En çok 12 görüntü aç; terminalde yalnız `ÖZET:` ve çıkış kodu yeter. PROOF'a yerel yol ya da kullanıcı adı girmeden maskele.

## Ne YAPMAZ

Canlı siteyi gezmez, düzeltme uygulamaz, piksel karşılaştırması yapmaz. "Bulgu yok" = yalnız yazılan senaryo ve matris için bulgu yok. Koşucu testi: `node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (`UX_SINAMA_TARAYICI_ZORUNLU=1`: tarayıcı yoksa atlama yerine hata).
