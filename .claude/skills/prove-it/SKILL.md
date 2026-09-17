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

Yazar (Sonnet) `PROOF.md` taslağını üretir. Orkestratör bağımsız doğrular: test komutunu KENDİSİ tekrar çalıştırır, görselleri açar, `git diff --stat` ile kapsamı kontrol eder, PROOF.md'deki "Orkestratör doğrulaması" bölümünü doldurur. Alt-ajanın "başarılı" raporu tek başına kanıt sayılmaz.

## Kanıt Türü

Gözlemlenebilir yüklem: değişiklik bir ekranı ya da görsel çıktıyı değiştiriyor mu?

- **Evet** → görsel kanıt zorunlu: `before.png` + `after.png` (ya da kısa kayıt).
- **Hayır** → mantık kanıtı zorunlu: tam komut + tam çıktı + çıkış kodu; sayı varsa önce/sonra tablosu; regresyon düzeltmesinde kırmızı-yeşil (düzeltmeyi geri al → başarısız → geri koy → geçer).
- **İkisi birden değişiyorsa** → ikisi de zorunlu.

## Görsel Kanıt Araç Sırası

1. chrome-devtools `take_screenshot` — `filePath` parametresiyle doğrudan diske yazar.
2. Claude_Browser `computer` screenshot yalnız görüntü döndürür → diske yazmak için `.claude/skills/prove-it/scripts/capture-screen.ps1 -Out <yol>` kullan.
3. Uygulama ayakta değilse `preview_start` ya da `run` skill ile başlat.

"Önce" görüntüsü KOD DEĞİŞMEDEN alınır; alınmadıysa `main` worktree'sinde alınır; asla uydurulmaz, asla sonradan üretilmez.

## Kalıcılaştır

`docs/proof/<dal-slug>/PROOF.md` (şablon: `PROOF-template.md`), görseller yanına yazılır. Orkestratör commit'ler: mesajı dosyadan (`-F`) verir, `Co-Authored-By` satırı ekler; `--amend` ve `--no-verify` yasaktır. `SendUserFile` ile kullanıcıya gösterilir (araç yoksa mutlak yol + GitHub blob linki verilir). Her yeni inceleme turu PROOF.md'ye `## Tur N` bölümü EKLER, üzerine yazmaz.

## Çıkış Kapısı

PROOF.md HEAD'de; her iddianın yanında kanıt referansı var; "Orkestratör doğrulaması" dolu; kullanıcıya gösterildi → Adım 4 (`ship-it`).

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Testler az önce geçti." | Bu turda tekrar çalıştır; eski çıktı kanıt değildir. |
| "Görsel değişiklik ufak." | Ufak da olsa ekran görüntüsü zorunludur. |
| "Ekran görüntüsü alacak araç yok." | `capture-screen.ps1` kullan. |
| "Alt-ajan başarı dedi." | Kendin çalıştır, `git diff`'e bak. |
| "Kanıtı PR açıklamasına yazarım." | Dosyaya yaz; PR ona link verir. |
