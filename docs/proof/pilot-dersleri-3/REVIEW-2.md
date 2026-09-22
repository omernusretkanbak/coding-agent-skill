# İnceleme — Tur 2

| PR | Aralık | İnceleyici | Yazar |
|---|---|---|---|
| #4 | `df258fb..4b1fe6a` (Tur 2 farkı `d378e4c..4b1fe6a`) | Fable 5.1 (taze bağlam; ilk deneme haftalık kota sınırında kesildi, sıfırlanınca aynı inceleyici sürdürüldü) | Sonnet 5 |

```
SKOR: 4
KARAR: DUZELTME_GEREKLI
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)
GUCLU_YANLAR:
- `.claude/skills/code-structure/builder-prompt.md:31` — ÖNEMLİ-2 kapanışı: prove-it'in "yoksa `main` worktree'sinde" seçeneği yazar için ADIYLA ve gerekçesiyle ("ana kopya paylaşımlı ve tabandan ileri olabilir") geçersiz kılınmış; taban `HEAD`, yol "dışına + kısa MUTLAK", çıktı `docs/proof/{DAL_SLUG}/` — `new-feature/SKILL.md:23,25`'teki "asla göreli yol" kuralıyla tutarlı, `{DAL_SLUG}` yer tutucusu `:2`'de tanımlı.
- `.claude/skills/code-structure/builder-prompt.md:30` — "KOD değişmeden (test dosyası yazmak serbest)" ifadesi TDD ile "önce" kanıtının çakışmasını kaldırıyor (KUCUK-4); a1 fixture'ının fiilen yaptığı sıralamayla örtüşüyor.
- `.claude/skills/code-structure/SKILL.md:22` — KUCUK-1 örneğini `fabrika-pilot` deposunda (HEAD `052a7de`, salt okunur) kendim koştum: `git grep -n color-scheme -- src/` → tek satır `src/style.css:2:  color-scheme: light;`; `git grep -q prefers-color-scheme -- src/` → çıkış 1; eski örnek repo genelinde 4 dosya buluyor. Yeni örnek doğru. `Measure-Object -Word`: SKILL.md 451 (taban 404, Tur 1 443), builder-prompt 347, prove-it 513 — PROOF:219,220,246 ile birebir.
- `docs/proof/pilot-dersleri-3/PROOF.md:177,206,245` + commit `5f7f150` mesajı — confound açıkça yazılmış, gerçek RED koşulu (worktree OLMAYAN cwd) tarif edilmiş, orkestratör hatayı kendi üstüne almış; harness uyarısını bu inceleme oturumunun kendi ortam bloğunda ("git stash stack is shared … Never use bare `git stash`") ben de doğruluyorum.
- Fixture ölçümleri (altı fixture'da tekrarladım): stash log YOK/liste boş/`.git\worktrees` YOK hepsinde; a1 `[x]`5/`[ ]`0, a2 0/4, a3 4/0, a4 0/4, b1/b2 PROOF yok; a3 `status` ` M render.mjs` korunmuş, a4 aynı + `b4` dizini yok; a3 PROOF:27 `git show HEAD:render.mjs`, a4 PROOF:21,67 `git worktree add --detach b4 …`/`remove b4` — PROOF:161–168 ile birebir. RED skill dosyaları `df258fb`, GREEN'ler `d378e4c` ile bayt-eş (`--ignore-cr-at-eol`); yetim süreç 0; `git worktree list` yalnız beklenen 4 worktree.
- Kapsam: `git diff --name-status df258fb..4b1fe6a` yalnız 2 skill dosyası + PROOF + REVIEW-1; `git diff --quiet … -- AGENTS.md CLAUDE.md README.md new-feature prove-it ship-it` çıkış 0; Tur 2 kod farkı 2 dosya 3+/3−. Tur 1 kararı PR #4'e yorum olarak düşülmüş (id 5748953980, REVIEW-1.md ile aynı metin).
- PROOF.md:199–260 — Tur 2 gerçekten `## Tur 2` olarak EKLENMİŞ (kendi İddia/Test/Orkestratör/Kapsam dışı/Yeniden üretme bölümleriyle); Tur 1 metnindeki yerinde daraltmalar etiketli ve Tur 1 inceleyicisinin istediği biçimde.
ENGELLEYICI:
- YOK
ONEMLI:
- `.claude/skills/code-structure/builder-prompt.md:9` ↔ `:31` — Satır 9 "Yalnız `{WORKTREE_ABS}` altına yaz. Dışına dokunma. … Salt-okunur git komutları serbest" derken satır 31 yazara görev worktree'sinin DIŞINA dizin açtırıp yazma komutu olan `git worktree add`/`remove` (ortak `.git/worktrees/`'e yazar) çalıştırtıyor; istisna hiçbir yerde belirtilmemiş. — Neden önemli: prompt, düzenlediği davranışın tam noktasında kendisiyle çelişiyor; a4 öznesi (Tur 1 metni + aynı satır 9 ile) `b4`'ü zaten İÇERİYE açmıştı — satır 9 bunun en olası nedeni; Tur 2 metni hiçbir koşuda sınanmadı (GREEN fixture'ları ve `a2/a4_prompt.txt` `d378e4c` sözcükleriyle: `<kısa-yol>`/`<taban-sha>`). Ucuz model genel kuralı seçerse iç içe worktree, seçmezse "dışına dokunma" ihlali raporu çıkar. — Nasıl düzeltilir: satır 9'a tek istisna cümlesi ("Tek istisna: 'Çalışma biçimi'ndeki geçici `--detach` worktree — `git worktree add/remove` bu amaçla serbest") ya da satır 31'e "Çalışma alanı kuralının tek istisnası budur" ekle.
- `docs/proof/pilot-dersleri-3/PROOF.md:109` (+ `:58`, `:139`) — Tur 1 ÖNEMLİ-1'in kapanışı eksik: 109 hâlâ "RED yazılı hiçbir kurala dayanmadan kendi yolunu buldu" diyor (58/126/139'da daraltılan ifadenin aynısı, aynı sayfada 58 ve 177 ile çelişiyor); 58 "bu PROOF'un başındaki 'Environment update' bloğuna bakınız", 139 "bu mesajın başındaki 'Environment update'" diye dosyada VAR OLMAYAN bir bloğa (yazar alt-ajanının kendi mesajına) atıf yapıyor. — Neden önemli: bu turun tek konusu çerçevenin dürüstlüğüydü; kanıt belgesi RED tabanı hakkında iki farklı şey söylüyor ve confound'un kaynağı okurun ulaşamayacağı bir yere işaret ediyor. — Nasıl düzeltilir: 109'u 58'deki gibi daralt ("verilen prompt'ta kural yok; harness uyarısı görülmüş olabilir"); iki atfı "bkz. Kapsam dışı → Harness confound" ile değiştir (o madde uyarıyı zaten alıntılıyor) ya da harness cümlesini orada bir kez tırnak içinde ver.
KUCUK:
- `PROOF.md:177,178,156` — Bulgu atfı yanlış: 177 "Tur 2 incelemesinde bulundu", 178 "Tur 2'de bulundu" — ikisi de Tur 1 incelemesinde (REVIEW-1.md) bulunup Tur 2'de kapatıldı; 156 ise Tur 1 orkestratör doğrulaması içinde, prove-it kontrolü Tur 1'de yapılmış gibi okunuyor. "Tur 1 incelemesinde (REVIEW-1) bulundu, Tur 2'de kapatıldı" yaz. Aynı şekilde `:10` "(gerçek örnekle: koyu tema/`prefers-color-scheme`)" eski örneği anıyor; `color-scheme -- src/` yap.
- `PROOF.md:252` — "yalnız YORUM/ÇERÇEVE metni daraltıldı" eksik: Tur 2'de `builder-prompt.md`'nin kural metni de değişti (3 maddeden 2'si yeniden yazıldı) ve HEAD'deki sözcükler hiçbir GREEN koşusunda kullanılmadı (a2/a4/b2 = `d378e4c`). Kapsam dışı (Tur 2)'ye "HEAD sözcükleri baskı testinden geçmedi; a4 kanıtı Tur 1 metnine aittir" notu ekle.
- `PROOF.md:229,260` — makineye özgü sürücü yolu (Tur 1 metni "`fabrika-pilot` deposu" diye soyutlamıştı, fixture'lar `<scratchpad>` ile). Sürücü yolunu kaldır.
- `PROOF.md:208,233` — Repo geneli `prefers-color-scheme` sayısı: 208 "üç eski PROOF.md/REVIEW-1.md dosyasında 7 eşleşme", 233 "iki PROOF.md/REVIEW-1.md" — listelenen 4 dosya 2 script + 2 belgedir ("üç" yanlış); bende 9 eşleşen satır (HEAD `052a7de`; o günden beri 4 commit var, sayı ölçüm anından sonra değişmiş olabilir ama "üç"/"iki" kendi içinde tutarsız). Yeniden say, tek sayı yaz.
- `.claude/skills/code-structure/builder-prompt.md:31` — Tek madde ≈120 kelime, iç içe parantez; gereksinim "kısa ve emir kipinde". İkiye böl: (1) yasak + neden, (2) reçete + öncelik cümlesi. İçerik değişmez.
- `PROOF.md:178,253` — `prove-it/SKILL.md:39` hizalama takip görevi yalnız PROOF metninde yaşıyor; kaybolmaması için depoda bir issue aç ve numarasını buraya yaz.
GEREKCE: Tur 1'in iki ÖNEMLİ'si özünde kapatılmış, KUCUK-1/2/4 doğru uygulanmış, tüm ölçümler ve alıntılar yeniden üretildi, kapsam temiz; ancak Tur 2'nin yeni `builder-prompt.md` metni satır 9'daki "dışına dokunma / yalnız salt-okunur git" sınırıyla çelişiyor (a4'ün iç içe worktree davranışının olası nedeni, sınanmamış) ve PROOF'ta RED tabanına dair daraltılmamış bir cümle ile var olmayan bir bloğa iki atıf kalmış; bu iki ÖNEMLİ giderilmeden 5 verilemez.
```

## Orkestratör kararı

SKOR 4 → döngü kuralı: iki ÖNEMLİ bulgu yeni bir Yazar görevine döndü → **Tur 3 (döngü sınırının son turu)**. Tur 3 sonunda hâlâ 5 değilse son kararla kullanıcıya eskalasyon.

- ÖNEMLİ-1 (şablonun kendisiyle çelişmesi) kabul edildi: çalışma alanı kuralına tek istisna cümlesi eklenecek ve Tur 2/3 metni ilk kez gerçek bir koşuda sınanacak (yeni GREEN fixture'ı `a5`, kirli ağaç, senkron özne).
- ÖNEMLİ-2 (PROOF'ta kalan daraltılmamış cümle ve var olmayan bloğa iki atıf) kabul edildi.
- Altı KUCUK'un tamamı Tur 3'te kapatılacak. `prove-it` hizalama takip görevi, yeni bir herkese açık issue yerine PR #4 açıklamasındaki "Takip notları"na yazıldı (önceki fabrika PR'larındaki düzen); PROOF oraya atıf verecek.
- **Orkestratörün kendi doğrulama hatası (kayıt):** Tur 2 orkestratör bölümünde "makineye özgü yol taraması temiz" dedim; tarama komutum `Select-String -SimpleMatch` ile sürücü yolu için yazdığım düzenli ifadeyi düz metin olarak aradığı için HİÇBİR ZAMAN eşleşemezdi. İnceleyicinin bulduğu sürücü yolu satırları bu yüzden kaçtı. Tur 3'te tarama `-SimpleMatch` olmadan, düzenli ifadeyle yeniden yapılacak ve sonucu PROOF'a yazılacak.
