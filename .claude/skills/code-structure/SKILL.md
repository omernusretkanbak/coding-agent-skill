---
name: code-structure
description: >-
  Use when about to write or modify code in any codebase — new file, new
  module, refactor, "where should this go?" — or when dispatching an
  implementer subagent for a task; before producing code without first
  reading how the project is organized. Keywords: build, implement,
  architecture, layering, page service repository, clean code, conventions,
  learn codebase, implementer subagent, sonnet.
---

# İNŞA ET — code-structure

**Duyuru:** "`code-structure` skill'ini kullanıyorum: kod tabanını okuyup mimariye uygun yazıyorum."

## İlke

`AGENTS.md` mimariyi anlatmaz; ajan kod tabanını okuyarak öğrenir. Önce oku, sonra yaz. Kodu **Yazar (Sonnet)** yazar; orkestratör görevlendirir ve doğrular.

## Orkestratör için

Kodu kendin yazma. `Agent(subagent_type: general-purpose, model: sonnet)` ile görevlendir; prompt = `builder-prompt.md`'nin doldurulmuş hali (fork değil, taze bağlam). Alt-ajan bitince: `git diff --stat` ile kapsamı kontrol et; test komutunu KENDİN tekrar çalıştır (alt-ajan raporu kanıt değildir); Mimari Notu'nu oku. Eksik varsa aynı alt-ajana `SendMessage` ile düzelttir; bağlam bozulduysa yeni alt-ajan aç.

## Yazar için (reçete)

1. **Keşif**: README/CONTRIBUTING/ADR oku → dizin ağacına bak → benzer bir akışı uçtan uca izle (giriş noktası → servis → veri erişimi) → test düzenini ve komutunu bul → lint/format konfigürasyonuna bak → adlandırma kalıplarını çıkar. Çıktı: raporda 5–8 satırlık "Mimari Notu". Boş veya yeni projede katman sorusunu orkestratöre döndür; varsayım yapma.
2. **Katman kuralı**: Sunum (Page/UI/Handler) → Servis (iş kuralı) → Repository (veri erişimi). Her katman yalnız bir altını çağırır. UI'da SQL/HTTP çağrısı yok; Repository'de iş kuralı yok; Servis, framework nesnesi (request/response) tanımaz. Proje farklı bir düzen kuruyorsa projeninki geçerlidir; kural düzeni değiştirmek değil, ona uymaktır.
3. **Temiz kod asgarisi**: tek sorumluluk, küçük fonksiyon, açıklayıcı isim, ölü kod yok, "bu arada şunu da" yok (cerrahi değişiklik), mevcut yardımcıyı kopyalamak yerine kullan.
4. **REQUIRED SUB-SKILL:** superpowers:test-driven-development — önce kırmızı test, sonra kod.

## Çıkış Kapısı

Mimari Notu yazıldı; testler yeşil (komut + çıktı raporda); `git diff --stat` yalnız görev kapsamındaki dosyaları gösteriyor → Adım 3 (`prove-it`).

## Sık Hatalar

| Hata | Düzeltme |
|---|---|
| Katman atlama (UI'dan doğrudan DB) | Servis ve Repository katmanlarını ekle, UI'ı sadeleştir. |
| Mevcut yardımcıyı görmeyip kopya yazmak | Keşif adımını atlama; benzer akışı önce bul. |
| Projenin adlandırmasını kendi tercihiyle değiştirmek | Projenin kalıbına uy, kişisel tercihi bastır. |
| Kapsam dışı "iyileştirme" | Görev dışına çıkma; ayrı görev olarak öner. |
| Test yazmadan kod | superpowers:test-driven-development'a dön. |
| Alt-ajan raporuna bakıp testi kendin koşmamak | Orkestratör test komutunu bağımsız tekrar çalıştırır. |
