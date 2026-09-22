# İnceleme — Tur 1

| PR | Aralık | İnceleyici | Yazar |
|---|---|---|---|
| #4 | `df258fb..d378e4c` | Fable 5.1 (taze bağlam) | Sonnet 5 |

```
SKOR: 4
KARAR: DUZELTME_GEREKLI
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)
GUCLU_YANLAR:
- `.claude/skills/code-structure/builder-prompt.md:31` — yasak + nedeni (yığın tüm worktree'lerle ortak) + tam komutlu alternatif (`git worktree add --detach` … `git worktree remove`) tek maddede; a4 fixture'ı bu maddeyi harfiyen uyguladı (`a4/docs/proof/gecikmis-gorevler/PROOF.md:21,67` — kendim okudum).
- `.claude/skills/code-structure/builder-prompt.md:32` — kutu kuralı gerekçeli ve tek başına gerçek RED/GREEN kanıtı olan madde: altı fixture'ı yeniden ölçtüm, a1 `[x]`5/`[ ]`0, a2 0/4, a3 4/0, a4 0/4 — PROOF:161–164 ile birebir.
- `.claude/skills/code-structure/SKILL.md:22` — öncül doğrulama kuralı doğru yere (görevlendirmeden ÖNCE / "Alt-ajan bitince"den önce) girmiş, yöntem (`git grep`/okuma) ve sonuç ("kapsam dışına iter") emir kipinde; `Measure-Object -Word` 443 (taban 404), sınır korunmuş.
- Kapsam: `git diff --name-status df258fb..d378e4c` yalnız 2 skill dosyası + PROOF; `git diff --quiet df258fb..d378e4c -- AGENTS.md CLAUDE.md README.md new-feature prove-it ship-it` çıkış 0; `git worktree list`te fixture sızıntısı yok; yetim süreç taraması 0.
- RED/GREEN tek değişkeni: `a1_prompt.txt`↔`a2_prompt.txt` ve `a3`↔`a4` yalnız fixture yolu + gömülü `builder-prompt.md` bloğunda (yani test edilen dosyanın kendisinde) farklı; `b1`↔`b2` yalnız yolda farklı. RED skill dosyaları `df258fb` ile bayt-eş (`--ignore-cr-at-eol`, çıkış 0), GREEN'ler head ile eş; prove-it kopyaları dört fixture'da da aynı; taban blob'lar (`render.mjs`/`data.json`/`README.md`) çiftlerde aynı SHA; a3/a4 kirli diff'i birebir aynı.
- Gerçek olay alıntıları kaynakta var: `fabrika-pilot` deposu, `docs/proof/gorev-son-tarih/PROOF.md:44` (`git stash push -u`), `:48` (orkestratör notu), `:169` (koyu tema öncülü + "bir daha kullanılmayacak"); PR #9 gövdesinde "Görev metnindeki yanlış bir öncül yüzünden eklenen koyu tema geri alındı." mevcut; o depo temiz.
- PROOF:121,126,139,169,177,179 — tuzağın tetiklenmediği, sentetik kanıtın yalnız GREEN'in uygulamasını gösterdiği, kuralın dayanağının gerçek olay olduğu açıkça yazılmış; commit mesajı da aynı dürüstlükte.
ENGELLEYICI:
- YOK
ONEMLI:
- `docs/proof/pilot-dersleri-3/PROOF.md:58,126,139,177` — RED'in stash'e düşmemesinin açıklaması eksik: bu oturumdan açılan her alt-ajan (bu inceleyici dahil) harness'in "This is a git worktree … git stash stack is shared … Never use bare `git stash`" ortam bloğunu alıyor; Sonnet özneleri de aynı oturumdan aynı worktree cwd'siyle açıldı. Yani Ders 1a için RED tabanı "kural yok" değildi; "yazılı hiçbir kurala dayanmayan yol" (58, 126) ifadesi bu yüzden yanlış — Neden önemli: aynı düzenek gelecekte her stash RED testini geçersiz kılar; harness dersi kayda girmezse tekrar edilir. — Nasıl düzeltilir: "Kapsam dışı / bilinen eksikler"e bu confound'u ekle (58/126'daki ifadeyi "prompt'taki hiçbir kuralda yok" diye daralt); gerçek RED için özneyi worktree olmayan bir cwd'den (ör. fixture'ın kendisi) başlatma notunu `skill-pressure-test-harness.md` belleğine ve PROOF'a yaz.
- `.claude/skills/code-structure/builder-prompt.md:31` ↔ `.claude/skills/prove-it/SKILL.md:39` — aynı durum ("önce" alınmadan kod değişti) için iki farklı reçete: prove-it "yoksa `main` worktree'sinde", builder-prompt "tabandan geçici `--detach` worktree". Yazar her ikisini okumaya zorunlu (builder-prompt:22). PROOF:156 "çelişmiyor" derken yalnız `new-feature` (b)'ye bakmış; prove-it:39 kontrol edilmemiş. — Neden önemli: ana kopya paylaşımlı ve tabandan ileri olabilir; yazar hangisini son okuduysa onu uygular. — Nasıl düzeltilir: (kapsam içi) builder-prompt:31'e kısa bir öncelik cümlesi ("prove-it'teki `main` worktree'si seçeneği yazar için geçerli değil; ana kopya paylaşımlıdır"); (takip) prove-it:39'daki "yoksa `main` worktree'sinde"yi "tabandan geçici `--detach` worktree'de" ile hizalayan ayrı PR; PROOF:156'da tutarlılık kontrolünün prove-it:39'u da kapsadığını yaz.
KUCUK:
- `.claude/skills/code-structure/SKILL.md:22` + `PROOF.md:156` — örnek "`git grep prefers-color-scheme` boş döndü" gerçek depoda boş dönmez: `git grep -l prefers-color-scheme` → `capture-page.mjs`, `capture-page.selftest.mjs`, `docs/proof/proje-iskeleti/*` (4 dosya); `gorev-son-tarih` PROOF'unda böyle bir grep kaydı da yok. Aynen uygulayan bir orkestratör "koyu tema var" sonucuna varır — kuralın amacıyla ters. Örneği daralt (`git grep prefers-color-scheme -- src` ya da `git grep -n color-scheme src/style.css` → `color-scheme: light`), PROOF:156'daki "birebir örtüşüyor"u "örnekle uyumlu" yap.
- `.claude/skills/code-structure/builder-prompt.md:31` — `<kısa-yol>` ve `<taban-sha>` yer tutucuları açıklanmamış: yol nereye (a4'te göreli `b4` → görev worktree'sinin İÇİNDE iç içe worktree; new-feature (c) göreli yolu tam bu nedenle yasaklıyor), SHA hangisi (yazar için pratikte `HEAD`; tur 2'de merge-base değil), "önce" çıktısı nereye yazılır (geçici worktree'ye yazılırsa `git worktree remove` `--force` ister). Öneri: "`<taban-sha>` yerine `HEAD`; yolu görev worktree'sinin DIŞINA, kısa mutlak yola aç; çıktıyı doğrudan `docs/proof/{DAL_SLUG}/` altına yaz".
- `PROOF.md:66,113,134,136` — Test B'nin tek ayırt edici bulgusu (GREEN'in gerekçesinde kuralı anması) yalnız özne raporundan; b1/b2'de kalıcı artefakt yok (`git status --short` boş, dolu prompt dosyaya yazılmamış), sonradan doğrulanamaz. Gelecek düzenekte özneye doldurduğu prompt'u fixture içine dosya olarak yazdır.
- `.claude/skills/code-structure/builder-prompt.md:27` vs `:30` — "Önce kırmızı test" ile "'önce' … görevin İLK işidir" aynı listede iki "ilk" var; a1 doğru yorumladı (test dosyası yazıldı, çıktı değişmeden "önce" alındı) ama "kod değişmeden, test dosyası serbest" diye netleştirmek ucuz.
GEREKCE: Kural metinleri doğru yerde, emir kipinde ve gerçek olayla temellendirilmiş; altı fixture ölçümü, prompt eşliği ve kaynak alıntıları tümüyle yeniden üretildi, kapsam temiz. Ancak PROOF'un "tuzak tetiklenmedi" açıklaması harness'in alt-ajanlara verdiği stash uyarısını görmüyor ve yeni "önce" reçetesi prove-it:39'daki mevcut reçeteyle uzlaştırılmadan eklendi; bu iki ÖNEMLİ bulgu giderilmeden 5 verilemez.
```

## Orkestratör kararı

SKOR 4 → döngü kuralı: ENGELLEYİCİ (yok) + ÖNEMLİ (2) bulgular yeni bir Yazar görevine döndü → Adım 2 → 3 → yeni inceleyici (Tur 2). Dört KUCUK'tan üçü (yanlış grep örneği, belirsiz yer tutucular, çakışan iki "ilk") aynı turda kapatıldı; KUCUK-3 (Test B'nin kalıcı artefaktı) ertelendi ve bilinen eksiklere yazıldı.

ÖNEMLİ-1 orkestratörün kendi düzenek hatasıdır: baskı testini kuran bendim ve harness'in alt-ajanlara verdiği "stash yığını paylaşımlı" uyarısını hesaba katmadım; RED kolu hiçbir zaman "kuralsız" olmadı. Bulgu kabul edildi, iddialar daraltıldı ve ders `skill-pressure-test-harness` belleğine kalıcı olarak yazıldı (izolasyon/stash kuralı sınanacaksa özne worktree OLMAYAN bir cwd'den başlatılmalı).

ÖNEMLİ-2 kapsam içi kısmıyla (builder-prompt'a öncelik cümlesi) kapatıldı; `prove-it/SKILL.md:39`'un kendisi 513 kelimeyle sınırda olduğu için ayrı bir takip görevine bırakıldı.
