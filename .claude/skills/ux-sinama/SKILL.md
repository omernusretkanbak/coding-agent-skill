---
name: ux-sinama
description: >-
  Use after a writer has changed a web UI (screens, forms, navigation, layout,
  styles) and before the proof is accepted: an independent "sınayıcı" role,
  separate from the writer, probes the interface in a headless browser with
  scenario steps and produces a findings report. Keywords: UX sınama, arayüz
  testi, senaryo, sınayıcı, düşman göz, erişilebilirlik, yatay taşma, dokunmatik
  hedef, odak, karanlık tema, 390 px, mobil görünüm, bulgu raporu, ux-sinama.
  Does not replace prove-it (which only verifies claims). Observes only: never
  edits code, never touches non-local sites.
---

# SINA — ux-sinama

**Duyuru:** "`ux-sinama` skill'ini kullanıyorum: arayüzü bağımsız bir sınayıcı gözüyle senaryo bazlı sınıyorum."

## Ne zaman

Arayüze dokunan her değişiklikte (ekran, form, gezinme, düzen, stil), yazar bittikten ve `prove-it` kanıtı üretilmeden önce. Saf arka uç, betik ya da belge değişikliğinde kullanılmaz. `prove-it` bir iddiayı kanıtla kapatır; `ux-sinama` ise iddia edilmemiş kusurları arar. İkisi birbirinin yerine geçmez: sınama raporu PROOF'a girdi olur.

## Rol sözleşmesi

Sınayıcı yazardan AYRI bir roldür (ayrı oturum ya da ayrı alt-ajan; yazarın bağlamını görmez). Sözleşme:

- **Kod değiştirmez.** Ürün koduna, testlere, stile dokunmaz. Yazdığı tek şey senaryo, beklenti ve rapordur. Düzeltme yazarın işidir; sınayıcı düzeltme önerisini bulgu satırına bir cümleyle ekleyebilir ama uygulamaz.
- **`git add`, `commit`, `push` yok.** Çıktılar çalışma ağacında dosya olarak kalır; kaydı orkestratör yapar.
- **Beklentiler sayfa AÇILMADAN yazılır.** Sınayıcı önce görev tanımından `beklenti.json`'u yazar (şablon: `beklenti-sablonu.json`): "şu işlem yapılınca şu görünür". Sayfaya bakıp ona uyan beklenti yazmak yasaktır; beklenti sayfayı değil görevi izler.
- **Kırmızı-önce.** Yeni davranışı doğrulayan adımlar, mümkünse değişiklik öncesi taban üzerinde de koşulur ve KIRMIZI görülür; hiç kırmızı olamayan senaryo kanıt değildir. Taban yoksa bunun nedeni rapora yazılır.
- **Her beklenti kanıtlanır.** Senaryo adımına `"beklenti": "B1"` yazılır; hiçbir adımın bağlanmadığı beklenti koşucuda `beklenti-kanitsiz` (ÖNEMLİ) bulgusu olur.

## Akış

1. Görev tanımını oku; kullanıcı yolculuklarını (en çok 6 senaryo) ve her biri için beklentileri `beklenti.json`'a yaz (sayfaya bakmadan).
2. Senaryoyu yaz (`senaryo-sablonu.json`). Hedefler yalnız erişilebilirlik `role`+`name` ya da görünür `metin` ile verilir; CSS sınıfı, kimlik ya da XPath hedefi koşucuda REDDEDİLİR. Gerçek kullanıcı verisi yerine açıkça sahte değer kullan.
3. Koşucuyu çalıştır (aşağıda). Yeni senaryoda `--tekrar 2` ver: sonuçlar farklıysa "kararsız senaryo" uyarısı gelir ve o hücrenin bulguları ürün bulgusu sayılmaz; önce senaryo/ortam kararlılığını düzelt.
4. `RAPOR.md`'yi oku (önce özet ve bulgu tablosu), yalnız bulguya bağlı kareleri aç. Her bulgunun şiddetini bu belgedeki ölçütle doğrula; koşucunun atadığı şiddet yanlışsa sebebini raporun sonuna yaz.
5. Teslim: `sonuc.json` + `RAPOR.md` + kareler yazarın PROOF'una bağlanır (`docs/proof/<dal-slug>/`). ENGELLEYİCİ/ÖNEMLİ bulgu varsa yazara döner; düzeltmeden sonra senaryolar yeniden koşulur.

