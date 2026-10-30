# KANIT — feat-ux-sinama

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| Yeni skill `ux-sinama`: bağımsız sınayıcı rolü + senaryo koşucusu (`senaryo-kos.mjs`) | mantık (görsel before/after yok; koşucunun ürettiği kareler testlerin konusu) | f3e80c4..bu turun commit'i | 1 | sonnet |

## İddia
- [ ] 1. Koşucu kasıtlı kusurlu fixture'ın kusurlarının HER BİRİNİ bulgu olarak üretir (konsol hatası, yakalanmamış istisna, 404 kaynak, yatay taşma, adsız düğme, `alt`sız görsel, başlık atlaması, küçük dokunmatik hedef, odak halkası kapalı bağlantı, küçük yazı); her bulgu senaryo adı + sayısal ölçüm + var olan kare içerir.
- [ ] 2. Temiz fixture'da tam 3×2 matris ve `--tekrar 2` ile bulgu da kararsızlık da yoktur, tüm adımlar geçer, çıkış 0.
- [ ] 3. URL bekçisi kodda zorlanır: `localhost`, `192.168.1.5`, `https://…`, `file:///`, portsuz adres → çıkış 2, tarayıcı açılmaz; senaryodaki mutlak dış `goto` başlamadan reddedilir; çalışma zamanında 127.0.0.1 dışına alt istek ve yönlendirme istek gönderilmeden engellenir ve ENGELLEYİCİ `dis-istek` bulgusu olur.
- [ ] 4. Yasak desen bekçisi (11 haneli sayı, TR cep telefonu, e-posta, `--yasak-desen` dosyası) senaryoda ve `--sun` dizinindeki metin dosyalarında eşleşme bulursa HİÇ başlamaz (çıkış 2) ve eşleşen metni DEĞİL yalnız `dosya:satır` + desen adını yazar.
- [ ] 5. `--sun` sunucusu salt-okunurdur (yalnız GET/HEAD), `..` ve kaçış kodlu `..` ile dizin dışına çıkılamaz, çıkışta port kapanır.
- [ ] 6. Süreç hijyeni: başarı, ENGELLEYİCİ bulgu, erken ve çalışırken zaman aşımı yollarında geçici profil dizini ve tarayıcı süreci kalmaz (capture-page.selftest ile aynı kontrol yöntemi).
- [ ] 7. `--tekrar 2` ile farklı çıkan hücre "kararsız senaryo" olarak raporlanır ve ürün bulgusu/çıkış kodu sayılmaz; `beklenti.json` kanıtsız beklentiyi ÖNEMLİ bulgu yapar, bilinmeyen kimlik çıkış 2 verir.
- [ ] 8. Tarayıcı yoksa tarayıcılı test kümesi NEDENİ yazılarak atlanır; `UX_SINAMA_TARAYICI_ZORUNLU=1` iken sessiz atlama yerine test başarısız olur.
- [ ] 9. Mevcut testler bozulmadı: `tests/kur.test.mjs` ve `capture-page.selftest.mjs` yeşil; ayna `.agents/skills` kanonikle aynı; `AGENTS.md` 24.000 baytın çok altında.

## Önce
Baz çizgisi (kod yazılmadan, taban f3e80c4):

```
node --test tests/kur.test.mjs
ℹ tests 20 · pass 20 · fail 0 · skipped 0          (çıkış 0)

node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs
ℹ tests 17 · pass 17 · fail 0 · skipped 0          (çıkış 0)
```

Kırmızı (testler koddan ÖNCE yazıldı; ham loglar `docs/proof/feat-ux-sinama/log/`, `*.log` `.gitignore`'da olduğundan commit'lenmez):

