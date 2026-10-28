# Kurulum ve Kullanım — Fabrika hattı

**What is this / how to install (EN summary)**
- A template repo for a "software factory" that works with AI coding tools (Claude Code, Codex, Cursor, Antigravity): every change goes through worktree → writer role → proof (`PROOF.md`) → draft PR → independent reviewer role (score 0–5, 5 required, max 3 rounds).
- Agents never merge; you do. No "done" without evidence.
- New project: `gh repo create <name> --template omernusretkanbak/coding-agent-skill --clone`. Existing project: copy `.claude/skills`, `.claude/agents`, `AGENTS.md`, `scripts/kur.mjs`, then run `node scripts/kur.mjs --hedef <claude|codex|cursor|antigravity|hepsi>`.
- Role texts are plain Markdown (`.claude/skills/fabrika/roller/`). Only Claude Code has a documented sub-agent file format; elsewhere roles run as separate sessions.
- Use: ask your tool to "use the `fabrika` skill, mode `pr-per-feature`: <task>". Details below (Turkish).

---

## 1. Kurulum

### (a) Şablondan yeni depo

```bash
gh repo create <ad> --clone --template omernusretkanbak/coding-agent-skill
cd <ad>
```

Depo görünürlüğünü (`--public` ya da `--private`) kendi tercihinize göre ekleyin.

### (b) Mevcut projeye kopyalama

Şablonu yan klasöre klonladığınızı varsayarak (`../coding-agent-skill`), kendi projenizin kökünde:

```bash
mkdir -p .claude scripts
cp -r ../coding-agent-skill/.claude/skills ../coding-agent-skill/.claude/agents .claude/
cp ../coding-agent-skill/scripts/kur.mjs scripts/kur.mjs
cp ../coding-agent-skill/AGENTS.md ./AGENTS.md
```

PowerShell karşılığı:

```powershell
New-Item -ItemType Directory -Force .claude, scripts | Out-Null
Copy-Item -Recurse -Force ..\coding-agent-skill\.claude\skills, ..\coding-agent-skill\.claude\agents .claude\
Copy-Item ..\coding-agent-skill\scripts\kur.mjs scripts\kur.mjs
Copy-Item ..\coding-agent-skill\AGENTS.md .\AGENTS.md
```

