# İNCELEME — Tur 6 (kullanıcı isteği: kalan notlar)

PR #1 · base `94465a9` → head `4683fbb` (Tur 6 farkı `5b8299b..4683fbb`) · İnceleyici: Fable 5.1 (taze bağlam, `Agent(model: fable)`) · Yazar: Sonnet 5 · Orkestratör: Fable 5.1 (oturum)

```
SKOR: 5
KARAR: PRODUCTION_READY
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)
GUCLU_YANLAR:
- .claude/skills/ship-it/reviewer-prompt.md:2–3 — yer tutucu listesi eksiksiz: dosya üzerinde `\{[^}]+\}` taraması tam olarak :2'de sayılan 9 tokeni veriyor ({REVIEWER_MODEL}/{BUILDER_MODEL} :5, {DESCRIPTION} :9, {REQUIREMENTS} :13, {PR_NUMBER}/{BASE_SHA}/{HEAD_SHA} :17/:19, {WORKTREE_ABS} :17/:19/:23, {DAL_SLUG} :23); :3 tanımı builder-prompt.md:3 ile kelimesi kelimesine aynı.
- Şablon yer tutucusu önce/sonra bağımsız yeniden üretildi: `git grep -n -e "{SLUG}" -e "{dal-slug}" -e "{DAL_SLUG}" 5b8299b -- .claude/skills` → builder-prompt.md:2/:37 `{DAL_SLUG}`, PROOF-template.md:3 `{dal-slug}`, reviewer-prompt.md:21 `{SLUG}` (üç yazım); HEAD'de aynı grep → yalnız `{DAL_SLUG}`, 5 geçiş / 3 dosya (builder :2/:37, PROOF-template :3, reviewer :2/:23). PROOF.md:331 ve :337 ile birebir.
- .claude/skills/new-feature/SKILL.md:23 — iki parantez de artık "(`/` → `-` uygulanmış"; :33 aynı biçim. `wc -w`: 5b8299b blob'u (scratchpad'e kaydedilip sayıldı) 495 → HEAD 496; PROOF.md:323 ve :338 doğru, orkestratörün yazarın "497" tahminini 496'ya düzeltmesi de doğru (bu ortamdaki `wc` yalnız "→" olan tokeni kelime saymıyor).
- Ölçümler bağımsız tekrarlandı: `wc -w` → 393 / 496 / 390 / 379 / 484 (AGENTS ≤400, SKILL ≤500); PyYAML `safe_load` 4/4 (anahtarlar name/description[/argument-hint]; description 392/377/354/383, hepsi "Use when/before"); `ConvertFrom-Json` geçerli, `gh pr merge` deny (:38), force push biçimleri deny (:39–46). PROOF.md:328–329 ile aynı.
- Kapsam ve commit disiplini: `git diff --stat 5b8299b..146ca34` = 3 dosya, 5+/3−; `146ca34..4683fbb` = yalnız PROOF.md 37+/1−; PR toplamı 18 dosya, 1038+/0−; `git status --porcelain` boş; her iki Tur 6 commit'inde `Co-Authored-By` var. PROOF.md:310 aralık ve :340 kapsam iddiası stat ile birebir.
- docs/proof/software-factory/PROOF.md:287 — KÜÇÜK-5 satırı artık bölüm adıyla atıf yapıyor (`## Yeniden üretme` 6. madde ↔ `## Sonuç`), eski numaralar "REVIEW-4'te" etiketli; gelecekteki satır kaymalarına dayanıklı.
- docs/proof/software-factory/PROOF.md:320 — KÜÇÜK-1'in `5b8299b`'de kapandığı iddiası `git show 5b8299b -- PROOF.md` ile doğrulandı: o commit tam olarak :228 cümlesini değiştirip :226 Tur 5 satırını ekliyor.
- .claude/skills/prove-it/PROOF-template.md:1 — normatif `<dal-slug>` korunmuş; Tur 2'de kurulan `<…>` normatif / `{…}` doldurma ayrımı (PROOF.md:135) bozulmadı. ship-it/SKILL.md:29, prove-it/SKILL.md:43, docs/proof/README.md:17 çapraz referansları hâlâ geçerli.
- Koruma/güvenlik: `git ls-remote origin main` = `94465a9`; `gh pr view 1` → OPEN, isDraft=true, mergedAt=null, head `4683fbb`, 5 yorum (tur başına bir karar); `git check-ignore -v` → `.gitignore:3` / `:2`; tracked dosyalarda `nusre` / `C:\Users` / token deseni yok (yalnız REVIEW-3.md:16, REVIEW-4.md:15, REVIEW-5.md:17'nin kendi cümleleri); Tur 6 farkı hiç yol eklemiyor.
- .claude/skills/ship-it/reviewer-prompt.md:19 — "bileşik komutlar izolasyon kilidine takılabilir" uyarısı gerçek: bu incelemede `python -c … subprocess git show` çağrım kilit tarafından reddedildi, düz `git show` geçti.
- Plan/gereksinim uyumu Tur 6'da bozulmadı: AGENTS.md:3/:11 mimari anlatmama; :9 sabit roller; :25–28 dört adım; :32 döngü; :10 merge yasağı; CLAUDE.md:1 `@AGENTS.md`, :7 sonnet/fable; settings.json:38.
TUR5_KAPANIS:
- KÜÇÜK-1 (`## Sonuç` "kayıtlı, düzeltilmedi" cümlesi) — kapandı — docs/proof/software-factory/PROOF.md:226 (Tur 5 satırı), :228 (`## Sonuç`; commit `5b8299b`)
- KÜÇÜK-2 (Tur 5 tablosunda eski satır atfı :115 ↔ :228) — kapandı — docs/proof/software-factory/PROOF.md:287 (`## Tur 5`, Bulgu → Düzeltme, KÜÇÜK-5 satırı)
- KÜÇÜK-3 (`{SLUG}` / `{DAL_SLUG}` / `{dal-slug}` şablon yer tutucusu birliği + reviewer-prompt yer tutucu listesi) — kapandı — .claude/skills/ship-it/reviewer-prompt.md:2–3, :23; .claude/skills/prove-it/PROOF-template.md:3 (git grep: 3 yazım → yalnız `{DAL_SLUG}`)
- KÜÇÜK-4 (new-feature (a) boşluk biçimi) — kapandı — .claude/skills/new-feature/SKILL.md:23 (wc 495 → 496)
ENGELLEYICI:
YOK
ONEMLI:
YOK
KUCUK:
- docs/proof/software-factory/PROOF.md:228 — "Tur 5'in 4 KÜÇÜK notu (…) kayıtlı; normatif kuralları etkilemez." cümlesi `5b8299b`'de yazıldı; HEAD'de `## Tur 6` (:307–323) bu notları kapattığı için özet yine bir tur geride (REVIEW-5 KUCUK-1 ile aynı sınıf); :220–226 tablosunda Tur 6 satırı yok, :230 "Eğilim" "→ 4"te bitiyor — `## Sonuç`'u okuyan biri notların açık kaldığını sanır — REVIEW-6 kayıt commit'inde (5b8299b'deki gibi) Tur 6 satırını ekle, cümleyi "(Tur 6'da kullanıcı isteğiyle düzeltildi; bkz. `## Tur 6`)" yap, eğilimi uzat.
- .claude/skills/prove-it/PROOF-template.md:3 ↔ :7 — isteğe bağlı: başlık `{DAL_SLUG}` (büyük harf, orkestratör doldurma biçimi) olurken aynı blokta `{görev}`, `{base-sha}..{head-sha}` küçük harf-tire kaldı; dosya Tur 6 öncesi kendi içinde tek biçimdi — salt biçim, işlev etkisi yok — ya olduğu gibi bırak (gerekçe: `{DAL_SLUG}` iki prompt'la ortak sabit değişken, diğerleri serbest metin; istenirse :1 yorumuna tek cümle) ya da `{base-sha}`/`{head-sha}`'yı da büyük harfe çek (SKILL.md değil, kelime bütçesi etkilenmez).
GEREKCE: REVIEW-5'in dört KÜÇÜK notu dosya:satır düzeyinde kapanmış; şablon yer tutucusu önce/sonra grep'i, wc (495 → 496 dahil), PyYAML, ConvertFrom-Json, commit kapsamı, KÜÇÜK-1'in 5b8299b atfı ve PR/remote koruma durumu bağımsız yeniden üretildi, Tur 6 farkı (4 dosya, 42+/4−) ve tüm normatif dosyalar okundu. Kalan iki madde kanıt özetinin bir tur geride kalması ve şablon içi yazım biçimi — hiçbiri yanlış kural, çelişki, çalışmayan komut ya da eksik gereksinim değil.
```

**Orkestratör kararı:** SKOR 5 → ship-it madde 6: PR yeniden hazır işaretlendi (`gh pr ready 1`), bağlantı kullanıcıya sunuldu, DURULDU. Merge yapılmadı; karar kullanıcının.

- KUCUK-1 bu kayıt commit'inde kapatıldı (`## Sonuç`: Tur 6 satırı, güncel cümle, eğilim). Bu sınıf bulgu yapısal olarak her turda oluşur: özet, inceleme kararından önce yazılır ve karar geldiğinde kayıt commit'iyle güncellenir.
- KUCUK-2 kasıtlı olarak olduğu gibi bırakıldı; inceleyicinin kendi gerekçesi benimsendi: `{DAL_SLUG}` üç şablonun ortak, orkestratörün doldurduğu sabit değişkenidir; `{görev}`, `{base-sha}..{head-sha}` ise yazarın doldurduğu serbest metin alanlarıdır. Ayrım işlevseldir, biçim tesadüfi değildir.
