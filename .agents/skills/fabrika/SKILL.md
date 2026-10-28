---
name: fabrika
description: >-
  Use when running the whole factory line (writer + reviewer roles) on this
  repo: orchestrating a feature, bug fix or from-scratch product through
  worktree, writer, proof, draft PR, independent reviewer score 0-5, at most
  3 rounds. Triggers: "fabrikayı çalıştır", "fabrika hattı", "şu özelliği
  yaptır", "bug düzelttir", "sıfırdan ürün üret", "pr-per-feature",
  "dev-then-single-pr". Works with agents (Claude Code: fabrika-yazar,
  fabrika-inceleyici) or with separate sessions (Codex, Cursor, Antigravity).
  The orchestrator writes no code, reviews nothing and never merges.
argument-hint: "<mod: pr-per-feature|dev-then-single-pr> <görev>"
---

# Fabrika hattı — fabrika

**Duyuru:** "`fabrika` skill'ini kullanıyorum: fabrika hattını `<mod>` modunda çeviriyorum."

Bu skill kuralları **kopyalamaz**; `AGENTS.md` ve dört adım skill'inin üstüne orkestrasyon
yapıştırıcısını ekler: hedef çözümleme, iki mod, roller, çıkış kapısı. Adım ayrıntısı
gerektiğinde kaynağı oku:

| Adım | Kaynak dosya |
|---|---|
| 1 İZOLE ET | `.claude/skills/new-feature/SKILL.md` |
| 2 İNŞA ET | `.claude/skills/code-structure/SKILL.md` + `builder-prompt.md` |
| 3 KANITLA | `.claude/skills/prove-it/SKILL.md` + `PROOF-template.md` + `scripts/capture-page.mjs` |
| 4 GÖNDER VE İNCELE | `.claude/skills/ship-it/SKILL.md` + `reviewer-prompt.md` |

Bu dosyadaki `.claude/skills/` yolları Claude Code'a göredir. Aracınız skill'leri `.agents/skills/`
altından okuyorsa (Codex, Cursor, Antigravity) aynı içerik oradadır (`scripts/kur.mjs` kopyalar);
yolları buna göre okuyun.

## Roller: ajanlı ve ajansız ortam

Rol metinleri araçtan bağımsız düz Markdown'dır ve TEK kaynaktır:
`.claude/skills/fabrika/roller/yazar.md` ve `roller/inceleyici.md`.