```
kirmizi-1-bekciler.log   senaryo-kos.mjs yokken bekçi/sunucu/CLI testleri:   tests 11 · pass 0 · fail 11
kirmizi-2-tarayici.log   koşucu gövdesi yokken (bekçiler yazılı):            tests 23 · pass 12 · fail 11   (11 tarayıcılı test kırmızı, çıkış 1)
kirmizi-3-favicon.log    favicon 404 testi, düzeltmeden önce:                 ✖ favicon.ico 404 gürültüsü ÖNEMLİ sayılmaz...   actual: 1, expected: 0
kirmizi-4-kur.log        ux-sinama SKILL.md/ayna yokken tests/kur.test.mjs:  tests 21 · pass 15 · fail 6
```

## Sonra
```
node --test tests/*.test.mjs                                           → ℹ tests 21 · pass 21 · fail 0 · skipped 0   (çıkış 0)   [yeni-kur.log]
node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs  → ℹ tests 17 · pass 17 · fail 0 · skipped 0   (çıkış 0)   [yeni-capture.log]
UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
                                                                       → ℹ tests 24 · pass 24 · fail 0 · skipped 0 · duration_ms 101901   (çıkış 0)   [yeni-ux.log]
node scripts/kur.mjs --hedef hepsi --kontrol                           → "Kontrol: kanonik kaynak ile kopyalar birebir aynı."
wc -c AGENTS.md                                                        → 3217
```

Elle koşu (kusurlu fixture, `--matris 390x844,1280x800 --tema acik`):
`ÖZET: ENGELLEYİCİ=0 ÖNEMLİ=15 KÜÇÜK=4 kararsız=0 çıkış=1`; bulgu türleri: adsiz-oge, ag-hatasi (`/yok-olan-betik.js` HTTP 404), alt-eksik, istisna, konsol-hatasi, odak-yok (1 öğe: `a "odağı görünmeyen bağlantı"`), yatay-tasma (scrollWidth 1508, innerWidth 390 ve 1280), dokunma-hedefi (yalnız 390 hücresi; en küçük 20x20), baslik-atlama (h1→h4), kucuk-yazi (9 px).

Mutasyon kontrolü (testlerin gerçekten kırılabildiği; kaynak her seferinde yedekten geri alındı, `cmp` ile doğrulandı):
```
çalışma zamanı dış istek bekçisi kapatıldı (izinliIstek = () => true)   → ✖ dış istek engeli · ✖ dış yönlendirme   (pass 0 · fail 2)
odak göstergesi denetimi "her zaman var" yapıldı                        → ✖ kusurlu fixture (odak-yok bulgusu üretilmedi)   (pass 0 · fail 1)
```

