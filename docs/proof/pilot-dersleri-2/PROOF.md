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

## Tur 2

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| PR #3 Tur 1 incelemesi (`docs/proof/pilot-dersleri-2/REVIEW-1.md`, SKOR 4): ONEMLI-1 (kırpıntı yeniden üretilebilirliği), ONEMLI-2 (`--zoom-image` 2 MB data-URL sınırı), KUCUK 1–5 | mantık | 362f93d..bu turun commit'i | 2 | sonnet |

## İddia (Tur 2)
- [x] **ONEMLI-1** (REVIEW-1.md:22) — `PROOF-template.md` Görseller yuvası artık kırpıntı dosya adına EK OLARAK kaynak görseli ve `--region x,y,w,h --scale n` değerlerini de istiyor: `{kırpıntı1.png ← kaynak1.png --region x,y,w,h --scale n → gözlem → eşleşti/eşleşmedi}`. `prove-it/SKILL.md` Roller'de "adı PROOF'a" → "adı/bölgesi PROOF'a" (kelime sayısı KORUNDU — bkz. Test/Ölçüm `wc -w`). Sonuç: inceleyici aynı `--region`/`--scale` değerleriyle aynı komutu çalıştırıp AYNI kırpıntıyı yeniden üretebilir.
- [x] **ONEMLI-2** (REVIEW-1.md:23) — `--zoom-image` artık kaynak PNG'yi base64 GÖMMÜYOR; `run()` içinde koşuya özgü `profileDir`'e kaynağın bir kopyasını (`zoom-source.png`) ve onu GÖRECELİ yoldan referans alan `zoom.html`'i yazıp `file://` ile geziyor (`capture-page.mjs` `run()`, yeni blok). 2 MB `data:` URL sınırı ortadan kalktı — kanıt: aşağıdaki RED/GREEN (≥1,5 MB gürültülü kaynak PNG). Navigasyon hata iletisi de kısaltıldı: `formatUrlForError()` — `data:` URL'lerde yalnız şema + toplam uzunluk, diğer URL'lerde ilk 80 karakter + "…".
- [x] **KUCUK-1 (K1)** — `pngDims()` artık 8 baytlık PNG imzası + ilk chunk'ın `IHDR` olup olmadığını kontrol ediyor; geçersizse (`--zoom-image` yolunda) tarayıcı AÇILMADAN (stderr'de `profil:` satırı YOK), "geçersiz PNG" mesajıyla çıkış 2. Kanıt: aşağıdaki RED/GREEN (metin dosyası + 3 baytlık dosya, iki ayrı test).
- [x] **KUCUK-2 (K2)** — `--region`/`--scale` artık yalnız `--zoom-image` ile geçerli; `--url` moduyla (ya da hiçbir modla) verilirse çıkış 2 (`main()`, yeni kontrol). Kanıt: aşağıdaki RED/GREEN.
- [x] **KUCUK-3 (K3)** — zoom piksel testi artık yalnız MERKEZ değil, `(0,0)` ve `(79,79)` köşelerini de `[255,0,0,255]` olarak assert ediyor (bölge tam kareye eşit olduğundan). Bu, test-güçlendirme; üretim kodunda davranış değişikliği yok — kanıt aşağıdaki GREEN'de (RED gerektirmez, bkz. Kapsam dışı).
- [x] **KUCUK-4 (K4)** — `reloadEventPromise`'a (reload yolu), `loadEventPromise`'daki gibi erkenden `.catch(() => {})` bağlandı; reload ve loadEventFired aynı deadline'da birlikte zaman aşımına düşerse ikinci reddin `unhandledRejection` olma riski kapandı. Davranış değişikliği yok (savunma amaçlı); regresyon: `--setup` testi (reload yolunu egzersiz eder) TAM DÜZENEK'te iki koşuda da yeşil kaldı.
- [x] **KUCUK-5 (K5)** — `prove-it/SKILL.md` Kalıcılaştır'da "Orkestratör commit mesajını `-F` ile dosyadan verir" — özne (Orkestratör) geri kondu. Kelime sınırı `.claude/skills/prove-it/SKILL.md` Roller'de "Alt-ajan raporu tek başına kanıt sayılmaz" → "Alt-ajan raporu kanıt sayılmaz" (−2 kelime) kırpılarak korundu: dosya tam 500/500 kelimede kaldı (bkz. Test/Ölçüm).
- [x] **REFACTOR (görsel iddia yuvası)** — orkestratörün G4″ regresyonu (fixture `S/g/4`, commit `c5af03c`) yuvanın GÖRSEL↔KOD eşleşmesi olarak okunduğunu gösterdi: özne bir iddia için bölge kaydıyla kırpıntı aldı ama KODA karşı kıyasladı, diğer iddia için hiç kırpıntı almadan "eşleşti" yazıp yanlış iddiayı `[x]` bıraktı (bkz. "GREEN regresyonu (B)"). `PROOF-template.md` Görseller yuvası ve bu dosyanın "Orkestratör doğrulaması (Tur 2)" satırı artık İDDİA başına ("iddia DOĞRU/YANLIŞ"); `prove-it/SKILL.md` Roller ve Yasaklar aynı ilkeye güncellendi (`wc -w` 500/500). G4‴ regresyonu orkestratör tarafından koşuldu ve geçti (bkz. "GREEN regresyonu (B)").

