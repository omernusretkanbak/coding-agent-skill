# KANIT — fabrika hattının genel hâli (ajanlar, fabrika skill'i, çok araçlı kurulum)

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| Fabrika hattının (yazar + inceleyici rolleri, `fabrika` skill'i) genel hâlini şablon depoya ekle; Claude Code, Codex, Cursor, Antigravity için kurulum betiği, `.agents/skills` aynası, testler ve KURULUM.md | karma (belge + betik; görsel çıktı yok) | 71c94da..bu turun commit'i | 1, 2 | sonnet |

## İddia
- [ ] Rol metinleri tek kaynaktır (`.claude/skills/fabrika/roller/yazar.md`, `inceleyici.md`); `.claude/agents/fabrika-yazar.md` ve `fabrika-inceleyici.md` bu dosyalara bakan ince sarmalayıcılardır (geçerli frontmatter: `name` = dosya adı, `description`, `model`, `tools`).
- [ ] `.claude/skills/fabrika/SKILL.md` genel; Mod A ve Mod B sade; ajanlı ve ajansız ortam iki yolu tarif edilmiş; push/PR öncesi onay, merge yok (Mod B dahil), en çok 3 tur, SKOR 5 koşulu korunmuş.
- [ ] `scripts/kur.mjs` hedef (claude/codex/cursor/antigravity/hepsi), kapsam (proje/kullanici), `--kuru`, `--kontrol`, `--zorla` seçeneklerini sağlıyor; sembolik bağlantı oluşturmuyor.
- [ ] `tests/kur.test.mjs` yeşil; testler OS geçici dizininde çalışır.
- [ ] Depodaki `.agents/skills/` aynası kanonik `.claude/skills/` ile birebir aynı (`--kontrol` çıkış 0, testle zorunlu).
- [ ] `docs/KURULUM.md` İngilizce özet, araç başına bölüm (klasörler, ajanlı/ajansız yol, başlatma istemi), doğrulama durumu tablosu (Resmî doküman / Üçüncü taraf kaynak / Doğrulanmadı), Antigravity boyut sınırı ve "başka araç eklemek" notunu içeriyor.
- [ ] `README.md` mevcut içeriği koruyup "Fabrika hattı" bölümü ekliyor; `AGENTS.md`'ye yalnız skill kadrosu tablosuna tek satır eklendi (3004 bayt); `CLAUDE.md` ajan satırı fabrika ajan adlarını kullanıyor.
- [ ] `prove-it`/`ship-it` güncellemeleri genel biçimde; amaç (capture-page.mjs birincil, `{ANA}` dalı) korundu.
- [ ] Yayın öncesi sızıntı taraması yapıldı: kişi adı, yerel yol, makine/ağ adı, sır, ortam değişkeni; sonuç temiz (yalnız şablon komutundaki depo adı).

### Tur 2 iddiaları
- [ ] `.claude/settings.json`: `git push *` ve `gh pr create *` `allow` listesinden `ask` listesine taşındı; JSON geçerli, `deny` listesi korundu.
- [ ] `ship-it` Adım 0 (push/PR öncesi açık onay) ile `fabrika` ve `docs/KURULUM.md` aynı kuralı söylüyor.
- [ ] Ajan/model anlatımı `CLAUDE.md`, `fabrika`, `ship-it`, `code-structure`, şablonlar (`builder-prompt.md`, `reviewer-prompt.md`) ve KURULUM'da aynı: `fabrika-yazar` / `fabrika-inceleyici` (çağrıda `model: fable`, yedek `opus`), ajan dosyası yoksa `general-purpose` + aynı model, ajansız ortamda ayrı oturum.
- [ ] `fabrika-inceleyici.md` `model: opus` (üst modele sessiz düşme yok); çağrıdaki `model` bunun üstüne yazar.
- [ ] `kur.mjs`: dizin çakışması "ÇATIŞMA (dizin)" ile çıkış 1; ön tarama (çakışmada hiçbir dosya yazılmaz); sembolik bağlantı atlanır/uyarılır, hedefte bağlantı içinden yazılmaz; ev dizini tanımsızsa kullanıcı kapsamı çıkış 2.
- [ ] KURULUM: Cursor çift skill konusu dürüst yazıldı (doğrulanmadı), `--zorla` yedek almadığı belirtildi, kullanıcı kapsamı uyarısı, `docs/proof` arşiv notu, salt-okunur kuralın metinsel olduğu ve `PowerShell` araç notu eklendi.
- [ ] `{ANA}` tek tanım (`fabrika` §0); `new-feature`, `CLAUDE.md`, KURULUM buna atıf yapıyor; ölü `{SKILL_ROOT}` yer tutucusu kaldırıldı.

## Önce
Taban SHA 71c94da: bu dosyaların hiçbiri yoktu (ajanlar, `fabrika`, `roller/`, `scripts/kur.mjs`, `tests/`, `.agents/`, `docs/KURULUM.md`). Tur 1'de betik yazılmadan önce kırmızı test:

```text
$ node --test tests/*.test.mjs
ℹ tests 14
ℹ pass 3
ℹ fail 11
```

Geçen 3 test betikten bağımsız bekçilerdi: kanonik kaynakta beş skill var; her skill için `name`/`description` geçerli; `AGENTS.md` 24000 bayttan küçük. Başarısız 11 test: `--hedef codex`; `--hedef claude` kullanıcı kapsamı; `--hedef claude` proje kapsamı; `--hedef hepsi`; `--kuru`; `--kontrol`; farklı dosyayı ezmeme; `--kapsam kullanici`; geçersiz hedef (çıkış 2); ajan sarmalayıcıları rol dosyasına işaret ediyor; depo aynası kanonikle aynı.

Tur 2'de yeni testler (dizin çakışması, ön tarama, sembolik bağlantı, ev dizini tanımsız) `kur.mjs` değişmeden önce yazıldı. Kırmızı koşu kaydı Tur 2 raporunda; bağımsız inceleme eski betiği çalıştırıp kısmi yazma + çıkış 1'i doğruladı (eski betik çakışmada kısmi yazıyor, dizinde yığın dökümü veriyordu). Eski betik artık yok; koşu çıktısı burada yeniden üretilmedi.

## Sonra
```text
$ node --test tests/*.test.mjs
ℹ tests 18
ℹ pass 18
ℹ fail 0
ℹ skipped 0
$ node scripts/kur.mjs --hedef codex --zorla   (aynayı kanonikten yeniler)
$ node scripts/kur.mjs --hedef hepsi --kontrol
Kontrol: kanonik kaynak ile kopyalar birebir aynı.     (çıkış 0)
$ wc -c AGENTS.md
3004 AGENTS.md
```

Değişen dosyalar için `git diff --stat` ve `git status --short -uall` orkestratörün doğrulamasında kullanılır. Bu turda dokunulanlar: `.claude/settings.json`, `.claude/agents/fabrika-inceleyici.md`, `.claude/skills/{ship-it,code-structure,new-feature,fabrika}` ve `.agents/skills` aynası, `CLAUDE.md`, `README.md`, `docs/KURULUM.md`, `scripts/kur.mjs`, `tests/kur.test.mjs`, bu PROOF.

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/*.test.mjs` | 18/18 | 18 geçti, 0 kaldı, 0 atlandı | 0 | PASS |
| `node scripts/kur.mjs --hedef hepsi --kontrol` | kopyalar birebir aynı | "birebir aynı" | 0 | PASS |
| JSON ayrıştırma `.claude/settings.json` (node `JSON.parse`) | geçerli | geçerli | 0 | PASS |
| Frontmatter bekçisi (testte): skill `name` = klasör adı, `description` dolu; ajan `name` = dosya adı, `model`/`tools` dolu | geçerli | geçerli | 0 | PASS |
| Yayın öncesi sızıntı taraması (yeni/değişen tüm dosyalar, `.agents` aynası dahil): kişi adı, yerel yol, makine/ağ adı, sır, ortam değişkeni | eşleşme yok | temiz (yalnız şablon komutundaki depo adı) | – | PASS |
| Yol/bağlantı kontrolü (backtick ve `](…)` yolları) | var olan dosyalara işaret | statik yollar var; yalnız çalışma anında oluşacak yollar yok (`.claude/worktrees`, `docs/backlog.md`, `docs/proof/urun`, örnek PROOF yolu) | 0 | PASS |
| CRLF denetimi (yeni/değişen dosyalar) | 0 (depo LF) | hepsi 0 | 0 | PASS |

KURULUM.md komutları okunarak sözdizimi denetlendi; dış etkili olanlar (`gh repo create`, `git push`, `gh pr create`) çalıştırılmadı.

## Araç başına doğrulama durumu
Ayrıntı ve kaynak türü `docs/KURULUM.md` "Doğrulama durumu" tablosundadır; özet:

| Araç | Resmî dokümanla doğrulanan | Üçüncü taraf kaynak / yaygın kabul | Doğrulanmadı |
|---|---|---|---|
| Claude Code | skill klasörü `.claude/skills/`, alt ajan dosyası `.claude/agents/*.md` | – | – |
| Codex | skill klasörü `.agents/skills` (repo kökü ve ev dizini), isteğe bağlı `agents/openai.yaml` | `AGENTS.md` okuması (OpenAI standardı, sorgulanan sayfada yok) | alt ajan dosyası |
| Cursor | skill klasörleri `.agents/skills/`, `.cursor/skills/` (+ `.claude/skills/`, `.codex/skills/` okunur), `AGENTS.md` | – | alt ajan dosyası; aynı adlı skill'in iki klasörde bulunması (çift gösterim) |
| Antigravity | `AGENTS.md`/`GEMINI.md`, `.agents/rules/*.md`, tek dosya 24.000 bayt, toplam 20.000 jeton | skill klasörü `.agents/skills/` (eski `.agent/skills/`), doğrulanmalı | alt ajan dosyası |

## Orkestratör doğrulaması

## Kapsam dışı / bilinen eksikler
- Codex, Cursor ve Antigravity için ajan dosyası üretilmedi: resmî alt ajan biçimi doğrulanamadı; bu araçlarda roller ayrı oturum olarak çalışır (tasarım kararı).
- Antigravity skill klasörü ve `--kapsam kullanici` altındaki Antigravity yolu üçüncü taraf kaynağa dayanır; betik kullanıcı kapsamında uyarı yazar.
- Cursor'da çift skill (kanonik + ayna) davranışı doğrulanmadı; KURULUM hangi klasörün silinebileceğini anlatır.
- `docs/proof/` altındaki eski pilot kanıt dosyaları bu işin kapsamı dışındadır.

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. `node --test tests/*.test.mjs` ve `node scripts/kur.mjs --hedef hepsi --kontrol` çıkış kodu 0 vermeli.
3. `git diff --stat 71c94da..HEAD` yukarıdaki dosya listesini göstermeli.