Ek notlar:
- Projenizde `AGENTS.md` ya da `CLAUDE.md` zaten varsa üzerine yazmayın; kurallarını birleştirin. `CLAUDE.md` içine `@AGENTS.md` satırı eklemek yeterlidir.
- `.claude/settings.json` isteğe bağlıdır (yalnız Claude Code): `git push` ve `gh pr create` için her seferinde sorar (araç düzeyinde izin istemi; hat düzeyindeki onay kuralı `ship-it` Adım 0), `gh pr merge` ile `--force` push'u yasaklar. Zaten bir `settings.json` varsa `permissions` bölümlerini elle birleştirin.
- `.gitignore` dosyanıza `.claude/worktrees/` satırını ekleyin (worktree'ler depoya girmesin).
- `docs/proof/` altındaki dosyalar örnek kanıt arşividir; `--template` ile açılan yeni depoya da kopyalanır. Yeni projenizde silebilirsiniz.

### (c) Skill'leri aracınızın klasörüne kopyalama: `scripts/kur.mjs`

Kanonik kaynak `.claude/skills/*` ve `.claude/agents/*`'dir. Diğer araçlar skill'leri `.agents/skills/` altında arar; bu klasörü betik üretir (kopyalar, sembolik bağlantı oluşturmaz ve bağlantı içinden yazmaz; Node ≥ 18, Windows/macOS/Linux):

```bash
node scripts/kur.mjs --hedef <claude|codex|cursor|antigravity|hepsi> [--kapsam proje|kullanici] [--kuru] [--kontrol] [--zorla]
```

| Seçenek | Anlamı |
|---|---|
| `--hedef claude` | `.claude/skills` + `.claude/agents` (proje kapsamında zaten kanonik kaynaktır, değişiklik yapmaz) |
| `--hedef codex` / `cursor` / `antigravity` | `.agents/skills` (üçü aynı klasörü paylaşır; aynı klasöre iki kez kopyalanmaz) |
| `--hedef hepsi` | yukarıdakilerin tümü |
| `--kapsam proje` (varsayılan) | depo kökü altına |
| `--kapsam kullanici` | ev dizininiz altındaki karşılığına (`~/.claude/...`, `~/.agents/skills`). Dikkat: beş skill'i (özellikle geniş tetikleyicili `ship-it`) TÜM projelerinizde etkinleştirir; proje kapsamını öneririz. |
| `--kuru` | yalnız ne yapacağını yazar, hiçbir şey yazmaz |
| `--kontrol` | kanonik kaynak ile kopyaların birebir aynı olup olmadığını denetler; sapma varsa çıkış kodu 1. Hedefte olup kanonikte olmayan skill dizinleri yalnız "Uyarı" olarak listelenir (fazla dosya uyarısı bilgilendiricidir, çıkış kodunu değiştirmez) |
| `--zorla` | farklı içerikli mevcut dosyanın üzerine yazar. Yedek ALMAZ: ezmeden önce `git status` ile durumu kontrol edin ya da yedek alın. Varsayılan: ezmez, uyarır, çıkış 1. |

Betik önce tüm dosyaları tarar: çakışma varsa (`--zorla` yoksa) HİÇBİR dosya yazılmaz, liste basılır, çıkış kodu 1 olur (kısmi kurulum bırakılmaz). Hedefte aynı adlı dizin ya da sembolik bağlantı varsa `--zorla` ile de aşılmaz.

Bu şablonda `.agents/skills/` aynası hazır gelir. Kanonik skill'i değiştirdiğinizde aynayı yenileyin ve doğrulayın:

```bash
node scripts/kur.mjs --hedef hepsi --zorla
node scripts/kur.mjs --hedef hepsi --kontrol
node --test tests/*.test.mjs
```

## 2. Roller ve modeller

Rol metinleri araçtan bağımsız düz Markdown'dır ve tek kaynaktır: `.claude/skills/fabrika/roller/yazar.md`, `roller/inceleyici.md`. Model rolü şudur: **yazar = hızlı/ucuz katman, inceleyici = mevcut en güçlü katman**. Zayıf katman inceleyici olamaz.

| Araç | Yazar | İnceleyici |
|---|---|---|
| Claude Code (örnek eşleme) | `sonnet` | çağrıda `model: fable`; ajan dosyasının varsayılanı ve yedeği `opus` |
| Codex, Cursor, Antigravity | araç ayarından hızlı/ucuz bir model seçin | araç ayarından mevcut en güçlü modeli seçin |

İki çalışma yolu vardır:
- **Ajanlı ortam (Claude Code):** `.claude/agents/fabrika-yazar.md` ve `fabrika-inceleyici.md` ince sarmalayıcıdır; rol dosyasına bakar. Orkestratör `Agent(subagent_type: ...)` ile çağırır.
- **Ajansız ortam (Codex, Cursor, Antigravity):** roller ayrı OTURUM olarak çalışır. Yazar için yeni bir oturum açıp `roller/yazar.md` + doldurulmuş `builder-prompt.md`'yi verin. İnceleyici için TAZE bir oturum açıp `roller/inceleyici.md` + doldurulmuş `reviewer-prompt.md`'yi verin; inceleyici yazarın bağlamını görmemelidir. Doldurulmuş prompt'ları `docs/proof/<dal-slug>/builder-prompt-<n>.md` ve `reviewer-prompt-<n>.md` olarak kaydedip yeni oturuma bu dosyayı verin. Oturumlar arasında aktarım dosyalarla olur (worktree, `PROOF.md`, `REVIEW-<n>.md`).

Bilinmesi gerekenler:
- İnceleyicinin "salt-okunur" kuralı metinseldir: ajanın `Bash`/`PowerShell` aracı vardır. Sıkı izolasyon istiyorsanız aracın ayarlarından bu oturum için yazma yetkisini kapatın.
- Ajan dosyalarındaki `tools:` satırında `PowerShell` geçer; Windows dışı ortamda bu araç bulunmayabilir ve bilinmeyen araç adının davranışı doğrulanmadı. Sorun yaşarsanız `tools:` satırından çıkarın.

## 3. Araç başına kullanım

### Claude Code

- **Klasörler:** skill'ler `.claude/skills/`, ajanlar `.claude/agents/` (şablonda hazır). Skill listesi yenilenmiyorsa Claude Code'u yeniden başlatın.
- **Yol:** ajanlı.
- **Başlatma:** repo kökünde `claude` açın ve yazın:
  ```text
  fabrika skill'ini kullan, mod pr-per-feature: CLI'ye --json çıktı bayrağı ekle. Kapsam dışı: diğer komutlar.
  ```

### Codex

- **Klasörler:** `.agents/skills/` (`node scripts/kur.mjs --hedef codex`); kök dizindeki `AGENTS.md`.
- **Yol:** ajansız (roller ayrı oturum).
- **Başlatma:** Codex'i repo kökünde açın ve yazın:
  ```text
  .agents/skills/fabrika/SKILL.md dosyasını oku ve pr-per-feature modunda uygula: CLI'ye --json çıktı bayrağı ekle. Yazar ve inceleyici rollerini ayrı oturumlarda çalıştıracağım; yazar için roller/yazar.md, inceleyici için roller/inceleyici.md kullanılacak.
  ```

### Cursor

- **Klasörler:** `.agents/skills/` (varsayılan hedef). Cursor ayrıca `.cursor/skills/` okur ve uyumluluk için `.claude/skills/` ile `.codex/skills/` klasörlerini de okuyabilir. Bu şablonda hem `.claude/skills` (kanonik) hem `.agents/skills` (ayna) bulunduğundan Cursor aynı adlı skill'i iki kopya olarak gösterebilir; çift ad davranışı doğrulanmadı. `.claude/skills` kanoniktir. Yalnız Cursor/Codex kullanıyorsanız `.claude/skills` ve `.claude/agents`'i silebilirsiniz (önce `.agents/skills`'in tam olduğunu `--kontrol` ile doğrulayın); yalnız Claude Code kullanıyorsanız `.agents/skills`'i silebilirsiniz. Skill `name` değeri küçük harf/rakam/tire olmalı ve klasör adıyla aynı olmalıdır (depodaki testler bunu zorlar).
- **Yol:** ajansız.
- **Başlatma:** projeyi Cursor'da açın, ajan sohbetine yukarıdaki Codex istemini (yol `.agents/skills/fabrika/SKILL.md`) verin; inceleyici için yeni bir sohbet açın.

### Antigravity

- **Klasörler:** kurallar için kök dizindeki `AGENTS.md` (ya da `GEMINI.md`) ve `.agents/rules/*.md`; skill'ler için `.agents/skills/` (aşağıdaki tabloya bakın, doğrulanmalı).
- **Boyut sınırı:** tek kural dosyası 24.000 bayt, toplam her zaman açık kural bütçesi 20.000 jeton. Bu şablonda `AGENTS.md` 3.004 bayttır (`wc -c AGENTS.md`); testler 24.000 baytın altında kalmasını zorlar. Kural eklerseniz `AGENTS.md`'yi şişirmeyin; ayrıntıyı skill'lere koyun.
- **Yol:** ajansız.
- **Başlatma:** Codex'teki istemi kullanın. Antigravity skill klasörünü görmezse ajana `.agents/skills/fabrika/SKILL.md` dosyasını doğrudan okutun (düz Markdown'dır; `AGENTS.md` de bunu söyler).

### Doğrulama durumu

| Olgu | Durum |
|---|---|
| Skill = `<ad>/SKILL.md` açık biçimi (`name`, `description` zorunlu) | Resmî doküman |
| Claude Code skill klasörü `.claude/skills/` | Resmî doküman |
| Claude Code alt ajan dosyası `.claude/agents/*.md` | Resmî doküman (alt ajan dosya biçimi yalnız Claude Code'da belgeli) |
| Codex skill klasörü `$REPO_ROOT/.agents/skills` (cwd'den kök dizine kadar taranır), kullanıcı: `$HOME/.agents/skills`; skill klasöründe isteğe bağlı `agents/openai.yaml` (arayüz ve çağrı politikası, alt ajan tanımı değildir; bu şablon kullanmaz) | Resmî doküman |
| Codex'in `AGENTS.md` okuması | Yaygın kabul (OpenAI standardı); sorgulanan doküman sayfasında doğrulanmadı |
| Cursor skill klasörleri `.agents/skills/`, `.cursor/skills/`; kullanıcı: `~/.agents/skills/`, `~/.cursor/skills/`; uyumluluk için `.claude/skills/` ve `.codex/skills/` da okunur; `name` klasör adıyla aynı | Resmî doküman |
| Cursor'ın `AGENTS.md` okuması | Resmî doküman |
| Cursor'da aynı adlı skill'in iki klasörde (`.claude/skills` ve `.agents/skills`) bulunması | Doğrulanmadı: çift gösterim/öncelik davranışı belgesiz |
| Antigravity kural dosyaları `AGENTS.md` / `GEMINI.md` (kök ve alt klasörler, hep aktif), `.agents/rules/*.md` (eski `.agent/rules`), tek dosya 24.000 bayt, toplam 20.000 jeton | Resmî doküman |
| Antigravity skill klasörü `.agents/skills/` (eski `.agent/skills/`) | Üçüncü taraf kaynağa dayanır, doğrulanmalı |
| Codex, Cursor, Antigravity için alt ajan tanım dosyası | Doğrulanmadı: bu araçlar için ajan dosyası üretilmedi; roller ayrı oturumla çalışır |
| Aynı rol metinlerinin ayrı oturumlarda kullanılması | Bu şablonun tasarımı (araca bağımlı değil) |

Tablodaki "Resmî doküman" satırları, yazıldıkları sırada ilgili araç dokümanlarından alınmıştır; araçlar hızlı değiştiği için kullanmadan önce kendi sürümünüzün dokümanına bakın.

## 4. Uçtan uca örnek: tek görev

Görev: "CLI'ye `--json` çıktı bayrağı ekle." Orkestratör oturumuna (Claude Code'da ana oturum, diğerlerinde ilk sohbet) yukarıdaki başlatma istemini verin. Sırasıyla:

Örneklerde `main`, deponuzun varsayılan dalı yerine geçer (`fabrika` skill'inde `{ANA}`; farklıysa onu yazın).

1. **İzole et** — görev için ayrı worktree ve dal:
   ```bash
   git worktree add "<kök>/.claude/worktrees/feat-json-bayragi" -b feat-json-bayragi origin/main
   ```
2. **İnşa et** — yazar rolü worktree'ye yazar: önce kırmızı test, sonra kod. (Claude Code'da `fabrika-yazar` ajanı; diğerlerinde `roller/yazar.md` + doldurulmuş `builder-prompt.md` ile açtığınız yeni oturum.) Yazar bitince orkestratör test komutunu kendisi tekrar koşar ve `git diff --stat` ile kapsamı kontrol eder.
3. **Kanıtla** — yazar `docs/proof/feat-json-bayragi/PROOF.md` taslağını üretir (kutular boş); orkestratör doğrular, kutuları işaretler ve commit'ler.
4. **Onay** — orkestratör sizi durdurur: "Bu dalı push edip taslak PR açayım mı?" Siz onaylarsınız (bu oturumda açıkça verdiğiniz bir ön yetki de sayılır; görevdeki genel bir "yap" sayılmaz).
5. **Gönder** — onaydan sonra:
   ```bash
   git push -u origin feat-json-bayragi
   gh pr create --draft --base main --title "feat: --json çıktı bayrağı" --body-file <geçici dosya>
   ```
6. **İncele** — inceleyici rolü (taze bağlam, salt-okunur) diff'i ve PROOF.md'yi okur, testleri kendi koşar ve şu biçimde yanıtlar: `SKOR: 0-5`, ENGELLEYİCİ / ÖNEMLİ / KÜÇÜK listeleri, `GEREKCE`. Orkestratör bunu `docs/proof/<dal-slug>/REVIEW-1.md` olarak kaydeder ve PR'a yorum yapar (`gh pr comment`).
7. **Karar** — `SKOR: 5` ise `gh pr ready <no>`, PR bağlantısı size sunulur ve hat durur. `SKOR < 5` ise ENGELLEYİCİ ve ÖNEMLİ bulgular yeni bir yazar turuna döner (PROOF'a `## Tur 2` eklenir), yeni bir inceleyici bakar. En çok 3 tur; üçüncüde de 5 yoksa sorun size eskale edilir.
8. **Siz** PR'ı GitHub'da okur ve birleştirirsiniz.

Sıfırdan ürün için `mod dev-then-single-pr` verin: önce spec + backlog onayınızı ister; sonra her backlog maddesi `dev` tabanlı ayrı bir PR olarak sunulur (birleştirmeyi siz yaparsınız) ve sonda `dev → {ANA}` PR'ı gelir. Varsayılan dala hiçbir şey doğrudan gitmez.

## 5. Ne değişmez

- Merge'i ajan ya da orkestratör yapmaz; 5 puanda bile PR bağlantısı sunulur ve durulur. `gh pr merge`, `main`'e push ve `--force` kullanılmaz. Bu Mod B için de geçerlidir.
- Kanıtsız "bitti" yok: her iddia `docs/proof/<dal-slug>/PROOF.md` içinde komut çıktısı ya da görüntüyle durur; orkestratör testi bağımsız tekrar koşar.
- Kodu hızlı katman yazar, incelemeyi ayrı ve güçlü bir katman yapar; orkestratör ne kod yazar ne inceler.
- `main` üzerinde doğrudan değişiklik yok; her görev kendi worktree'sinde.
- Push ve PR açmadan önce sizin açık onayınız alınır (oturumda açıkça verilmiş ön yetki geçerli; genel bir "yap" değil).
- SKOR 5 olmadan PR "hazır" olmaz; en çok 3 tur.

## 6. Güvenlik notları

- Ajanlara üretim sırrı, canlı veritabanı erişimi ya da gerçek kullanıcı verisi vermeyin. Testler sahte ya da yerel veriyle çalışmalıdır.
- Yazara dış etkili komutları (dağıtım, yayın, veri yazan betikler, uzak makineye bağlanan komutlar) çalıştırtmayın. Yazar bunları yalnız kuru çalışma (`--dry-run`) ya da saf fonksiyon testiyle gösterir; gerçek mod sizin kararınızdır.
- Sırlar repoya girmez: `.env*` dosyaları `.gitignore`'dadır (`.env.example` hariç). Bir sır commit'e girdiyse geçmişi yeniden yazmak yetmez; anahtarı hemen yenileyin.
- Yeni üçüncü taraf bağımlılık onayınız olmadan eklenmemeli; sürümü sabitleyin ve bağımlılık denetimini (`npm audit` ya da eşdeğeri) koşturun.
- Depo herkese açıksa PROOF.md ve REVIEW dosyaları da herkese açıktır: içlerine sır, kişisel veri, yerel dosya yolu ya da iç ağ adresi yazılmadığını PR'dan önce gözden geçirin.
- Ekran görüntüsü için `capture-page.mjs` kullanın (yalnız sayfayı alır); tüm masaüstünü yakalayan yöntemler ilgisiz pencereleri ve özel içeriği görüntüye sokar.
- `scripts/kur.mjs` yalnız dosya kopyalar; `--kapsam kullanici` ev dizininize yazar, `--kuru` ile önce bakın.

## 7. Sık sorun ve sorular

**Skill ya da ajan görünmüyor.** Dosya yolunu kontrol edin (`.claude/skills/fabrika/SKILL.md`, `.claude/agents/fabrika-yazar.md`); ajan `name`'i dosya adıyla aynı olmalı. Aracı yeniden başlatın. Diğer araçlarda `node scripts/kur.mjs --hedef <araç> --kontrol` ile klasörün tamam olduğunu doğrulayın.

**`kur.mjs` "ÇATIŞMA" diyor.** Hedefte içeriği farklı bir dosya var ve ezilmedi. Kendi değişikliğiniz yoksa `--zorla` ile ezin; varsa önce kanonik `.claude/skills` tarafına taşıyın.

**`fable` modeli yok / erişilemiyor.** İnceleyici çağrısında `model: opus` verin. İnceleme yine ayrı ve taze bağlamda yapılır; yazarla aynı modeli inceleyici yapmayın.

**Worktree açılmıyor: "branch already exists" ya da "already checked out".** Dal adı kullanılmış: yeni bir slug seçin ya da eski worktree'yi `git worktree list` ile bulup `git worktree remove <yol>` ile kaldırın (zorlama bayrağı kullanmayın).

**`gh pr create` yetki hatası.** `gh auth status` ile giriş ve depo yetkisini kontrol edin.

**Yazar bağlamı dolup düştü ("Prompt is too long").** Çalışma ağacı sağlamdır: `git status` ve `git diff` ile durumu çıkarın, yeni yazara "devralma" görevi verin (yapılanlar / eksikler). Yazar devir notunu bir dosyaya yazar; yolu görev metninde verilir.

**İnceleyici 5 vermiyor, döngü uzuyor.** Bu normaldir; bulgular yazara döner. 3. turdan sonra karar sizde: kapsamı daraltın, görevi bölün ya da bulguyu kabul edip elle düzeltin.

**PR'ı kim birleştirir?** Hep siz. 5 puan "birleştirmeye hazır" demektir, "birleştirildi" değil.

**Hattı kendi projeme uyarlayabilir miyim?** Evet: `AGENTS.md` yalnız iş akışını anlatır; teknoloji yığınını ajan kodu okuyarak öğrenir. Proje kurallarını (test komutu, katman düzeni) projenizin README/CONTRIBUTING dosyasına yazın, `AGENTS.md`'ye değil.

## 8. Başka bir araç eklemek

Rol dosyaları ve skill'ler düz Markdown'dır; araca özgü bir şey içermez. Yeni bir araç için yalnız `scripts/kur.mjs` içindeki `HEDEFLER` tablosuna bir satır ekleyin (araç adı → skill klasörü, varsa ajan klasörü), `node scripts/kur.mjs --hedef <ad>` ile kopyalayın, `--kontrol` ile doğrulayın ve yukarıdaki "Doğrulama durumu" tablosuna aracın resmî dokümanından aldığınız olguları (kaynağıyla) yazın. Aracın alt ajan dosya biçimi belgeli değilse ajan dosyası üretmeyin; roller ayrı oturum olarak çalışır.
