# coding-agent-skill

Bu depo bir Yazılım Fabrikası montaj hattı ile yönetilir: her değişiklik izole edilir, inşa edilir, kanıtlanır ve incelemeye gönderilir.
Kurallar: `AGENTS.md` · Skill'ler: `.claude/skills/`

## Fabrika hattı (yazar + inceleyici ajanları)

Montaj hattını uçtan uca çeviren hazır kadro: `fabrika` skill'i (`.claude/skills/fabrika/SKILL.md`) orkestrasyonu anlatır; yazar rolü kodu yazar, inceleyici rolü bağımsız olarak 0–5 puanlar. Roller araçtan bağımsız düz Markdown'dır (`.claude/skills/fabrika/roller/`); Claude Code'da `fabrika-yazar` (Sonnet) ve `fabrika-inceleyici` (Fable, yedek Opus) ajanları bu dosyalara bakar (`.claude/agents/`). Codex, Cursor ve Antigravity'de roller ayrı oturum olarak çalışır; skill'leri `node scripts/kur.mjs --hedef <araç>` kopyalar (`.agents/skills/`). İki mod: `pr-per-feature` (mevcut repoya özellik/bug) ve `dev-then-single-pr` (sıfırdan ürün). Merge her zaman kullanıcıdadır.

Arayüze dokunan değişikliklerde isteğe bağlı `ux-sinama` skill'i (`.claude/skills/ux-sinama/SKILL.md`): yazardan ayrı bir sınayıcı rolü, başsız tarayıcıyla yalnız 127.0.0.1 üzerinde senaryo bazlı sınama yapar ve `PROOF.md`'ye girdi olacak bir bulgu raporu üretir (kod değiştirmez).

Kurulum, araç başına kullanım, örnek akış ve güvenlik notları: [docs/KURULUM.md](docs/KURULUM.md). Yeni proje için şablondan başlayın: `gh repo create <ad> --template omernusretkanbak/coding-agent-skill`. `docs/proof/` altındaki dosyalar örnek kanıt arşividir; `--template` ile açılan yeni depoya da kopyalanır, yeni projenizde silebilirsiniz.
