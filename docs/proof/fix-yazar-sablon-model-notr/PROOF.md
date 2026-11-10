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

## Tur 2

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| REVIEW-1 bulgularını kapatmak (2 önemli, 2 küçük) | mantık | 2f503a7..bu turun commit'i | 2 | opus |

### İddia
- [x] `code-structure/SKILL.md` satır 22 ve `builder-prompt.md` satır 1 çağrıyı `Agent(subagent_type: fabrika-yazar, model: {BUILDER_MODEL})` olarak yazar; ajan dosyası yoksa `general-purpose` + aynı model.
- [x] `ship-it/SKILL.md` satır 38 yalnız "yazardan daha zayıf model katmanıyla inceleme"yi yasaklar; "aynı ya da" kalmadı, parantez aynen duruyor.
- [x] (c) testi `ship-it/SKILL.md`'de inceleyici yasağı satırını (satır 30) hariç tutup kalan metinde `/sonnet/i` arar; satır 30 dışında "sonnet" geçmez.
- [x] `builder-prompt.md` satır 2, `{BUILDER_MODEL}` için ajansız ortamda araç ayarındaki model adının yazıldığını söyler.
- [x] Altı dosyanın `.claude/skills` ve `.agents/skills` kopyaları bayt olarak aynı; tam takım 29/29, çıkış 0.

### Önce
Tur başı, 2f503a7 üzerinde test değişikliği yokken: `node --test tests/kur.test.mjs` 26 geçti, 0 kırmızı, çıkış 0.

Yeni assert'ler eklendikten sonra, şablonlar değişmeden (tam çıktı: `tur2-kirmizi.txt`):

```
$ node --test tests/kur.test.mjs
✖ ship-it SKILL.md: yalnız yazardan daha zayıf katmanla inceleme yasak (yazar Fable ise inceleyici Fable kalabilir)
✖ yazar çağrısı modeli açıkça verir: Agent(..., model: {BUILDER_MODEL})
✖ builder-prompt: {BUILDER_MODEL} açıklaması ajansız ortamı (araç ayarındaki model adı) anlatır
ℹ tests 29 · ℹ pass 26 · ℹ fail 3
çıkış kodu: 1
```

Sıkılaştırılan (c) testi bu aşamada yeşildi, çünkü satır 30 dışında "sonnet" zaten yoktu; yakalama gücü aşağıdaki geri bozmayla gösterildi.

### Sonra
Tam çıktı: `tur2-yesil.txt`.

```
$ node --test tests/kur.test.mjs
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
çıkış kodu: 0
```

### Test
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/kur.test.mjs` (tur başı) | 26 geçer | 26 geçti | 0 | PASS |
| aynı komut, yeni assert'ler var, şablonlar eski | 3 kırmızı | 3 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, tüm düzeltmeler ve ayna uygulandı | 29 geçer | 29 geçti | 0 | PASS |
| geçici kopyada `ship-it/SKILL.md` satır 38'e küçük harfli "sonnet" eklendi, ayna da eşitlendi | yalnız (c) kırmızı | yalnız (c) kırmızı | 1 | PASS (beklenen kırmızı) |

### Orkestratör doğrulaması
- Test komutu tekrar çalıştırıldı: `node --test tests/kur.test.mjs` → 29 pass, 0 fail, çıkış 0; `node scripts/kur.mjs --hedef codex --kontrol` → kopyalar birebir aynı, çıkış 0
- `git diff --stat` kapsam kontrolü: 7 izlenen şablon/test dosyası + kanıt klasörü; `AGENTS.md`, `CLAUDE.md`, `docs/KURULUM.md`, `.claude/agents` değişmedi
- Aralık/Yeniden üretme: 2f503a7..bu turun commit'i; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → doğruydu
- Görseller: uygulanamaz
- Süreç/port temizliği: test geçici dizinde çalışır, port açılmadı → uygulanamaz

### Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. Worktree kökünde `node --test tests/kur.test.mjs` çalıştır; 29 geçer, çıkış 0.

## Tur 3

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| REVIEW-2 bulgularını kapatmak (1 önemli, 2 küçük) | mantık | 3a5ec2f..bu turun commit'i | 3 | opus |

### İddia
- [x] `fabrika/SKILL.md` satır 42 yazarı `Agent(subagent_type: fabrika-yazar, model: {BUILDER_MODEL})` olarak çağırır; satırın kalanı aynı.
- [x] "yazar çağrısı modeli açıkça verir" testinin dosya listesinde `fabrika/SKILL.md` var.
- [x] `ship-it/SKILL.md` satır 38'in parantezi tek açık istisnayı yazar: "Fable erişilemezse Opus yedeği kabul, yazar Fable olsa da".
- [x] ship-it testindeki `/aynı ya da/` denetimi tüm dosyada değil, yalnız "yazardan daha zayıf" cümlesini taşıyan satırda çalışır.
- [x] `fabrika/SKILL.md` ve `ship-it/SKILL.md` için `.claude/skills` ve `.agents/skills` kopyaları bayt olarak aynı; tam takım 29/29, çıkış 0; `kur.mjs --hedef codex --kontrol` çıkış 0.

### Önce
Tur başı, 3a5ec2f üzerinde test değişikliği yokken: `node --test tests/kur.test.mjs` 29 geçti, 0 kırmızı, çıkış 0.

Yeni assert'ler eklendikten sonra, skill dosyaları değişmeden (tam çıktı: `tur3-kirmizi.txt`). Ship-it testi "yazar Fable olsa da" metni bulunmadığı için, yazar çağrısı testi `fabrika/SKILL.md` dosyasında düştü:

```
$ node --test tests/kur.test.mjs
✖ ship-it SKILL.md: yalnız yazardan daha zayıf katmanla inceleme yasak (yazar Fable ise inceleyici Fable kalabilir)
✖ yazar çağrısı modeli açıkça verir: Agent(..., model: {BUILDER_MODEL})
ℹ tests 29 · ℹ pass 27 · ℹ fail 2
çıkış kodu: 1
```

### Sonra
Tam çıktı: `tur3-yesil.txt`.

```
$ node --test tests/kur.test.mjs
ℹ tests 29
ℹ pass 29
ℹ fail 0
çıkış kodu: 0

