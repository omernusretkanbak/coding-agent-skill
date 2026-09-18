<!-- Kullanım: bu şablonu docs/proof/<dal-slug>/PROOF.md olarak kopyala ve doldur. -->

# KANIT — {DAL_SLUG}

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| {görev} | görsel / mantık / karma | {base-sha}..{head-sha} | 1 | sonnet |

## İddia
- [ ] {iddia 1}
- [ ] {iddia 2}

## Önce
{komut + tam çıktı + çıkış kodu}  veya  ![before](before.png)

## Sonra
{komut + tam çıktı + çıkış kodu}  veya  ![after](after.png)

## Test / Ölçüm
| Komut | Beklenen | Gerçek | Çıkış kodu | Sonuç |
|---|---|---|---|---|
| {…} | {…} | {…} | {0} | PASS/FAIL |

## Orkestratör doğrulaması
- Test komutu tekrar çalıştırıldı: {komut} → {sonuç}
- `git diff --stat` kapsam kontrolü: {sonuç}
- Görseller açıldı / eşleşti: {evet / hayır / uygulanamaz}

## Kapsam dışı / bilinen eksikler
- {…}

## Yeniden üretme
1. {…}

<!-- Sonraki inceleme turlarında buraya "## Tur N" bölümü eklenir: İddia / Önce / Sonra / Test / Orkestratör doğrulaması aynı düzenle. -->
