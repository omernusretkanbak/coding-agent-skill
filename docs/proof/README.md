# Kanıt Dizini

Bu dizin, montaj hattının her görevi için üretilen kanıtı tutar.

## Düzen

- `docs/proof/<dal-slug>/PROOF.md` — zorunlu; her görevin kanıtı burada yaşar.
- `before.png` / `after.png` — yalnız görsel değişikliklerde eklenir.
- `REVIEW-<n>.md` — her inceleme turu için bir dosya.

Dal slug'ı, dal adındaki `/` karakterinin `-` ile değiştirilmiş halidir.

## Kurallar

- Kanıt her zaman ilgili feature dalında oluşturulur ve commit'lenir; `main` üzerinde düzenlenmez.
- Yeni bir inceleme turu PROOF.md'ye `## Tur N` bölümü ekler, mevcut içeriğin üzerine yazmaz.
- Şablon: `.claude/skills/prove-it/PROOF-template.md`.