$ node scripts/kur.mjs --hedef codex --kontrol
Kontrol: kanonik kaynak ile kopyalar birebir aynı.
çıkış kodu: 0
```

Toplam test sayısı değişmedi; bu turda yeni test değil, mevcut iki teste yeni denetim eklendi.

### Test
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| `node --test tests/kur.test.mjs` (tur başı) | 29 geçer | 29 geçti | 0 | PASS |
| aynı komut, yeni assert'ler var, skill dosyaları eski | 2 kırmızı | 2 kırmızı | 1 | PASS (beklenen kırmızı) |
| aynı komut, düzeltmeler ve ayna uygulandı | 29 geçer | 29 geçti | 0 | PASS |
| `node scripts/kur.mjs --hedef codex --kontrol` | kopyalar aynı | kopyalar aynı | 0 | PASS |

Geri bozma denemeleri deponun geçici bir kopyasında yapıldı; her denemede iki kopya birlikte bozulduğundan ayna testleri etkilenmedi.

| Geri bozma | Beklenen | Gerçek | Çıkış kodu |
|---|---|---|---|
| `fabrika/SKILL.md` satır 42'den `model: {BUILDER_MODEL}` silindi | yalnız "yazar çağrısı modeli açıkça verir" kırmızı | aynı, 28/29 | 1 |
| `ship-it/SKILL.md` satır 38'den ", yazar Fable olsa da" silindi | yalnız ship-it katman testi kırmızı | aynı, 28/29 | 1 |
| `ship-it/SKILL.md` satır 38'e "aynı ya da" eklendi | yalnız ship-it katman testi kırmızı | aynı, 28/29 | 1 |
| `ship-it/SKILL.md` satır 52'ye "aynı ya da" eklendi (daraltmanın kanıtı) | hepsi yeşil | 29/29 | 0 |

### Orkestratör doğrulaması
- Test komutu tekrar çalıştırıldı: `node --test tests/kur.test.mjs` → 29 pass, 0 fail, çıkış 0; `node scripts/kur.mjs --hedef codex --kontrol` → kopyalar birebir aynı, çıkış 0
- `git diff --stat` kapsam kontrolü: 4 skill dosyası + `tests/kur.test.mjs` + kanıt klasörü; `AGENTS.md`, `CLAUDE.md`, `docs/KURULUM.md`, `.claude/agents` değişmedi
- Aralık/Yeniden üretme: 3a5ec2f..bu turun commit'i; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → doğruydu
- Görseller: uygulanamaz
- Süreç/port temizliği: test geçici dizinde çalışır, port açılmadı → uygulanamaz

### Yeniden üretme
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. Worktree kökünde `node --test tests/kur.test.mjs` çalıştır; 29 geçer, çıkış 0.
3. Aynı kökte `node scripts/kur.mjs --hedef codex --kontrol` çalıştır; çıkış 0.