- **Yazar** = hızlı/ucuz model katmanı (Claude'da örnek: Sonnet). **İnceleyici** = mevcut en güçlü
  katman (Claude'da örnek: Fable, erişilemezse Opus). Diğer araçlarda model adını araç ayarından seçin.
  Zayıf katman inceleyici olamaz; orkestratör kendini inceleyemez.
- **Ajanlı ortam (Claude Code):** yazar `Agent(subagent_type: fabrika-yazar)`, inceleyici
  `Agent(subagent_type: fabrika-inceleyici, model: fable)` (yedek `opus`). Bu iki ajan dosyası
  (`.claude/agents/`) yalnız rol dosyasına bakan ince sarmalayıcıdır. Ajan dosyaları yoksa aynı
  prompt'la `general-purpose` ajan + aynı model kullanılır. Fork yok; her çağrı taze bağlamdır.
- **Ajansız ortam (ayrı alt ajan tanımı belgeli olmayan araçlar):** roller AYRI OTURUM olarak
  çalışır. Yazar için yeni bir oturum açın ve `roller/yazar.md` + doldurulmuş `builder-prompt.md`'yi
  verin. İnceleyici için TAZE bir oturum açın ve `roller/inceleyici.md` + doldurulmuş
  `reviewer-prompt.md`'yi verin; inceleyici yazarın bağlamını GÖRMEMELİ (bağımsızlık kuralı).
  Doldurulmuş prompt'ları `docs/proof/<dal-slug>/builder-prompt-<n>.md` ve
  `reviewer-prompt-<n>.md` olarak kaydedin ve yeni oturuma bu dosyayı verin (uzun metni sohbete
  yapıştırmak hata kaynağıdır; kayıt aynı zamanda denetim izidir). Oturumlar arası aktarım
  dosyalardır: worktree, PROOF.md, REVIEW-<n>.md.

## Orkestratörün sınırları

- Orkestratör (ana oturum ya da siz) **kod yazmaz, incelemez, merge etmez.** `gh pr merge` yasak;
  5 puanda bile PR bağlantısını sunar ve durur. Merge kararı kullanıcınındır.
- **Push ve PR açmadan önce kullanıcıdan açık onay al** (tek satır: "Şu dalı push edip taslak
  PR açayım mı?"). Bu oturumda açıkça verilmiş bir ön yetki geçerlidir; görevdeki genel
  bir "yap" onayın yerine geçmez (`ship-it` Adım 0 ile aynı kural).
- `main` (ya da varsayılan dal) üzerinde hiçbir Write/Edit/commit yok. `--force`, `--no-verify`,
  `--amend`, `git stash` yok. Commit'i orkestratör atar (mesaj `-F <dosya>` ile).

## 0. Hedefi çöz

1. `{HEDEF}` = repo kökü: `git rev-parse --show-toplevel` (worktree içindeyseniz ortak kök:
   `git rev-parse --path-format=absolute --git-common-dir` çıktısının üst dizini).
   `{ANA}` = deponun varsayılan dalı (bu depodaki tek tanım; diğer dosyalar buraya atıf yapar):
   `git symbolic-ref --short refs/remotes/origin/HEAD` (örn. `origin/main` → `main`); komut sonuç
   vermezse `main`.
2. Görevde geçen her olgusal öncülü ("şu dosya var", "şu yardımcı mevcut") yazara göndermeden
   ÖNCE `git grep`/okuma ile doğrula (`code-structure` "Orkestratör için").
3. Skill seçimi (yazar başına en çok 2 skill + TDD, ortamda kurulu olanlardan): arayüz → bir
   tasarım/UI skill'i; bug → sistematik hata ayıklama skill'i; dış API → önbellek disiplini
   skill'i. Seçtiklerini builder prompt'unun başına "Önce şu skill'leri yükle:" satırı olarak yaz.
   İnceleyiciye: kod incelemesi skill'i; güvenlik dokunuyorsa güvenlik incelemesi; arayüzse
   erişilebilirlik incelemesi.

## Mod A — `pr-per-feature` (mevcut repoya özellik/bug; varsayılan)

Montaj hattı aynen: 1 → 2 → 3 → 4, en çok 3 tur, SKOR 5 → PR bağlantısı → DUR.

1. **İzole et** (`new-feature`): `EnterWorktree` ya da
   `git worktree add "{HEDEF}/.claude/worktrees/<dal-slug>" -b <dal-slug> origin/{ANA}`.
   `.claude/worktrees/` `.gitignore`'da değilse önce ekleme öner; kullanıcı onayı olmadan
   `.gitignore`'a dokunma.
2. **İnşa et:** yazar rolü (yukarıdaki ajanlı/ajansız yollardan biri); prompt = doldurulmuş
   `builder-prompt.md` (`{GOREV}`, `{KAPSAM_DISI}`, `{WORKTREE_ABS}`, `{DAL}`, `{DAL_SLUG}`) +
   skill satırı + devir notu yolu. Yazar bitince test komutunu **kendin** worktree'de tekrar koş;
   `git diff --stat` ile kapsamı kontrol et; commit'i sen at.
3. **Kanıtla:** PROOF'u `prove-it` kurallarıyla doğrula (kutuları ve "Orkestratör doğrulaması"nı
   sen doldurursun); commit.
4. **Gönder ve incele** (`ship-it`): kullanıcı onayı → push → `gh pr create --draft --base {ANA}`
   → inceleyici rolü (taze bağlam), prompt = doldurulmuş `reviewer-prompt.md` → ilk `SKOR:`
   satırını ayrıştır → `REVIEW-<n>.md` + PR yorumu → SKOR 5 ise `gh pr ready` + bağlantıyı sun +
   **DUR**; SKOR < 5 ise ENGELLEYİCİ + ÖNEMLİ maddeler yeni yazar turuna döner (PROOF'a
   `## Tur n+1`), yeni taze inceleyici. 3. turda hâlâ < 5 ise DUR, son REVIEW ile kullanıcıya
   eskale et.

### Arayüz içeren işler

PROOF'ta görsel kanıt zorunludur (`prove-it`): sayfayı `scripts/capture-page.mjs` ile başsız
yakala (yalnız o sayfayı alır, masaüstünü yakalamaz); birkaç genişlik (örn. 390, 768, 1280) ve
varsa açık/koyu tema; gerçek kullanıcı verisi değil, sahte veri. İnceleyici görüntüleri açıp
inceler. Görüntü eksikse arayüz işi en çok SKOR 3 alabilir (ÖNEMLİ bulgu). Yeni üçüncü taraf
bağımlılık kullanıcı onayı olmadan eklenmez; sürüm sabitlenir, bağımlılık denetimi (`npm audit`
ya da eşdeğeri) koşulur, gerekçe PR'da yazılır.

## Mod B — `dev-then-single-pr` (sıfırdan ürün; maddeler `dev`'e PR ile, sonda `dev → {ANA}` PR)

Amaç: ürün, onaylı bir backlog'un maddeleri tek tek bitirilerek kurulsun. **`main`'e hiçbir şey
doğrudan gitmez ve hiçbir birleştirmeyi ajan ya da orkestratör yapmaz; her birleştirme
kullanıcınındır.**

1. **Spec + backlog** (kullanıcı onaylı): spec `docs/specs/<ad>.md`; backlog `docs/backlog.md` —
   5–8 madde, her biri tek yazar turu, her maddede "bitti ölçütü".
2. **Dal ve depo:** `git switch -c dev` (yeni depo gerekiyorsa açmak kullanıcı onayı ister).
   Spec + backlog `dev` dalında commit'lenir (push için kullanıcı onayı).
3. **Madde döngüsü** (madde başına, `dev` tabanlı worktree `.claude/worktrees/<madde-slug>`): Mod
   A'nın 1–4. adımları aynen, yalnız PR tabanı `dev`'dir (`gh pr create --draft --base dev`);
   PROOF `docs/proof/<madde-slug>/` altındadır. SKOR 5 olunca PR hazır işaretlenir, bağlantı
   sunulur ve **DUR**: kullanıcı PR'ı `dev`'e birleştirir, sonra orkestratör `dev`'i günceller,
   `docs/backlog.md`'de maddeyi `[x]` yapar ve sonraki maddeye geçer. 3. turda da < 5 → DUR,
   kullanıcıya sor.
4. **Çalışır kanıt:** tüm maddeler `dev`'de birleşince uygulamayı ayağa kaldır (projenin kendi
   çalıştırma komutu), spec'teki ana akışla uçtan uca duman testi, gerekirse `capture-page.mjs`
   ile ekran görüntüleri (`docs/proof/urun/`), `README.md` (kurulum + çalıştırma), açılan
   portları kapat. **Ürün incelemesi:** inceleyici rolü, prompt = `reviewer-prompt.md`, gereksinim
   = spec'in tamamı, aralık = `{ANA}..dev`. SKOR 5 şart; değilse ENGELLEYİCİ'ler backlog'a madde
   olarak döner (adım 3).
5. **Son PR:** kullanıcı onayı → push → `dev → {ANA}` taslak PR (gövde: spec özeti + backlog +
   proof bağlantıları + ürün incelemesi) → bağlantıyı sun → **DUR**.

## Bağlam disiplini (orkestratör tarafı)

Ajanlar ve oturumlar compact yapamayabilir; bağlamları dolarsa iş yarım kalır. Builder prompt'una
"büyük logları tamamen okuma; yalnız son satırlar/ÖZET" ve devir notu yolunu koy. Aynı yazarı
sınırsız uzatma: önceki turlarda bağlamı büyümüş (çok turlu ya da uzun) bir yazarın yerine taze
yazar + devir notu ver. Yazar "Prompt is too long" ile düşerse çalışma ağacını koru (geri
alma/silme yok), `git status`/`git diff` ile durumu çıkar ve yeni yazara "devralma" görevi ver.
Mutasyon ve uzun ölçümleri yazara değil, kendi arka plan betiğine ver.

## Çıkış kapısı

Mod A: PR hazır + `REVIEW-<n>.md` SKOR 5 + bağlantı sunuldu. Mod B: her madde PR'ı SKOR 5 ile
sunuldu + son ürün incelemesi 5 + son PR bağlantısı sunuldu. İkisinde de birleştirme kullanıcıdadır.
