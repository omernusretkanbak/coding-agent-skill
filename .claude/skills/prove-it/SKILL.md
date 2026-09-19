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

Kanıt, bu turda üretilip dosyaya yazılmış, kullanıcıya gösterilmiş çıktıdır. "Çalışıyor" kanıt değildir; komut çıktısı, görüntü, sayı kanıttır.

**REQUIRED SUB-SKILL:** superpowers:verification-before-completion — kanıtsız iddia yasağı budur.

## Roller

Yazar (Sonnet) `PROOF.md` taslağını üretir. Orkestratör bağımsız doğrular: testi tekrar çalıştırır; kanıttaki TÜM görselleri adıyla açıp listeler, iddia bölgesini `node .claude/skills/prove-it/scripts/capture-page.mjs --zoom-image <png> --region x,y,w,h --out <kırpıntı>` ile kırpıp büyütür (scratch'e; adı PROOF'a); `git diff --stat`/Aralığı kontrol eder, "Orkestratör doğrulaması"nı doldurur. Alt-ajan raporu tek başına kanıt sayılmaz. **Zorunlu:** süreçler kapalı mı — rapor/PROOF/yapılandırmadaki her port: Windows `Get-NetTCPConnection -LocalPort <p> -State Listen`, Unix `lsof -i :<p>`; açıksa PID'i durdur (toplu öldürme yasak), PROOF'a yaz.

## Kanıt Türü

Gözlemlenebilir yüklem: değişiklik ekranı/görsel çıktıyı değiştiriyor mu?

- **Evet** → görsel kanıt: `before.png` + `after.png` (ya da kısa kayıt).
- **Hayır** → mantık kanıtı: tam komut + çıktı + çıkış kodu; sayı varsa önce/sonra tablosu; regresyon düzeltmesinde kırmızı-yeşil (geri al → başarısız → geri koy → geçer).
- **İkisi birden** → ikisi de zorunlu.

## Görsel Kanıt Araç Sırası

1. **Web sayfası:** chrome-devtools `take_screenshot` (`filePath`). Kilitliyse ("already running … --isolated") beklemeden `node .claude/skills/prove-it/scripts/capture-page.mjs --url <url> --out <yol>` (headless, yalnız sayfa; `--help`).
2. **Masaüstü uygulaması, SON ÇARE:** `capture-screen.ps1` birincil ekranın TAMAMINI yakalar. Commit'ten önce Read ile aç; özel içerik/ilgisiz pencere varsa sil — yalnız kırpılmış sürüm commit'lenir. Diğer tam ekran yöntemleri (`CopyFromScreen` dahil) aynı risktedir.
3. Uygulama ayakta değilse `preview_start`/`run`.

"Önce" görüntüsü KOD DEĞİŞMEDEN alınır (yoksa `main` worktree'sinde); asla uydurulmaz/sonradan üretilmez.

## Kalıcılaştır

`docs/proof/<dal-slug>/PROOF.md` (şablon `PROOF-template.md`), görseller yanına yazılır; commit mesajı `-F` ile dosyadan, `Co-Authored-By` ekler, `--amend`/`--no-verify` yasak; `SendUserFile` ile gösterilir (yoksa mutlak yol + GitHub linki); yeni tur `## Tur N` EKLER, üzerine yazmaz; Aralık/Yeniden üretme var olmayan commit'e SHA/"çalışma ağacı" atıf yapmaz (`<taban-sha>..bu turun commit'i`), orkestratör görürse önce düzeltir.

## Çıkış Kapısı

PROOF.md HEAD'de; her iddia kanıt referanslı; "Orkestratör doğrulaması" dolu (süreç/port, görseller n/n dahil); kullanıcıya gösterildi → Adım 4 (`ship-it`).

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Testler az önce geçti." | Bu turda tekrar çalıştır; eski çıktı geçersiz. |
| "Görsel değişiklik ufak." | Ufak da olsa ekran görüntüsü zorunludur. |
| "Ekran görüntüsü alacak araç yok." | Web: `capture-page.mjs`; masaüstü (SON ÇARE): `capture-screen.ps1`. |
| "chrome-devtools kilitli; `CopyFromScreen` ile masaüstünü yakalarım." | Tam ekran = ilgisiz pencere + özel içerik; web'de `capture-page.mjs`. |
| "Uygulama penceresi görünüyor, kabul ettim." | Görüntünün TAMAMI denetlenir; özel içerik varsa ham görüntü commit'lenmez. |
| "Alt-ajan başarı dedi." | Kendin çalıştır, `git diff`'e bak. |
| "Kanıtı PR açıklamasına yazarım." | Dosyaya yaz; PR ona link verir. |
| "Görsellerin çoğuna baktım, diğeri de aynıdır." | Atlanan görsel farkı gizleyebilir; HER görsel açılır. |
| "Görseli açtım, düğme normal görünüyor." | Kırpıntı (`--zoom-image`) yoksa "normal" denmez. |
