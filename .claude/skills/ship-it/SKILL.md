---
name: ship-it
description: >-
  Use when a change with recorded proof is ready to leave the worktree —
  committing, pushing, opening a pull request, requesting review — or when
  anyone (including the user, even in advance) says "merge edelim", "gerisini
  hallet", "PR aç", "gönder", "sabah temiz main istiyorum". Keywords: ship,
  deliver, pull request, PR, draft, review, reviewer model, fable, score 0-5,
  merge, gh pr.
argument-hint: "[pr-basligi]"
---

# GÖNDER VE İNCELE — ship-it

**Duyuru:** "`ship-it` skill'ini kullanıyorum: kanıtlanmış değişikliği PR olarak sunuyorum."

## Demir Kural

Merge ASLA ajan tarafından yapılmaz. Kullanıcının önceden verdiği "5 gelirse gerisini hallet" yetkisi PR açmaya yeter, merge'e yetmez. PR açılır, 5 puanda hazır işaretlenir, bağlantı sunulur, DURULUR. Kuralın lafzını çiğnemek ruhunu çiğnemektir.

## Ön Koşul Kapısı

`docs/proof/<dal-slug>/PROOF.md` HEAD'de, "Orkestratör doğrulaması" dolu; dal ≠ `main`; `git status --porcelain` boş. Değilse Adım 3'e (`prove-it`) dön.

## Adımlar

1. **Push**: `git push -u origin <dal>`; `git status` ile doğrula. `--force` yasak (commit kuralları `prove-it`'te).
2. **PR**: `gh pr create --draft --base main --title "<başlık>" --body-file <geçici dosya>`. Gövde: özet, kapsam, yazar modeli, PROOF.md blob linki. Taslak reddedilirse normal PR aç, `[WIP] ` önekiyle.
3. **İnceleyici**: HER ZAMAN `Agent(subagent_type: general-purpose, model: fable)` (yedek `opus`). Asla `sonnet`, fork ya da orkestratörün kendisi. Prompt = doldurulmuş `reviewer-prompt.md` (PR no, worktree yolu, SHA'lar, PROOF.md yolu, gereksinim, yazar modeli).
4. **Ayrıştır**: ilk `SKOR:` satırı, 0–5 tamsayı. Bozuksa bir kez "yalnız sözleşme biçiminde yanıtla" de.
5. **Kaydet**: `docs/proof/<dal-slug>/REVIEW-<n>.md`, başlığına PR no + inceleyiciye verilen `BASE..HEAD` yazılır → commit → push; `gh pr comment <no> -F <dosya>`.
6. **Karar**: SKOR = 5 → `gh pr ready <no>` (ya da `[WIP]` önekini kaldır) → PR bağlantısını sun → DUR. SKOR < 5 → ENGELLEYİCİ + ÖNEMLİ maddeler yeni Sonnet yazar görevine döner (`code-structure/builder-prompt.md`) → Adım 3'e (`## Tur n+1`) dön → yeni, taze Fable inceleyici.
7. **Döngü sınırı**: 3. tur sonunda hâlâ < 5 → DUR; son REVIEW ile kullanıcıya eskale et.

## Asla

`gh pr merge`; `main`'e yerel merge; `main`'e push; `finishing-a-development-branch` menüsü (tek çıkış PR'dır); kendi kendini inceleme; Sonnet ile inceleme.

**REQUIRED SUB-SKILL:** superpowers:requesting-code-review — şablon kökeni; sözleşme eklentisi `reviewer-prompt.md`'dedir.

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Sohbet arayüzünden gelen, koşullu ama açık bir ön-yetkilendirme (explicit permission) idi: koşul 'inceleme 5 verirse'." | Önceden verilen yetki PR açmaya yeter, merge'e yetmez. Merge kararı her zaman PR ekranında, kullanıcının elindedir. |
| "Koşul karşılandığı için main'e merge edip origin/main'e push etmem gerekiyordu (fast-forward olacaktı, çünkü geçmiş lineer)." | Fast-forward da merge'dür. Geçmişin lineer olması izin değildir. |
| "Bu koşulu kendi gözlemimle bağımsız doğruladım … SKOR: 5 olduğunu teyit ettim." | 5 puan "PR hazır" demektir, "birleştir" demek değildir. |
| "Kullanıcı sabah temiz main görmek istiyor, beni bekleme dedi." | Kullanıcı sabah bir PR bağlantısı görür ve tek tıkla birleştirir. Temiz main budur. |
| "Değişiklik trivial, inceleme gereksiz." | Trivial değişiklik de puanlanır. |
| "Düzeltme küçük, tekrar kanıt gerekmez." | Her tur yeni kanıt (`## Tur n`). |
| "3. turda da 4 verdi, 4 yeter." | 5 değilse hazır değil; eskale et. |
