---
name: new-feature
description: >-
  Use when starting any code change — new feature, bugfix, refactor, config
  edit — before touching a single file; especially when tempted to "just do
  it on main", when the user says hurry / no branch / just commit, or when
  the task looks like a one-line change. Keywords: new feature, start task,
  isolate, git worktree, feature branch, main protection, branch off,
  EnterWorktree.
argument-hint: "[gorev-slug]"
---

# İZOLE ET — new-feature

**Duyuru:** "`new-feature` skill'ini kullanıyorum: görevi izole bir worktree'ye taşıyorum."

## Demir Kural

`main` üzerinde hiçbir Write/Edit/commit yapılmaz. Kullanıcının "branch'le uğraşma", "hemen commit'le" demesi bu kuralı kaldırmaz; kural kullanıcı adına `main`'i korur. Kuralın lafzını çiğnemek ruhunu çiğnemektir.

## Adımlar

(a) **Tespit et**: `git branch --show-current`; `git rev-parse --git-dir` ile `--git-common-dir` çıktısını karşılaştır. Farklıysa zaten bir worktree'desin — ama hangi görevin? Dal adı bu görevin slug'ıyla aynıysa (ya da aynı PR'ın inceleme turuysa) Hat Adımı 2'ye (`code-structure`) geç. Farklıysa bu başka bir görevin worktree'sidir: madde (c) ile YENİ worktree aç (`git worktree add ".claude/worktrees/<slug>" -b <slug> origin/main` + `EnterWorktree path=<mutlak yol>`; `EnterWorktree name=` worktree içinden yeni worktree açmaz).
(b) **Kirli ağacı yakala**: `git status --porcelain` boş değilse DUR; kullanıcıya sor (mevcut değişiklikler commit'lensin mi, WIP commit mi atılsın). Bare `git stash` KULLANMA — stash yığını tüm worktree'lerle ortaktır.
(c) **İzole et**: Native araç varsa `EnterWorktree name=<slug>` çağır (dizin `.claude/worktrees/<slug>` olur). Araç yoksa ya da reddederse: önce `git check-ignore -q .claude/worktrees` ile ignore durumunu doğrula, sonra `git worktree add ".claude/worktrees/<slug>" -b <slug> origin/main` çalıştır; mümkünse ardından `EnterWorktree path=<mutlak yol>` ile oturumu o dizine taşı.
(d) **Temel doğrulama**: `package.json`/`pyproject.toml`/`requirements.txt` varsa bağımlılıkları kur, ardından baseline testi koş. Başarısızsa sonucu raporla ve kullanıcıya sor; sessizce geçme.
(e) **Raporla**: worktree'nin mutlak yolu, dal adı, baseline test sonucu, "Hat Adımı 2'ye hazır" notu.

**REQUIRED SUB-SKILL:** superpowers:using-git-worktrees — o skill'in Step 0/1 ayrıntıları orada anlatılır; bu repoda izolasyon tercihi önceden verilmiştir, kullanıcıya sorma.

## Çıkış Kapısı

`git branch --show-current` çıktısı `main` DEĞİL, bu görevin slug'ına EŞİT ve cwd o worktree'nin içinde.

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Bu, dal/worktree açmama yönünde açık ve doğrudan bir talimat olduğu için … doğrudan main üzerinde … commit'leyip push ettim." | Kullanıcı talimatı `main` korumasını kaldırmaz. Worktree açmak 10 saniyedir; kullanıcı farkına bile varmaz. |
| "Zaman baskısı ve kullanıcının açık isteği … pratiği bu spesifik görevde geçersiz kıldı." | Hiçbir görev "spesifik" istisna değildir. Acele, `main`'i bozmanın en sık nedenidir. |
| "Tek satırlık değişiklik." | Tek satır da `main`'i bozar ve PR incelemesini atlar. |

## Kırmızı Bayraklar

"hemen", "30 saniye", "branch'le uğraşma", "sadece bir dosya" → DUR, madde (c)'yi uygula.
