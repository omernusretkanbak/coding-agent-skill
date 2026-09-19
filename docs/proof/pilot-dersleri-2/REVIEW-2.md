# İnceleme — Tur 2

| PR | Aralık (inceleyiciye verilen) | İnceleyici | Yazar |
|---|---|---|---|
| #3 | `4ed9a0f..d0d8e6e` (Tur 2 farkı `362f93d..d0d8e6e`) | Fable 5.1 (taze bağlam, `Agent(model: fable)`) | Sonnet 5 |

```
SKOR: 5
KARAR: PRODUCTION_READY
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)
GUCLU_YANLAR:
- `.claude/skills/prove-it/scripts/capture-page.mjs:673-692` — ONEMLI-2 gerçekten kapandı: `zoom-source.png` + göreli `<img src>`'li `zoom.html` koşuya özgü `profileDir`'e yazılıp `file://` ile geziliyor, profil diziniyle birlikte temizleniyor; `:336-346` `formatUrlForError` `data:` URL'leri şema+uzunluğa indiriyor. `capture-page.selftest.mjs:620-689` testi kaynak PNG'nin ≥1,5 MB olduğunu `bigBuf.length` ile assert edip (900x900 gürültü) `--zoom-image` çıkış 0 + IHDR 40x40 doğruluyor — mock değil.
- `capture-page.mjs:256-276` (`pngDims` imza + `IHDR`), `:834-838` (`--region/--scale` yalnız zoom'da), `:753-754` (`reloadEventPromise.catch`) — REVIEW-1 KUCUK-1/2/4 birebir; `selftest.mjs:589-618` iki geçersiz-PNG testi "profil:" satırının YOKLUĞUNU assert ederek tarayıcının hiç açılmadığını gerçekten kanıtlıyor; `:537-564` merkez + (0,0) + (79,79) köşe pikselleri (KUCUK-3).
- Kanıt "önce"si gerçek: `362f93d`'nin değişmemiş `capture-page.mjs`'ini scratchpad'e çıkarıp (`buildZoomDataUrl` var, `PNG_SIGNATURE` yok, `node --check` 0) yeni K1/K2 testlerini ona karşı kendim koştum → 3/3 FAIL, hata metinleri PROOF.md:301-338 ile birebir (`0 !== 2`, CDP `params.width - BINDINGS: int32`, `Attempt to access memory outside buffer bounds`).
- Kendi koşum: `node --test capture-page.selftest.mjs` 17/17 PASS, çıkış 0, 67 sn; öncesi/sonrası `capture-page-|setInterval` süreç 0/0, `%TEMP%\capture-page*` 0, junction artığı 0. Eski dosyanın 8 testinin hepsi yeni dosyada korunmuş (+9 yeni).
- `PROOF-template.md:33` + `SKILL.md:23,60-61` — ONEMLI-1 kapandı ve yeniden üretilebilirlik fiilen doğrulandı: G4‴ fixture'ının (`g/4` `6732a50`, `docs/proof/gorev-silme/PROOF.md`) kaydettiği `after-tamamlandi.png --region 120,62,90,30 --scale 8` komutunu aynen koştum → 720x240, "Sil" üzerinde çizgi net; kontrol bölgesi `0,15,260,45 --scale 5` → 1300x225, düğme temiz. Fixture PROOF'u 4/4 iddiayı kendi bölge kaydıyla, iddia 4'ü YANLIŞ + `[ ]` + üstü çizili gösteriyor — PROOF.md:436 anlatısıyla aynı. R4 (`r/4` `b19548f`) yanlış iddia `[x]` + "üstü çizili DEĞİL" — PROOF.md:24 ile aynı.
- Kapsam/sayılar: `git diff --numstat 362f93d..d0d8e6e` PROOF.md:413'teki beş satırla birebir (+1/−1, +5/−5, +119/−28, +133/−8, +161/−0); `4ed9a0f..d0d8e6e`'de `pilot-dersleri/PROOF.md` +9/−0 ve taban satır 44 gerçekten "ölçüldü: orijinal PID ~birkaç ms"; AGENTS.md/CLAUDE.md/settings/diğer üç skill/`capture-screen.ps1`/`docs/proof/README.md` `git diff --quiet` → 0; `wc -w` 496/390/500/492; `capture-page.test.mjs`'e canlı referans yok (yalnız tarihsel PROOF/REVIEW ve selftest başlık yorumu); PR açıklamasında `.claude/**` hariç tutma taşıma notu var; REVIEW-1 PR yorumu olarak yazılmış (15:42Z). Sınır denemelerim: `x+w==800` çıkış 0 (160x32), `641,…` çıkış 2, negatif/ondalık bölge çıkış 2, eksik dosya çıkış 2, `--zoom-image`+`--setup` çıkış 0, tüm görsel `--scale 8` → 6400x2400 çıkış 0; hepsinden sonra süreç 0. Diff üç geçişte okundu (şablon/SKILL/docs; `capture-page.mjs`; eski test → yeni selftest).
ENGELLEYICI:
- YOK
ONEMLI:
- YOK
KUCUK:
- `capture-page.mjs:314-329` (`prepareZoom`) — `--width/--height`, `--zoom-image` ile verildiğinde sessizce eziliyor (`args.width = region.w * args.scale`); denedim: `--zoom-image … --region 20,60,160,32 --width 100 --height 50` → çıkış 0, 640x128. REVIEW-1 KUCUK-2'nin aynası; `main()` `:834-838`'deki koruma gibi `widthExplicit/heightExplicit` izleyip zoom modunda çıkış 2 ver (ya da `--help`'te "zoom'da yok sayılır" yaz).
- `capture-page.mjs:134-144` (`parseRegion`) — `Number(''.trim())` 0 döndüğü için boş alanlar geçiyor; denedim: `--region ,,10,10` → çıkış 0, 40x40 (0,0,10,10 sayıldı). Parçaları `Number()`'dan önce `/^\d+$/` ile doğrula.
- `capture-page.selftest.mjs:220-228` — `harnessTimeoutMs = innerTimeoutMs + CLEANUP_BUDGET_MS` tanımlanıp hemen `>= innerTimeoutMs + CLEANUP_BUDGET_MS` assert ediliyor: totoloji, hiçbir zaman patlayamaz ("sözleşme" korumadığı halde koruyor görünüyor). Ya kaldır ya da sabitlerden türeyen gerçek bir değişmezi (ör. `CLEANUP_BUDGET_MS >= 1000 + 600 + 3000 + 15000`) assert et.
- `SKILL.md:23` komutu `--scale` içermiyor ama `PROOF-template.md:33` yuvası `--scale n` kaydı istiyor; SKILL'i harfiyen izleyen orkestratör varsayılanın 4 olduğunu `--help`'ten bilmek zorunda. Komuta `[--scale n]` ekle; dosya 500/500 olduğundan örn. "(scratch'e; adı/bölgesi PROOF'a)" → "(adı/bölgesi PROOF'a)" ile 2 kelime kırp.
- PR #3 açıklaması (`gh pr view 3`) Tur 1'de kalmış: "13/13, çıkış 0" (şimdi 17/17) ve baskı testi tablosu G4′'te bitiyor (G4″ FAIL → iddia başına yuva → G4‴ yok). Undraft'tan önce orkestratör gövdeyi Tur 2'ye göre güncellesin.
- Kaynak izi: G4″ (`c5af03c`) fixture'ı yeniden kurulumda ezilmiş; scratchpad `logs/`, `evidence/`, `g/*` içinde `c5af03c` izi yok (0 eşleşme). İddia-başına REFACTOR'u gerekçelendiren FAIL yalnız PROOF.md:435 anlatısında yaşıyor (sonuç etkilenmiyor: G4‴ `6732a50` doğrulanabilir ve tutuyor). Gelecekte ara fixture'ı ezmeden önce PROOF'unu `docs/proof/<dal>/` altına kopyala ya da `git bundle` al.
GEREKCE: REVIEW-1'in yedi maddesinin hepsi gerçek RED/GREEN ile kapanmış — KIRMIZI'ları değişmemiş `362f93d` betiğine karşı kendim yeniden ürettim, 17/17 test ve 0/0 yetim benim koşumda da tutuyor, yeni yuvanın kaydettiği bölge/ölçekle G4‴ kırpıntısını birebir yeniden üretip "Sil" çizgisini gördüm; kalanlar (sessizce yutulan `--width/--height`, gevşek `--region` ayrıştırma, totolojik assert, bayat PR gövdesi, G4″ izi) davranışı ya da kanıtı zedelemeyen küçük pürüzler.
```

## Orkestratör kararı

SKOR 5 → PR gövdesi Tur 2'ye göre güncellendi (KUCUK-5), PR hazır işaretlenir, bağlantı kullanıcıya sunulur, DURULUR. Merge yapılmaz; karar kullanıcınındır. Kalan KÜÇÜK notlar (`--width/--height` zoom'da yutuluyor, `--region` boş alan, totolojik assert, SKILL komutunda `[--scale n]`, ara fixture izinin saklanması) yeni tur açmaz; PR açıklamasında takip notu olarak kayıtlı.
