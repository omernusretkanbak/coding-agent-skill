---
name: ux-sinama
description: >-
  Use after a writer has changed a web UI (screens, forms, navigation, layout,
  styles) and before the proof is accepted: an independent "sınayıcı" role,
  separate from the writer, probes the interface in a headless browser with
  scenario steps and produces a findings report. Keywords: UX sınama, arayüz
  testi, senaryo, sınayıcı, erişilebilirlik, yatay taşma, dokunmatik hedef,
  odak, karanlık tema, ux-sinama. Observes only: never edits code, never
  touches non-local sites.
---

# SINA — ux-sinama

**Duyuru:** "`ux-sinama` skill'ini kullanıyorum: arayüzü bağımsız bir sınayıcı gözüyle senaryo bazlı sınıyorum."

Arayüze dokunan her değişiklikte, yazar bittikten ve `prove-it` kanıtından önce; arka uç/betik/belge değişikliğinde değil. `prove-it` iddiayı kanıtlar; bu skill iddia edilmemiş kusurları arar.

## Rol sözleşmesi

Sınayıcı yazardan AYRI roldür (ayrı oturum/alt-ajan).

- **Kod değiştirmez**, `git add/commit/push` yapmaz; yalnız senaryo, beklenti ve rapor yazar. Düzeltme yazarındır; bulguya en çok bir cümle öneri eklenebilir.
- **Beklentiler sayfa AÇILMADAN yazılır** (`beklenti-sablonu.json`): beklenti sayfayı değil görevi izler.
- **Kırmızı-önce:** yeni davranış adımları mümkünse değişiklik öncesi tabanda KIRMIZI görülür; taban yoksa nedeni rapora yazılır.
- **Her beklenti kanıtlanır:** adıma `"beklenti": "B1"` yazılır; bağlanmayan beklenti ÖNEMLİ bulgudur.

## Akış

1. Görev tanımından kullanıcı yolculuklarını (en çok 6 senaryo) ve beklentileri yaz.
2. Senaryoyu yaz (`senaryo-sablonu.json`; adım türleri, alanlar, geçerli roller `--help`'te). Hedef yalnız `role`+`name` ya da görünür `metin`; eşleşme Türkçe-bilinçli ve büyük/küçük harf duyarsızdır (KATIL = katıl); `img` rolü `image` olur. Sayfanın aşağısı için `kaydir`, sonra `screenshot`. Sahte değer kullan.
3. Koş: `node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs --senaryo s.json --beklenti b.json --sun <dizin> --out <çıktı> --tekrar 2` (ya da `--url http://127.0.0.1:<port>/`). `--tekrar 2`: sonuç farklıysa hücre "kararsız" sayılır, ürün bulgusu olmaz. `--hareket serbest`: reduced-motion zorlanmaz, geçici karşılama/modal sınanır. Seçenekler, çıkış kodları `--help`'te.
4. `RAPOR.md` ölçüm özetini ve bulgu tablosunu oku; kareleri yalnız bulguyu doğrulamak için aç.
5. Çıktılar yazarın PROOF'una (`docs/proof/<dal-slug>/`) bağlanır. ENGELLEYİCİ/ÖNEMLİ bulgu yazara döner; düzeltmeden sonra yeniden koşulur.

## Bulgu şiddeti

- **ENGELLEYİCİ:** görev tamamlanamaz ya da güvenlik sınırı aşılır (başarısız adım, 127.0.0.1 dışına istek).
- **ÖNEMLİ:** görev tamamlanır ama belirgin kusur (konsol/ağ hatası, taşma, adsız düğme, odak yok, kanıtsız beklenti; tam liste `--help`).
- **KÜÇÜK:** cila (başlık atlaması, 24–44 px hedef). Dokunmatik hedef denetimi yalnız ≤480 px genişlikte.

Her bulgu = **senaryo adı + sayısal ölçüm + kare**; ölçümsüz bulgu yazılmaz.

## Sınır

- **Kişisel ya da sağlık verisi taşıyan arayüzlerde çalıştırılmaz: kareler ekrandaki her şeyi alır, rapor konsol ve öğe metnini içerir; bu ekranları insan gözle sına.**
- Yalnız `http://127.0.0.1:<port>/`; `localhost`, başka IP, `https`, `file:` çıkış 2. `--sun` dizini salt-okunur sunulur.
- Ana sayfanın HTTP(S) istek ve yönlendirmeleri 127.0.0.1 dışına gönderilmeden engellenir (ENGELLEYİCİ `dis-istek`). Yeni pencere/sekme (`window.open`, `_blank`) bu bekçiden geçmez; onların loopback dışı trafiği (link-local, `*.localhost` dahil) ölü proxy'de ölür; `--block-new-web-contents` bu tarayıcıda etkisiz çıkabilir, kurumsal ProxySettings ilkesi proxy bayrağını ezebilir. WebSocket/WebRTC kapsam dışıdır: garanti yok.
- **Yasak desen bekçisi** girdiyi (senaryo, beklenti, `--setup`, `--sun` metinleri) ve ÇIKTIYI (`sonuc.json`, `RAPOR.md`) tarar; şu biçimleri kodda yakalar: 11 hane, TR cep telefonu, e-posta, `--yasak-desen` desenleri. Eşleşmede iş başlamaz ya da çıktı yazılmaz ve bu koşunun kareleri silinir (çıkış 2); yalnız `dosya:satır` ve silinen kare sayısı yazılır (silinemeyen `KALDI, elle silin` diye listelenir). Ad/adres gibi gerisi sınayıcının sorumluluğudur.

## Ne YAPMAZ

En çok 12 görüntü açar; PROOF'a yerel yol/kullanıcı adı girmeden maskeler. Canlı siteyi gezmez, piksel karşılaştırması yapmaz. "Bulgu yok" = yalnız yazılan senaryo ve matris için bulgu yok. Koşucu testi: `senaryo-kos.selftest.mjs` (`UX_SINAMA_TARAYICI_ZORUNLU=1`: tarayıcı yoksa hata).