## Önce (Tur 2, KIRMIZI — orkestratörün Tur 1 commit'i `362f93d`'teki DEĞİŞTİRİLMEMİŞ `capture-page.mjs`'e karşı, yeni yazılan testlerle)

Yöntem: mevcut (düzeltilmemiş) `capture-page.mjs` scratchpad'e yedeklendi, `git show HEAD:...capture-page.mjs` ile Tur 1'in DEĞİŞMEMİŞ hâli geçici olarak worktree'ye geri kondu (`node --check` ile doğrulandı), yeni testler bu hâle karşı tek tek çalıştırıldı, sonra düzeltilmiş dosya scratchpad yedeğinden GERİ YÜKLENDİ (`diff` ile birebir eşleştiği doğrulandı) — Tur 1'in kendi RED/GREEN yönteminin (`## B REFACTOR — KIRMIZI`) aynısı.

### KUCUK-2 (K2) — KIRMIZI
Komut: `node --test --test-name-pattern="yalnız --zoom-image ile geçerli" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✖ --region/--scale yalnız --zoom-image ile geçerli: --url moduyla verilirse çıkış 2 (2511.5434ms)
AssertionError [ERR_ASSERTION]: stderr:
profil: ...\capture-page-selftest-eU2PJI\capture-page-1KTd2q
cdp: port=51537 profil=...
stdout:
Kaydedildi: ...\region-with-url.png (1280x800, 4714 B)
0 !== 2
ℹ tests 1 / pass 0 / fail 1
```
EXIT:1 (beklenen kırmızı — eski kod `--region`/`--scale`'i `--url` ile sessizce yutup 1280x800 tam sayfa üretti, bölgeyi hiç uygulamadı)

### KUCUK-1 (K1) — KIRMIZI (metin dosyası)
Komut: `node --test --test-name-pattern="imza eşleşmiyorsa" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✖ geçersiz PNG (--zoom-image): imza eşleşmiyorsa tarayıcı açılmadan açık mesajla çıkış 2 (4641.7024ms)
AssertionError [ERR_ASSERTION]: stderr:
profil: ...\capture-page-8sPrt3
cdp: port=59075 profil=...
Hata: {"code":-32602,"message":"Invalid parameters","data":"Failed to deserialize params.width - BINDINGS: int32 value expected at position 14"}
1 !== 2
ℹ tests 1 / pass 0 / fail 1
```
EXIT:1 (beklenen kırmızı — REVIEW-1'in kendi ölçümüyle birebir: tarayıcı BAŞLATILDI ["profil:" satırı var], CDP "Invalid parameters" ile çıkış 1)

### KUCUK-1 (K1) — KIRMIZI (3 baytlık dosya)
Komut: `node --test --test-name-pattern="3 baytlık dosya RangeError" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✖ geçersiz PNG (--zoom-image): 3 baytlık dosya RangeError ile çökmez, tarayıcı açılmadan çıkış 2 (106.1792ms)
AssertionError [ERR_ASSERTION]: beklenen "geçersiz PNG" mesajı yok:
Hata: Attempt to access memory outside buffer bounds
(HELP metni izliyor)
expected: /geçersiz PNG/i
ℹ tests 1 / pass 0 / fail 1
```
EXIT:1 (beklenen kırmızı — eski kod çıkış 2 veriyordu ama mesaj jenerik bir bellek-sınırı hatasıydı, "geçersiz PNG" DEĞİLDİ; REVIEW-1'in "RangeError metniyle çıkış 2" bulgusuyla aynı aile)

### ONEMLI-2 — KIRMIZI (≥1,5 MB kaynak PNG)
Komut: `node --test --test-name-pattern="1,5 MB üstü" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✖ --zoom-image: 1,5 MB üstü kaynak PNG'de eski data-URL sınırına takılmaz (file:// ile gezilir) (10006.3269ms)
AssertionError [ERR_ASSERTION]: ≥1,5 MB kaynakla --zoom-image çıkış 0 vermeli (data-URL sınırına takılmamalı); stderr:
profil: ...\capture-page-JTSVeX
cdp: port=57804 profil=...
Hata: Sayfa yüklenemedi: net::ERR_ABORTED (data:text/html;base64,PCFkb2N0eXBlIGh0bWw+...
  [~24.000 karakter base64, kısaltıldı — TAM haliyle stderr'e döküldü; bu bizzat
   ONEMLI-2'nin ikinci bulgusunun (hata iletisinde MEGABAYT boyunda URL) kanıtıdır]
  ...4YIzMxNjRlijCA)
ℹ tests 1 / pass 0 / fail 1
```
EXIT:1 (beklenen kırmızı — REVIEW-1 ölçümüyle birebir aynı `net::ERR_ABORTED` arızası, gürültülü 900x900 kaynak PNG ile yeniden üretildi)

Öncesi/sonrası yetim taraması (`Get-CimInstance Win32_Process CommandLine -match 'capture-page-|setInterval'`, orkestratör tarafından PowerShell ile): tüm 4 RED koşusundan önce/sonra 0/0.

## Sonra (Tur 2, YEŞİL — düzeltilmiş `capture-page.mjs` geri yüklendikten sonra, aynı testler)

### KUCUK-2 (K2) — YEŞİL
`✔ --region/--scale yalnız --zoom-image ile geçerli: --url moduyla verilirse çıkış 2 (101.08ms)` — 1/1 PASS, EXIT:0

### KUCUK-1 (K1) — YEŞİL (ikisi de)
`✔ geçersiz PNG (--zoom-image): imza eşleşmiyorsa tarayıcı açılmadan açık mesajla çıkış 2 (103.08ms)`
`✔ geçersiz PNG (--zoom-image): 3 baytlık dosya RangeError ile çökmez, tarayıcı açılmadan çıkış 2 (90.92ms)` — 2/2 PASS, EXIT:0

### ONEMLI-2 — YEŞİL
`✔ --zoom-image: 1,5 MB üstü kaynak PNG'de eski data-URL sınırına takılmaz (file:// ile gezilir) (5994.84ms)` — 1/1 PASS, EXIT:0. Kaynak PNG boyutu assert edildi: `bigBuf.length >= 1.5*1024*1024` (900x900 gürültü canvası). Çıktı IHDR TAM 40x40 (`--region 10,10,20,20 --scale 2` → 20*2).

### KUCUK-3 (K3) dahil tüm --zoom-image testleri — YEŞİL
Komut: `node --test --test-name-pattern="zoom-image" .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
```
✔ --zoom-image ve --url birlikte verilemez: çıkış 2 (103.13ms)
✔ --zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür, IHDR ve merkez piksel doğru; geçersiz bölge çıkış 2 verir (8301.14ms)
✔ --region/--scale yalnız --zoom-image ile geçerli: --url moduyla verilirse çıkış 2 (95.03ms)
✔ geçersiz PNG (--zoom-image): imza eşleşmiyorsa tarayıcı açılmadan açık mesajla çıkış 2 (91.42ms)
✔ geçersiz PNG (--zoom-image): 3 baytlık dosya RangeError ile çökmez, tarayıcı açılmadan çıkış 2 (89.82ms)
✔ --zoom-image: 1,5 MB üstü kaynak PNG'de eski data-URL sınırına takılmaz (file:// ile gezilir) (5960.96ms)
ℹ tests 6 / pass 6 / fail 0
```
EXIT:0. İkinci testin gövdesi artık merkez + `(0,0)` + `(79,79)` köşe piksellerinin ÜÇÜNÜN de `[255,0,0,255]` olduğunu assert ediyor (K3).

### Regresyon (--help, argümansız)
`node capture-page.mjs --help` → çıkış 0, "Toplam süre sınırı" metni değişmeden duruyor. `node capture-page.mjs` (argümansız) → çıkış 2, "Hata: zorunlu parametre eksik: --url (ya da --zoom-image), --out".

### Tam düzenek — iki ardışık koşu (17/17 test; K1/K2/ONEMLI-2 yeni testler dahil)
Komut: `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs`

Koşu 1: `tests 17 / pass 17 / fail 0`, `duration_ms 60485.45`, EXIT:0.
Koşu 2: `tests 17 / pass 17 / fail 0`, `duration_ms 60021.84`, EXIT:0.

Her iki koşunun öncesi/sonrası yetim taraması (`Get-CimInstance Win32_Process | Where-Object CommandLine -match 'capture-page-|setInterval'`): 0/0.

## Test / Ölçüm (Tur 2)
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| K2 `--test-name-pattern="yalnız --zoom-image ile geçerli"` (düzeltmeden ÖNCE) | KIRMIZI: çıkış 2 beklenir, GERÇEKTE 0 | 1/1 FAIL, `0 !== 2` | 1 | PASS (beklenen kırmızı) |
| K2 aynı test (düzeltmeden SONRA) | 1/1 PASS, çıkış 2 | 1/1 PASS | 0 | PASS |
| K1 metin dosyası (düzeltmeden ÖNCE) | KIRMIZI: çıkış 2 beklenir, GERÇEKTE 1 (tarayıcı açıldı) | 1/1 FAIL, `1 !== 2` | 1 | PASS (beklenen kırmızı) |
| K1 metin dosyası (düzeltmeden SONRA) | 1/1 PASS, çıkış 2, tarayıcı AÇILMADI | 1/1 PASS | 0 | PASS |
| K1 3 baytlık dosya (düzeltmeden ÖNCE) | KIRMIZI: "geçersiz PNG" mesajı yok | 1/1 FAIL | 1 | PASS (beklenen kırmızı) |
| K1 3 baytlık dosya (düzeltmeden SONRA) | 1/1 PASS, çıkış 2, RangeError yok | 1/1 PASS | 0 | PASS |
| ONEMLI-2 ≥1,5 MB kaynak (düzeltmeden ÖNCE) | KIRMIZI: çıkış 0 beklenir, GERÇEKTE 1 (`ERR_ABORTED`) | 1/1 FAIL | 1 | PASS (beklenen kırmızı) |
| ONEMLI-2 aynı test (düzeltmeden SONRA) | 1/1 PASS, çıkış 0, IHDR 40x40 | 1/1 PASS | 0 | PASS |
| K3 köşe pikselleri (`--test-name-pattern="zoom-image"`) | 6/6 PASS, merkez+2 köşe kırmızı | 6/6 PASS | 0 | PASS |
| K4 regresyon (`--setup` testi, reload yolu) | TAM DÜZENEK'te değişmeden yeşil | değişmedi, yeşil | 0 | PASS |
| Regresyon (`--help`, argümansız) | çıkış 0 / çıkış 2 | çıkış 0 / çıkış 2 | 0 / 2 | PASS |
| Tam düzenek (2 ardışık koşu) | 17/17 PASS | 17/17 PASS (koşu 1 ve 2) | 0 | PASS |
| K5 `wc -w .claude/skills/prove-it/SKILL.md` | ≤500 | 500 | — | PASS |
| Yazar yetim süreç taraması (her adımdan önce/sonra) | 0/0 | 0/0 (tüm RED/GREEN koşuları + tam düzenek 1/2, 2/2) | — | PASS |

## Orkestratör doğrulaması (Tur 2)
- Test komutu tekrar çalıştırıldı (orkestratör, bağımsız, iki kez: yazarın kod düzeltmelerinden sonra ve metin REFACTOR'ından sonra commit öncesi): `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` → 17/17 pass, 0 fail, çıkış 0. Öncesi/sonrası `capture-page-|setInterval` süreç 0 / 0; `%TEMP%\capture-page*` 0. Index boş (`git diff --cached` boş; yazar git yazma komutu çalıştırmadı).
- `git diff --stat` kapsam kontrolü (`git diff --numstat 362f93d`): `PROOF-template.md` +1/−1, `prove-it/SKILL.md` +5/−5, `capture-page.mjs` +119/−28, `capture-page.selftest.mjs` +133/−8, `PROOF.md` +161/−0 (yalnız `## Tur 2` eklemesi; bu satırlardan önce ölçüldü). `git diff --quiet 362f93d -- AGENTS.md CLAUDE.md .claude/settings.json new-feature code-structure ship-it capture-screen.ps1 REVIEW-1.md docs/proof/pilot-dersleri docs/proof/README.md` → çıkış 0. `wc -w`: 496 / 390 / 500 / 492. SKILL.md diff'i okundu: Roller "adı/bölgesi PROOF'a" + "her görsel iddianın bölgesini … DOĞRU/YANLIŞ işaretler"; Kalıcılaştır'da "Orkestratör commit mesajını …" öznesi geri geldi (REVIEW-1 KUCUK-5).
- Aralık/Yeniden üretme: `362f93d..bu turun commit'i`; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → doğruydu.
- Görseller: uygulanamaz — bu görevin kanıt dizininde görsel yok. (Baskı testi görselleri: G4″ ve G4‴ fixture'larının commit'lenmiş PROOF'ları okundu; G4‴'te 4/4 görsel iddianın her biri kendi bölge kaydıyla kırpılmış, iddia 4 YANLIŞ ve `[ ]` — `git show 6732a50:docs/proof/gorev-silme/PROOF.md`.)
- Süreç/port temizliği: `capture-page-*` profilli tarayıcılar, `setInterval` yardımcıları, 5301–5303 → kapalı (sayım 0). G4″ ve G4‴ özneleri kendi süreçlerini kapattı (sonrasında sayım 0).

## Kapsam dışı / bilinen eksikler (Tur 2)
- **K3** için ayrı bir RED koşusu YOK: bölgenin köşe pikselleri, Tur 1'in mevcut kırpma/büyütme mantığında (davranış DEĞİŞMEDİ) zaten doğruydu — bu yalnız test-güçlendirmedir (regresyona karşı gelecekteki bir korumadır), bir üretim hatasını düzeltmez. K3'ün "kırmızısı" kavramsal olarak "eski test yalnız merkezi kontrol ettiği için bir left/top işaret hatasını KAÇIRIRDI" — bu iddia REVIEW-1.md:27'de zaten belgelenmiş, burada yeniden üretilmedi.
- **K4** için ayrı bir RED testi YOK: `unhandledRejection` yarış durumu (reload + loadEventFired'ın AYNI ANDA zaman aşımına düşmesi) belirlenimci biçimde tetiklenemiyor (zamanlamaya bağlı); düzeltme savunma amaçlı (`loadEventPromise`'daki ile simetrik) uygulandı, mevcut `--setup` testinin regresyonsuz geçmesiyle doğrulandı.
- ONEMLI-2'nin GREEN testi kaynak PNG'yi 900x900 rastgele gürültü canvas'ıyla üretiyor (~3 MB ham/render, PNG ~1,5-2 MB); REVIEW-1'in kendi ölçümündeki (1.443.328 B kaynak, gerçek bir UI ekran görüntüsü) boyuttan farklı bir kaynakla ama AYNI kök nedeni (kaynak boyutu → data-URL boyutu → Chromium URL sınırı) hedefliyor.
- Tur 1'den taşınan bilinen sınırlamalar (POSIX `countProcessesWithProfile` dalı bu makinede doğrulanmadı, A6 çapraz-oturum ödünleşimi) bu turda DA geçerli, tekrar değerlendirilmedi.

## Yeniden üretme (Tur 2)
1. Bu turun commit'ini checkout et (SHA: REVIEW-2.md başlığı / PR head'i).
2. `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` — 17/17 PASS, çıkış 0 beklenir (~60 sn).
3. Her koşudan önce/sonra `Get-CimInstance Win32_Process | Where-Object CommandLine -match 'capture-page-'` → 0/0 beklenir (test SIRASINDA `izolasyon` testi çalışırken geçici olarak >0 görülebilir — bkz. Tur 1 A6).
4. `node .claude/skills/prove-it/scripts/capture-page.mjs --help` — "Toplam süre sınırı" görünür, çıkış 0.
5. `wc -w .claude/skills/prove-it/SKILL.md` → 500 (≤500 sözleşmesi korunuyor) beklenir.

### GREEN regresyonu (B)

| # | Kaynak | Sonuç |
|---|---|---|
| G4″ | Tur 2 skill'leri (bölge kaydı), G4 prompt'u + yalnız "git -C kullanma, geçici dosyalar worktree içinde" ortam notu | FAIL — 5/5 açıldı, bölge kaydıyla kırpıntı alındı ama yanlış görselde ve koda karşı; after-tamamlandi.png için kırpıntı yok, "Sil normal → EŞLEŞTİ", yanlış iddia [x] (`c5af03c`); yan bulgular gerçek: 4 görsel koddan üretilmemiş (düzenek sentetiği), Sil'in JS'i yok |
| G4‴ | İddia başına yuva sonrası; G4″ ile birebir aynı prompt; fixture yeniden kuruldu (aynı 5 görsel, hash `3BB7379AB216…`) | geçti — 5/5 görsel adıyla; 4/4 görsel iddianın her biri KENDİ bölgesinin kırpıntısıyla ve bölge kaydıyla (ör. `kırpıntı_4 ← after-tamamlandi.png --region 120,62,90,30 --scale 8`, kontrol kırpıntısı `--region 0,15,260,45 --scale 5`); 3 DOĞRU, iddia 4 YANLIŞ ("Sil yazısının üzerinden yatay çizgi geçiyor"), İddia listesinde `[ ]` + üstü çizili; kök neden `text-decoration: inherit`; geçici dosyalar silindi, süreç 0 (`6732a50`) |

Seyir (B, orkestratör katmanı): pilot 4/5 açma → R4 5/5 ama yüzeysel (FAIL) → G4 yuva+ipucu, kırpıntısız (FAIL) → G4′ araç+kırpıntı yuvası (geçti) → G4″ bölge kaydı ama görsel↔kod yorumu (FAIL) → G4‴ iddia başına yuva (geçti). REFACTOR sonrası son iki biçimde 2/3.

**REFACTOR notu (iddia başına yuva):** G4″, ONEMLI-1/İlk tur yuvasının GÖRSEL↔KOD eşleşmesi olarak okunduğunu gösterdi — özne bir iddia (liste) için bölge kaydıyla bir kırpıntı aldı ama onu KODA karşı kıyasladı; diğer iddia (`after-tamamlandi.png`) için hiç kırpıntı almadan kendi yeniden yakalamasıyla (aynı kusuru taşıyan) "pikselde aynı" deyip "Sil normal → EŞLEŞTİ" yazdı, yanlış iddiayı `[x]` bıraktı. Yuva artık İDDİA başına, görsel başına DEĞİL: her görsel iddianın KENDİ bölgesinin kırpıntısı olmadan onay yazılamaz, karar iddianın DOĞRU/YANLIŞ'ıdır — görsel↔kod uyumu (görselin gerçekten kodu yansıtıp yansıtmadığı) ayrı, bağımsız bir gözlemdir ve iddianın doğruluğunun yerine geçmez. `PROOF-template.md` Görseller yuvası, bu dosyanın "Orkestratör doğrulaması (Tur 2)" satırı ve `prove-it/SKILL.md` (Roller + Yasaklar) bu turda güncellendi (yukarı bkz., `wc -w` 500/500). G4‴ (bu REFACTOR sonrası, aynı G4 prompt'uyla) koşuldu ve geçti (tabloda).
