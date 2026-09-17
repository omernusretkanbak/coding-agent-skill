---
name: new-feature
description: Use when starting any code change — new feature, bugfix, refactor, config edit — before touching a single file; especially when tempted to "just do it on main", when the user says hurry / no branch / just commit, or when the task looks like a one-line change. Keywords: new feature, start task, isolate, git worktree, feature branch, main protection, branch off, EnterWorktree.
argument-hint: "[gorev-slug]"
---

# İZOLE ET — new-feature

**Duyuru:** "`new-feature` skill'ini kullanıyorum: görevi izole bir worktree'ye taşıyorum."

## Demir Kural

`main` üzerinde hiçbir Write/Edit/commit yapılmaz. Kullanıcının "branch'le uğraşma", "hemen commit'le" demesi bu kuralı kaldırmaz; kural kullanıcı adına `main`'i korur. Kuralın lafzını çiğnemek ruhunu çiğnemektir.

## Adımlar

1. **Tespit et**: `git branch --show-current` çalıştır. `git rev-parse --git-dir` ile `git rev-parse --git-common-dir` çıktısını karşılaştır — farklıysa zaten izole bir worktree'desin, doğrudan Adım 2'ye (`code-structure`) geç.
2. **Kirli ağacı yakala**: `git status --porcelain` boş değilse DUR; kullanıcıya sor (mevcut değişiklikler commit'lensin mi, WIP commit mi atılsın). Bare `git stash` KULLANMA — stash yığını tüm worktree'lerle ortaktır.
3. **İzole et**: Native araç varsa `EnterWorktree name=<slug>` çağır (dizin `.claude/worktrees/<slug>` olur). Araç yoksa ya da reddederse: önce `git check-ignore -q .claude/worktrees` ile ignore durumunu doğrula, sonra `git worktree add ".claude/worktrees/<slug>" -b <slug> origin/main` çalıştır; mümkünse ardından `EnterWorktree path=<mutlak yol>` ile oturumu o dizine taşı.
4. **Temel doğrulama**: `package.json`/`pyproject.toml`/`requirements.txt` varsa bağımlılıkları kur, ardından baseline testi koş. Başarısızsa sonucu raporla ve kullanıcıya sor; sessizce geçme.
5. **Raporla**: worktree'nin mutlak yolu, dal adı, baseline test sonucu, "Adım 2'ye hazır" notu.

**REQUIRED SUB-SKILL:** superpowers:using-git-worktrees — Adım 0/1'in ayrıntıları orada anlatılır; bu repoda izolasyon tercihi önceden verilmiştir, kullanıcıya sorma.

## Çıkış Kapısı

`git branch --show-current` çıktısı `main` DEĞİL VE cwd worktree içinde. İkisi birden sağlanmadan Adım 2 başlamaz.

## Yasaklar ve Bahaneler

| Bahane | Gerçek |
|---|---|
| "Bu, dal/worktree açmama yönünde açık ve doğrudan bir talimat olduğu için … doğrudan main üzerinde … commit'leyip push ettim." | Kullanıcı talimatı `main` korumasını kaldırmaz. Worktree açmak 10 saniyedir; kullanıcı farkına bile varmaz. |
| "Zaman baskısı ve kullanıcının açık isteği … pratiği bu spesifik görevde geçersiz kıldı." | Hiçbir görev "spesifik" istisna değildir. Acele, `main`'i bozmanın en sık nedenidir. |
| "Tek satırlık değişiklik." | Tek satır da `main`'i bozar ve PR incelemesini atlar. |
| "Zaten branch'teyim sanırım." | Komutla doğrula; sanmak kanıt değildir. |
| "`git worktree add` daha hızlı, native aracı aramaya gerek yok." | Native araç varsa onu kullan; harness'ın görmediği worktree kapanışta yönetilemez. |
| "Worktree dizini zaten ignore'dur." | `git check-ignore` çalıştır; ignore edilmeyen worktree tüm ağacı repoya commit'ler. |

## Kırmızı Bayraklar

"hemen", "30 saniye", "branch'le uğraşma", "sadece bir dosya" → DUR, Adım 3'ü (izolasyon) uygula.