## Komut

```bash
node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs \
  --senaryo <senaryo.json> --beklenti <beklenti.json> \
  --sun <statik-cikti-dizini>        # ya da: --url http://127.0.0.1:<port>/
  --out <cikti-dizini> --tekrar 2
```

Seçenekler: `--matris 390x844,768x1024,1280x800` ve `--tema acik,koyu` (varsayılan 3×2 = 6 hücre), `--setup "<js>"` (her belgeden önce çalışır; ör. `Date.now = () => 1767225600000;`), `--yasak-desen <dosya>` (satır başına bir düzenli ifade), `--timeout-ms` (varsayılan 180000; çağıranın kendi dış zaman aşımından KISA tut), `--browser <exe>` (yoksa `CAPTURE_BROWSER`, sonra Edge/Chrome aranır). `--help` tam listeyi verir.

Kararlılık: koşucu `prefers-reduced-motion: reduce`, `tr-TR` yerel ayarı ve `Europe/Istanbul` saat dilimini otomatik uygular; her hücrede depolama, çerez ve önbellek temizlenir.

Çıkış kodları: **0** temiz ya da yalnız KÜÇÜK bulgu · **1** ENGELLEYİCİ/ÖNEMLİ bulgu var · **2** kullanım hatası, güvenlik bekçisi (URL ya da yasak desen) ya da tarayıcı bulunamadı · **3** koşucu hatası (zaman aşımı, tarayıcı, CDP; kısmi `sonuc.json` yazılır, `tamamlandi: false`).

## Adımlar (senaryo JSON'u)

| `adim` | Alanlar |
|---|---|
| `goto` | `url` (göreli yol; mutlak ise 127.0.0.1 olmalı) |
| `click` | `role`+`name` ya da `metin`; hedef örtülüyse adım başarısız olur |
| `fill` | `role`+`name` ya da `metin`, `deger` |
| `press` | `tus`: Enter, Tab, Escape, Space, Backspace, Arrow* |
| `waitFor` | `metin` ya da `role`(+`name`), isteğe `kaybolur`, `zamanAsimiMs` (koşul yoklaması; sabit bekleme YOK) |
| `assertText` | `metin` (isteğe `yok: true`) |
| `assertVisible` | `role`(+`name`) ya da `metin` |
| `screenshot` | `ad`; kare alır ve o noktada denetimleri de koşar |

Her adıma isteğe bağlı `beklenti` (kimlik) ve `not` yazılabilir. İlk adım `goto` olmalıdır. Başarısız adımdan sonraki adımlar `atlandi` olur; son durum yine ölçülür.

## Otomatik denetimler (her hücrede)

Konsol hataları ve yakalanmamış istisnalar · ağ hataları (4xx/5xx, başarısız yükleme) · 127.0.0.1 dışına istek · yatay taşma · erişilebilirlik adı olmayan etkileşimli öğe · `alt`ı olmayan görsel · başlık hiyerarşisi atlaması · dokunmatik hedef <44 px (yalnız ≤480 px genişlikte) · Tab gezintisinde görünür odak · 12 px altı yazı. Bir denetim çalıştırılamazsa `olcumHatalari` alanına ve rapora yazılır; sessizce atlanmaz.

## Bulgu şiddeti

| Şiddet | Ölçüt | Örnek |
|---|---|---|
| **ENGELLEYİCİ** | Kullanıcı görevi tamamlayamaz ya da güvenlik sınırı aşılır | Senaryo adımı başarısız (düğme yok/örtülü, beklenen metin gelmiyor); 127.0.0.1 dışına istek |
| **ÖNEMLİ** | Görev tamamlanır ama belirgin işlev ya da erişilebilirlik kusuru var | Konsol hatası/istisna, 4xx/5xx, yatay taşma, adsız düğme, `alt`sız görsel, odak göstergesi yok, 24 px altı dokunmatik hedef, kanıtsız beklenti |
| **KÜÇÜK** | Cila ya da düşük risk | Başlık atlaması, 24–44 px dokunmatik hedef, 12 px altı yazı, `favicon.ico` 404 |

