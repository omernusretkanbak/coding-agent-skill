---
name: prove-it
description: >-
  Use before telling the user anything is done, fixed, working or passing,
  and before committing or opening a PR — especially when about to write
  "tamam", "bitti", "çalışıyor", "should work", or when an implementer
  subagent reports success. Keywords: prove, evidence, verification,
  screenshot, before after, test output, measurements, done claim, PROOF.md.
---

# KANITLA — prove-it

**Duyuru:** "`prove-it` skill'ini kullanıyorum: iddiayı kanıtla kapatıyorum."

## İlke

Kanıt, bu turda üretilmiş, dosyaya yazılmış ve kullanıcıya gösterilmiş çıktıdır. "Çalışıyor" cümlesi kanıt değildir; komut çıktısı, görüntü ve sayı kanıttır.

**REQUIRED SUB-SKILL:** superpowers:verification-before-completion — kanıtsız iddia yasağının kaynağı budur.

## Roller

Yazar (Sonnet) `PROOF.md` taslağını üretir. Orkestratör bağımsız doğrular: test komutunu KENDİSİ tekrar çalıştırır, görselleri açar, `git diff --stat` ile kapsamı, Aralık'ı kontrol eder, PROOF.md'deki "Orkestratör doğrulaması" bölümünü doldurur. Alt-ajanın "başarılı" raporu tek başına kanıt sayılmaz. **Zorunlu:** süreçler kapalı mı — rapor/PROOF/yapılandırmadaki her port: Windows `Get-NetTCPConnection -LocalPort <p> -State Listen`, Unix `lsof -i :<p>`; açıksa PID'i durdur (toplu öldürme yasak), PROOF'a yaz.

## Kanıt Türü

Gözlemlenebilir yüklem: değişiklik bir ekranı ya da görsel çıktıyı değiştiriyor mu?

- **Evet** → görsel kanıt zorunlu: `before.png` + `after.png` (ya da kısa kayıt).
- **Hayır** → mantık kanıtı zorunlu: tam komut + tam çıktı + çıkış kodu; sayı varsa önce/sonra tablosu; regresyon düzeltmesinde kırmızı-yeşil (düzeltmeyi geri al → başarısız → geri koy → geçer).
- **İkisi birden değişiyorsa** → ikisi de zorunlu.

## Görsel Kanıt Araç Sırası

1. **Web sayfası:** chrome-devtools `take_screenshot` (`filePath`). Kilitliyse ("already running … --isolated") beklemeden `node .claude/skills/prove-it/scripts/capture-page.mjs --url <url> --out <yol>` (headless, yalnız sayfa; detaylar `--help`).
2. **Masaüstü uygulaması, SON ÇARE:** `capture-screen.ps1` birincil ekranın TAMAMINI yakalar. Commit'ten önce Read ile aç; özel içerik/ilgisiz pencere varsa commit'leme, sil — yalnız temiz kırpılmış sürüm commit'lenir. Tam ekran yakalayan her yöntem (`CopyFromScreen` dahil) aynı risktedir.
3. Uygulama ayakta değilse `preview_start`/`run`.

"Önce" görüntüsü KOD DEĞİŞMEDEN alınır; alınmadıysa `main` worktree'sinde alınır; asla uydurulmaz, asla sonradan üretilmez.

## Kalıcılaştır

`docs/proof/<dal-slug>/PROOF.md` (şablon: `PROOF-template.md`), görseller yanına yazılır. Orkestratör commit'ler: mesajı dosyadan (`-F`) verir, `Co-Authored-By` satırı ekler; `--amend` ve `--no-verify` yasaktır. `SendUserFile` ile kullanıcıya gösterilir (araç yoksa mutlak yol + GitHub blob linki verilir). Her yeni inceleme turu PROOF.md'ye `## Tur N` bölümü EKLER, üzerine yazmaz. Aralık/Yeniden üretme henüz var olmayan commit'e SHA ya da "çalışma ağacı" ile atıf yapmaz (`<taban-sha>..bu turun commit'i`); orkestratör görürse commit'ten önce düzeltir.

## Çıkış Kapısı

PROOF.md HEAD'de; her iddianın yanında kanıt referansı var; "Orkestratör doğrulaması" dolu (süreç/port temizliği dahil); kullanıcıya gösterildi → Adım 4 (`ship-it`).

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Testler az önce geçti." | Bu turda tekrar çalıştır; eski çıktı kanıt değildir. |
| "Görsel değişiklik ufak." | Ufak da olsa ekran görüntüsü zorunludur. |
| "Ekran görüntüsü alacak araç yok." | Web: `capture-page.mjs`; masaüstü (SON ÇARE): `capture-screen.ps1`. |
| "chrome-devtools kilitli; `CopyFromScreen` ile masaüstünü yakalarım." | Tam ekran = ilgisiz pencere + özel içerik; web için `capture-page.mjs`. |
| "Uygulama penceresi görünüyor, kabul ettim." | Görüntünün TAMAMI denetlenir; özel içerik varsa ham görüntü commit'lenmez. |
| "Alt-ajan başarı dedi." | Kendin çalıştır, `git diff`'e bak. |
| "Kanıtı PR açıklamasına yazarım." | Dosyaya yaz; PR ona link verir. |
