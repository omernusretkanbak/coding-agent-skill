<!-- Kullanım: bu şablonu docs/proof/<dal-slug>/PROOF.md olarak kopyala ve doldur. -->

# KANIT — {DAL_SLUG}

<!-- Aralık: yalnız taban SHA doldurulur, "bu turun commit'i" sabit metindir.
PROOF commit'ten ÖNCE yazılır — bu turun commit'i henüz yoktur, SHA'sı
bilinmez. Somut base→head aralığı, commit'ten SONRA yazılan REVIEW-<n>.md
başlığına girer (inceleyiciye verilen SHA'lar oradadır). -->

| Görev | Tür | Aralık | Tur | Yazar modeli |
|---|---|---|---|---|
| {görev} | görsel / mantık / karma | {base-sha}..bu turun commit'i | 1 | sonnet |

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
- Aralık/Yeniden üretme: {taban-sha}..bu turun commit'i; "çalışma ağacı" ya da taban SHA'yı HEAD sayan adım yok → {doğruydu | düzeltildi: …}
- Görseller: {n}/{n} açıldı — {ad1.png: gözlem} …; iddia bölgesi kırpıntıları (`--zoom-image`): {kırpıntı1.png → gözlem → eşleşti/eşleşmedi} … (n/n DEĞİLSE ya da iddia içeren bir görselin kırpıntısı YOKSA "eşleşti" YAZILMAZ) | uygulanamaz
- Süreç/port temizliği: {portlar} → {kapalı | açıktı: PID … durduruldu}

## Kapsam dışı / bilinen eksikler
- {…}

## Yeniden üretme
<!-- İlk adım her zaman bu turun commit'ini checkout etmektir (SHA:
REVIEW-<n>.md başlığı ya da PR head'i) — ASLA taban SHA'sı, ASLA "çalışma
ağacı". -->
1. Bu turun commit'ini checkout et (SHA: REVIEW-<n>.md başlığı / PR head'i).
2. {…}

<!-- Sonraki inceleme turlarında buraya "## Tur N" bölümü eklenir: İddia / Önce / Sonra / Test / Orkestratör doğrulaması aynı düzenle. Aralık ve Yeniden
üretme burada da henüz var olmayan commit'e SHA ya da "çalışma ağacı" ile
atıf yapmaz. -->
