# GEMINI.md — Yazılım Fabrikası (Antigravity / Gemini uyarlaması)

İş akışının kuralları `AGENTS.md`'dedir ve geçerlidir. Bu dosya yalnız Claude'a özgü ayrıntıların Gemini karşılığını verir; çelişkide **bu dosya geçerlidir**.

## Skill'ler

Skill'ler `.agents/skills/` altındadır (Antigravity çalışma alanı keşfi). `.claude/skills/` Claude Code için olduğu gibi korunur; Gemini'de onu kullanma.

| Adım | Skill | Yol |
|---|---|---|
| 1 | new-feature | `.agents/skills/new-feature/SKILL.md` |
| 2 | code-structure | `.agents/skills/code-structure/SKILL.md` (+ `builder-prompt.md`) |
| 3 | prove-it | `.agents/skills/prove-it/SKILL.md` (+ `PROOF-template.md`, `scripts/`) |
| 4 | ship-it | `.agents/skills/ship-it/SKILL.md` (+ `reviewer-prompt.md`) |

Skill listede görünmüyorsa `SKILL.md` dosyasını `read_file` ile oku ve uygula.

## Roller ve modeller

| Rol | Claude | Gemini karşılığı |
|---|---|---|
| Yazar | `sonnet` | `invoke_subagent(TypeName: self, Model: flash)` |
| İnceleyici | `fable` (yedek `opus`) | `invoke_subagent(TypeName: self, Model: pro)` |
| Orkestratör | oturum modeli | oturum modeli (kod yazmaz, incelemez) |

- Yazar ve inceleyici her zaman yeni alt-ajandır (taze bağlam). İnceleyici asla `flash` ya da orkestratörün kendisi olamaz.
- Mevcut alt-ajana düzeltme yaptırmak için `send_message` (alıcı: `invoke_subagent`'ın döndürdüğü conversationId); bağlam bozulduysa yeni alt-ajan aç.
- Alt-ajan çıktısı kanıt sayılmaz: testleri ve `git diff --stat`'ı orkestratör kendisi çalıştırır.

## Araç karşılıkları

| Claude Code | Antigravity |
|---|---|
| `EnterWorktree` | Yok. `git worktree add "<kök>/.worktrees/<dal-slug>" -b <dal-slug> origin/main`; sonra her `run_command` için cwd = o mutlak yol |
| `Agent(...)` | `invoke_subagent` |
| `SendMessage` | `send_message` |
| `SendUserFile` | Yanıtta `file:///` bağlantısı; görseller artifact dizinine kopyalanıp gömülebilir |
| chrome-devtools `take_screenshot` | Tarayıcı aracı/`/browser`; olmazsa `scripts/capture-page.mjs` |
| `preview_start` | `run_command` (`IsDaemon: true`) |
| `.claude/worktrees/` | `.worktrees/` (`.gitignore`'da olmalı) |
| `superpowers:<ad>` | Global kurulu skill `<ad>` (ör. `test-driven-development`, `using-git-worktrees`, `verification-before-completion`, `requesting-code-review`, `subagent-driven-development`) |

`finishing-a-development-branch` menüsü bu repoda geçersizdir; tek çıkış yolu `ship-it` (PR).

## İzinler (değişmez kurallar, teknik engel yok)

Claude'daki `.claude/settings.json` izin listesinin Gemini'de dosya karşılığı yoktur; aşağıdakiler yalnız kuraldır ve komut onayında da dikkat edilir:

- Asla: `gh pr merge`, `git merge` ile `main`'e birleştirme, `main`'e push, `git push --force`/`-f`, `git branch -D`, `git worktree remove --force`.
- `git stash` yasak (yığın tüm worktree'lerle ortaktır).
- Serbest: `git status/diff/log/branch/rev-parse/check-ignore/worktree/switch/fetch/add/commit/push` (main hariç), `gh pr create/view/diff/list/ready/comment/edit/checks`.
