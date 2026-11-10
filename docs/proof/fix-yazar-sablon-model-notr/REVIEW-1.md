# REVIEW-1 — fix-yazar-sablon-model-notr

Aralık: `ff8f0d9137b93e29d2e3e6a1bef40bb029aa0b06`..`2f503a7286a8ffd0544aa95af48c7cb53a30fbf8` · PR #10 · yazar: opus

SKOR: 4
KARAR: DUZELTME_GEREKLI
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)

GUCLU_YANLAR:
- `tests/kur.test.mjs:320-360`: 5 bekçi test gerçek davranışı yakalıyor; taban şablonlarıyla yeni test dosyası 4 kırmızı verdi, HEAD'de 26/26 ve `kur.mjs --hedef codex --kontrol` çıkış 0. PROOF'taki kırmızı/yeşil anlatısı bağımsız tekrarla uyumlu.
- `.claude/skills/code-structure/builder-prompt.md:2,5`: `{BUILDER_MODEL}` adı `ship-it/reviewer-prompt.md`'deki mevcut yer tutucuyla aynı.
- `.claude/skills/prove-it/PROOF-template.md:12`: `{yazar-modeli}` aynı satırdaki yer tutucu biçimini izliyor.
- `.agents/skills` aynası kanonikle eşit; kapsam dışı dosyalara dokunulmamış.

ENGELLEYICI:
- YOK

ONEMLI:
- `.claude/skills/code-structure/SKILL.md:22` (ayna aynı): ajan dosyalı yolda çağrıda `model:` geçilmesi söylenmiyor, `.claude/agents/fabrika-yazar.md:4` ise `model: sonnet`. `{BUILDER_MODEL}=opus` doldurulup çağrıda model geçilmezse yazar Sonnet'te koşar, prompt ve PROOF Opus der. Düzeltme: `Agent(subagent_type: fabrika-yazar, model: {BUILDER_MODEL})`; aynı ifade `builder-prompt.md:1` yorumuna da.
- `.claude/skills/ship-it/SKILL.md:38` (ayna aynı): "yazarla aynı ya da daha zayıf" yasağı, yazar Fable seçildiğinde tek izinli inceleyiciyi (Fable) yasaklıyor; `fabrika/SKILL.md:41` ile de uyumsuz. Düzeltme: "aynı ya da" ibaresi çıkar.

KUCUK:
- `tests/kur.test.mjs:347`: (c) testi yalnız "Sonnet ile inceleme" dizisine bakıyor; satır 30 hariç tutulmuş `doesNotMatch(/sonnet/i)` daha sağlam.
- `.claude/skills/code-structure/builder-prompt.md:2`: ajansız ortamda `{BUILDER_MODEL}`'in nasıl doldurulacağı yazmıyor; `fabrika/SKILL.md:40`'a atıf yeter.

GEREKCE: Gereksinim karşılanıyor ve kanıt tekrarlanabilir; ancak ajan dosyalı varsayılan çağrı yolunda `model:` geçilmemesi yanlış etiketlemeyi geri getirir ve "aynı katman" yasağı yazar Fable seçiminde kendini iptal eder.