Tarayıcısız ortam simülasyonu (`CAPTURE_BROWSER` var olmayan yola) [tarayicisiz-atlama.log, tarayicisiz-zorunlu.log]:
```
(zorunlu bayrağı yok)           ℹ tests 24 · pass 12 · fail 0 · skipped 12 · çıkış 0
                                stderr: "ATLANDI: tarayıcılı test kümesi (B) çalışmadı. Neden: tarayıcı bulunamadı (Edge/Chrome yok; ...)"
UX_SINAMA_TARAYICI_ZORUNLU=1    ✖ tarayıcı gerekli mi: ... sessiz atlama YOK, test başarısız olur   ℹ pass 11 · fail 1 · skipped 12 · çıkış 1
```

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/*.test.mjs` | 21 test yeşil (20 baz + 1 yeni ux-sinama kopyalama testi) | 21/21 | 0 | PASS |
| `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` | baz ile aynı: 17/17 | 17/17 | 0 | PASS |
| `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` | 24 test yeşil, atlama yok | 24/24, skipped 0 | 0 | PASS |
| aynı komut, tarayıcı yok + zorunlu bayrak | sessiz geçmez | 1 fail, 12 skipped | 1 | PASS (beklenen kırmızı) |
| `node scripts/kur.mjs --hedef hepsi --kontrol` | ayna aynı | "birebir aynı" | 0 | PASS |

## Orkestratör doğrulaması
Orkestratör, 2026-10-30, cwd = worktree, yazar raporuna dayanmadan kendi koşusu:
- `node --test tests/kur.test.mjs` -> tests 21, pass 21, fail 0.
- `node .claude/skills/prove-it/scripts/capture-page.selftest.mjs` -> tests 17, pass 17, fail 0.
- `UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` -> tests 24, pass 24, fail 0, skipped 0 (~106 sn).
- `node scripts/kur.mjs --hedef hepsi --kontrol` -> "kanonik kaynak ile kopyalar birebir aynı".
- Kapsam: `git status` yalnız AGENTS.md, README.md, docs/KURULUM.md, tests/kur.test.mjs değişikliği + yeni `.claude/skills/ux-sinama/`, `.agents/skills/ux-sinama/`, `docs/proof/feat-ux-sinama/`; `git diff --stat` 4 dosya +37/-1.
- Sızıntı ön taraması (grep: kişisel ad, yerel yol, sağlık verisi, özel altyapı ve proje adları, özel IP): yalnız redd edilmesi test edilen genel örnek `192.168.1.5` ve depo sahibinin zaten yayında olan şablon komutu çıktı; ayrıca bağımsız sızıntı okuması ve Fable incelemesi ayrı yapılır.
- Orkestratörce denenmedi: tarayıcısız simülasyon (yazarın logu), gerçek bir sitede pilot (sonraki iş).

## Kapsam dışı / bilinen eksikler
- Görsel fark (piksel karşılaştırma) yok; sonraki sürüm.
- Ham test logları `*.log` olduğu için `.gitignore` tarafından commit dışıdır; sayılar yukarıda alıntılanmıştır. Alıntılarda yerel yol/geçici dizin adı yoktur; ham loglarda vardır (commit'e girmez).
- 127.0.0.1 dışı engeli CDP `Fetch` alanı üzerindendir ve yalnız ANA SAYFA hedefinin HTTP(S) istek ve yönlendirmelerini kapsar. Kapsam dışı: WebSocket, WebRTC, worker ve `window.open`/`target=_blank` ile açılan yeni hedefler Fetch'ten geçmez. Yeni hedeflerin loopback dışı trafiği `--proxy-server=127.0.0.1:1` (ölü proxy) ve `--proxy-bypass-list=<-loopback>;127.0.0.1` ile durdurulur (örtük bypass kaldırıldığından link-local ve `*.localhost` da vekile düşer; kurumsal ProxySettings ilkesi bayrakları ezebilir; `--block-new-web-contents` bu tarayıcıda etkisiz çıkabilir); garanti HTTP(S) içindir, WebSocket/WebRTC için verilmez (SKILL.md "Sınır" bölümü bunu söyler).
- Sınama kareleri ekrandaki her şeyi alır ve rapor konsol/öğe metnini içerir; kişisel/sağlık verisi taşıyan arayüzlerde çalıştırılmaz (SKILL.md "Sınır"). Çıktı bekçisi (sonuc.json/RAPOR.md taraması) yalnız 11 hane, TR cep telefonu, e-posta ve özel desenleri yakalar; ad/adres gibi gerisi ve PNG karelerin İÇERİĞİ kapsam dışıdır (kareler taranmaz). Bekçi tetiklenirse bu koşunun yazdığı kareler silinir ve "N kare silindi" yazılır (Tur 3); kare artık kalmaz, yalnız silinemeyen durumda `KALDI, elle silin: <yol>` satırı çıkar.
- Örtülü öğe denetimi yalnız tıklanacak noktanın `elementFromPoint` ile sınanmasıdır; `click` için kapsam budur, ayrı bir fixture testi yoktur.
- `ux-sinama` ajan tanım dosyası / `roller/` bilinçli olarak eklenmedi (görev kapsamı dışı).

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. `node --test tests/*.test.mjs`
3. `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
4. `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (Node ≥ 22; Edge/Chrome gerekir, yoksa `--browser`/`CAPTURE_BROWSER`)
5. Elle: `node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs --senaryo <senaryo.json> --sun .claude/skills/ux-sinama/fixtures/kusurlu --out <dizin> --matris 390x844,1280x800 --tema acik` (`senaryo.json`: `{"ad":"kusurlu-sinama","adimlar":[{"adim":"goto","url":"/"},{"adim":"screenshot","ad":"acilis"}]}`) → çıkış 1, `RAPOR.md` içinde yukarıdaki bulgu türleri.

## Tur 2 (Fable Tur 1 bulgularının kapatılması)

Tur: 2 · Yazar modeli: sonnet · Kapsam: `.claude/skills/ux-sinama/` (kanonik) ve `.agents/skills/ux-sinama/` (ayna, `kur.mjs --hedef hepsi --zorla` ile eşitlendi).

### İddia (Tur 2)
- [ ] T2-1. (ENGELLEYİCİ-1) SKILL.md "Sınır" bölümünde "Kişisel ya da sağlık verisi taşıyan arayüzlerde çalıştırılmaz: kareler ekrandaki her şeyi alır, rapor konsol ve öğe metnini içerir; bu ekranları insan gözle sına." cümlesi vardır.
- [ ] T2-2. (ÖNEMLİ-1) Yasak desen bekçisi ÇIKTIYI da tarar: `sonuc.json` ve `RAPOR.md` yazılmadan önce varsayılan + `--yasak-desen` desenleriyle taranır; eşleşirse dosyalar YAZILMAZ, yalnız `dosya:satır desen=<ad>` stderr'e gider (değer yazılmaz), çıkış 2.
- [ ] T2-3. (ÖNEMLİ-2) Tarayıcı `--block-new-web-contents` ve `--proxy-server=127.0.0.1:1` ile başlar; loopback proxy'den muaf kalır (sınama çalışır), loopback dışı trafik (yeni pencere dahil) proxy'ye düşer. Kapsam dışı notları SKILL.md "Sınır" ve bu PROOF'un "Kapsam dışı" bölümündedir.
- [ ] T2-4. (ÖNEMLİ-3) SKILL.md 1202 → 544 sözcük; adım tablosu, seçenekler, şiddet ölçütü ve kararlılık notu `--help` çıktısına taşındı; `--help` bunları gerçekten verir (test).
- [ ] T2-5. (KÜÇÜK a-f) stderr'de yalnız profil dizin adı; ayraçsız 10 haneli TR cep (`5321234567`) yakalanır, uzun sayılar yakalanmaz; selftest e-postası `@example.com`; SKILL.md bekçi iddiası "şu biçimleri kodda yakalar; ad/adres gibi gerisi sınayıcının sorumluluğu"; RAPOR-template/SKILL.md/`--help` aynı öneri biçimini (en çok bir cümle) ve aynı eşiği (≤480 px genişlikte <44 px) söyler; bu PROOF'un tarama listesi genel dille yazıldı.

### Önce (kırmızı; testler koddan ÖNCE yazıldı) [log/tur2-kirmizi.log]
```
UX_SINAMA_TARAYICI_ZORUNLU=1 node --test ... --test-name-pattern=<yeni/değişen testler>
ℹ tests 11 · pass 0 · fail 11     (modül dışa aktarımı, yasakTara 10 hane, --help içeriği, SKILL.md cümlesi,
                                   SKILL.md ≤550, tarayiciBayraklari, süreç hijyeni (tam yol), çıktı bekçisi x2,
                                   yeni hedef, proxy)
yeni hedef testi (kontrol): açılan hedefler yüklendi: /popup, /favicon.ico, /sekme, /favicon.ico   (bayraksız tarayıcıda popup yüklendi)
SKILL.md ölçümü: wc -w = 1202
```

### Sonra [log/tur2-ux.log, tur2-kur.log, tur2-capture.log]
```
node --test tests/kur.test.mjs                                         → ℹ tests 21 · pass 21 · fail 0 · skipped 0   (çıkış 0)
node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs  → ℹ tests 17 · pass 17 · fail 0 · skipped 0   (çıkış 0)
UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
                                                                       → ℹ tests 30 · pass 30 · fail 0 · skipped 0 · duration_ms 113065   (çıkış 0)
node scripts/kur.mjs --hedef hepsi --kontrol                           → "Kontrol: kanonik kaynak ile kopyalar birebir aynı."
wc -w .claude/skills/ux-sinama/SKILL.md                                → 544
```
Mevcut 21/17/24 test yeşil kaldı; 24 → 30: +6 yeni test (SKILL.md sınır cümlesi, SKILL.md hafiflik/hizalama, `tarayiciBayraklari`, çıktı bekçisi iki test, proxy). `yasakTara` ve `--help` testleri genişletildi (sayıları değişmedi).

Not (kanıt): `--block-new-web-contents` bu tarayıcı sürümünde (başsız Edge) etkisiz çıktı: bayrakla da kullanıcı hareketiyle `window.open` hedefi yüklendi. Gerçek tutucu ölü proxy'dir; proxy testi (`--disable-popup-blocking` ile) yeni hedefin dış trafiğinin (192.0.2.1) vekile düştüğünü, loopback'in vekile uğramadığını gösterir (`bilgi: yeni hedef AÇILDI (dış trafiği proxy'ye düştü)`).

### Test / Ölçüm (Tur 2)
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/kur.test.mjs` | 21 yeşil | 21/21 | 0 | PASS |
| `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` | 17 yeşil | 17/17 | 0 | PASS |
| `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` | 30 yeşil, atlama yok | 30/30, skipped 0 | 0 | PASS |
| `node scripts/kur.mjs --hedef hepsi --kontrol` | ayna aynı | "birebir aynı" | 0 | PASS |

(Bu koşudan sonra yalnız `senaryo-kos.mjs` başlık YORUMU ve ayna eşitlemesi değişti; `node --check` temiz, `--kontrol` yeniden temiz.)

## Tur 2 — Orkestratör doğrulaması
Orkestratör (2026-10-30), kendi koşusu, yazar raporuna dayanmadan:
- [x] `node --test tests/kur.test.mjs` -> tests 21, pass 21, fail 0.
- [x] `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` -> tests 17, pass 17, fail 0.
- [x] `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` -> tests 30, pass 30, fail 0, skipped 0 (~112 sn; yazarın başlık-yorumu düzeltmesinden SONRA koşuldu).
- [x] `node scripts/kur.mjs --hedef hepsi --kontrol` -> "kanonik kaynak ile kopyalar birebir aynı"; `node --check` senaryo-kos.mjs temiz; `wc -w SKILL.md` = 544.
- [x] Kapsam: `git diff --stat` 9 dosya (+616/-216), yeni izlenmeyen dosya yok; yalnız skill dosyaları, aynaları ve PROOF değişti.
- [x] Sızıntı taraması (grep: kişisel ad, yerel yol, sağlık verisi, özel altyapı ve proje adları) skill dizini ve PROOF'ta eşleşme yok.
- Yazar sapması, orkestratör kararı: `--block-new-web-contents` bu başsız Edge'de etkisiz, gerçek tutucu ölü proxy; bayrak "best-effort" olarak `--help`'te işaretli kalır (zararsız savunma derinliği). Çıktı bekçisi tetiklenince PNG kareler `--out` altında kalabilir (PROOF "Kapsam dışı"da yazılı).

## Tur 3 (Fable Tur 2 bulguları)

Tur: 3 · Yazar modeli: sonnet · Kapsam: `.claude/skills/ux-sinama/` (kanonik) + `.agents/skills/ux-sinama/` (ayna, `kur.mjs --hedef hepsi --zorla` ile eşitlendi).

### İddia (Tur 3)
- [ ] T3-1. (ÖNEMLİ-A) Çıktı bekçisi tetiklenince bu koşunun yazdığı kare dosyaları silinir (yalnız koşucunun kendi yazdığı yollar; `--out/kareler` içindeki başkasının dosyası kalır), stderr'e "N kare silindi" yazılır, silinemeyen için "KALDI, elle silin: <göreli yol>" satırı çıkar; çıkış 2, eşleşen değer çıktıda yok. SKILL.md "Sınır" ve bu PROOF "Kapsam dışı" buna göre güncellendi.
- [ ] T3-2. (ÖNEMLİ-B) Tarayıcı `--proxy-bypass-list=<-loopback>;127.0.0.1` ile başlar: örtük bypass (link-local 169.254/16, fe80::/10, `*.localhost`) kalkar, yalnız 127.0.0.1 muaf. Gerçek tarayıcı + izleyen vekil testi: `169.254.1.1`, `[fe80::1]` ve `deneme.localhost` istekleri vekile düşer, 127.0.0.1 vekile uğramaz ve hâlâ yüklenir. `--block-new-web-contents` ibaresine "bu tarayıcıda etkisiz çıkabilir" ve ProxySettings ilkesi notu SKILL.md ile `--help`'e eklendi.
- [ ] T3-3. (KÜÇÜK) `tarayiciBayraklari` birim testi "sözleşme kilidi; gerçek kanıt proxy testi" diye yorumlandı (silinmedi).

### Önce (kırmızı; testler koddan ÖNCE) [log/tur3-kirmizi.log]
```
--test-name-pattern="kareleriSil|tarayiciBayraklari|kareleri SİLİNİR|modül yüklenir"  → ℹ tests 4 · pass 0 · fail 4
  (kareleriSil dışa aktarılmıyor; bypass-list bayrağı yok; bekçi sonrası kareler diskte kalıyordu)
```
Proxy testinin link-local eklemesi kırmızı olarak KOŞULMADI: bypass kuralı yokken tarayıcı gerçek ağa link-local isteği atardı (görev kuralı: gerçek ağa istek yok). Doğrulama yalnız bayraklı (yeşil) durumda koşuldu; kırmızısı bayrak birim testiyle gösterilir.

### Sonra [log/tur3-ux.log, tur3-kur.log, tur3-capture.log]
```
node --test tests/kur.test.mjs                                         → ℹ tests 21 · pass 21 · fail 0 · skipped 0   (çıkış 0)
node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs  → ℹ tests 17 · pass 17 · fail 0 · skipped 0   (çıkış 0)   [ux selftest ile eş zamanlı DEĞİL]
UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
                                                                       → ℹ tests 32 · pass 32 · fail 0 · skipped 0 · duration_ms 122055   (çıkış 0)
node scripts/kur.mjs --hedef hepsi --kontrol                           → "Kontrol: kanonik kaynak ile kopyalar birebir aynı."
wc -w .claude/skills/ux-sinama/SKILL.md                                → 545
```
30 → 32: +2 test (`kareleriSil` birim testi, bekçi-sonrası kare temizliği tarayıcılı test). Mevcut proxy testi genişletildi (sayı değişmedi).

## Tur 3 — Orkestratör doğrulaması
Orkestratör (2026-10-30), kendi koşusu, sırayla (eş zamanlı değil):
- [x] `node --test tests/kur.test.mjs` -> tests 21, pass 21, fail 0.
- [x] `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs` -> tests 17, pass 17, fail 0.
- [x] `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` -> tests 32, pass 32, fail 0, skipped 0 (~115 sn).
- [x] `node scripts/kur.mjs --hedef hepsi --kontrol` -> "kanonik kaynak ile kopyalar birebir aynı"; `node --check` temiz; `wc -w SKILL.md` = 545.
- [x] Kapsam: `git diff --stat` 7 dosya (+224/-40), yeni izlenmeyen dosya yok.
- [x] Sızıntı taraması (kişisel ad, yerel yol, sağlık verisi, özel altyapı ve proje adları): skill dizini ve PROOF'ta eşleşme yok.
- Orkestratörce DENENMEDİ: link-local proxy davranışının kırmızısı (gerçek ağa istek atmamamak için; yazar belirtti), kurumsal ProxySettings ilkesinin bayrağı ezmesi.
