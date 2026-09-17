@AGENTS.md

## Claude Code notları

- Her görevde worktree kullan: `EnterWorktree` (ad = görev slug'ı). Araç kullanılamıyorsa `new-feature` (c)'deki kök tespitiyle `git worktree add "<kök>/.claude/worktrees/<slug>" -b <slug> origin/main` (asla göreli yol).
- Adım skill'lerini `Skill` aracıyla çağır; listede görünmüyorsa `.claude/skills/<ad>/SKILL.md` dosyasını oku ve uygula.
- Kod yazımı: `Agent(subagent_type: general-purpose, model: sonnet)`. İnceleme: `Agent(subagent_type: general-purpose, model: fable)`. Fork kullanma; taze bağlam.
- superpowers alt-skill'leri: `superpowers:using-git-worktrees`, `superpowers:subagent-driven-development`, `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.
- `superpowers:finishing-a-development-branch` menüsü bu repoda geçersizdir; tek çıkış yolu `ship-it` (PR).
