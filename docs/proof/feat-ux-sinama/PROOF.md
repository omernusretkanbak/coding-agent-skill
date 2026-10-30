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
- Sızıntı ön taraması (grep: kişisel ad, yerel yol, eczane/hasta, hub terimleri, özel IP, tailscale, proje adları): yalnız redd edilmesi test edilen genel örnek `192.168.1.5` ve depo sahibinin zaten yayında olan şablon komutu çıktı; ayrıca bağımsız sızıntı okuması ve Fable incelemesi ayrı yapılır.
- Orkestratörce denenmedi: tarayıcısız simülasyon (yazarın logu), gerçek bir sitede pilot (sonraki iş).

## Kapsam dışı / bilinen eksikler
- Görsel fark (piksel karşılaştırma) yok; sonraki sürüm.
- Ham test logları `*.log` olduğu için `.gitignore` tarafından commit dışıdır; sayılar yukarıda alıntılanmıştır. Alıntılarda yerel yol/geçici dizin adı yoktur; ham loglarda vardır (commit'e girmez).
- 127.0.0.1 dışı engeli CDP `Fetch` alanı üzerindendir: HTTP(S) istek ve yönlendirmeleri kapsar; WebSocket/WebRTC gibi Fetch'e düşmeyen kanallar kapsam dışıdır (SKILL.md "Sınır" bölümü bunu iddia etmez).
- Örtülü öğe denetimi yalnız tıklanacak noktanın `elementFromPoint` ile sınanmasıdır; `click` için kapsam budur, ayrı bir fixture testi yoktur.
- `ux-sinama` ajan tanım dosyası / `roller/` bilinçli olarak eklenmedi (görev kapsamı dışı).

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. `node --test tests/*.test.mjs`
3. `node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs`
4. `UX_SINAMA_TARAYICI_ZORUNLU=1 node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (Node ≥ 22; Edge/Chrome gerekir, yoksa `--browser`/`CAPTURE_BROWSER`)
5. Elle: `node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs --senaryo <senaryo.json> --sun .claude/skills/ux-sinama/fixtures/kusurlu --out <dizin> --matris 390x844,1280x800 --tema acik` (`senaryo.json`: `{"ad":"kusurlu-sinama","adimlar":[{"adim":"goto","url":"/"},{"adim":"screenshot","ad":"acilis"}]}`) → çıkış 1, `RAPOR.md` içinde yukarıdaki bulgu türleri.
