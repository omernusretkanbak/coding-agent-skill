# KANIT — fix-yazar-sablon-model-notr

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| Yazar şablonlarını model-nötr yapmak | mantık | ff8f0d9..bu turun commit'i | 1 | opus |

## İddia
- [x] `code-structure/builder-prompt.md` `{BUILDER_MODEL}` yer tutucusunu içerir, "sonnet" içermez (büyük/küçük harf duyarsız).
- [x] `code-structure/SKILL.md`, `prove-it/SKILL.md`, `prove-it/PROOF-template.md` "sonnet" içermez.
- [x] `ship-it/SKILL.md` satır 38'de "Sonnet ile inceleme" kalmadı; yerine model katmanı kuralı geldi. Satır 30'daki "Asla `sonnet`" yerinde.
- [x] `fabrika/SKILL.md` builder-prompt yer tutucu listesi `{BUILDER_MODEL}` içerir ve yanında "orkestratörün çağrıda verdiği yazar modeli" açıklaması vardır.
- [x] Altı dosyanın (yukarıdaki beş şablon + `fabrika/SKILL.md`) `.claude/skills` ve `.agents/skills` kopyaları bayt olarak aynı.
- [x] Tam takım yeşil: `node --test tests/kur.test.mjs` 26/26, çıkış 0 (taban 21/21; +5 yeni test).

## Önce
Taban, hiçbir değişiklik yokken:

```
$ node --test tests/kur.test.mjs
ℹ tests 21 · ℹ pass 21 · ℹ fail 0
çıkış kodu: 0
```

İlk dört yeni test eklendikten sonra, şablonlar değişmeden (tam çıktı: `once-kirmizi.txt`):

```
$ node --test tests/kur.test.mjs
✖ builder-prompt: {BUILDER_MODEL} yer tutucusu var, sabit "sonnet" yok
✖ code-structure SKILL.md, prove-it SKILL.md ve PROOF-template.md "sonnet" içermez
✖ ship-it SKILL.md "Sonnet ile inceleme" yasağını model katmanıyla yazar
ℹ tests 25 · ℹ pass 22 · ℹ fail 3
çıkış kodu: 1
```

Bayt eşitliği testi (d) bu aşamada yeşildi, çünkü iki kopya tabanda aynıydı. Kırmızısı, kanonik beş dosya düzenlenip ayna henüz eşitlenmemişken alındı (tam çıktı: `ayna-kirmizi.txt`):

```
$ node --test tests/kur.test.mjs
✖ depodaki .agents/skills aynası kanonik .claude/skills ile aynı
✖ yazar şablonlarının .claude/skills ve .agents/skills kopyaları bayt olarak aynı
ℹ tests 25 · ℹ pass 23 · ℹ fail 2
çıkış kodu: 1
```

Beş şablon bittikten sonra eklenen beşinci test; `fabrika/SKILL.md` henüz değişmeden (tam çıktı: `fabrika-kirmizi.txt`). Liste satırı bulundu, `{BUILDER_MODEL}` yoktu:

```
$ node --test tests/kur.test.mjs
✖ fabrika SKILL.md: builder-prompt yer tutucu listesi {BUILDER_MODEL} içerir
ℹ tests 26 · ℹ pass 25 · ℹ fail 1
çıkış kodu: 1
```

`fabrika/SKILL.md` kanonik kopyası düzeltilip ayna henüz eşitlenmemişken (tam çıktı: `fabrika-ayna-kirmizi.txt`):

```
$ node --test tests/kur.test.mjs
✖ depodaki .agents/skills aynası kanonik .claude/skills ile aynı
✖ yazar şablonlarının .claude/skills ve .agents/skills kopyaları bayt olarak aynı
ℹ tests 26 · ℹ pass 24 · ℹ fail 2
çıkış kodu: 1
```

## Sonra
Tam çıktı: `sonra-yesil.txt`.

```
$ node --test tests/kur.test.mjs
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
çıkış kodu: 0
```

`grep -i sonnet` beş kanonik dosyada yalnız `ship-it/SKILL.md:30` satırını döndürür (inceleyici kuralı, kapsam gereği yerinde).

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/kur.test.mjs` (değişiklikten önce, yeni testsiz) | 21 geçer | 21 geçti | 0 | PASS |
| aynı komut, yeni testler var, şablonlar eski | 3 kırmızı | 3 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, kanonik yeni, ayna eski | (d) ve ayna bekçisi kırmızı | 2 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, beşinci test var, `fabrika/SKILL.md` eski | 1 kırmızı | 1 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, `fabrika/SKILL.md` kanonik yeni, ayna eski | (d) ve ayna bekçisi kırmızı | 2 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, tüm değişiklikler uygulandı | 26 geçer | 26 geçti | 0 | PASS |

Kör nokta denemesi: (b) testi döngüde ilk bulguda durduğundan ilk kırmızı yalnız `code-structure/SKILL.md`'yi gösterdi. Bu yüzden deponun geçici bir kopyasında (çalışma ağacı dışında) her kanonik dosyaya tek tek geri bozma uygulandı.

| Geri bozma | Düşen hedef test |
|---|---|
| builder-prompt: `{BUILDER_MODEL}` silindi | (a) |
| builder-prompt: satır 1'e "sonnet" eklendi | (a) |
| code-structure/SKILL.md: description'a "sonnet" | (b) |
| prove-it/SKILL.md: "Yazar (Sonnet)" geri geldi | (b) |
| PROOF-template.md: `{yazar-modeli}` → `sonnet` | (b) |
| ship-it/SKILL.md: "Sonnet ile inceleme" geri geldi | (c) |

Her denemede yalnız kanonik kopya bozulduğundan (d) ve ayna bekçisi de düştü (fail 3, çıkış 1).

## Orkestratör doğrulaması
- Test komutu tekrar çalıştırıldı: `node --test tests/kur.test.mjs` → 26 pass, 0 fail, çıkış 0; `node scripts/kur.mjs --hedef codex --kontrol` → kopyalar birebir aynı, çıkış 0
- `git diff --stat` kapsam kontrolü: 13 izlenen dosya (+ `docs/proof/fix-yazar-sablon-model-notr/`); `AGENTS.md`, `CLAUDE.md`, `docs/KURULUM.md`, `.claude/agents` değişmedi
- Aralık/Yeniden üretme: ff8f0d9..bu turun commit'i; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → doğruydu
- Görseller: uygulanamaz
- Süreç/port temizliği: test geçici dizinde çalışır, port açılmadı → uygulanamaz

## Kapsam dışı / bilinen eksikler
- Şunlar görev gereği değişmedi ve hâlâ yazarı Sonnet olarak anar: `AGENTS.md`, `CLAUDE.md`, `docs/KURULUM.md`, `.claude/agents/fabrika-yazar.md`. `fabrika/SKILL.md` içinde yalnız satır 39-40'taki "Yazar = hızlı/ucuz model katmanı" ilkesi kaldı; aynı dosyada yalnız yer tutucu listesi değişti.
- `docs/proof/` altındaki eski kanıtlar geçmiş kayıt olarak kaldı.

## Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. Worktree kökünde `node --test tests/kur.test.mjs` çalıştır; 26 geçer, çıkış 0.
3. `.claude/skills/ship-it/SKILL.md` içinde satır 38'e "Sonnet ile inceleme" yazıp aynı komutu çalıştır; (c), (d) ve ayna bekçisi düşer. Dosyayı geri al.
