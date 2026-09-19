# KANIT — pilot-dersleri-2

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| coding-agent-skill PR #2 (`4ed9a0f`) sonrası takip: REVIEW-2 KÜÇÜK notları (A1–A5) + host proje test bulucu çakışması (C) + eşzamanlı-oturum izolasyonu (A6, ara talimat) + görsel doğrulama "Match the Form" (B: yuva + `--zoom-image` aracı, ara talimat) | mantık | 4ed9a0f..bu turun commit'i | 1 | sonnet |

## İddia
- [x] **A1** (REVIEW-2 KUCUK-1, `capture-page.selftest.mjs` `countProcessesWithProfile`) — test kâhini artık betikle (`buildProfileDirFilter`) AYNI filtreyi kullanıyor: `$_.Name -in @(...) -and $_.CommandLine -and $_.CommandLine.Contains('...')`, `-like '*...*'` kaldırıldı. Kanıt: scratchpad demosu (`kucuk1-demo.mjs`) — köşeli parantezli (`w[1]-...`) sahte profil yolunda eski `-like` 0, yeni `.Contains` 2 (iki yardımcı `node -e` süreci) buldu; sahte süreçler PID ile kapatıldı, temizlik sonrası 0.
- [x] **A2** (REVIEW-2 KUCUK-2, `capture-page.selftest.mjs` `runCapture`) — ölü `opts` parametresi kaldırıldı (hiçbir çağıran ikinci argüman geçmiyordu); `harnessTimeoutMs` artık HER ZAMAN `innerTimeoutMs + CLEANUP_BUDGET_MS`'den türetiliyor; sözleşme assert'i `harnessTimeoutMs >= innerTimeoutMs + CLEANUP_BUDGET_MS`. Davranış değişikliği yok (ölü kod), TAM DÜZENEK'in yeşil kalmasıyla doğrulandı.
- [x] **A3** (REVIEW-2 KUCUK-3, `capture-page.mjs` `run()`/`CdpClient`) — `--timeout-ms` artık ADIM BAŞINA değil, `run()` başında belirlenen TEK bir `deadline`'a göre uygulanıyor; her CDP adımı ve `--wait-ms` beklemesi `remainingMs()`/`requireTime()` ile KALAN süreyle sınırlanıyor, aşılırsa açık hata + çıkış 1 (temizlik yine çalışıyor). `--help` metni "Toplam süre sınırı" olarak güncellendi. Kanıt: aşağıdaki RED/GREEN ("toplam süre sınırı" testi).
- [x] **A4** (REVIEW-2 KUCUK-4, `capture-page.mjs` ana-modül koruması) — `pathToFileURL(process.argv[1])` yerine `realpathSync(process.argv[1])` ile çözülmüş yol karşılaştırılıyor; junction/symlink üzerinden çağrıda artık sessizce 0 ile çıkmıyor. Kanıt: aşağıdaki RED/GREEN (Windows junction testi).
- [x] **A5** (REVIEW-2 KUCUK-5, `docs/proof/pilot-dersleri/PROOF.md` sonu) — mevcut satırlar DEĞİŞTİRİLMEDİ (yalnız `git diff --numstat` `9 0` — 9 ekleme, 0 silme); dosyanın sonuna PROOF.md:44'teki "ölçüldü" ifadesinin REVIEW-1/REVIEW-2'de yeniden üretilemediğini, REVIEW-1'in kendi çoğaltmasında (`REVIEW-1.md:23`) spawn PID'in 5,2 sn yaşadığını ve stratejinin (profil-dizini taraması) etkilenmediğini belirten `## Düzeltme notu (pilot-dersleri-2)` bölümü eklendi.
- [x] **A6** (ara talimat — başka bir oturumun Fable incelemesi, fabrika-pilot PR #6: eşzamanlı oturum izolasyonu) — `before()`/`after()`/yetim sayımları artık MAKİNE GENELİNDE değil, bu koşuya ÖZGÜ bir kök dizine (`runRoot = mkdtempSync(...,'capture-page-selftest-')`) göre yapılıyor; `runCapture` her alt süreç için `TEMP`/`TMP`/`TMPDIR` ortam değişkenlerini bu köke yönlendiriyor (betik DEĞİŞMEDİ — yalnızca `os.tmpdir()` çağıranın ortamını okuyor, bu doğrulandı). Eski makine-geneli tarama `countCapturePageProcessesMachineWide()` olarak bilgi-amaçlı (assert edilmeyen) bir fonksiyona indirgendi. Yeni kalıcı regresyon testi: "izolasyon: eşzamanlı YABANCI bir capture-page- profili ... kök-taramalı kontrolü yanlış nedenle düşürmez" — GERÇEK bir yabancı (env override'sız) tarayıcı çalıştırırken kök-taramalı sayım 0 kalıyor, makine-geneli sayım (bilgi) 16'ya çıkıyor. Kanıt: aşağıdaki RED (scratchpad `a6-red-demo.mjs`) + GREEN (gerçek test). Ek bulgu: rename (C) ayrıca Vitest worker'ında `after()`'a hiç ulaşılmayıp boş `capture-page-selftest-*`/`capture-page-test-out-*` dizinlerinin kalması sorununu da çözüyor — bkz. "C" bölümü RED çıktısı, bu sorunun kanıtı orada.
- [x] **C** (host projede test bulucu çakışması) — `capture-page.test.mjs` → `capture-page.selftest.mjs` olarak taşındı (düz dosya kopyala+sil; `git mv` KULLANILMADI); içindeki başlık yorumu ve tüm çalıştırma talimatları güncellendi. Kanıt: aşağıdaki `scratchpad/b2/vitest-host` RED/GREEN tekrarı.
- [x] **B** (dördüncü ders: "Match the Form" — görsel doğrulamada eksik öğe/yüzeysel bakış) — İlk tur: `prove-it/PROOF-template.md`'deki "Görseller açıldı / eşleşti" yer tutucusu yapısal bir yuvaya çevrildi, `prove-it/SKILL.md` Roller'de teknik ipucu eklendi (PowerShell `System.Drawing`), Yasaklar'a iki bahane eklendi. G4 baskı testi bunun YETERSİZ olduğunu gösterdi (bkz. "## GREEN (B)"): özne 5/5 görseli açtı ama HİÇBİR kırpıntı üretmedi, yanlış iddiayı "eşleşti" işaretledi — ipucu bir ARAÇ değildi. **REFACTOR:** `capture-page.mjs`'e `--zoom-image/--region/--scale` yakınlaştırma modu eklendi (TDD: RED sonra GREEN, aşağıda); `PROOF-template.md` Görseller yuvası artık AÇIKÇA kırpıntı listesi istiyor (`--zoom-image` çıktısı, "eşleşti" yalnız kırpıntı varsa yazılabilir); `SKILL.md` Roller'deki ipucu TEK bir çalıştırılabilir komuta (`capture-page.mjs --zoom-image ...`) çevrildi. Toplam kelime sayısı ≤ 500 korundu. GREEN: REFACTOR sonrası G4′ geçti (kırpıntıyla kusuru yakaladı, yanlış iddiayı düşürdü) — bkz. "## GREEN (B)".

## Önce

### B — KIRMIZI (orkestratör ölçtü; iki ayrı arıza biçimi)

| # | Kaynak | Arıza biçimi | Gözlem |
|---|---|---|---|
| Pilot | fabrika-pilot PR #3 Tur 1 | Görsel ATLAMA | Orkestratör "Görseller açıldı / eşleşti: evet" yazdı ama 5 görselden yalnız 4'ünü açmıştı; açılmayan `after-toggle-focus.png`'de `li.done` line-through'u tamamlanmış satırdaki "Sil" düğmesine de geçiyordu (regresyon). Fable incelemesi bunu yakaladı, SKOR 4. |
| R4 | skill'ler `main` @ `4ed9a0f`, Sonnet orkestratör öznesi, fixture `S/r/4` | YÜZEYSEL bakış (görsel açıldı ama iddia edilen küçük bölge incelenmedi) | Yazar taslağında yanlış iddia vardı: "Tamamlanmış satırda Sil düğmesi normal görünür, üstü çizili değil (after-tamamlandi.png)"; gerçekte görselde (800x300) düğme metni GRİ ve ÜSTÜ ÇİZİLİ, normal boyutta da görünür durumda. Özne 5/5 görseli AÇTI ama "düğme metni üstü çizili DEĞİL" yazıp yanlış iddiayı `b19548f` ile commit'ledi. Sonuç: FAIL. |

Her iki arıza da eski şablon yuvasının ("evet"/"hayır" serbest metni) hem eksik-açma hem yüzeysel-bakışı YAKALAMADIĞINI gösteriyor — bu yüzden B, yer tutucuyu yapısal bir yuvaya (Pilot'un açığı) ve SKILL.md'ye açık bir tekniğe (R4'ün açığı) çeviriyor (writing-skills "Match the Form").

### A1 — KIRMIZI (scratchpad, `kucuk1-demo.mjs`; eski `-like` filtresi)
Komut: `node kucuk1-demo.mjs` (scratchpad `b2/`)
```
fakeProfileDir: C:\Users\nusre\AppData\Local\Temp\w[1]-kucuk1-demo-1789805012255
helper PIDs: [ 54568, 39800 ]
ESKI (-like) sayim: 0 (beklenen 0)
YENI (.Contains) sayim: 2 (beklenen 2, iki yardimci surec)
temizlik sonrasi (.Contains) sayim: 0 (beklenen 0)
```
EXIT: 0 (beklentiler karşılandı — ESKİ filtrenin köşeli parantezli yolda 0 bulması, yani yanlış negatif vermesi, budur; bu "kırmızı"nın kendisidir)

### A3 — KIRMIZI (`capture-page.mjs` düzeltmeden ÖNCE, adım-bazlı `--timeout-ms`)
Komut: `node --test --test-name-pattern="toplam süre sınırı" .claude/skills/prove-it/scripts/capture-page.test.mjs`
```
✖ toplam süre sınırı: adım başına değil TÜM çalışmaya uygulanır (yavaş sayfa + --wait-ms toplamda aşar) (12659.6364ms)
ℹ tests 1
ℹ pass 0
ℹ fail 1
  AssertionError [ERR_ASSERTION]: beklenen: gecikme (1500ms) + --wait-ms (6000ms) toplamı --timeout-ms'i (6000ms) aşıyor, çıkış 1 olmalı; stderr:
  profil: C:\Users\nusre\AppData\Local\Temp\capture-page-aXXJTa
  cdp: port=51339 profil=C:\Users\nusre\AppData\Local\Temp\capture-page-aXXJTa
  stdout:
  Kaydedildi: C:\Users\nusre\AppData\Local\Temp\capture-page-test-out-NKEJKG\global-timeout.png (1280x800, 4714 B)
  0 !== 1
EXIT:1
```
(Yani eski davranış: her adım kendi TAM `--timeout-ms` bütçesiyle sıfırlanan bir saatle ölçülüyor, `--wait-ms` hiç sınırlanmıyor; toplamda gecikme(1500)+wait-ms(6000)=7500ms, `--timeout-ms`(6000)'i aştığı halde betik BAŞARIYLA (çıkış 0) tamamlanıyor — bu, testin BEKLEDİĞİ `1`'e karşı `0` üretip KIRMIZI vermesidir.)

### A4 — KIRMIZI (`capture-page.mjs` düzeltmeden ÖNCE, `pathToFileURL(process.argv[1])`)
Komut: `node --test --test-name-pattern="ana-modül koruması" .claude/skills/prove-it/scripts/capture-page.test.mjs`
```
✖ ana-modül koruması (Windows junction): junction üzerinden çağrıda CLI sessizce çıkmaz, kullanım hatasıyla çıkış 2 verir (107.6302ms)
ℹ tests 1
ℹ pass 0
ℹ fail 1
  AssertionError [ERR_ASSERTION]: junction üzerinden argümansız çağrı kullanım hatasıyla (çıkış 2) bitmeli, sessizce 0 ile çıkmamalı; stdout:

  stderr:

  0 !== 2
EXIT:1
```
(Junction üzerinden çağrılan CLI hiçbir çıktı vermeden, `main()` hiç çalışmadan sessizce 0 ile çıkıyor.)

### A6 — KIRMIZI (scratchpad, `a6-red-demo.mjs`; eski makine-geneli, izole-edilmemiş sayım)
Komut: `node a6-red-demo.mjs` (scratchpad `b2/`; gerçek bir "yabancı" `capture-page.mjs` çalıştırması — env override'sız, gerçek sistem temp'inde — canlıyken hem eski (makine geneli) hem yeni (kök-taramalı) sorgu koşuluyor)
```
ourRunRoot: C:\Users\nusre\AppData\Local\Temp\capture-page-selftest-AHewmY
ESKI (makine geneli, A6 ONCESI before/after mantigi) sayim: 16 (beklenen >=1 -- eski assert.equal(...,0) BURADA DUSERDI)
YENI (runRoot taramali, A6) sayim: 0 (beklenen 0 -- izole, etkilenmedi)
EXIT:0
```
(Eski `before()`/`after()` mantığı bu payı — tek bir gerçek yabancı tarayıcının 16 alt sürecini — "yetim" sayıp `assert.equal(...,0)` ile DÜŞERDİ; bu KIRMIZI'nın kanıtıdır.)

### C — KIRMIZI (`scratchpad/b2/vitest-host`, eski ad `capture-page.test.mjs`)
Kurulum: `package.json` (`"type":"module"`, `"test":"vitest run"`), `src/ornek.test.mjs` (tek geçen test), `.claude/skills/prove-it/scripts/{capture-page.mjs, capture-page.test.mjs}` (kaynak depodan kopya; test dosyası KASITLI olarak eski adla). `npm install --prefer-offline --no-audit --no-fund vitest` → `added 37 packages in 10s` (yerel önbellek yeterliydi, ağ gerekmedi).

Komut: `npx vitest run`
```
 RUN  v5.0.1 .../scratchpad/b2/vitest-host

stderr | .claude/skills/prove-it/scripts/capture-page.test.mjs
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (başlangıç): 0

 ❯ .claude/skills/prove-it/scripts/capture-page.test.mjs (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  .claude/skills/prove-it/scripts/capture-page.test.mjs [ .claude/skills/prove-it/scripts/capture-page.test.mjs ]
Error: No test suite found in file .../vitest-host/.claude/skills/prove-it/scripts/capture-page.test.mjs

 Test Files  1 failed | 1 passed (2)
      Tests  1 passed (1)
   Start at  11:19:14
   Duration  2.52s
EXIT:1
```
Ek bulgu (A6'nın son maddesiyle örtüşüyor): bu RED koşusu `before()`'ı vitest'in import aşamasında TETİKLEDİ (yukarıdaki "bilgi:" satırı ve `%TEMP%\capture-page-selftest-*`, `capture-page-test-out-*` dizinlerinin oluşması bunun kanıtı) ama vitest node:test'in `after()`'ını HİÇ ÇAĞIRMADI — bu dizinler boş kalıp birikirdi. Kontrol edildi ve elle temizlendi (bkz. SURECLER).

## Sonra

### A3 — YEŞİL (`capture-page.mjs` düzeltmeden SONRA)
Komut: `node --test --test-name-pattern="toplam süre sınırı" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✔ toplam süre sınırı: adım başına değil TÜM çalışmaya uygulanır (yavaş sayfa + --wait-ms toplamda aşar) (7162.8321ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
EXIT:0
```
(7,2 sn — RED'deki 12,7 sn'den belirgin biçimde kısa: yeni kod `--wait-ms`'i hiç başlatmadan, kalan sürenin yetersiz olduğunu GÖRÜR GÖRMEZ hata veriyor.)

### A4 — YEŞİL (`capture-page.mjs` düzeltmeden SONRA)
Komut: `node --test --test-name-pattern="ana-modül koruması" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✔ ana-modül koruması (Windows junction): junction üzerinden çağrıda CLI sessizce çıkmaz, kullanım hatasıyla çıkış 2 verir (144.7055ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
EXIT:0
```
Regresyon kontrolü (doğrudan çağrı, junction'sız): `node capture-page.mjs --help` → çıkış 0; `node capture-page.mjs` (argümansız) → çıkış 2, "Hata: zorunlu parametre eksik: --url, --out". Değişmedi.

### A6 — YEŞİL (gerçek regresyon testi)
Komut: `node --test --test-name-pattern="izolasyon" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (başlangıç): 0
bilgi: yabancı süreç aktifken makine geneli (izole edilmemiş) tarama: 16 (>=1 beklenir; A6 öncesi before()/after() bu payı YANLIŞ NEDENLE 0 sanıp düşerdi)
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (bitiş): 0
✔ izolasyon: eşzamanlı YABANCI bir capture-page- profili (başka oturumu simüle eder) bu koşunun kök-taramalı kontrolünü yanlış nedenle düşürmez (7523.9327ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
EXIT:0
```
Ayrıca doğrulandı: kendi (izole) capture'ımızın profil dizini GERÇEKTEN `runRoot` altına düşüyor (`ownProfileDir.startsWith(runRoot)` — ayrı bir scratchpad doğrulamasıyla da (`verify-env-override.mjs`) teyit edildi: `profileDir starts with runRoot? true`), betikte (`capture-page.mjs`) HİÇBİR değişiklik yapılmadan.

### C — YEŞİL (`scratchpad/b2/vitest-host`, yeni ad `capture-page.selftest.mjs`)
İşlem: `.claude/skills/prove-it/scripts/capture-page.test.mjs` → `capture-page.selftest.mjs` (host projede de).

Komut: `npx vitest run`
```
 RUN  v5.0.1 .../scratchpad/b2/vitest-host

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  11:19:57
   Duration  209ms
EXIT:0
```
Yalnız `src/ornek.test.mjs` çalıştı (1/1 PASS); `capture-page.selftest.mjs` vitest'in varsayılan desenine ARTIK uymadığı için hiç import edilmedi — doğrulama: koşu sonrası `%TEMP%` altında `capture-page-*` dizini OLUŞMADI (RED'deki gibi `before()` hiç tetiklenmedi).

### B REFACTOR — KIRMIZI (`--zoom-image` yokken, iki yeni test)
Komut: `node --test --test-name-pattern="zoom-image" .claude/skills/prove-it/scripts/capture-page.selftest.mjs` (`capture-page.mjs` GEÇİCİ olarak zoom-öncesi hâline döndürülüp çalıştırıldı — yalnız zoom hunk'ları elle geri alındı, `node --check` ile doğrulandı, TAM içerik farkı zoom eklemeleriyle birebir eşleşti; sonra scratchpad yedeğinden GERİ YÜKLENDİ)
```
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (başlangıç): 0
✖ --zoom-image ve --url birlikte verilemez: çıkış 2 (100.89ms)
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (bitiş): 0
✖ --zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür, IHDR ve merkez piksel doğru; geçersiz bölge çıkış 2 verir (2557.2563ms)
ℹ tests 2
ℹ pass 0
ℹ fail 2
ℹ duration_ms 6197.8166

✖ failing tests:
  "--zoom-image ve --url birlikte verilemez: çıkış 2"
  AssertionError: --zoom-image bayrağı tanınmıyor gibi görünüyor:
  Hata: Bilinmeyen parametre: --zoom-image
  ...
  "--zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür..."
  AssertionError [ERR_ASSERTION]: stderr:
  Hata: Bilinmeyen parametre: --zoom-image
  ...
  2 !== 0
EXIT:1
```
(İlk RED denemesinde yalnız çıkış-kodu kontrolü vardı ve `--zoom-image`'ın "Bilinmeyen parametre" ile de 2 döndüğü için YANLIŞLIKLA geçiyordu; test `stderr`'in "Bilinmeyen parametre" İÇERMEDİĞİNİ ve "BİRLİKTE verilemez" İÇERDİĞİNİ de zorunlu kılacak şekilde güçlendirildi — yukarıdaki KIRMIZI bu güçlendirilmiş hâlin çıktısıdır.)

Öncesi/sonrası yetim taraması (`Get-CimInstance ... capture-page-`): 0/0.

### B REFACTOR — YEŞİL (`--zoom-image` eklendikten sonra, aynı iki test)
Komut: `node --test --test-name-pattern="zoom-image" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (başlangıç): 0
✔ --zoom-image ve --url birlikte verilemez: çıkış 2 (102.5996ms)
bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (bitiş): 0
✔ --zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür, IHDR ve merkez piksel doğru; geçersiz bölge çıkış 2 verir (8171.3458ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
ℹ duration_ms 12047.6434
EXIT:0
```
Bu test: (1) 200x150 beyaz sayfada bilinen `(50,50,20,20)` kırmızı kareyi `capture-page.mjs --url` ile yakalar; (2) `--region 190,140,20,20` (sınır dışı) → çıkış 2, PNG oluşmaz; (3) `--region 50,50,20,20 --scale 4` → çıkış 0, IHDR TAM 80x80; (4) çıktı PNG'yi kendi `capture-page.mjs --url file://…verify.html --eval` ile bir `<canvas>`'a çizip `getImageData` okur — merkez piksel `[255,0,0,255]` (tam kırmızı, yeni bağımlılık YOK). Öncesi/sonrası yetim taraması: 0/0.

### Tam düzenek — iki ardışık koşu (13/13 test; zoom testleri dahil)
Komut: `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs`

Koşu 1 (özet):
```
✔ temel yakalama: PNG imzası + IHDR boyutu istenenle eşleşir, çıkış 0 (4003.636ms)
✔ --media prefers-color-scheme=dark karanlık CSS uygular, --media olmadan açık kalır (4885.5864ms)
✔ --setup ile localStorage tohumlama sonrası DOM tohumu gösterir (2738.416ms)
✔ temizlik: çıkıştan sonra profil dizini yok, CDP portu cevap vermiyor, yetim süreç kalmıyor (3527.4848ms)
✔ erişilemeyen URL: çıkış 1, temizlik yapılmış, yetim süreç kalmıyor (6008.2374ms)
✔ iç zaman aşımı (--timeout-ms 1): çıkış 1, temizlik yapılmış, yetim süreç kalmıyor (5334.423ms)
✔ toplam süre sınırı: adım başına değil TÜM çalışmaya uygulanır (yavaş sayfa + --wait-ms toplamda aşar) (7441.3209ms)
✔ izolasyon: eşzamanlı YABANCI bir capture-page- profili (başka oturumu simüle eder) bu koşunun kök-taramalı kontrolünü yanlış nedenle düşürmez (7867.5993ms)
✔ --url verilmezse çıkış 2 (91.4483ms)
✔ --zoom-image ve --url birlikte verilemez: çıkış 2 (93.1897ms)
✔ --zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür, IHDR ve merkez piksel doğru; geçersiz bölge çıkış 2 verir (8129.8798ms)
✔ ana-modül koruması (Windows junction): junction üzerinden çağrıda CLI sessizce çıkmaz, kullanım hatasıyla çıkış 2 verir (187.4003ms)
✔ killByProfileDir (Windows): yardımcı süreçleri öldürür, sorguyu çalıştıran kendi PowerShell sürecini öldürmez (1519.3673ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
ℹ duration_ms 55607.0582
EXIT:0
```

Koşu 2 (özet): aynı 13 test, hepsi ✔, `tests 13 / pass 13 / fail 0`, `duration_ms 53056.8332`, EXIT:0. Her iki koşunun öncesi/sonrası yetim taraması: 0/0.

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| A1 scratchpad (`kucuk1-demo.mjs`) | eski 0, yeni 2, temizlik-sonrası 0 | eski 0, yeni 2, temizlik-sonrası 0 | 0 | PASS |
| A3 `--test-name-pattern="toplam süre sınırı"` (düzeltmeden ÖNCE) | KIRMIZI: çıkış 1 beklenir, GERÇEKTE 0 | 1/1 FAIL, `0 !== 1` | 1 | PASS (beklenen kırmızı) |
| A3 aynı test (düzeltmeden SONRA) | 1/1 PASS, çıkış 1 (script) / 0 (test) | 1/1 PASS | 0 | PASS |
| A4 `--test-name-pattern="ana-modül koruması"` (düzeltmeden ÖNCE) | KIRMIZI: çıkış 2 beklenir, GERÇEKTE 0 | 1/1 FAIL, `0 !== 2` | 1 | PASS (beklenen kırmızı) |
| A4 aynı test (düzeltmeden SONRA) | 1/1 PASS | 1/1 PASS | 0 | PASS |
| A4 regresyon (`--help`, argümansız, junction'sız) | çıkış 0 / çıkış 2 | çıkış 0 / çıkış 2 | 0 / 2 | PASS |
| A6 scratchpad (`a6-red-demo.mjs`) | eski(makine-geneli) >=1, yeni(kök) 0 | eski 16, yeni 0 | 0 | PASS |
| A6 `--test-name-pattern="izolasyon"` (gerçek test, düzeltmeyle) | 1/1 PASS, kök-taramalı 0, makine-geneli bilgi >=1 | 1/1 PASS, kök 0, bilgi 16 | 0 | PASS |
| A6 env-override doğrulaması (`verify-env-override.mjs`) | kendi profil dizini `runRoot` altında | `profileDir starts with runRoot? true` | 0 | PASS |
| C vitest RED (`vitest-host`, eski ad) | "No test suite found", çıkış 1 | aynen | 1 | PASS (beklenen kırmızı) |
| C vitest GREEN (`vitest-host`, yeni ad) | yalnız `ornek.test.mjs`, 1/1 PASS, çıkış 0 | aynen | 0 | PASS |
| B REFACTOR `--test-name-pattern="zoom-image"` (`--zoom-image` yokken) | KIRMIZI: 2/2 FAIL | 2/2 FAIL (`Bilinmeyen parametre: --zoom-image`) | 1 | PASS (beklenen kırmızı) |
| B REFACTOR aynı testler (`--zoom-image` eklendikten sonra) | 2/2 PASS, IHDR 80x80, merkez piksel `[255,0,0,255]` | 2/2 PASS, IHDR 80x80, piksel `[255,0,0,255]` | 0 | PASS |
| Tam düzenek (`capture-page.selftest.mjs`, 2 ardışık koşu) | 13/13 PASS | 13/13 PASS (2/2 koşu) | 0 | PASS |
| Yazar yetim süreç taraması (her adımdan önce/sonra, `Get-CimInstance Win32_Process CommandLine -match 'capture-page-\|setInterval'`) | 0/0 | 0/0 (tüm koşular: A1, A3 RED/GREEN, A4 RED/GREEN, A6 scratchpad/test/verify, C RED/GREEN, B REFACTOR RED/GREEN, tam düzenek 1/2, tam düzenek 2/2) | — | PASS |

## Orkestratör doğrulaması
- Test komutu tekrar çalıştırıldı (orkestratör, bağımsız, iki kez): A+C+A6 sonrası `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` → 11/11 pass, çıkış 0; B REFACTOR (`--zoom-image`) sonrası → 13/13 pass, 0 fail, çıkış 0. Her koşunun öncesi/sonrası `Get-CimInstance Win32_Process | Where-Object CommandLine -match 'capture-page-|setInterval'` → 0 / 0; `%TEMP%\capture-page*` → 0. Argümansız → çıkış 2; `--help` "Toplam süre sınırı" gösteriyor. C: `scratchpad\b2\vitest-host`'a güncel `capture-page.mjs` + `capture-page.selftest.mjs` kopyalanıp `npx vitest run` → "Test Files 1 passed (1)", çıkış 0 (selftest'e dokunulmadı). Araç gerçek vakada: `capture-page.mjs --zoom-image <s4-images\after-tamamlandi.png> --region 20,60,160,32 --scale 4` → 640x128, çıkış 0; açıldı: "Sil" üzerinde çizgi net.
- `git diff --stat` kapsam kontrolü (`git diff --numstat`): `PROOF-template.md` +1/−1, `prove-it/SKILL.md` +16/−14, `capture-page.mjs` +195/−15, `capture-page.test.mjs` −361 (silindi; yeni ad `capture-page.selftest.mjs`, 670 satır), `docs/proof/pilot-dersleri/PROOF.md` +9/−0 (yalnız sona ekleme), yeni `docs/proof/pilot-dersleri-2/PROOF.md`. `git diff --quiet origin/main -- AGENTS.md CLAUDE.md .claude/settings.json new-feature code-structure ship-it capture-screen.ps1 docs/proof/README.md docs/proof/software-factory pilot-dersleri/REVIEW-1.md REVIEW-2.md` → çıkış 0. `wc -w`: new-feature 496, code-structure 390, prove-it 500, ship-it 492. Eski test adına referans (SKILL.md, capture-page.mjs, şablon): 0. Yazarın `git add -N` sapması: index boş doğrulandı (`git diff --cached` boş). Diff okundu; B sıkıştırmasında "Kalıcılaştır"ın öznesi ("Orkestratör commit'ler") örtük kaldı — anlam korunuyor, inceleyiciye bırakıldı.
- Aralık/Yeniden üretme: `4ed9a0f..bu turun commit'i`; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → doğruydu.
- Görseller: uygulanamaz — bu görevin kanıt dizininde (`docs/proof/pilot-dersleri-2/`) görsel yok. (Baskı testi düzeneği görselleri — `s4-images` 5/5 — orkestratör tarafından ayrıca açıldı: ilk üretimde `after-tamamlandi.png`'de kusur YOKTU — `text-decoration` düğmeye yayılmaz; 5x kırpıntıyla (`zoom-done-row.png`) tespit edilip düzenek düzeltildi; ikinci üretimde kırpıntı `s4-zoom-done.png` ve `orch-zoom-check.png` → "Sil" gri ve üstü çizili, eşleşti. Diğer 4 görsel: çizgisiz düğmeler / düğmesiz taban.)
- Süreç/port temizliği: `capture-page-*` profilli tarayıcılar, testlerin `setInterval` yardımcıları, 5301–5303 → kapalı (sayım 0, Listen 0). Asılı kalan iki G4 öznesi `TaskStop` ile durduruldu; ardından süreç sayımı 0.

## Kapsam dışı / bilinen eksikler
- Hedef depolara (`D:\sut-denetci-saas`, `D:\fabrika-pilot`) yeniden eşitleme — ayrı, taşıyan bir oturumun işi; bu turda yapılmadı.
- Host projede kök test bulucusunun `.claude/**`'ı hariç tutması gerektiği notu — bu PROOF'a değil, PR açıklamasına eklenecek (orkestratör).
- **B**'nin İlk tur metin değişiklikleri (`SKILL.md`, `PROOF-template.md`) G4 baskı testinde YETERSİZ çıktı (bkz. "## GREEN (B)"): ipucu bir araç değildi, özne kırpıntı üretmedi. **REFACTOR** bu turda tamamlandı: `capture-page.mjs`'e `--zoom-image/--region/--scale` eklendi (TDD RED/GREEN, "Sonra"), `PROOF-template.md`/`SKILL.md` bu komutu zorunlu kılacak şekilde güncellendi. G4′ baskı testi (REFACTOR sonrası) orkestratör tarafından koşuldu ve geçti — bkz. "## GREEN (B)".
- **Sapma:** kod incelemesi sırasında yanlışlıkla `git add -N .claude/skills/prove-it/scripts/capture-page.selftest.mjs` çalıştırıldı (talimat "git add ÇALIŞTIRMA" der); fark edilir edilmez `git reset <yol>` ile geri alındı, dosya İÇERİĞİ etkilenmedi, `git status --porcelain` eski `??` (untracked) durumuna döndüğü doğrulandı. Orkestratöre bu turda ayrıca bildirildi ("Index temiz" onayı alındı).
- `countProcessesWithProfile`'ın POSIX (`ps -eo comm,args` + `.includes`) dalı bu makinede (Windows) çalıştırılıp doğrulanmadı — yalnız statik olarak tutarlı yazıldı (Tur 1/2'den taşınan bilinen sınırlama, A1/A6 de aynı sınırlamayı miras alıyor).
- A6'nın kök-taramalı `before()` kontrolü artık trivyaldir (yeni `runRoot` her koşuda benzersiz olduğu için başlangıçta hiçbir sürecin onu taşıması mümkün değildir) — bu, ÖNCEKİ bir çökmüş koşudan kalan yetimleri (farklı bir eski `runRoot` altında oldukları için) artık YAKALAMAZ; bu, çapraz-oturum yanlış-pozitifini önlemenin bilinen bedelidir (talimatta öngörülen ödünleşim). Aynı koşu İÇİNDEKİ yetimler `after()` tarafından hâlâ yakalanır.

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` — 13/13 PASS, çıkış 0 beklenir (~50-56 sn; gerçek headless Edge + gerçek yardımcı/yabancı süreç senaryoları + zoom/kırpıntı testleri başlatır).
3. Her koşudan önce/sonra `Get-CimInstance Win32_Process | Where-Object CommandLine -match 'capture-page-'` → 0/0 beklenir (test SIRASINDA, `izolasyon` testi çalışırken, geçici olarak >0 görülebilir — bu BEKLENEN ve testin kendisinin doğruladığı davranıştır, bkz. A6).
4. `node .claude/skills/prove-it/scripts/capture-page.mjs --help` — kullanım metninde "Toplam süre sınırı" ifadesi görünür, çıkış 0 beklenir.

## GREEN (B)

| # | Kaynak | Sonuç |
|---|---|---|
| G4 | R4 ile aynı prompt, skill'ler REFACTOR ÖNCESİ (yalnız İlk tur değişiklikleri: yapısal yuva + `System.Drawing` ipucu) | liste: geçti (5/5 adıyla); büyütme: FAIL — kırpıntı yok, yanlış iddia "eşleşti" işaretlendi (`f9583f0`) |
| G4′ | G4 ile aynı prompt, skill'ler REFACTOR SONRASI (`--zoom-image` + kırpıntı isteyen yuva); fixture yeniden kuruldu (aynı 5 görsel, hash eşleşti) | geçti — "Görseller: 5/5 açıldı" + her görsel adıyla; `after-tamamlandi.png` için 5x kırpıntı (`tamamlandi-sil-zoom.png`) ve kontrast kırpıntısı (`sutual-sil-zoom.png`) alındı; "iddia 4 ile EŞLEŞMEDİ: Sil düğmesi gri VE üstü çizili"; kök neden `text-decoration: inherit` bulundu; yanlış iddia `[ ]` + üstü çizili yapıldı, "BLOKE EDİCİ" olarak yazıldı (`68bb668`); `.zoom\` silindi, süreç 0 |

Not (G4′ koşusu): ilk deneme 1 saat 14 dakika hiçbir dosya değiştirmeden asılı kaldı (son cümlesi: "tamamlanmış satırdaki düğmeyi büyütüp üstü çizili bulgusunu doğrulayayım" — kusuru kırpıntıdan önce fark etmişti; bir komut onay beklerken takıldı). Orkestratör aynı ajanı bağlamıyla sürdürdü; devam mesajında yalnız onay istemine takılmamak için "`git -C` kullanma, geçici dosyaları worktree içindeki `.zoom\`'a yaz, commit'leme" dendi. İlk G4 koşusu da bir kez aynı biçimde (4 saat, dosya değişmeden) asılı kalmış, durdurulup birebir aynı prompt'la yeniden koşulmuştu.

**REFACTOR notu (araç + yuva):** G4, ipucun ("(ör. PowerShell `System.Drawing`, ya da daha büyük yeniden yakalama)") zaman baskısında UYGULANMADIĞINI gösterdi — özne görselleri açtı/listeledi (Pilot'un açığı kapandı) ama hiç kırpıntı üretmedi ve iddiayı doğrulamadan "eşleşti" işaretledi (R4'ün açığı AYNEN tekrarladı). Bu turda İKİ değişiklik yapıldı: (1) **araç** — `capture-page.mjs --zoom-image/--region/--scale` artık TEK bir çalıştırılabilir komut, "ipucu" değil (yukarıdaki RED/GREEN); (2) **yuva** — `PROOF-template.md` Görseller satırı artık kırpıntı dosya adı + gözlem + eşleşti/eşleşmedi İSTİYOR ("eşleşti" yalnız kırpıntı varsa yazılabilir), `SKILL.md` Roller bu komutu birebir gösteriyor. G4′ (bu REFACTOR'dan sonra) koşuldu ve geçti (tabloda). Özet: pilot 4/5 açma → R4 5/5 açma ama yüzeysel → G4 5/5 listeleme ama kırpıntısız → G4′ 5/5 + kırpıntı + "EŞLEŞMEDİ".
