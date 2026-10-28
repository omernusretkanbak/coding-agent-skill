@AGENTS.md

## Claude Code notları

- Her görevde worktree kullan: `EnterWorktree` (ad = görev slug'ı). Araç kullanılamıyorsa `new-feature` (c)'deki kök tespitiyle `git worktree add "<kök>/.claude/worktrees/<dal-slug>" -b <dal-slug> origin/{ANA}` (`{ANA}` = deponun varsayılan dalı, çoğunlukla `main`; asla göreli yol).
- Adım skill'lerini `Skill` aracıyla çağır; listede görünmüyorsa `.claude/skills/<ad>/SKILL.md` dosyasını oku ve uygula.
- Kod yazımı: `Agent(subagent_type: fabrika-yazar)` (model `sonnet`). İnceleme: `Agent(subagent_type: fabrika-inceleyici, model: fable)` (yedek `opus`). Ajan dosyaları yoksa aynı prompt'la `general-purpose` + aynı model. Fork kullanma; taze bağlam. Tüm hat için `fabrika` skill'i.
- superpowers alt-skill'leri: `superpowers:using-git-worktrees`, `superpowers:subagent-driven-development`, `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.
- `superpowers:finishing-a-development-branch` menüsü bu repoda geçersizdir; tek çıkış yolu `ship-it` (PR).
