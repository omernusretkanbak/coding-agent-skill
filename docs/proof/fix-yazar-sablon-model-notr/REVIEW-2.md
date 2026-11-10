# REVIEW-2 — fix-yazar-sablon-model-notr

Aralık: `ff8f0d9137b93e29d2e3e6a1bef40bb029aa0b06`..`3a5ec2f061faef80635862c05690929d48a214cd` · PR #10 · yazar: opus

SKOR: 4
KARAR: DUZELTME_GEREKLI
INCELEYICI_MODEL: Fable 5.1 (claude-fable-5-1)

GUCLU_YANLAR:
- `tests/kur.test.mjs:331-380`: bekçi testler bağımsız tekrarla doğrulandı; HEAD 29/29, tur-1 ağacına karşı PROOF "Tur 2 / Önce"deki 3 kırmızı.
- `.claude/skills/code-structure/SKILL.md:22`, `builder-prompt.md:1`, `ship-it/SKILL.md:38`, `tests/kur.test.mjs:343-347`, `builder-prompt.md:2`: REVIEW-1'in dört bulgusu kapandı.
- `.agents/skills` aynası eşit; kapsam dışı dosyalara dokunulmamış.

ENGELLEYICI:
- YOK

ONEMLI:
- `.claude/skills/fabrika/SKILL.md:42` (ayna aynı): "Ajanlı ortam" tanımı yazarı `model:` vermeden çağırıyor, `fabrika-yazar.md` varsayılanı kazanır; REVIEW-1 ÖNEMLİ-1'in başka yüzeydeki aynısı. Düzeltme: `Agent(subagent_type: fabrika-yazar, model: {BUILDER_MODEL})`; testin dosya listesine `fabrika/SKILL.md` eklenir.

KUCUK:
- `.claude/skills/ship-it/SKILL.md:38`: yazar Fable iken Opus yedeği ana cümleyle çelişiyor; açık istisna yeter.
- `tests/kur.test.mjs:357`: `/aynı ya da/` tüm dosyada aranıyor; satır 38'e daraltılabilir.

GEREKCE: REVIEW-1 bulguları kapandı ve kanıt tutuyor; ancak yazar çağrısının `model:`'siz kaldığı `fabrika/SKILL.md:42` yanlış etiketlemeyi orkestratörün ilk okuduğu skill'de geri getirir.
