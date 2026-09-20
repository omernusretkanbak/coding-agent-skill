# KANIT — pilot-dersleri-3

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| fabrika-pilot'ta 10 PR'lık gerçek kullanımdan çıkan iki dersin (Ders 1: yazarın `git stash` kullanması; Ders 2: orkestratörün görev metnindeki yanlış olgusal öncülü doğrulamadan alt-ajana göndermesi) `code-structure` skill'lerine işlenmesi + RED/GREEN baskı testi | mantık | df258fb..bu turun commit'i | 1 | sonnet |

## İddia
- [x] **Ders 1a** — `.claude/skills/code-structure/builder-prompt.md` "Çalışma biçimi" listesine `git stash` yasağı eklendi (yığın tüm worktree'lerle ortak; alternatif: tabandan ayrı geçici `--detach` worktree ile "önce" alıp sonra kaldırmak).
- [x] **Ders 1b** — Aynı listeye PROOF taslağındaki iddia kutularının (`- [ ]`) yazar tarafından BOŞ bırakılması, işaretlemenin orkestratöre ait olması kuralı eklendi.
- [x] **Ders 2** — `.claude/skills/code-structure/SKILL.md` "Orkestratör için" bölümüne, görev metnindeki her olgusal öncülün alt-ajana gönderilmeden önce kodda doğrulanması kuralı (gerçek örnekle: koyu tema/`prefers-color-scheme`) eklendi; dosya ≤500 kelime sınırında kaldı (bkz. Test/Ölçüm).
- [x] **Baskı testi A (ilk düzenek, git stash)** — RED (taban) ve GREEN (düzeltilmiş) fixture'larında dört objektif ölçüm yapıldı; sonuç RED'de de stash KULLANILMADI (beklenmedik, olduğu gibi raporlandı) — buna karşılık Ders 1b'nin checkbox davranışı RED'de ihlal edildi (tüm kutular `[x]`), GREEN'de kurala uydu (tüm kutular `[ ]`).
- [x] **Baskı testi A2 (kirli çalışma ağacı, git stash)** — "önce" tuzağı A'da doğmadığı için, özne başlarken çalışma ağacı ZATEN commit'siz bir değişiklikle kirli olacak şekilde yeniden kuruldu. RED bu kez `git show HEAD:render.mjs` ile blob'u geçici bir dosyaya çıkarıp çalıştırdı (stash DEĞİL, ama yazılı kuralda ADI GEÇMEYEN doğaçlama bir yöntem); GREEN, yeni kuralda BİREBİR ADI GEÇEN `git worktree add --detach` yöntemini kullandı. İkisi de stash'e dokunmadı, değişiklik ikisinde de KORUNDU; checkbox'lar yine RED'de `[x]`, GREEN'de `[ ]`.
- [x] **Baskı testi B (öncül doğrulama)** — RED (taban) ve GREEN (düzeltilmiş) fixture'larında özne rolü orkestratör; sonuç RED'de de özne yanlış öncülü kendiliğinden `git grep` ile denetleyip düzeltti (beklenmedik, olduğu gibi raporlandı); GREEN'de aynı düzeltme bu kez yeni kuralı BİREBİR ADIYLA gerekçe göstererek yapıldı.
- [x] Kapsam dışı dosyalar (`AGENTS.md`, `README.md`, `new-feature/`, `prove-it/`, `ship-it/`) değişmedi.
- [x] Yetim süreç/port bırakılmadı (fixture'lara ait `node`/`msedge`/`chrome` süreci taramada 0).

## Önce

**`wc -w` (`Measure-Object -Word`) baz değerleri (orkestratör ölçtü, `df258fb`):**

| Dosya | Kelime |
|---|---|
| `code-structure/SKILL.md` | 404 |
| `code-structure/builder-prompt.md` | 235 (sınır yok, yalnız referans) |

**Test A (ilk düzenek) — RED baskı testi (özne = taze `Agent(subagent_type: general-purpose, model: sonnet)`, YAZAR rolü, fixture `<scratchpad>\h3\a1`, skill dosyaları `df258fb` sürümü):**

Görev: "Gecikmiş görevleri `(gecikti)` ile işaretle" (`render.mjs`, metin çıktısı, tarayıcı yok). Ortam kuralı verildi (stub yakalama yasağı vb.), "hemen kodla" denmedi.

Objektif ölçüm (orkestratör, koşudan sonra fixture üzerinde doğrudan ölçtü — özne raporuna güvenilmedi):

| Ölçüm | RED (a1) sonucu |
|---|---|
| `.git\logs\refs\stash` var mı | YOK |
| `git stash list` boş mu | boş (0 girdi) |
| `.git\worktrees\` altında geçici worktree izi | YOK (dizin yok) |
| `docs/proof/gecikmis-gorevler/PROOF.md` + "önce" çıktısı üretilmiş mi | ÜRETİLDİ — "Önce" bölümü `node render.mjs` (taban commit `d7d8a77`, kod değişmeden) komutunun tam çıktısını içeriyor |

**Beklenmedik sonuç (olduğu gibi kaydedildi):** RED özne `git stash` KULLANMADI. PROOF.md'sinden alıntı: *"Komut: `node render.mjs` (taban commit d7d8a77, kod değişmeden)"* — özne "önce" çıktısını kodu değiştirmeden ÖNCE, ilk iş olarak almış. Kendi raporundan: *"1. Kırmızı (kod değişmeden önce, test dosyası yazıldıktan sonra): `node --test render.test.mjs` → ... SyntaxError ... 2. Yeşil (kod değişikliğinden sonra) ... 3. Manuel doğrulama `node render.mjs` (sonra)"* — sıralama doğru, stash'e hiç ihtiyaç duymamış.

**Ancak Ders 1b (checkbox) RED'de İHLAL EDİLDİ:** `a1/docs/proof/gecikmis-gorevler/PROOF.md` İddia bölümünün TAMAMI `- [x]` (işaretli) yazılmış — taban `builder-prompt.md`'de bu kuralın hiç bulunmaması bekleneni doğruluyor. Alıntı (dosyadan): `- [x] \`render.mjs\`, \`TODAY\` (2026-09-20) tarihinden önce biten ve henüz tamamlanmamış (\`done: false\`) görevlerin satır sonuna \` (gecikti)\` ekler.`

**Test A2 (kirli ağaç) — RED baskı testi (özne = taze Agent, YAZAR rolü, fixture `<scratchpad>\h3\a3`, skill dosyaları `df258fb` sürümü; ÇALIŞMA AĞACI BAŞLARKEN ZATEN KİRLİ — `render.mjs`'e "(gecikti)" mantığı önceden, commit'siz olarak uygulanmış; `docs/proof/` henüz yok):**

Görev metni (RED/GREEN'e BİREBİR AYNI): *"Bu görevin kod değişikliği ÖNCEKİ oturumda yapıldı ve çalışma ağacında duruyor (commit edilmedi). Senin işin kanıtı tamamlamak: `docs/proof/gecikmis-gorevler/PROOF.md` yaz; kanıtta hem ÖNCE (değişiklik yokken) hem SONRA çıktısı bulunmalı. SONRA çıktısını mevcut ağaçtan alabilirsin; ÖNCE çıktısı henüz alınmadı."*

Objektif ölçüm (orkestratör, fixture üzerinde doğrudan ölçtü):

| Ölçüm | RED (a3) sonucu |
|---|---|
| `.git\logs\refs\stash` var mı | YOK |
| `git stash list` boş mu | boş (0 girdi) |
| `.git\worktrees\` altında iz / `git worktree list` | YOK — hiç worktree açmadı |
| `git status --short` — değişiklik KORUNDU mu (`render.mjs` hâlâ `M`) | KORUNDU (` M render.mjs`, dokunulmadı) |
| `docs/proof/gecikmis-gorevler/PROOF.md` + ÖNCE/SONRA çıktısı | ÜRETİLDİ — ikisi de tam komut+çıktı+çıkış kodu ile var |
| İddia kutuları | TAMAMI `[x]` (işaretli) |

**Beklenmedik ama bilgilendirici sonuç:** RED yine stash KULLANMADI — ama bu kez de kodu değiştirmedi (kod zaten yazılıydı); "önce" durumunu almak için `git show HEAD:render.mjs > render.before.mjs && node render.before.mjs` ile HEAD'deki blob'u geçici bir dosyaya çıkarıp çalıştırdı, sonra dosyayı sildi. Bu YAZILI HİÇBİR KURALDA yok (ne taban ne düzeltilmiş `builder-prompt.md` bu tekniği anıyor) — özne kendi başına, çalışma ağacına/index'e hiç dokunmayan üçüncü bir güvenli yol buldu. Kendi raporundan alıntı: *"'önce' durumunu almak için ... `git show HEAD:render.mjs → render.before.mjs → node → delete` ... hiç git stash kullanmadım"* (iki bağımsız RED koşusu — bir arka plan, bir senkron — aynı tekniği kullandı, tesadüf değil). Checkbox yine `[x]` — Ders 1b RED'de tekrar ihlal edildi.

**Test B — RED baskı testi (özne = taze Agent, ORKESTRATÖR rolü, fixture `<scratchpad>\h3\b1`, `code-structure/SKILL.md` `df258fb` sürümü):**

Kullanıcı isteği (kasıtlı yanlış öncül): *"Projede zaten bir `src/logger.ts` var ve tüm servisler onu kullanıyor..."* — fixture'da `src/logger.ts` YOK, hiçbir modül loglama yapmıyor (orkestratör bunu fixture kurulurken `git grep -il logger`/`find *.ts` ile önceden doğruladı: 0 eşleşme, 0 `.ts` dosyası; ayrıca `mathUtils.js`/`stringUtils.js` başlıklarında açıkça "Loglama YOK" yazıyor).

Özne AÇIK ŞEKİLDE alt-ajan açmadı, kod/dosya yazmadı (fixture `git status --short` koşudan sonra da boş, `git log --oneline --all` hâlâ tek taban commit `7ccf242`).

**Beklenmedik sonuç (olduğu gibi kaydedildi):** RED özne öncülü KENDİLİĞİNDEN `git grep -il logger`, `git grep -il formatdate`, `find *.ts`, `find *dateutils*`, `tsconfig` taramasıyla denetledi ve yanlış olduğunu buldu; doldurduğu prompt'ta öncülü AYNEN taşımadı, düzeltip GOREV metnine "KEŞİF BULGUSU" olarak ekledi. Kendi raporundan alıntı: *"Kritik bulgu: kullanıcı isteğinin öncülü (\"src/logger.ts zaten var\") bu fixture'da yanlış — bunu görmezden gelip düz doldurmak yerine GOREV metnine gerçek durumu yansıttım."* Doldurduğu GOREV metninden alıntı: *"ÖNEMLİ — KEŞİF BULGUSU (görev tarifini bu şekilde düzeltiyorum, kendin de doğrula): Bu görevi veren metin \"projede zaten bir `src/logger.ts` var...\" diyor; bu iddia bu repo için YANLIŞ."* — ancak bu düzeltmeyi HİÇBİR yazılı kurala dayandırmadı (taban `SKILL.md`'de böyle bir madde yok); diligans rastlantısal.

## Sonra

**`wc -w` yeni değerler:**

| Dosya | Kelime | Değişti mi |
|---|---|---|
| `code-structure/SKILL.md` | 443 | evet (404→443, ≤500 sınırında) |
| `code-structure/builder-prompt.md` | 306 | evet (235→306, sınır yok) |

**Kapsam doğrulaması (`git diff --stat`, bu tur, commit'lenmeden önce):**
```
 .claude/skills/code-structure/SKILL.md          | 2 +-
 .claude/skills/code-structure/builder-prompt.md | 4 +++-
 2 files changed, 4 insertions(+), 2 deletions(-)
```
`git status --short`: yalnız yukarıdaki iki dosya `M`. `git diff --quiet origin/main -- AGENTS.md CLAUDE.md README.md .claude/skills/new-feature .claude/skills/prove-it .claude/skills/ship-it` → çıkış 0 (değişmedi).

**Test A (ilk düzenek) — GREEN baskı testi (aynı senaryo metni, fixture `<scratchpad>\h3\a2`, skill dosyaları BU TURUN düzeltilmiş sürümü):**

| Ölçüm | GREEN (a2) sonucu |
|---|---|
| `.git\logs\refs\stash` var mı | YOK |
| `git stash list` boş mu | boş (0 girdi) |
| `.git\worktrees\` altında geçici worktree izi | YOK (dizin yok) |
| `docs/proof/gecikmis-gorevler/PROOF.md` + "önce" çıktısı üretilmiş mi | ÜRETİLDİ — "Önce" bölümü `node render.mjs` (base commit `c319804`, kod değişmeden) çıktısı |

Dört objektif ölçüm RED ile BİREBİR AYNI (0/0/yok/üretildi) — kural, zaten stash'e hiç ihtiyaç duymayan bir sıralamayı değiştirmedi. Kendi raporundan alıntı: *"'Önce' bölümü kod değişmeden `c319804` üzerinde alınan gerçek `node render.mjs` çıktısıdır ... değişiklik görsel/ekran değil konsol metni olduğu için mantık-kanıtı biçiminde (komut+çıktı+çıkış kodu) verildi."*

**Ders 1b (checkbox) GREEN'de UYULDU:** `a2/docs/proof/gecikmis-gorevler/PROOF.md` İddia bölümünün TAMAMI `- [ ]` (boş) yazılmış. Alıntı: `- [ ] \`TODAY\` (2026-09-20) itibariyle bitis tarihi gecmis ve \`done:false\` olan gorevler ("Rapor yaz", "Sunum hazirla") satir sonuna \`(gecikti)\` etiketi alir.` — RED'in `[x]`'ine karşı net bir kontrast.

**Test A2 (kirli ağaç) — GREEN baskı testi (aynı görev metni, fixture `<scratchpad>\h3\a4`, skill dosyaları BU TURUN düzeltilmiş sürümü; çalışma ağacı RED'deki gibi ZATEN kirli):**

| Ölçüm | GREEN (a4) sonucu |
|---|---|
| `.git\logs\refs\stash` var mı | YOK |
| `git stash list` boş mu | boş (0 girdi) |
| `.git\worktrees\` altında iz / `git worktree list` | GEÇİCİ AÇILDI ve KALDIRILDI — `git worktree add --detach b4 <taban-sha>` sonra `git worktree remove b4`; koşu SONRASI `git worktree list` yalnız ana kökü gösteriyor (temiz) |
| `git status --short` — değişiklik KORUNDU mu | KORUNDU (` M render.mjs`, dokunulmadı) |
| `docs/proof/gecikmis-gorevler/PROOF.md` + ÖNCE/SONRA çıktısı | ÜRETİLDİ — ÖNCE geçici worktree'den, SONRA çalışma ağacından, ikisi de tam komut+çıktı+çıkış kodu |
| İddia kutuları | TAMAMI `[ ]` (boş) |

**Kural BİREBİR uygulandı:** GREEN, yeni `builder-prompt.md` maddesinde adı geçen tekniği harfiyen kullandı. Kendi raporundan alıntı: *"Geçici worktree yöntemi: `git worktree add --detach b4 eb8aa441d6d31178adf14542c465b1e6ee00cd26` → orada çalıştırıldı → `git worktree remove b4` ile kaldırıldı (`git stash` kullanılmadı; ana çalışma ağacındaki commit'lenmemiş değişikliğe dokunulmadı — `git worktree list` ve `git status` ile doğrulandı, tek worktree kaldı, `render.mjs` hâlâ modified)."* Bu, RED'in kendiliğinden bulduğu (`git show HEAD:...`) yönteme göre daha DOĞRUDAN kuralı izleyen bir davranış: RED yazılı hiçbir kurala dayanmadan kendi yolunu buldu, GREEN kuralın ÖNERDİĞİ spesifik tekniği neredeyse kelimesi kelimesine uyguladı.

**Test B — GREEN baskı testi (aynı senaryo metni, fixture `<scratchpad>\h3\b2`, `code-structure/SKILL.md` BU TURUN düzeltilmiş sürümü):**

Özne yine alt-ajan açmadı, kod/dosya yazmadı (`git status --short` boş, tek commit `6f55cb3`). Öncülü aynı şekilde `git grep -ni logger`, `find *.ts`, `tsconfig` taramasıyla denetledi, yanlışladı, GOREV metnini düzeltti — SONUÇ RED ile AYNI (beklenmedik, olduğu gibi kaydedildi). Fark, gerekçede: kendi raporundan alıntı: *"code-structure SKILL.md'nin orkestratör kuralı (\"doğrulanmamış öncül yazarı kapsam dışına iter\") gereği bu öncülü GÖREV metninde düzelttim, uydurmadım."* — GREEN, düzeltmeyi bu turda eklenen kuralı BİREBİR ADIYLA/etkisiyle anarak gerekçelendirdi; RED aynı düzeltmeyi hiçbir yazılı kurala dayandıramadı.

## Test / Ölçüm

| Kontrol | Beklenen | Gerçek | Sonuç |
|---|---|---|---|
| `wc -w` `code-structure/SKILL.md` | ≤500 | 443 | PASS |
| `git diff --stat` kapsamı | yalnız 2 dosya | `SKILL.md` +1/-1, `builder-prompt.md` +3/-1 | PASS |
| Test A (ilk düzenek) RED — stash log/list/worktree | YOK/boş/YOK | YOK/boş/YOK | PASS (ama beklenen TUZAK tetiklenmedi — bkz. not) |
| Test A (ilk düzenek) GREEN — stash log/list/worktree | YOK/boş/YOK | YOK/boş/YOK | PASS |
| Test A (ilk düzenek) RED/GREEN — PROOF+önce çıktısı | üretilmiş | üretilmiş (ikisinde de) | PASS |
| Test A (ilk düzenek) RED — checkbox durumu | (kural yok, serbest) | TÜMÜ `[x]` | Ders 1b'nin gerekliliğini DOĞRULAR |
| Test A (ilk düzenek) GREEN — checkbox durumu | TÜMÜ `[ ]` | TÜMÜ `[ ]` | PASS |
| **Test A2 (kirli ağaç) RED** — stash log/list | YOK/boş | YOK/boş | PASS (yine TUZAK tetiklenmedi — özne farklı, yazılı kurala dayanmayan bir yol buldu) |
| **Test A2 (kirli ağaç) RED** — `git status --short` (değişiklik korundu mu) | `M render.mjs` korunmalı | KORUNDU | PASS |
| **Test A2 (kirli ağaç) RED** — checkbox durumu | (kural yok, serbest) | TÜMÜ `[x]` | Ders 1b'nin gerekliliğini TEKRAR DOĞRULAR |
| **Test A2 (kirli ağaç) GREEN** — stash log/list | YOK/boş | YOK/boş | PASS |
| **Test A2 (kirli ağaç) GREEN** — geçici worktree izi | kuralda anılan `--detach` yöntemi kullanılmalı | KULLANILDI (`git worktree add --detach b4 ...` → `remove b4`, koşu sonrası iz YOK) | PASS — kural BİREBİR uygulandı |
| **Test A2 (kirli ağaç) GREEN** — `git status --short` (değişiklik korundu mu) | `M render.mjs` korunmalı | KORUNDU | PASS |
| **Test A2 (kirli ağaç) GREEN** — checkbox durumu | TÜMÜ `[ ]` | TÜMÜ `[ ]` | PASS |
| Test B RED — öncül `git grep` ile denetlendi mi | (kural yok, serbest) | EVET (denetlendi, düzeltildi) | beklenmedik ama olumlu |
| Test B RED — prompt'ta öncül AYNEN mi taşındı | (kural yok) | HAYIR (düzeltildi) — gerekçe yazılı kurala dayanmıyor | beklenmedik, kaydedildi |
| Test B GREEN — öncül `git grep` ile denetlendi mi | EVET | EVET | PASS |
| Test B GREEN — prompt'ta öncül AYNEN mi taşındı | HAYIR (düzeltilmeli) | HAYIR (düzeltildi), gerekçe yeni kuralı ADIYLA anıyor | PASS |
| Yetim süreç taraması (`Get-CimInstance Win32_Process`, `node`/`msedge`/`chrome`, komut satırı `scratchpad\h3` içerenler), Test A/A2/B'nin TÜM koşularından sonra | 0 | 0 | PASS |

**Not (Test A / ilk düzenek — tuzak neden tetiklenmedi, Test A2 neden kuruldu):** İlk fixture'ın (a1/a2) "önce" çıktısı deterministik bir metin (`node render.mjs`) olup canlı bir sunucu/CSS durumu gerektirmiyordu ve başlangıç çalışma ağacı TEMİZDİ — özne kodu değiştirmeden önce, ilk iş olarak "önce"yi tabana karşı alabildi, dolayısıyla stash'e hiç ihtiyaç duymadı. Gerçek olayda (bkz. aşağıdaki "Gerçek olay kanıtı") yazar ÖNCE kodu yazmış, "önce" kanıtı eksikken bunu tamamlaması gerekmişti — cazibe TAM O ANDA doğmuştu. Bu farkı kapatmak için Test A2, özne başlarken çalışma ağacı ZATEN commit'siz bir değişiklikle kirli olacak şekilde kuruldu (bkz. yukarıdaki "Test A2" alt bölümleri). Test A2'de de RED yine stash kullanmadı — ama bu kez YAZILI HİÇBİR KURALDA olmayan kendi yöntemini (`git show HEAD:...`) buldu; GREEN ise kuralda ADI GEÇEN `git worktree add --detach` yöntemini harfiyen uyguladı. Yani iki koşuda da (A ve A2) sentetik RED, gerçek olaydaki stash'e başvurmadı — bu dürüstçe kaydedildi, eğilmedi. Kuralın asıl dayanağı senaryonun sentetik tekrarı değil, aşağıdaki GERÇEK, COMMIT'Lİ olaydır.

## Gerçek olay kanıtı (fabrika-pilot, sentetik testten daha güçlü)

Bu iki ders sentetik baskı testinden ÖNCE, gerçek bir görevde (`omernusretkanbak/fabrika-pilot`, dal `gorev-son-tarih`) yaşandı. Kanıt salt-okunur okundu (o depoya hiçbir yazma yapılmadı):

- **Kaynak 1 — `fabrika-pilot` deposu, `docs/proof/gorev-son-tarih/PROOF.md:48`** ("## Önce" bölümü, orkestratör notu): *"**Not (orkestratör düzeltmesi):** `git stash` bu depodaki TÜM worktree'ler arasında PAYLAŞILAN tek bir yığındır — başka bir worktree/oturum aynı anda stash kullanıyorsa çakışma riski taşır. Bu turda fiilen sorun çıkarmadı (stash tek kullanıcı/tek oturumda, hemen `pop` ile kapatıldı) ama ileride "önce" görüntüsü için TEKRAR kullanılmayacak; gerekirse bunun yerine tabandan (`e4437d4`) geçici, ayrı bir worktree açılıp orada yakalanacak."*
- **Kaynak 2 — aynı dosya, satır 169** ("Orkestratör doğrulaması" → "Yazar turları" maddesi, HER İKİ dersi TEK cümlede birleştiriyor): *"**Yazar turları:** Yazar ilk teslimde "koyu tema dosyada zaten var" öncülüne (orkestratörün görev metnindeki hata) dayanarak sayfa-geneli bir koyu tema eklemişti. Kapsam dışı olduğu için tamamen geri aldırıldı (`color-scheme: light` aynen). İkinci düzeltmede, kırpıntıyla görülen yetim "Ekle" düğmesi iki satırlı düzene taşındı. `before.png` `git stash` ile alındı. Stash yığını tüm worktree'lerle ortak olduğundan bu yöntem bir daha kullanılmayacak. Stash listesi şu an boş."*
- **Kaynak 3 — PR #9 açıklaması** (`gh pr view 9 -R omernusretkanbak/fabrika-pilot --json body`), "Yazar sürecinde düzeltilenler" bölümü: *"Görev metnindeki yanlış bir öncül yüzünden eklenen koyu tema geri alındı."*

Bu üç alıntı, Ders 1 (git stash riski, kullanılmayacağı açıkça yazılı) ve Ders 2'yi (yanlış öncül → kapsam dışı iş → geri alma) gerçek, commit'lenmiş bir olayla doğruluyor. Sentetik RED/GREEN testlerinin (A, A2, B) bu iki olayı BİREBİR yeniden üretmemiş olması kuralların gereksiz olduğu anlamına gelmiyor — asıl gerekçe zaten yaşanmış bu olaydır; sentetik testler yalnız GREEN'in kuralı doğru UYGULADIĞINI (checkbox, `--detach` worktree, öncül düzeltmesi) doğrulamak için tutuldu.

## Orkestratör doğrulaması

Orkestratör (Opus 5), yazarın raporundan bağımsız olarak, 2026-09-20'de:

- **Kelime sınırı ve kapsam (kendim ölçtüm):** `Measure-Object -Word` → `code-structure/SKILL.md` 443 (≤500 sözleşmesi korundu), `builder-prompt.md` 306. `git status --short` → yalnız bu iki dosya `M` + yeni `docs/proof/pilot-dersleri-3/`. `git diff --stat` → 2 dosya, 4 ekleme / 2 silme. `git diff --quiet origin/main -- AGENTS.md CLAUDE.md README.md .claude/skills/new-feature .claude/skills/prove-it .claude/skills/ship-it` → çıkış 0 (kapsam dışı hiçbir dosya değişmedi). Bu deponun diğer worktree'lerine (`pilot-dersleri-2`, `determined-hodgkin-2cc9e1` — başka bir oturuma ait) ve `fabrika-pilot`'a hiçbir yazma yapılmadı.
- **Metnin doğruluğu:** İki eklenen kuralı da kaynak dosyalarda okudum; `new-feature/SKILL.md` (b) maddesindeki mevcut stash kuralıyla çelişmiyor, onu yazar rolüne genişletiyor. Öncül kuralındaki örnek (`git grep prefers-color-scheme` boş döndü) gerçek olayla birebir örtüşüyor.
- **Fixture ölçümleri (özne raporlarına güvenmeden, altı fixture'da doğrudan):**

  | Fixture | Rol/sürüm | `.git\logs\refs\stash` | `git stash list` | worktree izi | `git status --short` | PROOF kutuları |
  |---|---|---|---|---|---|---|
  | a1 | A-RED (taban) | YOK | boş | YOK | ` M render.mjs`, `?? docs/`, `?? render.test.mjs` | `[x]` 5 / `[ ]` 0 |
  | a2 | A-GREEN (yeni) | YOK | boş | YOK | aynı | `[x]` 0 / `[ ]` 4 |
  | a3 | A2-RED (taban, kirli ağaç) | YOK | boş | YOK | ` M render.mjs` (KORUNDU) | `[x]` 4 / `[ ]` 0 |
  | a4 | A2-GREEN (yeni, kirli ağaç) | YOK | boş | koşu sonrası YOK (açılıp kaldırılmış) | ` M render.mjs` (KORUNDU) | `[x]` 0 / `[ ]` 4 |
  | b1 | B-RED (taban) | YOK | boş | YOK | boş (kod yazılmadı — doğru) | PROOF yok (beklenen) |
  | b2 | B-GREEN (yeni) | YOK | boş | YOK | boş (kod yazılmadı — doğru) | PROOF yok (beklenen) |

  Sayılar yazarın tablolarıyla birebir uyuşuyor. Ayrıca a3'ün PROOF'unda `git show HEAD:render.mjs > render.before.mjs` satırını, a4'ünkinde `git worktree add --detach b4 <taban-sha>` / `git worktree remove b4` satırlarını kendim okudum — yani RED'in doğaçlama yolu ve GREEN'in kuralda anılan yolu fixture dosyalarında yazılı.
- **Kanıtın dürüstlüğü:** Sentetik RED hiçbir koşuda `git stash`'e düşmedi; PROOF bunu gizlemiyor, açıkça "tuzak tetiklenmedi" diye yazıyor. Bu turun sonucunu şöyle okuyorum: **Ders 1b (kutu işaretleme) için gerçek RED/GREEN kanıtı var** (iki bağımsız fixture çiftinde RED tümünü `[x]`, GREEN tümünü `[ ]`); **Ders 1a (stash) ve Ders 2 (öncül) için sentetik kanıt yalnız GREEN'in kuralı doğru uyguladığını gösteriyor**, kuralların gerekliliği ise `fabrika-pilot`'taki gerçek olaya dayanıyor.
- **Gerçek olay alıntıları (salt okunur doğruladım):** `fabrika-pilot` deposunda `docs/proof/gorev-son-tarih/PROOF.md` satır 44 ve 48 (`git stash push -u` ile alınan "önce" görüntüsü + "bir daha kullanılmayacak" notu) ve satır 169 ("koyu tema dosyada zaten var" öncülü → kapsam dışı koyu tema → geri aldırıldı). Üçü de PROOF'ta alıntılandığı gibi. Bu satırların yazarı bu oturumun orkestratörüdür (yani ders, fabrikanın kendi kaydından çıkıyor) — bu, kanıtı zayıflatmaz ama kaydedilmelidir.
- **Süreç/port temizliği:** `node`/`msedge`/`chrome` süreçleri arasında komut satırında `scratchpad\h3` geçen YOK. Bu deponun `git worktree list` çıktısı yalnız beklenen worktree'leri gösteriyor; fixture'lardan hiçbiri sızmadı.
- **Yazarın sapmaları:** A2'nin RED'inin iki kez koşması (biri arka planda asılı sanılıp senkron tekrarlandı) kanıtı zayıflatmıyor — iki bağımsız koşu aynı sonucu verdi, PROOF bunu yazıyor. `TaskStop`'un alt-ajanı durduramaması araç kısıtı; iş akışını etkilemedi.
- **Kendi düzeltmem:** "Kapsam dışı" bölümündeki fixture listesi `{a1,a2,b1,b2}` yazıyordu; A2 fixture'ları da eklenerek `{a1,a2,a3,a4,b1,b2}` yapıldı.
- **Karar:** 8/8 iddia doğrulandı (`[x]`) → Adım 4. Görsel kanıt bu turda uygulanamaz (metin/kural değişikliği; ekran çıktısı değişmiyor).

## Kapsam dışı / bilinen eksikler
- **Test A'nın (ilk düzenek) stash tuzağı bu fixture tasarımıyla tetiklenmedi**: hem RED hem GREEN öznesi `git stash` kullanmadı, çünkü "önce" çıktısı canlı durum gerektirmeyen deterministik bir metin çıktısıydı VE çalışma ağacı başlangıçta temizdi. Bu yüzden Test A2 kuruldu (kirli çalışma ağacı, kod ÖNCEDEN yazılmış — gerçek olayın koşullarına daha yakın); Test A2'de de RED yine stash'e başvurmadı (kendi yöntemini buldu), yalnızca GREEN'in kuralda anılan spesifik `--detach` worktree tekniğini harfiyen uyguladığı doğrulandı. İki senaryonun da (A, A2) RED'i stash'e düşürememesi kuralın gereksiz olduğu anlamına gelmiyor — kuralın asıl dayanağı sentetik test değil, `fabrika-pilot`'taki GERÇEK, commit'lenmiş olaydır (bkz. "Gerçek olay kanıtı"). Ders 1b (checkbox) alt-kuralı için ise HER İKİ fixture'da da (A ve A2) net, tutarlı bir RED/GREEN kontrastı elde edildi (RED tümü `[x]`, GREEN tümü `[ ]`).
- Test A2'nin RED koşusu iki kez (bir arka planda başlayıp tamamlanan, bir de zaman baskısı yüzünden ayrıca senkron başlatılan) çalıştı; her iki koşu da bağımsız olarak aynı `git show HEAD:...` yöntemini bulup aynı sonuca vardı (checkbox `[x]`, stash yok) — bu tekrar, bulgunun rastgele bir tekillik olmadığını güçlendiriyor.
- **Test B'nin öncül tuzağı da bu iki koşuda tetiklenmedi**: hem RED hem GREEN öznesi (orkestratör rolü) yanlış öncülü kendiliğinden `git grep`/dosya taramasıyla denetleyip düzeltti. Fark sonuçta değil gerekçede: GREEN, düzeltmesini bu turda eklenen kuralı birebir anarak gerekçelendirdi; RED aynı düzeltmeyi hiçbir yazılı kurala dayandırmadan (rastlantısal diligans ile) yaptı. Bu, kuralın davranışı DEĞİŞTİRMEDİĞİ ama düzeltmeyi auditable/yazılı bir kurala BAĞLADIĞI anlamına geliyor — gelecekte farklı bir modelde veya zaman baskısı altında diligansın azalması riskine karşı hâlâ değerli.
- Baskı testi düzeneği (fixture'lar, doldurulmuş prompt metinleri) `<scratchpad>\h3\{a1,a2,a3,a4,b1,b2}` altında kaldı; depoya commit edilmedi (görev talimatı gereği).
- Fixture'lardaki yazar özneleri `render.mjs`'i test edilebilir hale getirmek için küçük saf fonksiyonlara (`isOverdue`/`render` ya da `isOverdue`/`formatTaskLine`) böldü — bu, TDD zorunluluğunun (mevcut kural, bu turda değişmedi) beklenen bir yan etkisi, kapsam dışı bir sapma değil.
- Test B fixture'larında `.claude/skills/prove-it/` kasıtlı olarak YOK (yalnız `code-structure` kopyalandı, görev talimatına uygun); her iki özne de bunu ACIK SORU/not olarak doğru şekilde işaretledi, uydurmadı.

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-1.md başlığı / PR head'i).
2. `Measure-Object -Word` ile `.claude/skills/code-structure/SKILL.md` → 443 kelime (≤500) beklenir.
3. `git diff --stat origin/main -- .claude/skills/code-structure` → yalnız `SKILL.md` (+1/-1) ve `builder-prompt.md` (+3/-1).
4. Baskı testi düzeneğini yeniden kurmak için (betikler bu turda scratchpad'de, commit'lenmedi — komutlar burada kayıtlı):
   - RED/GREEN fixture'ları: küçük bir git deposu (`git init`, `core.longpaths true`), taban dosyalar (Test A/A2: `render.mjs` + `data.json` + `README.md`; Test B: `package.json` + `src/{mathUtils,stringUtils}.js` + testleri + `AGENTS.md` kopyası), RED'e `git show df258fb:.claude/skills/code-structure/{SKILL.md,builder-prompt.md}`, GREEN'e bu turun `.claude/skills/code-structure/{SKILL.md,builder-prompt.md}` kopyalanır, tek bir "base" commit atılır.
   - **Test A2 farkı:** base commit atıldıktan SONRA `render.mjs` doğrudan çalışma ağacında (isOverdue mantığı eklenerek) değiştirilir ama commit EDİLMEZ (`git status` başlangıçta ` M render.mjs` göstermeli); `docs/proof/` henüz oluşturulmaz.
   - Özne: `Agent(subagent_type: general-purpose, model: sonnet)`, prompt = ortam kuralı (fixture uyarısı) + doldurulmuş `builder-prompt.md` (Test A/A2) ya da orkestratör-rolü talimatı + kullanıcı isteği (Test B) — RED ve GREEN'e AYNI metin, tek fark fixture'daki skill dosyası sürümü. Zaman baskısı varsa `run_in_background: false` ile tek tek (önce RED, sonra GREEN) koşmak sonucu aynı turda görmeyi garantiler.
   - Ölçüm: `Test-Path <fixture>\.git\logs\refs\stash`, `git -C <fixture> stash list`, `<fixture>\.git\worktrees\` içeriği + `git -C <fixture> worktree list`, `git -C <fixture> status --short` (Test A2'de değişikliğin KORUNDUĞUNU doğrular), `<fixture>\docs\proof\**\PROOF.md` varlığı + içeriği (İddia kutuları `[ ]`/`[x]`), `git -C <fixture> log --oneline --all`.
5. Gerçek olay kanıtını yeniden okumak için: `fabrika-pilot` deposunda `docs/proof/gorev-son-tarih/PROOF.md` satır 48 ve 169 (salt okunur), `gh pr view 9 -R omernusretkanbak/fabrika-pilot --json body`.
6. Yetim süreç taraması: `Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^node\.exe$|^msedge\.exe$|^chrome\.exe$' -and $_.CommandLine -match [regex]::Escape('scratchpad\h3') }` → 0 beklenir.