Her bulgu satırı = **senaryo adı + sayısal ölçüm + kare**. Ölçümsüz, kareysiz ya da yalnız "bence" diye başlayan bulgu yazılmaz. Kararsız hücrelerin bulguları `kararsizBulgular`'da durur ve şiddet saymaz.

## Sınır (kodda zorlanır)

- Yalnız `http://127.0.0.1:<port>/...` `localhost`, başka IP, ana makine adı, `https` ve `file:` reddedilir (çıkış 2). Gezinme sırasında yönlendirme ya da alt istek 127.0.0.1 dışına giderse istek GÖNDERİLMEDEN engellenir ve ENGELLEYİCİ `dis-istek` bulgusu olur.
- `--sun <dizin>` dizini rastgele portta SALT-OKUNUR sunar; dizin dışına çıkış engellidir; koşu bitince kapanır. Canlı siteye giden, oturum açan ya da gerçek hesaba dokunan senaryo yazılmaz.
- **Yasak desen bekçisi:** koşucu başlamadan senaryoyu, beklentiyi, `--setup` metnini ve `--sun` dizinindeki metin dosyalarını tarar: 11 haneli ardışık sayı, TR cep telefonu biçimleri, e-posta ve `--yasak-desen` dosyasındaki projeye özgü desenler. Eşleşirse hiçbir şey başlamaz (çıkış 2); eşleşen metin değil yalnız `dosya:satır` ve desen adı yazılır. Projeye özgü yasaklar koda değil o projenin kendi dosyasına yazılır.

## Bağlam disiplini

- PR başına **en çok 6 senaryo**, rapora bakarken **en çok 12 görüntü** aç. Önce `RAPOR.md` özeti ve bulgu tablosu; kareleri yalnız bir bulguyu doğrulamak için aç.
- Büyük çıktıyı bağlama alma: koşucunun çıktısını dosyaya (`--out`) yazdır; terminalde yalnız `ÖZET:` satırı ve çıkış kodu yeter. `sonuc.json` büyükse `grep`/`jq` ile yalnız ilgili alanı oku.
- Kareler PNG'dir ve repoya girecekse PR'a yalnız bulguyu gösteren birkaçı konur; tüm matris çıktısı commit'lenmez.
- Tarayıcı çıktısında yerel yol, makine adı ya da kullanıcı adı görünüyorsa PROOF'a koymadan önce `<TEMP>`/`<DEPO>` ile maskele.

## Ne YAPMAZ

- Canlı siteyi gezip plan üretmez; yalnız önceden yazılmış senaryoyu, 127.0.0.1 üzerinde koşar.
- Otomatik düzeltme yapmaz; kod, stil ya da test dosyası değiştirmez.
- Gerçek kullanıcı verisi kullanmaz (kimlik/telefon/e-posta bekçisi bunu kodda zorlar).
- Piksel karşılaştırması (görsel fark) yapmaz; bu sürümde kareler insan/inceleyici gözü içindir.
- `prove-it`'in kanıt kapısının yerine geçmez; "bulgu yok" demek "her şey doğru" demek değildir, yalnız yazılan senaryo ve matris için geçerlidir.

## Dosyalar

| Dosya | Amaç |
|---|---|
| `scripts/senaryo-kos.mjs` | Koşucu (bağımlılıksız, Node ≥ 22) |
| `scripts/senaryo-kos.selftest.mjs` | Koşucunun testleri: `node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (tarayıcı yoksa tarayıcılı küme NEDENİYLE atlanır; `UX_SINAMA_TARAYICI_ZORUNLU=1` ile atlama yerine hata verir) |
| `senaryo-sablonu.json`, `beklenti-sablonu.json` | Senaryo ve beklenti şablonları |
| `RAPOR-template.md` | `RAPOR.md` şablonu (`{{yer_tutucu}}` alanlarını koşucu doldurur) |
| `fixtures/` | Koşucunun kendi testleri için kasıtlı kusurlu / temiz / dış istekli küçük siteler |
