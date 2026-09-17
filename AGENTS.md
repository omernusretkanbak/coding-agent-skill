# AGENTS.md — Yazılım Fabrikası Montaj Hattı

Bu repoda her değişiklik dört istasyondan geçer. Bu dosya yalnız iş akışını tanımlar; teknoloji yığını veya klasör yapısı anlatmaz.

## Değişmez Kurallar

1. `main` üzerine doğrudan yazılmaz; her görev kendi worktree'sinde ve dalında yapılır.
2. Kanıtsız "bitti" yoktur; kanıt `docs/proof/<dal>/PROOF.md` altında yaşar ve kullanıcıya gösterilir.
3. Kodu her zaman ucuz model (Sonnet) yazar; incelemeyi her zaman en akıllı model (Fable) yapar ve 0–5 puanlar. Orkestratör ne kod yazar ne inceler.
4. Merge asla ajan tarafından yapılmaz. 5 puanda bile PR bağlantısı sunulur ve durulur; birleştirme kararı kullanıcınındır.
5. Bu dosya teknoloji yığını veya klasör yapısı anlatmaz; ajan mimariyi kodu okuyarak öğrenir (Adım 2). Bu maddeyi genişleten değişiklikler reddedilir.

## Roller

| Rol | Model | Görev |
|---|---|---|
| Yazar | `sonnet` | Adım 2–3'te kodu yazar, testleri koşar, PROOF.md taslağını üretir. |
| İnceleyici | `fable` (yedek `opus`) | Adım 4'te diff + kanıtı inceler, 0–5 puan verir; taze bağlam. |
| Orkestratör | oturum modeli | Worktree açar, alt-ajanları görevlendirir, kanıtı bağımsız doğrular, PR açar, döngüyü yönetir. |

## Montaj Hattı

| Adım | Ad | Skill | Giriş koşulu | Çıkış koşulu |
|---|---|---|---|---|
| 1 | İZOLE ET | new-feature | Görev alındı | cwd izole worktree, dal ≠ main |
| 2 | İNŞA ET | code-structure | Adım 1 çıkışı veya inceleme bulguları | Testler yeşil, diff kapsam içinde |
| 3 | KANITLA | prove-it | Adım 2 çıkışı | PROOF.md commit'li, orkestratör doğruladı, kullanıcıya sunuldu |
| 4 | GÖNDER VE İNCELE | ship-it | Adım 3 çıkışı | SKOR 5 → PR hazır + bağlantı → DUR |

## Döngü Kuralı

SKOR < 5 → ENGELLEYİCİ ve ÖNEMLİ bulgular yeni bir Yazar görevine dönüşür → Adım 2 → 3 → 4 (yeni inceleyici). En fazla 3 tur; hâlâ 5 değilse son kararla kullanıcıya eskalasyon. (Varsayım: 3 tur sınırı sonsuz döngü korumasıdır.)

## Skill Kadrosu

| Skill | Yol | Adım |
|---|---|---|
| new-feature | `.claude/skills/new-feature/SKILL.md` | 1 |
| code-structure | `.claude/skills/code-structure/SKILL.md` (+ `builder-prompt.md`) | 2 |
| prove-it | `.claude/skills/prove-it/SKILL.md` (+ `PROOF-template.md`) | 3 |
| ship-it | `.claude/skills/ship-it/SKILL.md` (+ `reviewer-prompt.md`) | 4 |

Claude dışı ajanlar bu skill dosyalarını yukarıdaki yollardan düz Markdown olarak okuyup uygular.

## Artefaktlar

`docs/proof/<dal-slug>/PROOF.md` (zorunlu kanıt), `before.png` / `after.png` (yalnız görsel değişikliklerde), `REVIEW-<n>.md` (her inceleme turu). Her inceleme kararı PR yorumu olarak da yazılır.
