# KANIT — feat-ux-sinama-pilot-iyilestirme

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| ux-sinama pilot iyileştirmeleri (Türkçe eşleşme, rol takma adı, #parça gezinmesi, `kaydir`, `--hareket`, rapor ölçüm özeti + gruplama, SKILL.md) | mantık | 8740bf4..bu turun commit'i | 1 | sonnet |

## İddia
- [x] 1. Eşleşme Türkçe-bilinçli ve büyük/küçük harf duyarsız: role+name, click/assertText/waitFor metni `trEsle` (NFC + `toLocaleLowerCase('tr')`) ile iki yanı normalize eder; bulunamayan adda hata mesajı en çok 5 en yakın aday adı listeler.
- [x] 2. `img` rolü CDP rolü `image`'e çevrilir; `--help` geçerli rol listesini ve takma adı verir; bilinmeyen rolde mesaja uyarı eklenir.
- [x] 3. Aynı belgede yalnız `#parça` farkı olan `goto` yük olayı beklemeden (`Page.navigatedWithinDocument`) tamamlanır; eskiden zaman aşımı + çıkış 3.
- [x] 4. Yeni `kaydir` adımı hedefi görünüme getirir; sonraki `screenshot` sayfanın aşağısını karelemiş olur (`olcumler.kaydirmaY`).
- [x] 5. `--hareket serbest` `prefers-reduced-motion` zorlamaz; varsayılan (`azalt`) davranışı değişmedi.
- [x] 6. `RAPOR.md` hücre başına ölçüm özeti verir ("bulgu yok" olumlu kanıtla görünür) ve aynı (tür, şiddet, senaryo, ölçüm) bulgularını tek satıra gruplar; `sonuc.json` hücre başına ayrıntılı kalır.
- [x] 7. `SKILL.md` yeni özellikleri kısaca belgeler ve ≤550 sözcük sınırında kalır.
- [x] 8. Güvenlik sınırı DEĞİŞMEDİ: yasak desen bekçisi, URL bekçisi, Fetch kesme, ölü proxy/bypass listesi, kare silme ve çıkış kodu 2 mantığı aynen; bekçiyi gevşeten seçenek eklenmedi; mevcut 32 test değişmeden yeşil.

## Önce
Yeni testler kod değişmeden koşuldu (`--test-name-pattern` ile yalnız yeni testler):

```
UX_SINAMA_TARAYICI_ZORUNLU=1 node --test --test-name-pattern="trEsle|rolCoz|enYakin|yalnizParca|bulgulariGrupla|CLI --help: kaydir|CLI: --hareket|SKILL.md: yeni|Türkçe eşleşme|bulunamayan ad|rol takma|kaydir:|--hareket:|goto #|rapor:" .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
```
Sonuç: `pass 0 / fail 17`, çıkış 1 (tam çıktı: `log/kirmizi.txt`). Kırmızı nedenleri: işlevler dışa aktarılmıyor; `kaydir` ve `--hareket` bilinmiyor (çıkış 2); `assertVisible role=button name="katıl"` başarısız (Türkçe küçültme); `goto "/#alt"` `Page.loadEventFired eventi zaman aşımına uğradı` ile koşuyu bozuyor (48 sn).
Taban (değişiklik öncesi) tam takım: 32 test yeşil, çıkış 0 (`log/taban-yesil.txt`).

## Sonra
```
UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
```
Sonuç: `tests 49 / pass 49 / fail 0`, çıkış 0 (tam çıktı: `log/tam-takim.txt`). 32 eski test + 17 yeni test.

Örnek rapor kesiti (kusurlu fixture, 2 görünüm x 2 tema; aynı bulgu tek satır, hücreler listeli):
```
| F9, F16, F24, F32 | ÖNEMLİ | konsol-hatasi | ornek | 1280x800-acik, 1280x800-koyu, 390x844-acik, 390x844-koyu | `{"sayi":1,"ilk":"kasitli konsol hatasi"}` | ... |

## Ölçüm özeti (hücre başına)
| Hücre | scrollWidth / clientWidth | Odak (görünür / kontrol / odaklanabilir) | Dokunma hedefi (denetlenen / <44 px) | Konsol hata / istisna | Ağ hata | Dış istek |
| 390x844-acik | 1508 / 390 | 2 / 3 / 3 | 3 / 3 | 1 / 1 | 1 | 0 |
| 1280x800-acik | 1508 / 1280 | 2 / 3 / 3 | - (yalnız ≤480 px) | 1 / 1 | 1 | 0 |
```

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| yeni testler, kod öncesi | kırmızı | pass 0 / fail 17 | 1 | PASS (kırmızı görüldü) |
| tam selftest, kod sonrası | 49 yeşil | pass 49 / fail 0 | 0 | PASS |
| `wc -w SKILL.md` | ≤550 | 549 | 0 | PASS |

## Orkestratör doğrulaması

Zeki, 2026-10-30, kendi koşusu:
- `UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (worktree kökü): `tests 49, pass 49, fail 0`, çıkış 0, `✖` satırı 0 (32 eski + 17 yeni).
- `git diff` güvenlik sınırı için okundu: yasak desen, URL, Fetch kesme, ölü proxy ve kare silme kodunda silinen/gevşetilen satır yok; tek ekleme, hata mesajına giren aday adların yasak desenden süzülmesi (bekçiyi sıkar, gevşetmez). `--izinli-desen` eklenmedi.
- Kapsam: yalnız `.claude/skills/ux-sinama/` (koşucu, selftest, SKILL.md, RAPOR şablonu, `fixtures/pilot/`) ve bu kanıt klasörü.
- Orkestratörce DENENMEDİ: iyileştirmeler iki gerçek siteye (pizza, Memluk) yeniden uygulanmadı; yalnız fixture tabanlı selftest.

## Kapsam dışı / bilinen eksikler
- `--sun` kipinde sitenin kendi herkese açık iletişim bilgisi (e-posta/telefon) yasak desen bekçisine takılıyor, `--url` kipinde sayfa içeriği girdi olarak taranmadığı için aynı sayfa geçiyor (yalnız çıktı bekçisi çalışır): tutarsızlık. Bekçiyi gevşeten `--izinli-desen` bu görevde EKLENMEDİ; ayrı kullanıcı kararı gerekir.
- Aday adlar hata mesajıyla rapora girer; çıktı bekçisine takılmasın diye aday listesi yasak desenlerden süzülür (bekçi değişmedi). Süzme yalnız aday listesini temizler.
- Pilot raporlarındaki diğer öneriler (ör. `kaydir` için piksel/oran seçeneği, `goto` sonrası hash'e kaydırma ölçümü) kapsam dışı.
- Rol listesi (`ROL_LISTESI`) CDP/ARIA'nın sık kullanılan rollerini kapsar; listede olmayan rol reddedilmez, yalnız bulunamazsa mesaja uyarı eklenir.

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. `UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs` (Node >= 22, Edge/Chrome gerekir; ~3 dk).
3. Elle: `node .claude/skills/ux-sinama/scripts/senaryo-kos.mjs --help` (kaydir, --hareket, roller, takma ad); `--senaryo <json> --sun .claude/skills/ux-sinama/fixtures/pilot --out <dizin>` ile örnek koşu.

## Tur 2

Aralık: e2bed7c..bu turun commit'i (Fable tur 1 skoru 4; düzeltmeler).

### İddia
- [x] 1. Aday adların yasak desen süzmesi test altında: telefon, e-posta, 11 haneli sayı ve `--yasak-desen` özel deseni taşıyan düğme adları hata mesajına girmez; `--url` kipinde koşu çıkış 1 ile biter ve `sonuc.json` yazılır (çıkış 2 değil). Süzme `const temiz = adaylar;` mutantında kırmızıya düşer.
- [x] 2. Aday ad önce 50 karaktere kesilir (`adayKisalt`), SONRA yasak desenlerden süzülür; kesim bir sayıyı 11 haneye indirdiğinde sızmaz.
- [x] 3. `trEsle` NFC adımı test altında (`C` + birleşik çengel → `çok`); NFC'siz mutant kırmızı.
- [x] 4. `SKILL.md` description'a "mobil görünüm" anahtar sözcüğü geri kondu; sözcük sınırı (≤550) korundu.
- [x] 5. Güvenlik sınırı kodlarına (yasak desen, URL bekçisi, Fetch kesme, proxy, kare silme) dokunulmadı.

### Önce
Yeni testler (`aday adlar|enYakinAdaylar: uzun|NFC ayrık`) mevcut koda karşı: `pass 5 / fail 1`, çıkış 1 (`log/tur2-kirmizi.txt`). Kırmızı olan: "önce 50 karaktere kesilir, SONRA süzülür" (`kesik ad sızdı → çıktı bekçisi (çıkış 2)`). Diğer beşi mevcut davranışı kilitler (süzme ve NFC kodda vardı, testi yoktu); bu yüzden mutasyonla doğrulandı.

### Mutasyon doğrulaması
Mutasyonlar çalışma ağacında değil, `skill` dizininin geçici kopyasında uygulandı (kopyalar silindi); testler kopyadaki betiğe karşı koşuldu.

| Mutasyon | Değişiklik | Sonuç | Çıktı |
|---|---|---|---|
| A | `const temiz = adaylar;` (süzme yok) | 3 test kırmızı: hassas aday, özel desen, kesim | `log/tur2-mutasyon-A.txt` |
| B | `trEsle` içinden `.normalize('NFC')` çıkarıldı | NFC testi kırmızı | `log/tur2-mutasyon-B.txt` |
| C | `adaylar.map(adayKisalt)` çıkarıldı (eski sıra: önce süz, sonra kes) | kesim testi kırmızı | `log/tur2-mutasyon-C.txt` |

### Sonra
```
UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
```
Sonuç: `tests 54 / pass 54 / fail 0`, çıkış 0 (`log/tur2-tam-takim.txt`). Yeni testler hedefli koşuda: `pass 6 / fail 0` (`log/tur2-yesil-kismi.txt`).

### Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| yeni testler, kod öncesi | en az kesim testi kırmızı | pass 5 / fail 1 | 1 | PASS (kırmızı görüldü) |
| mutasyon A / B / C | kırmızı | 3 / 1 / 1 test kırmızı | 1 | PASS |
| tam selftest, kod sonrası | ≥52 yeşil | pass 54 / fail 0 | 0 | PASS |
| `SKILL.md` sözcük sayısı (testin sayımı: boşlukla bölme) | ≤550 | 549 | 0 | PASS |

### Orkestratör doğrulaması

### Kapsam dışı / bilinen eksikler
- `--sun` kipindeki girdi bekçisi tutarsızlığı ve `--izinli-desen` kararı Tur 1 notundaki gibi açık.

### Tur 2 orkestratör doğrulaması
Zeki, 2026-10-30, kendi koşusu:
- `UX_SINAMA_TARAYICI_ZORUNLU=1 node .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs`: `tests 54, pass 54, fail 0`, çıkış 0, `✖` satırı 0 (49 + 5 yeni; eski testlere dokunulmadı).
- `senaryo-kos.mjs` diff'i yalnız `adayKisalt` yardımcısı, `enYakinAdaylar`'daki satır içi kesmenin yardımcıya çevrilmesi ve `yakinAdayEki`'nde "önce kes, sonra süz" sırası; bekçi, URL, Fetch, proxy ve kare silme satırları diff'te yok.
- Orkestratörce DENENMEDİ: yazarın mutasyonları (A, B, C) bağımsız yeniden uygulanmadı; yazar logları `log/tur2-mutasyon-*.txt`.
