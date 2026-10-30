#!/usr/bin/env node
// senaryo-kos.mjs
//
// Amaç: bağımsız bir "sınayıcı"nın bir web arayüzünü SENARYO bazlı, başsız Edge/Chrome + CDP ile
// sınaması ve bulgu raporu (sonuc.json + RAPOR.md + PNG kareler) üretmesi. Kod DEĞİŞTİRMEZ; yalnız
// gözlemler. prove-it/scripts/capture-page.mjs'in CDP kalıbını ve süreç hijyenini (rastgele geçici
// profil, her çıkış yolunda temizlik, sabit port yok, --timeout-ms iç deadline) aynen izler.
// Bağımlılıksız: yalnız Node >= 22 çekirdek API'leri (global fetch + WebSocket).
//
// Kullanım:
//   node senaryo-kos.mjs --senaryo <json> (--url http://127.0.0.1:PORT/ | --sun <dizin>) --out <dizin>
//     [--matris 390x844,768x1024,1280x800] [--tema acik,koyu] [--hareket azalt|serbest] [--tekrar 1] [--setup <js>]
//     [--beklenti <json>] [--yasak-desen <dosya>] [--timeout-ms 180000] [--browser <exe>]
//   node senaryo-kos.mjs --help
//
// Çıkış kodları: 0 temiz ya da yalnız KÜÇÜK bulgu; 1 ENGELLEYİCİ/ÖNEMLİ bulgu var;
//                2 kullanım / güvenlik (URL ya da yasak desen bekçisi) / tarayıcı bulunamadı;
//                3 koşucu hatası (zaman aşımı, tarayıcı, CDP).
//
// GÜVENLİK (kodda, talimatta değil):
//  - URL bekçisi: yalnız ^http://127\.0\.0\.1:\d+(/|$). localhost, başka IP, ana makine adı, https,
//    file: REDDEDİLİR (çıkış 2). Gezinme sırasında yönlendirme/alt istek 127.0.0.1 dışına giderse
//    CDP Fetch alanında istekten ÖNCE engellenir ve ENGELLEYİCİ bulgu olur.
//  - Yasak desen bekçisi: koşucu başlamadan senaryoyu (ve --sun dizinindeki metin dosyalarını)
//    varsayılan + --yasak-desen desenleriyle tarar; eşleşme varsa HİÇ başlamaz (çıkış 2). Eşleşen
//    metin DEĞİL, yalnız dosya:satır ve desen adı yazılır. Aynı tarama ÇIKTIYA da uygulanır (sonuc.json,
//    RAPOR.md yazılmadan önce): eşleşirse dosyalar yazılmaz, çıkış 2.
//  - Tarayıcı bayrakları: --proxy-server=127.0.0.1:1 (loopback muaf, diğer trafik ölü proxy'de ölür) ve
//    --block-new-web-contents. Fetch bekçisi yalnız ana sayfa hedefindedir; WebSocket/WebRTC/worker kapsam dışı.
//  - --sun: dizini 127.0.0.1'de rastgele portta SALT-OKUNUR sunar; `..`, kaçış kodlu `..`, sembolik
//    bağlantı ile dizin dışına çıkış engelli; çıkışta kapanır.

import { spawn, spawnSync } from 'node:child_process';
import {
  mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync,
  realpathSync, readdirSync, statSync, lstatSync, unlinkSync,
} from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

// Erişilebilirlik ağacı (CDP) rol adları; senaryodaki `role` bunlardan biri olmalıdır. Takma ad: CDP adı farklıysa.
export const ROL_LISTESI = [
  'alert', 'alertdialog', 'article', 'banner', 'button', 'cell', 'checkbox', 'combobox', 'complementary', 'contentinfo',
  'dialog', 'figure', 'form', 'grid', 'group', 'heading', 'image', 'link', 'list', 'listbox', 'listitem', 'main',
  'menu', 'menubar', 'menuitem', 'navigation', 'option', 'progressbar', 'radio', 'region', 'row', 'search', 'searchbox',
  'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'textbox', 'toolbar', 'tooltip',
];
export const ROL_TAKMA = { img: 'image' };
const TAKMA_METNI = Object.entries(ROL_TAKMA).map(([k, v]) => `${k} → ${v}`).join(', ');

const HELP = `Kullanım:
  node senaryo-kos.mjs --senaryo <json> (--url <http://127.0.0.1:PORT/...> | --sun <dizin>) --out <dizin> [seçenekler]

Zorunlu:
  --senaryo <json>        Adım listesi (bkz. senaryo-sablonu.json)
  --url <url>             Sınanacak adres. YALNIZ http://127.0.0.1:PORT/... kabul edilir
                          (localhost, başka IP, https, file: reddedilir; çıkış 2)
  --sun <dizin>           --url yerine: dizini 127.0.0.1'de rastgele portta SALT-OKUNUR sunar
                          (--url ile BİRLİKTE VERİLEMEZ; çıkışta kapanır)
  --out <dizin>           sonuc.json, RAPOR.md ve kareler buraya yazılır

Seçenekler:
  --matris <GxY,...>      Görünüm alanları (varsayılan: 390x844,768x1024,1280x800)
  --tema <acik,koyu>      prefers-color-scheme emülasyonu (varsayılan: acik,koyu)
  --hareket <azalt|serbest>
                          azalt (varsayılan): prefers-reduced-motion: reduce zorlanır (kararlı kare). serbest:
                          ZORLANMAZ; karşılama/splash/modal gibi hareket kapalıyken görünmeyen geçici katmanlar
                          sınanabilir (kareler daha kararsız olabilir; yeni senaryoda --tekrar 2 kullanın)
  --tekrar <n>            Senaryoyu her hücrede n kez koş (1-5, varsayılan 1). YENİ senaryoda 2 kullan:
                          sonuçlar farklıysa "kararsız senaryo" uyarısı verilir (ürün bulgusu sayılmaz)
  --setup <js>            Her sayfa belgesinden ÖNCE çalışacak JS (ör. Date.now sabitleme)
  --beklenti <json>       Sayfa açılmadan önce yazılmış beklenti listesi (bkz. beklenti-sablonu.json)
  --yasak-desen <dosya>   Satır başına bir düzenli ifade; varsayılan yasak desenlere EK olarak uygulanır
  --rapor-sablon <md>     RAPOR.md şablonu (varsayılan: skill dizinindeki RAPOR-template.md)
  --timeout-ms <ms>       Toplam süre sınırı (varsayılan 180000), TEK global deadline. Çağıranın kendi dış
                          zaman aşımından KISA tut (aksi halde temizlik fırsatı bulunamaz)
  --browser <exe>         Tarayıcı yolu (yoksa CAPTURE_BROWSER, sonra Edge/Chrome aranır)
  --help                  Bu yardım

Adımlar (senaryo JSON'u: {"ad": "...", "adimlar": [...]}; ilk adım goto olmalı; örnek: senaryo-sablonu.json):
  goto          url (göreli yol; mutlak ise 127.0.0.1 olmalı). Aynı belgede yalnız #parça farkı ("/#iletisim")
                yük olayı beklenmeden (Page.navigatedWithinDocument) tamamlanır
  click         role+name ya da metin; hedef örtülüyse adım başarısız olur
  kaydir        role+name ya da metin; hedefi görünüme getirir (scrollIntoView). Ardından gelen screenshot
                sayfanın aşağısındaki bölümü karelemiş olur
  fill          role+name ya da metin, deger (açıkça sahte değer kullanın)
  press         tus: Enter, Tab, Escape, Space, Backspace, Arrow* (ArrowUp/Down/Left/Right)
  waitFor       metin ya da role(+name); isteğe kaybolur, zamanAsimiMs (koşul yoklaması; sabit bekleme YOK)
  assertText    metin (isteğe yok: true)
  assertVisible role(+name) ya da metin
  screenshot    ad; kare alır ve o noktada denetimleri de koşar
Her adıma isteğe bağlı: beklenti (beklenti.json kimliği, ör. "B1") ve not. Hedefler yalnız erişilebilirlik
role+name ya da görünür metin; CSS sınıfı, kimlik ve XPath hedefi REDDEDİLİR. Başarısız adımdan sonraki
adımlar atlandi olur; son durum yine ölçülür.

Eşleşme: role+name, metin, assertText ve waitFor Türkçe-bilinçli ve büyük/küçük harf duyarsızdır (Unicode NFC +
tr küçültme: "KATIL" = "katıl", "TERİM" = "terim"; text-transform: uppercase görünür adı büyütse de eşleşir).
Bulunamayan adda hata mesajı sayfadaki en yakın aday adları listeler (en çok 5).
Roller (erişilebilirlik ağacı, CDP adları): ${ROL_LISTESI.join(', ')}.
Takma adlar: ${TAKMA_METNI} (img yazılsa da CDP rolü image aranır).

Kararlılık: koşucu (--hareket serbest değilse) prefers-reduced-motion: reduce, tr-TR yerel ayarı ve Europe/Istanbul saat dilimini uygular;
her hücrede depolama, çerez ve önbellek temizlenir. Çıktıda (sonuc.json, RAPOR.md) yasak desen çıkarsa dosyalar
YAZILMAZ (çıkış 2).

Otomatik denetimler (her hücrede): konsol hatası/yakalanmamış istisna, ağ hatası (4xx/5xx), 127.0.0.1 dışı istek,
yatay taşma, adsız etkileşimli öğe, alt'sız görsel, başlık atlaması, dokunmatik hedef < 44 px (yalnız ≤480 px
genişlikte), Tab ile görünür odak, yazı < 12 px. Çalıştırılamayan denetim olcumHatalari alanına ve rapora yazılır.

Şiddet (ölçüt):
  ENGELLEYİCİ  görev tamamlanamaz ya da güvenlik sınırı aşılır: başarısız adım, 127.0.0.1 dışı istek
  ÖNEMLİ       görev tamamlanır ama belirgin kusur: konsol hatası/istisna, 4xx/5xx, yatay taşma, adsız düğme,
               alt'sız görsel, odak göstergesi yok, 24 px altı dokunmatik hedef, kanıtsız beklenti
  KÜÇÜK        cila: başlık atlaması, 24-44 px dokunmatik hedef, 12 px altı yazı, favicon.ico 404

Sınır: ana sayfanın HTTP(S) istek ve yönlendirmeleri 127.0.0.1 dışına gönderilmeden engellenir. Yeni pencere/sekme
(window.open, target=_blank) bu bekçiden geçmez; onların loopback dışı trafiği ölü proxy'de ölür
(--proxy-bypass-list=<-loopback>;127.0.0.1 ile yalnız 127.0.0.1 muaftır; --block-new-web-contents de verilir ama
bu tarayıcıda etkisiz çıkabilir). Kurumsal ProxySettings ilkesi bu bayrakları ezebilir. WebSocket, WebRTC ve
worker kapsam dışıdır.
Çıktı bekçisi tetiklenirse bu koşunun yazdığı kareler silinir ("N kare silindi"); silinemeyen "KALDI, elle silin".

Çıkış kodları: 0 temiz/yalnız KÜÇÜK, 1 ENGELLEYİCİ/ÖNEMLİ bulgu, 2 kullanım/güvenlik/tarayıcı yok, 3 koşucu hatası.
`;

// ---------------------------------------------------------------------------------------------
// Bekçiler (saf işlevler)
// ---------------------------------------------------------------------------------------------

const URL_IZINLI = /^http:\/\/127\.0\.0\.1:\d+(\/|$)/;

/** Yalnız http://127.0.0.1:PORT kabul edilir. */
export function urlBekcisi(url) {
  return typeof url === 'string' && URL_IZINLI.test(url);
}

const GORSEL_UZANTILAR = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico', 'css', 'js']);
// Her desen: { ad, re, suz? }. suz(eşleşme) true dönerse eşleşme yok sayılır.
const VARSAYILAN_DESENLER = [
  { ad: 'on-bir-hane', re: /(?<!\d)\d{11}(?!\d)/ },
  { ad: 'tr-cep', re: /(?<!\d)(?:\+90|90|0)[\s-]*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)/ },
  { ad: 'tr-cep', re: /(?<!\d)5\d{2}[\s.-]\d{3}[\s.-]\d{2}[\s.-]\d{2}(?!\d)/ },
  { ad: 'tr-cep', re: /(?<!\d)5\d{9}(?!\d)/ }, // ayraçsız, ön eksiz 10 hane (5321234567); 10+ haneli uzun sayılar takılmaz
  {
    ad: 'eposta',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.([A-Za-z]{2,})/,
    suz: (m) => GORSEL_UZANTILAR.has(m[1].toLowerCase()), // logo@2x.png gibi dosya adları e-posta değildir
  },
];

/**
 * Metinleri yasak desenlere karşı tarar. Eşleşen METNİ döndürmez: yalnız dosya adı, satır no, desen adı.
 * @param {{dosyalar: {ad: string, metin: string}[], ozel?: {ad: string, re: RegExp}[]}} girdi
 */
export function yasakTara({ dosyalar, ozel = [] }) {
  const desenler = [...VARSAYILAN_DESENLER, ...ozel];
  const bulunan = [];
  const goruldu = new Set();
  for (const d of dosyalar) {
    const satirlar = d.metin.split(/\r?\n/);
    satirlar.forEach((satir, i) => {
      for (const p of desenler) {
        const re = new RegExp(p.re.source, p.re.flags.replace('g', ''));
        const m = re.exec(satir);
        if (!m) continue;
        if (p.suz && p.suz(m)) {
          // aynı satırda başka eşleşme olabilir: g bayraklı tarama
          const g = new RegExp(p.re.source, p.re.flags.replace('g', '') + 'g');
          let bulundu = false;
          for (const mm of satir.matchAll(g)) {
            if (!p.suz(mm)) { bulundu = true; break; }
          }
          if (!bulundu) continue;
        }
        const anahtar = `${d.ad}\0${i + 1}\0${p.ad}`;
        if (goruldu.has(anahtar)) continue;
        goruldu.add(anahtar);
        bulunan.push({ dosya: d.ad, satir: i + 1, desen: p.ad });
      }
    });
  }
  return bulunan;
}

const METIN_UZANTILARI = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.txt', '.md', '.svg', '.xml', '.csv', '.webmanifest']);
const TARAMA_BOYUT_SINIRI = 2 * 1024 * 1024;

/** --sun dizinindeki metin dosyalarını (sembolik bağlantıları atlayarak) toplar. */
function sunMetinDosyalari(kok) {
  const sonuc = [];
  const gez = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.isSymbolicLink()) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { gez(p); continue; }
      if (!e.isFile() || !METIN_UZANTILARI.has(path.extname(e.name).toLowerCase())) continue;
      if (statSync(p).size > TARAMA_BOYUT_SINIRI) continue;
      sonuc.push({ ad: path.relative(kok, p).split(path.sep).join('/'), metin: readFileSync(p, 'utf8') });
    }
  };
  gez(kok);
  return sonuc;
}

function ozelDesenleriOku(dosya) {
  if (!existsSync(dosya)) throw new KullanimHatasi(`--yasak-desen dosyası bulunamadı: ${dosya}`);
  const desenler = [];
  readFileSync(dosya, 'utf8').split(/\r?\n/).forEach((satir, i) => {
    const s = satir.trim();
    if (!s || s.startsWith('#')) return;
    try {
      desenler.push({ ad: `ozel:${i + 1}`, re: new RegExp(s, 'u') });
    } catch {
      throw new KullanimHatasi(`--yasak-desen ${i + 1}. satır geçerli bir düzenli ifade değil`);
    }
  });
  return desenler;
}

// ---------------------------------------------------------------------------------------------
// Salt-okunur statik sunucu (--sun)
// ---------------------------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
};

function icinde(kokGercek, hedefGercek) {
  const k = process.platform === 'win32' ? kokGercek.toLowerCase() : kokGercek;
  const h = process.platform === 'win32' ? hedefGercek.toLowerCase() : hedefGercek;
  return h === k || h.startsWith(k.endsWith(path.sep) ? k : k + path.sep);
}

/** Dizini 127.0.0.1'de rastgele portta SALT-OKUNUR sunar. Dizin dışına çıkış engellidir. */
export function statikSunucuBaslat(dizin) {
  const kokGercek = realpathSync(path.resolve(dizin));
  const baglantilar = new Set();
  const sunucu = createServer((req, res) => {
    const hata = (kod, ek = {}) => {
      res.writeHead(kod, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...ek });
      res.end(`${kod}\n`);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return hata(405, { Allow: 'GET, HEAD' });
    let ham = (req.url || '/').split('#')[0].split('?')[0];
    let cozulmus;
    try { cozulmus = decodeURIComponent(ham); } catch { return hata(400); }
    if (cozulmus.includes('\0')) return hata(400);
    const parcalar = cozulmus.split(/[\\/]+/).filter((s) => s !== '' && s !== '.');
    // `..` (düz ya da kaçış kodlu) ve Windows sürücü/akış ayracı (:) dizin dışına çıkış sayılır.
    if (parcalar.some((s) => s === '..' || s.includes(':'))) return hata(403);
    let hedef = path.join(kokGercek, ...parcalar);
    let gercek;
    try { gercek = realpathSync(hedef); } catch { return hata(404); }
    if (!icinde(kokGercek, gercek)) return hata(403); // sembolik bağlantıyla kaçış
    try {
      if (statSync(gercek).isDirectory()) {
        gercek = realpathSync(path.join(gercek, 'index.html'));
        if (!icinde(kokGercek, gercek)) return hata(403);
      }
      if (!statSync(gercek).isFile()) return hata(404);
    } catch { return hata(404); }
    const govde = readFileSync(gercek);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(gercek).toLowerCase()] || 'application/octet-stream',
      'Content-Length': govde.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : govde);
  });
  sunucu.on('connection', (s) => { baglantilar.add(s); s.on('close', () => baglantilar.delete(s)); });
  return new Promise((resolve, reject) => {
    sunucu.once('error', reject);
    sunucu.listen(0, '127.0.0.1', () => {
      const { port, address } = sunucu.address();
      resolve({
        port,
        adres: address,
        kapat: () => new Promise((r) => {
          sunucu.close(() => r());
          for (const s of baglantilar) s.destroy();
        }),
      });
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Tarayıcı bulma (capture-page.mjs ile aynı arama sırası)
// ---------------------------------------------------------------------------------------------

export function tarayiciBul(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  if (process.env.CAPTURE_BROWSER) {
    return existsSync(process.env.CAPTURE_BROWSER) ? process.env.CAPTURE_BROWSER : null;
  }
  const adaylar = [];
  if (process.platform === 'win32') {
    const pf86 = process.env['ProgramFiles(x86)'];
    const pf = process.env['ProgramFiles'];
    const localAppData = process.env['LOCALAPPDATA'];
    if (pf86) adaylar.push(path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    if (pf) adaylar.push(path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    if (pf) adaylar.push(path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (pf86) adaylar.push(path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (localAppData) adaylar.push(path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  } else if (process.platform === 'darwin') {
    adaylar.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    adaylar.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    adaylar.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge');
  }
  return adaylar.find((c) => existsSync(c)) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Eşleşme yardımcıları (saf işlevler)
// ---------------------------------------------------------------------------------------------

/**
 * Eşleşme için Türkçe-bilinçli normalleştirme: Unicode NFC, boşluk sadeleştirme, tr küçültme
 * ("KATIL" → "katıl", "TERİM" → "terim"). Sayfa içinde de çalışır (toString ile gönderilir): DIŞ BAŞVURU İÇERMEZ.
 */
export function trEsle(s) {
  return String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
}

/** Senaryodaki rolü CDP erişilebilirlik rol adına çevirir (img → image); küçük harfe indirir. */
export function rolCoz(rol) {
  const r = String(rol ?? '').trim().toLowerCase();
  return ROL_TAKMA[r] ?? r;
}

// Yalnız sıralama için: aksan ve ı/i farkını yok sayan ASCII benzeri biçim ("Katilim" ≈ "katıl").
const sadelestir = (k) => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i');

function duzenlemeUzakligi(a, b) {
  if (a === b) return 0;
  let onceki = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const simdiki = [i];
    for (let j = 1; j <= b.length; j++) {
      simdiki[j] = Math.min(onceki[j] + 1, simdiki[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    onceki = simdiki;
  }
  return onceki[b.length];
}

/** Aranan ada en yakın en çok `enCok` aday adı döndürür (yinelenenler Türkçe-bilinçli tekilleştirilir). */
export function enYakinAdaylar(aranan, adaylar, enCok = 5) {
  const a = sadelestir(trEsle(aranan)).slice(0, 80);
  const goruldu = new Set();
  const puanli = [];
  for (const ham of adaylar) {
    const ad = String(ham ?? '').replace(/\s+/g, ' ').trim();
    const anahtar = trEsle(ad);
    if (!anahtar || goruldu.has(anahtar)) continue;
    goruldu.add(anahtar);
    const k = sadelestir(anahtar).slice(0, 80);
    const icerir = k.length >= 2 && a.length >= 2 && (k.includes(a) || a.includes(k));
    const uzaklik = icerir ? Math.abs(k.length - a.length) / 2 : duzenlemeUzakligi(a, k);
    puanli.push({ ad: ad.length > 50 ? `${ad.slice(0, 50)}…` : ad, uzaklik, sira: puanli.length });
  }
  return puanli.sort((x, y) => x.uzaklik - y.uzaklik || x.sira - y.sira).slice(0, enCok).map((x) => x.ad);
}

/** Hedef URL, mevcut belgeden yalnız #parça ile ayrılıyorsa (ve hedefte parça varsa) aynı belge gezinmesidir. */
export function yalnizParcaFarki(mevcut, hedef) {
  try {
    const a = new URL(mevcut);
    const b = new URL(hedef);
    return b.href.includes('#') && a.href.split('#')[0] === b.href.split('#')[0];
  } catch {
    return false;
  }
}

/**
 * Raporda aynı (tür, şiddet, senaryo, ölçüm) bulgularını tek satıra toplar (hücre×tema tekrarını önler).
 * `sonuc.json` ayrıntılı kalır; yalnız rapor gruplanır. Sıra ilk görülene göre korunur.
 */
export function bulgulariGrupla(bulgular) {
  const harita = new Map();
  for (const b of bulgular) {
    const anahtar = [b.tur, b.siddet, b.senaryo, JSON.stringify(b.olcum)].join('\0');
    let g = harita.get(anahtar);
    if (!g) {
      g = { ids: [], tur: b.tur, siddet: b.siddet, senaryo: b.senaryo, hucreler: [], olcum: b.olcum, mesaj: b.mesaj, kare: b.kare };
      harita.set(anahtar, g);
    }
    g.ids.push(b.id);
    if (!g.hucreler.includes(b.hucre)) g.hucreler.push(b.hucre);
  }
  return [...harita.values()];
}

// ---------------------------------------------------------------------------------------------
// Argüman ve senaryo doğrulama
// ---------------------------------------------------------------------------------------------

class KullanimHatasi extends Error {}

const VARSAYILAN_MATRIS = '390x844,768x1024,1280x800';
const VARSAYILAN_TEMA = 'acik,koyu';

function degerAl(argv, i, bayrak) {
  if (i >= argv.length) throw new KullanimHatasi(`${bayrak} bir değer bekliyor`);
  return argv[i];
}

function pozitifTamsayi(ham, bayrak, enAz = 1, enCok = Infinity) {
  const n = Number(ham);
  if (!Number.isInteger(n) || n < enAz || n > enCok) throw new KullanimHatasi(`${bayrak} geçerli bir tamsayı olmalı: ${ham}`);
  return n;
}

export function matrisAyristir(ham) {
  const hucreler = ham.split(',').map((s) => s.trim()).filter(Boolean);
  if (hucreler.length === 0) throw new KullanimHatasi(`--matris boş olamaz: ${ham}`);
  return hucreler.map((h) => {
    const m = /^(\d{2,5})x(\d{2,5})$/.exec(h);
    if (!m) throw new KullanimHatasi(`--matris <GENİŞLİKxYÜKSEKLİK,...> biçiminde olmalı: ${h}`);
    return { genislik: Number(m[1]), yukseklik: Number(m[2]) };
  });
}

export function temaAyristir(ham) {
  const temalar = ham.split(',').map((s) => s.trim()).filter(Boolean);
  if (temalar.length === 0 || temalar.some((t) => t !== 'acik' && t !== 'koyu')) {
    throw new KullanimHatasi(`--tema yalnız acik ve/veya koyu olabilir: ${ham}`);
  }
  return [...new Set(temalar)];
}

export function hareketAyristir(ham) {
  if (ham !== 'azalt' && ham !== 'serbest') throw new KullanimHatasi(`--hareket yalnız azalt (varsayılan) ya da serbest olabilir: ${ham}`);
  return ham;
}

function argumanAyristir(argv) {
  const a = {
    senaryo: null, url: null, sun: null, out: null, matris: VARSAYILAN_MATRIS, tema: VARSAYILAN_TEMA, hareket: 'azalt',
    tekrar: 1, setup: null, beklenti: null, yasakDesen: null, raporSablon: null,
    timeoutMs: 180000, browser: null, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help': case '-h': a.help = true; break;
      case '--senaryo': a.senaryo = degerAl(argv, ++i, arg); break;
      case '--url': a.url = degerAl(argv, ++i, arg); break;
      case '--sun': a.sun = degerAl(argv, ++i, arg); break;
      case '--out': a.out = degerAl(argv, ++i, arg); break;
      case '--matris': a.matris = degerAl(argv, ++i, arg); break;
      case '--tema': a.tema = degerAl(argv, ++i, arg); break;
      case '--hareket': a.hareket = hareketAyristir(degerAl(argv, ++i, arg)); break;
      case '--tekrar': a.tekrar = pozitifTamsayi(degerAl(argv, ++i, arg), arg, 1, 5); break;
      case '--setup': a.setup = degerAl(argv, ++i, arg); break;
      case '--beklenti': a.beklenti = degerAl(argv, ++i, arg); break;
      case '--yasak-desen': a.yasakDesen = degerAl(argv, ++i, arg); break;
      case '--rapor-sablon': a.raporSablon = degerAl(argv, ++i, arg); break;
      case '--timeout-ms': a.timeoutMs = pozitifTamsayi(degerAl(argv, ++i, arg), arg); break;
      case '--browser': a.browser = degerAl(argv, ++i, arg); break;
      default: throw new KullanimHatasi(`Bilinmeyen parametre: ${arg}`);
    }
  }
  return a;
}

const ADIM_ALANLARI = {
  goto: ['url'],
  click: ['role', 'name', 'metin'],
  kaydir: ['role', 'name', 'metin'],
  fill: ['role', 'name', 'metin', 'deger'],
  press: ['tus'],
  waitFor: ['role', 'name', 'metin', 'kaybolur', 'zamanAsimiMs'],
  assertText: ['metin', 'yok'],
  assertVisible: ['role', 'name', 'metin'],
  screenshot: ['ad'],
};
const ORTAK_ALANLAR = ['adim', 'beklenti', 'not'];
export const TUSLAR = ['Enter', 'Tab', 'Escape', 'Space', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Senaryo JSON'unu doğrular; geçersizse KullanimHatasi fırlatır. Tarayıcı AÇILMADAN çağrılır. */
export function senaryoDogrula(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new KullanimHatasi('senaryo bir JSON nesnesi olmalı');
  if (typeof s.ad !== 'string' || !s.ad.trim()) throw new KullanimHatasi('senaryo "ad" (metin) içermeli');
  if (!Array.isArray(s.adimlar) || s.adimlar.length === 0) throw new KullanimHatasi('senaryo en az bir adım içermeli ("adimlar" dizisi)');
  s.adimlar.forEach((st, i) => {
    const no = i + 1;
    if (!st || typeof st !== 'object' || Array.isArray(st)) throw new KullanimHatasi(`adım ${no}: nesne olmalı`);
    const tur = st.adim;
    if (!ADIM_ALANLARI[tur]) {
      throw new KullanimHatasi(`adım ${no}: bilinmeyen adım türü "${String(tur)}" ("adim" alanı: ${Object.keys(ADIM_ALANLARI).join('|')})`);
    }
    const izinli = new Set([...ORTAK_ALANLAR, ...ADIM_ALANLARI[tur]]);
    for (const k of Object.keys(st)) {
      if (!izinli.has(k)) {
        const css = ['css', 'selector', 'secici', 'xpath', 'sinif', 'class', 'id'].includes(k.toLowerCase());
        throw new KullanimHatasi(
          `adım ${no} (${tur}): "${k}" alanı geçersiz` + (css ? ' — CSS/XPath/sınıf hedefi YASAK; erişilebilirlik role+name ya da görünür metin kullanın' : ''),
        );
      }
    }
    if (i === 0 && tur !== 'goto') throw new KullanimHatasi('ilk adım "goto" olmalı');
    const hedefli = ['click', 'kaydir', 'fill', 'assertVisible', 'waitFor'].includes(tur);
    if (hedefli) {
      const roleVar = typeof st.role === 'string' && st.role.trim() !== '';
      const metinVar = typeof st.metin === 'string' && st.metin.trim() !== '';
      if (roleVar === metinVar) {
        throw new KullanimHatasi(`adım ${no} (${tur}): hedef role+name ya da görünür metin olmalı (ikisi birden/hiçbiri olmaz)`);
      }
      if (st.name !== undefined && (typeof st.name !== 'string' || !roleVar)) {
        throw new KullanimHatasi(`adım ${no} (${tur}): "name" yalnız "role" ile birlikte, metin olarak verilir`);
      }
    }
    if (tur === 'goto') {
      if (typeof st.url !== 'string' || !st.url) throw new KullanimHatasi(`adım ${no} (goto): "url" gerekli`);
      let cozulen;
      try { cozulen = new URL(st.url, 'http://127.0.0.1:1/').href; } catch { throw new KullanimHatasi(`adım ${no} (goto): geçersiz url`); }
      if (!urlBekcisi(cozulen)) {
        throw new KullanimHatasi(`adım ${no} (goto): url yalnız 127.0.0.1 üzerinde olabilir (http://127.0.0.1:PORT/...); göreli yol kullanın`);
      }
    }
    if (tur === 'fill' && typeof st.deger !== 'string') throw new KullanimHatasi(`adım ${no} (fill): "deger" (metin) gerekli`);
    if (tur === 'press' && !TUSLAR.includes(st.tus)) throw new KullanimHatasi(`adım ${no} (press): "tus" şunlardan biri olmalı: ${TUSLAR.join(', ')}`);
    if ((tur === 'assertText') && (typeof st.metin !== 'string' || !st.metin)) throw new KullanimHatasi(`adım ${no} (assertText): "metin" gerekli`);
    if (tur === 'screenshot' && !(typeof st.ad === 'string' && /^[\p{L}\p{N}_-]+$/u.test(st.ad))) {
      throw new KullanimHatasi(`adım ${no} (screenshot): "ad" yalnız harf, rakam, _ ve - içerebilir`);
    }
    if (st.zamanAsimiMs !== undefined && !(Number.isInteger(st.zamanAsimiMs) && st.zamanAsimiMs > 0)) {
      throw new KullanimHatasi(`adım ${no} (waitFor): "zamanAsimiMs" pozitif tamsayı olmalı`);
    }
  });
  return s;
}

/** beklenti.json biçimini ve adımlardaki `beklenti` kimliklerini doğrular (tarayıcı açılmadan). */
export function beklentiDogrula(b, sen) {
  const kullanilan = sen.adimlar.map((st) => st.beklenti).filter((x) => x !== undefined);
  if (!b) {
    if (kullanilan.length) throw new KullanimHatasi(`adımlar beklenti kimliği kullanıyor (${kullanilan[0]}) ama --beklenti dosyası verilmedi`);
    return null;
  }
  if (typeof b !== 'object' || !Array.isArray(b.beklentiler) || b.beklentiler.length === 0) {
    throw new KullanimHatasi('beklenti dosyası {"beklentiler":[{"id":"B1","metin":"..."}]} biçiminde olmalı');
  }
  const idler = new Set();
  for (const x of b.beklentiler) {
    if (!x || typeof x.id !== 'string' || !x.id || typeof x.metin !== 'string' || !x.metin.trim()) {
      throw new KullanimHatasi('her beklenti "id" ve "metin" içermeli');
    }
    if (idler.has(x.id)) throw new KullanimHatasi(`beklenti kimliği tekrarlanıyor: ${x.id}`);
    idler.add(x.id);
  }
  if (b.senaryo !== undefined && b.senaryo !== sen.ad) {
    throw new KullanimHatasi(`beklenti dosyasının senaryo adı ("${b.senaryo}") senaryonun adıyla ("${sen.ad}") uyuşmuyor`);
  }
  for (const k of kullanilan) {
    if (!idler.has(k)) throw new KullanimHatasi(`adım bilinmeyen beklenti kimliğine başvuruyor: ${k}`);
  }
  return b;
}

function jsonOku(dosya, etiket) {
  if (!existsSync(dosya)) throw new KullanimHatasi(`${etiket} bulunamadı: ${dosya}`);
  try {
    return JSON.parse(readFileSync(dosya, 'utf8'));
  } catch (err) {
    throw new KullanimHatasi(`${etiket} geçerli JSON değil (${path.basename(dosya)}): ${err.message}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Süreç hijyeni (capture-page.mjs ile aynı yöntem; bkz. oradaki ayrıntılı gerekçeler)
// ---------------------------------------------------------------------------------------------
// Tarayıcı kendini erken evrede yeniden başlatabildiğinden spawn PID'ine GÜVENİLMEZ: bu çalıştırmaya
// özgü, mkdtempSync ile rastgele üretilmiş profil dizinini komut satırında taşıyan TÜM süreçler
// (PID zincirinden bağımsız) taranıp kapatılır. Sorguyu çalıştıran powershell kendini dışlar
// ($PID) ve joker karakter sorunu olmasın diye -like yerine .Contains() kullanılır.

function buildProfileDirFilter(profileDir) {
  const escaped = profileDir.replace(/'/g, "''");
  return `$_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains('${escaped}')`;
}

export function killByProfileDir(profileDir) {
  if (process.platform === 'win32') {
    const cmd =
      `Get-CimInstance Win32_Process | Where-Object { ${buildProfileDirFilter(profileDir)} } | ` +
      'ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }';
    try { return spawnSync('powershell', ['-NoProfile', '-Command', cmd], { stdio: 'ignore' }); } catch (err) { return { error: err }; }
  }
  try { return spawnSync('pkill', ['-9', '-f', profileDir], { stdio: 'ignore' }); } catch (err) { return { error: err }; }
}

// Yalnız SAYAR. Başarısızsa -1 ("bilinmiyor") döner; çağıran bunu 0 SAYMAZ.
function countByProfileDir(profileDir) {
  if (process.platform === 'win32') {
    const cmd = `(Get-CimInstance Win32_Process | Where-Object { ${buildProfileDirFilter(profileDir)} } | Measure-Object).Count`;
    try {
      const res = spawnSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
      const n = parseInt((res.stdout || '').trim(), 10);
      return Number.isFinite(n) ? n : -1;
    } catch { return -1; }
  }
  try {
    const res = spawnSync('pgrep', ['-f', profileDir], { encoding: 'utf8' });
    if (res.error) return -1;
    return (res.stdout || '').split('\n').filter((l) => l.trim().length > 0).length;
  } catch { return -1; }
}

/**
 * Tarayıcı komut satırı. Savunma derinliği (CDP Fetch bekçisi yalnız ana sayfa hedefini görür):
 *  - --block-new-web-contents: window.open / target=_blank ile yeni hedef açılmaz;
 *  - --proxy-server=127.0.0.1:<ölü port>: loopback proxy'den muaf kalır (sınama çalışır), diğer her trafik
 *    ölü proxy'ye düşüp ölür. Son öğe başlangıç sayfasıdır (about:blank).
 */
export function tarayiciBayraklari(profileDir, { proxyPort = 1 } = {}) {
  return [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check',
    '--block-new-web-contents', `--proxy-server=127.0.0.1:${proxyPort}`,
    // Chromium'un örtük bypass'ı loopback'e ek olarak link-local (169.254/16, fe80::/10) ve localhost/*.localhost
    // adlarını da proxy'siz çıkarır; <-loopback> bunu kaldırır, yalnız 127.0.0.1 muaf kalır.
    '--proxy-bypass-list=<-loopback>;127.0.0.1',
    'about:blank',
  ];
}

function spawnBrowser(browserPath, profileDir) {
  return spawn(browserPath, tarayiciBayraklari(profileDir), { stdio: 'ignore' });
}

function waitForExit(child, ms) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve(true);
    const timer = setTimeout(() => resolve(false), ms);
    child.once('exit', () => { clearTimeout(timer); resolve(true); });
  });
}

// Windows'ta süreç ağacı kapansa bile dosya kilitleri (EPERM) gecikebilir: rmSync geniş bir toplam bütçe içinde tekrarlanır.
async function removeProfileDir(profileDir, totalBudgetMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < totalBudgetMs) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      return;
    } catch { await sleep(500); }
  }
  try { rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
}

// Tüm çıkış yollarının (başarı, hata, iç zaman aşımı, SIGINT/SIGTERM) aynı temizliğe uğradığı tek nokta. İdempotent.
async function cleanupResources(state) {
  if (!state || state.done) return;
  state.done = true;
  if (state.ws) { try { state.ws.close(); } catch {} }
  if (state.sunucu) { try { await state.sunucu.kapat(); } catch {} }
  if (state.child) await waitForExit(state.child, 1000);
  const TUR = 3;
  for (let i = 0; i < TUR; i++) {
    if (countByProfileDir(state.profileDir) === 0) break;
    killByProfileDir(state.profileDir);
    if (i < TUR - 1) await sleep(300);
  }
  await removeProfileDir(state.profileDir);
}

let activeState = null;
let signalHandlersInstalled = false;
function installSignalHandlers() {
  if (signalHandlersInstalled) return;
  signalHandlersInstalled = true;
  const onSignal = (signal) => {
    console.error(`Hata: ${signal} alındı, temizleniyor...`);
    cleanupResources(activeState).finally(() => process.exit(3));
  };
  // Windows'ta dışarıdan TerminateProcess ile öldürülürse bu işleyiciler ÇALIŞMAZ: --timeout-ms'i
  // çağıranın kendi dış zaman aşımından belirgin biçimde KISA tut.
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));
}

async function waitForDevToolsActivePort(profileDir, timeoutMs) {
  const file = path.join(profileDir, 'DevToolsActivePort');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(file)) {
      const port = parseInt(readFileSync(file, 'utf8').trim().split('\n')[0], 10);
      if (Number.isInteger(port) && port > 0) return port;
    }
    await sleep(50);
  }
  throw new Error('DevToolsActivePort dosyası zaman aşımına uğradı (tarayıcı başlamamış olabilir)');
}

async function waitForPageTarget(port, timeoutMs) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const target = (await res.json()).find((t) => t.type === 'page');
        if (target) return target;
      }
    } catch (err) { lastErr = err; }
    await sleep(50);
  }
  throw new Error(`CDP page hedefi bulunamadı (timeout): ${lastErr ?? ''}`);
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function describeException(d) {
  return d?.exception?.description || d?.text || JSON.stringify(d);
}

class CdpClient {
  // getRemainingMs: run()'ın TEK global deadline'ına göre KALAN süre (her çağrıda yeniden hesaplanır).
  constructor(ws, getRemainingMs) {
    this.ws = ws;
    this.getRemainingMs = getRemainingMs;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = [];
    this.dinleyiciler = [];
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
      } else if (msg.method) {
        for (const d of this.dinleyiciler) {
          if (d.method === msg.method) { try { d.fn(msg.params); } catch {} }
        }
        this.eventWaiters = this.eventWaiters.filter((w) => {
          if (w.method === msg.method) { w.resolve(msg.params); return false; }
          return true;
        });
      }
    });
  }

  /** Kalıcı olay dinleyicisi. */
  on(method, fn) { this.dinleyiciler.push({ method, fn }); }

  send(method, params = {}) {
    const id = this.nextId++;
    const ms = this.getRemainingMs();
    if (ms <= 0) return Promise.reject(new Error(`${method}: toplam süre sınırı aşıldı`));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} zaman aşımına uğradı`)); }, ms);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs) {
    const ms = timeoutMs ?? this.getRemainingMs();
    if (ms <= 0) {
      const rejected = Promise.reject(new Error(`${method}: toplam süre sınırı aşıldı`));
      rejected.cancel = () => {};
      return rejected;
    }
    let entry;
    let timer;
    const promise = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        this.eventWaiters = this.eventWaiters.filter((w) => w !== entry);
        reject(new Error(`${method} eventi zaman aşımına uğradı`));
      }, ms);
      entry = { method, resolve: (p) => { clearTimeout(timer); resolve(p); } };
      this.eventWaiters.push(entry);
    });
    promise.cancel = () => { clearTimeout(timer); this.eventWaiters = this.eventWaiters.filter((w) => w !== entry); };
    return promise;
  }
}

// ---------------------------------------------------------------------------------------------
// Sayfa içi betikler (Node tarafında tanımlanır, toString() ile sayfaya gönderilir)
// ---------------------------------------------------------------------------------------------

// Otomatik denetimlerin DOM ölçümleri. Yalnız OKUR; sayfayı değiştirmez.
function sayfaOlcumu() {
  const gorunur = (el) => {
    const r = el.getClientRects();
    if (!r.length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) !== 0;
  };
  const tanim = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return t ? `${s} "${t}"` : s;
  };
  const de = document.documentElement;
  const sonuc = {};
  sonuc.tasma = { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth: window.innerWidth, tasanlar: [] };
  if (de.scrollWidth > de.clientWidth + 1) {
    for (const el of document.body.querySelectorAll('*')) {
      if (!gorunur(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1) {
        sonuc.tasma.tasanlar.push(`${tanim(el)} (sağ=${Math.round(r.right)})`);
        if (sonuc.tasma.tasanlar.length >= 3) break;
      }
    }
  }
  sonuc.altsiz = [...document.querySelectorAll('img:not([alt])')].filter(gorunur)
    .map((el) => `${tanim(el)} src=${(el.getAttribute('src') || '').slice(0, 30)}`);
  const basliklar = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(gorunur).map((el) => ({
    seviye: /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : Number(el.getAttribute('aria-level') || 2),
    oge: tanim(el),
  }));
  sonuc.baslikAtlamalari = [];
  let onceki = null;
  for (const b of basliklar) {
    if (onceki !== null && b.seviye > onceki + 1) sonuc.baslikAtlamalari.push({ kimden: onceki, kime: b.seviye, oge: b.oge });
    onceki = b.seviye;
  }
  sonuc.kucukYazi = [];
  const yuru = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gorulen = new Set();
  while (yuru.nextNode()) {
    const tn = yuru.currentNode;
    if (!tn.nodeValue.trim()) continue;
    const el = tn.parentElement;
    if (!el || gorulen.has(el)) continue;
    gorulen.add(el);
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !gorunur(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 12) sonuc.kucukYazi.push({ oge: tanim(el), px });
  }
  sonuc.dokunma = [];
  sonuc.dokunmaDenetlenen = null; // yalnız ≤480 px genişlikte denetlenir; diğerinde null ("denetlenmedi")
  if (window.innerWidth <= 480) {
    sonuc.dokunmaDenetlenen = 0;
    const adaylar = document.querySelectorAll(
      'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=tab],[role=menuitem],[tabindex]:not([tabindex="-1"])',
    );
    for (const el of adaylar) {
      if (!gorunur(el) || el.disabled) continue;
      sonuc.dokunmaDenetlenen++;
      const r = el.getBoundingClientRect();
      if (r.width >= 44 && r.height >= 44) continue;
      // Metin akışı içindeki satır içi bağlantılar dokunmatik hedef kuralından muaftır.
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') {
        const metinli = (n) => n && n.nodeType === 3 && n.nodeValue.trim();
        if (metinli(el.previousSibling) || metinli(el.nextSibling)) continue;
      }
      // Etiketi yeterince büyük onay kutusu/radyo düğmesi.
      if ((el.type === 'checkbox' || el.type === 'radio') && el.labels
        && [...el.labels].some((l) => { const q = l.getBoundingClientRect(); return q.width >= 44 && q.height >= 44; })) continue;
      sonuc.dokunma.push({ oge: tanim(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  sonuc.hucre = {
    renkSemasiKoyu: matchMedia('(prefers-color-scheme: dark)').matches,
    azaltilmisHareket: matchMedia('(prefers-reduced-motion: reduce)').matches,
    kaydirmaY: Math.round(window.scrollY),
    dil: navigator.language,
    dateNow: Date.now(),
    baslik: document.title,
  };
  return sonuc;
}

// Tab gezintisi için hazırlık: odaklanabilir öğelerin ODAKSIZ stil imzasını kaydeder, odağı belgenin başına alır.
function odakHazirla() {
  const gorunur = (el) => {
    const r = el.getClientRects();
    if (!r.length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const tanim = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const t = (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return t ? `${s} "${t}"` : s;
  };
  const imza = (el) => {
    const cs = getComputedStyle(el);
    return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.borderTopColor, cs.borderBottomColor,
      cs.backgroundColor, cs.color, cs.textDecorationLine, cs.textDecorationColor, cs.transform, cs.filter].join('|');
  };
  const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"]),[contenteditable=true]';
  const liste = [...document.querySelectorAll(sel)].filter((el) => !el.disabled && gorunur(el));
  const temel = new Map(liste.map((el) => [el, imza(el)]));
  const onceki = document.activeElement;
  const kaydirma = [window.scrollX, window.scrollY];
  window.__uxSinama = {
    liste,
    olc() {
      const el = document.activeElement;
      const sira = liste.indexOf(el);
      if (sira < 0) return { sira: -1 };
      const cs = getComputedStyle(el);
      const halka = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      return { sira, oge: tanim(el), odakGorunur: halka || imza(el) !== temel.get(el) };
    },
    geriYukle() {
      if (onceki && onceki !== document.body && onceki.focus) onceki.focus({ preventScroll: true });
      else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo(kaydirma[0], kaydirma[1]);
    },
  };
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  document.body.setAttribute('tabindex', '-1');
  document.body.focus({ preventScroll: true });
  document.body.removeAttribute('tabindex');
  window.scrollTo(0, 0);
  return { adet: liste.length };
}

// Metin hedefi: görünür metni içeren EN DERİN öğe (tam eşleşme önceliklidir). Öğenin kendisini döndürür.
// `n` = trEsle (Türkçe-bilinçli, büyük/küçük harf duyarsız); çağıran trEsle.toString() ile geçirir.
function metinHedefi(metin, n) {
  const aranan = n(metin);
  let en = null;
  let enTam = false;
  let enUzunluk = Infinity;
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    const r = el.getClientRects();
    if (!r.length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const t = n(el.innerText || el.value || el.getAttribute('aria-label') || '');
    if (!t.includes(aranan)) continue;
    const tam = t === aranan;
    if ((tam && !enTam) || (tam === enTam && t.length < enUzunluk)) { en = el; enTam = tam; enUzunluk = t.length; }
  }
  return en;
}

// Bulunamayan metin hedefi için aday adlar: görünür, kısa metinli en derin öğelerin metni (en çok 300).
function metinAdaylari() {
  const sonuc = [];
  const goruldu = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 60 || goruldu.has(t)) continue;
    goruldu.add(t);
    sonuc.push(t);
    if (sonuc.length >= 300) break;
  }
  return sonuc;
}

// kaydir adımı: hedefi görünüme getirir (anında; yumuşak kaydırma kareyi kararsız yapmasın). this = öğe.
function kaydirHedefe() {
  const el = this.tagName === 'LABEL' && this.control ? this.control : this;
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  return Math.round(window.scrollY);
}

// Hedef öğeyi görünüme getirip tıklanacak noktayı ve örtülü olup olmadığını döndürür (this = öğe).
function tikKonumu() {
  const el = this.tagName === 'LABEL' && this.control ? this.control : this;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const ust = document.elementFromPoint(x, y);
  const ortulu = !(ust && (ust === el || el.contains(ust) || ust.contains(el)));
  const cs = getComputedStyle(el);
  return { x, y, w: r.width, h: r.height, ortulu, gorunur: el.getClientRects().length > 0 && cs.visibility !== 'hidden' };
}

function odakla() {
  const el = this.tagName === 'LABEL' && this.control ? this.control : this;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  if (typeof el.select === 'function') el.select();
  else if (el.isContentEditable) document.execCommand('selectAll');
  return el.tagName;
}

function gorunurMu() {
  const cs = getComputedStyle(this);
  return this.getClientRects().length > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
}

function tanimla() {
  let s = this.tagName.toLowerCase();
  if (this.id) s += `#${this.id}`;
  const t = (this.getAttribute('aria-label') || this.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  return t ? `${s} "${t}"` : s;
}

// ---------------------------------------------------------------------------------------------
// Koşucu
// ---------------------------------------------------------------------------------------------

class AdimHatasi extends Error {}

const SIDDET = {
  'adim-basarisiz': 'ENGELLEYİCİ',
  'dis-istek': 'ENGELLEYİCİ',
  'konsol-hatasi': 'ÖNEMLİ',
  istisna: 'ÖNEMLİ',
  'ag-hatasi': 'ÖNEMLİ',
  'yatay-tasma': 'ÖNEMLİ',
  'adsiz-oge': 'ÖNEMLİ',
  'alt-eksik': 'ÖNEMLİ',
  'odak-yok': 'ÖNEMLİ',
  'beklenti-kanitsiz': 'ÖNEMLİ',
  'baslik-atlama': 'KÜÇÜK',
  'dokunma-hedefi': 'KÜÇÜK',
  'kucuk-yazi': 'KÜÇÜK',
};
const SIDDET_SIRA = ['ENGELLEYİCİ', 'ÖNEMLİ', 'KÜÇÜK'];

const ETKILESIMLI_ROLLER = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab',
]);

const TUS_HARITASI = {
  Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  Tab: { key: 'Tab', code: 'Tab', vk: 9 },
  Escape: { key: 'Escape', code: 'Escape', vk: 27 },
  Space: { key: ' ', code: 'Space', vk: 32, text: ' ' },
  Backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', vk: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', vk: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
};

function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'adsiz';
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const kisalt = (s, n = 160) => { const t = norm(s); return t.length > n ? `${t.slice(0, n)}…` : t; };
const izinliIstek = (url) => urlBekcisi(url) || url.startsWith('data:') || url.startsWith('blob:') || url === 'about:blank';
function yolMetni(url) { try { const u = new URL(url); return u.pathname; } catch { return kisalt(url, 60); } }
function hostMetni(url) { try { return new URL(url).host || url.split(':')[0]; } catch { return kisalt(url, 40); } }

async function degerlendir(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  if (r.exceptionDetails) throw new Error(`sayfa betiği hatası: ${describeException(r.exceptionDetails)}`);
  return r.result.value;
}

async function nesneyeCagir(cdp, objectId, fn) {
  const r = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: fn.toString(), returnByValue: true });
  if (r.exceptionDetails) throw new Error(`sayfa betiği hatası: ${describeException(r.exceptionDetails)}`);
  return r.result.value;
}

function hedefAciklama(st) {
  if (st.role) return st.name !== undefined ? `role=${st.role} name="${st.name}"` : `role=${st.role}`;
  return `metin="${st.metin}"`;
}

/** Hedefi bir kez dener: bulunursa görünür öğenin objectId'si, yoksa null. */
async function hedefDene(ctx, st) {
  const cdp = ctx.cdp;
  if (st.role) {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const rol = rolCoz(st.role);
    const ad = st.name !== undefined ? trEsle(st.name) : null;
    for (const n of nodes) {
      if (n.ignored || !n.backendDOMNodeId || String(n.role?.value ?? '').toLowerCase() !== rol) continue;
      if (ad !== null && trEsle(n.name?.value) !== ad) continue;
      let objectId;
      try { objectId = (await cdp.send('DOM.resolveNode', { backendNodeId: n.backendDOMNodeId })).object?.objectId; } catch { continue; }
      if (!objectId) continue;
      if (await nesneyeCagir(cdp, objectId, gorunurMu)) return objectId;
    }
    return null;
  }
  const r = await cdp.send('Runtime.evaluate', { expression: `(${metinHedefi.toString()})(${JSON.stringify(st.metin)}, ${trEsle.toString()})`, returnByValue: false });
  if (r.exceptionDetails) throw new Error(`sayfa betiği hatası: ${describeException(r.exceptionDetails)}`);
  return r.result.subtype === 'node' ? r.result.objectId : null;
}

/**
 * Bulunamayan hedef için hata mesajına eklenir: bilinmeyen rol uyarısı ve sayfadaki en yakın aday adlar.
 * Adaylar çıktıya gireceğinden yasak desen bekçisinden geçirilir (bekçiyi gevşetmez; yalnız aday listesini temizler).
 */
async function yakinAdayEki(ctx, st) {
  const cdp = ctx.cdp;
  let ek = '';
  let adaylar = [];
  let kapsam = '';
  let aranan = st.metin;
  if (st.role) {
    const rol = rolCoz(st.role);
    if (!ROL_LISTESI.includes(rol)) ek += `; "${st.role}" bilinen bir rol değil (geçerli roller: --help)`;
    if (st.name === undefined) return ek;
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const adli = nodes.filter((n) => !n.ignored && n.backendDOMNodeId && norm(n.name?.value) !== '');
    const ayniRol = adli.filter((n) => String(n.role?.value ?? '').toLowerCase() === rol);
    const kaynak = ayniRol.length ? ayniRol : adli.filter((n) => ETKILESIMLI_ROLLER.has(String(n.role?.value ?? '').toLowerCase()));
    kapsam = ayniRol.length ? ` (rol ${rol})` : ' (etkileşimli öğeler)';
    adaylar = kaynak.map((n) => norm(n.name.value));
    aranan = st.name;
  } else {
    const r = await cdp.send('Runtime.evaluate', { expression: `(${metinAdaylari.toString()})()`, returnByValue: true });
    adaylar = Array.isArray(r.result?.value) ? r.result.value : [];
  }
  const temiz = adaylar.filter((ad) => yasakTara({ dosyalar: [{ ad: 'aday', metin: ad }], ozel: ctx.ozel ?? [] }).length === 0);
  const yakin = enYakinAdaylar(aranan, temiz, 5);
  if (yakin.length) ek += `; sayfadaki en yakın adaylar${kapsam}: ${yakin.map((x) => `"${x}"`).join(', ')}`;
  return ek;
}

async function hedefBul(ctx, st, bekleMs) {
  const bitis = Date.now() + bekleMs;
  for (;;) {
    const nesne = await hedefDene(ctx, st);
    if (nesne) return nesne;
    if (Date.now() >= bitis) break;
    ctx.requireTime('hedef bekleme');
    await sleep(50);
  }
  throw new AdimHatasi(`hedef bulunamadı: ${hedefAciklama(st)}${await yakinAdayEki(ctx, st).catch(() => '')}`);
}

async function tusBas(cdp, ad) {
  const t = TUS_HARITASI[ad];
  const ortak = { key: t.key, code: t.code, windowsVirtualKeyCode: t.vk, nativeVirtualKeyCode: t.vk };
  await cdp.send('Input.dispatchKeyEvent', { type: t.text ? 'keyDown' : 'rawKeyDown', ...(t.text ? { text: t.text } : {}), ...ortak });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...ortak });
}

async function govdeMetni(cdp) {
  return norm(await degerlendir(cdp, "document.body ? document.body.innerText : ''"));
}

// Ağ durulana kadar KOŞULLU bekleme (sabit sleep değil): bekleyen istek yok ve son ağ olayından beri sakinMs geçti.
async function sakinBekle(ctx, sakinMs = 150, azamiMs = 4000) {
  const bas = Date.now();
  while (Date.now() - bas < azamiMs) {
    ctx.requireTime('ağ sakinliği');
    if (ctx.bekleyen.size === 0 && Date.now() - ctx.sonAg >= sakinMs) return;
    await sleep(25);
  }
}

async function yuklemeBekle(ctx, url) {
  // Aynı belgede yalnız #parça farkı: tarayıcı yük olayı üretmez (eskiden zaman aşımına düşüp koşuyu çıkış 3 ile
  // bozuyordu); Page.navigatedWithinDocument beklenir. Yük olayı da yedek olarak dinlenir (aynı URL'ye yeniden
  // gitmek bazı sürümlerde yeniden yükleme sayılır); hangisi önce gelirse.
  const mevcut = await degerlendir(ctx.cdp, 'location.href').catch(() => '');
  const olaylar = yalnizParcaFarki(mevcut, url) ? ['Page.navigatedWithinDocument', 'Page.loadEventFired'] : ['Page.loadEventFired'];
  const beklemeler = olaylar.map((o) => { const w = ctx.cdp.waitForEvent(o); w.catch(() => {}); return w; });
  const iptal = () => beklemeler.forEach((w) => w.cancel());
  try {
    const nav = await ctx.cdp.send('Page.navigate', { url });
    if (nav.errorText) throw new AdimHatasi(`gezinme başarısız: ${nav.errorText} (${yolMetni(url)})`);
    await Promise.race(beklemeler);
  } finally {
    iptal();
  }
}

async function kareKaydet(ctx, ad) {
  const shot = await ctx.cdp.send('Page.captureScreenshot', { format: 'png' });
  const dosya = `${slug(ctx.sen.ad)}_${ctx.cur.hucre}_${slug(ad)}.png`;
  mkdirSync(path.join(ctx.out, 'kareler'), { recursive: true });
  const tam = path.join(ctx.out, 'kareler', dosya);
  writeFileSync(tam, Buffer.from(shot.data, 'base64'));
  ctx.yazilanKareler.add(tam); // yalnız BU koşunun yazdıkları; çıktı bekçisi tetiklenirse silinir
  return `kareler/${dosya}`;
}

/**
 * Verilen kare dosyalarını siler (yalnız çağıranın verdiği yollar). Silinemeyenler `kalan`da döner;
 * zaten olmayan (ENOENT) dosya kalan sayılmaz. `sil` yalnız test için değiştirilebilir.
 */
export function kareleriSil(yollar, sil = unlinkSync) {
  const silinen = [];
  const kalan = [];
  for (const y of yollar) {
    try { sil(y); silinen.push(y); } catch (err) { if (err?.code !== 'ENOENT') kalan.push(y); }
  }
  return { silinen, kalan };
}

/** Bulgu ekler; aynı anahtar aynı hücre koşusunda bir kez kaydedilir. */
function bulguEkle(cur, tur, mesaj, olcum, anahtar, kare, siddet) {
  const k = `${tur}|${anahtar}`;
  if (cur.bulgular.has(k)) return;
  cur.bulgular.set(k, { tur, siddet: siddet ?? SIDDET[tur], senaryo: cur.senaryoAd, hucre: cur.hucre, mesaj, olcum, kare: kare ?? null, anahtar: k });
}

async function olaylariIsle(ctx, kare) {
  const cur = ctx.cur;
  const yeni = (liste, anahtar) => { const b = cur.islenen[anahtar]; cur.islenen[anahtar] = liste.length; return liste.slice(b); };
  const konsol = yeni(cur.konsol, 'konsol');
  for (const m of konsol) bulguEkle(cur, 'konsol-hatasi', `Konsol hatası: ${kisalt(m, 100)}`, { sayi: konsol.length, ilk: kisalt(m, 160) }, kisalt(m, 80), kare);
  const ist = yeni(cur.istisna, 'istisna');
  for (const e of ist) bulguEkle(cur, 'istisna', `Yakalanmamış istisna: ${kisalt(e.metin, 100)}`, { sayi: ist.length, ilk: kisalt(e.metin, 160), konum: e.konum }, kisalt(e.metin, 80), kare);
  const ag = yeni(cur.ag, 'ag');
  for (const e of ag) {
    const ayrinti = e.durum ? `HTTP ${e.durum}` : e.hata;
    // Tarayıcının kendiliğinden istediği /favicon.ico 404'ü gürültüdür: bulgu olarak kalır ama KÜÇÜK.
    const favikon = e.durum === 404 && e.yol === '/favicon.ico';
    bulguEkle(cur, 'ag-hatasi', `Ağ hatası: ${ayrinti} ${e.yol}`, { durum: e.durum ?? null, hata: e.hata ?? null, yol: e.yol, kaynakTuru: e.tur ?? null }, `${ayrinti}|${e.yol}`, kare, favikon ? 'KÜÇÜK' : undefined);
  }
  const dis = yeni(cur.dis, 'dis');
  for (const e of dis) bulguEkle(cur, 'dis-istek', `127.0.0.1 dışına istek ENGELLENDİ: ${e.host}`, { host: e.host, sayi: dis.length }, e.host, kare);
}

async function axAdsizOgeler(ctx) {
  const cdp = ctx.cdp;
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const adsiz = [];
  for (const n of nodes) {
    if (n.ignored || !n.backendDOMNodeId) continue;
    const rol = String(n.role?.value ?? '').toLowerCase();
    if (!ETKILESIMLI_ROLLER.has(rol) || norm(n.name?.value) !== '') continue;
    let tanim = rol;
    try {
      const objectId = (await cdp.send('DOM.resolveNode', { backendNodeId: n.backendDOMNodeId })).object?.objectId;
      if (objectId) tanim = await nesneyeCagir(cdp, objectId, tanimla);
    } catch {}
    adsiz.push({ rol, oge: tanim });
  }
  return adsiz;
}

async function odakGezintisi(ctx) {
  const cdp = ctx.cdp;
  await cdp.send('Page.bringToFront').catch(() => {});
  const hazir = await degerlendir(cdp, `(${odakHazirla.toString()})()`);
  if (!hazir || hazir.adet === 0) return { adet: 0, kontrolEdilen: 0, odaksiz: [] };
  const sinir = Math.min(hazir.adet, 40);
  const odaksiz = [];
  const gorulen = new Set();
  try {
    for (let i = 0; i < sinir; i++) {
      await tusBas(cdp, 'Tab');
      const o = await degerlendir(cdp, 'window.__uxSinama.olc()');
      if (!o || o.sira < 0) continue;
      if (gorulen.has(o.sira)) break;
      gorulen.add(o.sira);
      if (!o.odakGorunur) odaksiz.push(o.oge);
    }
  } finally {
    await degerlendir(cdp, 'window.__uxSinama && window.__uxSinama.geriYukle()').catch(() => {});
  }
  return { adet: hazir.adet, kontrolEdilen: gorulen.size, odaksiz };
}

/** Bir kontrol noktası: ağ sakinliği → kare → olay bulguları → DOM / erişilebilirlik / odak denetimleri. */
async function kontrolNoktasi(ctx, kareAdi) {
  const cur = ctx.cur;
  await sakinBekle(ctx);
  const kare = await kareKaydet(ctx, kareAdi);
  cur.kareler.push(kare);
  const hata = (ad, err) => cur.olcumHatalari.push(`${ad}: ${kisalt(err.message, 120)}`);
  await olaylariIsle(ctx, kare);
  let o = null;
  try { o = await degerlendir(ctx.cdp, `(${sayfaOlcumu.toString()})()`); } catch (err) { hata('sayfa-olcumu', err); }
  if (o) {
    cur.olcumler = {
      ...cur.olcumler, ...o.hucre, scrollWidth: o.tasma.scrollWidth, clientWidth: o.tasma.clientWidth, innerWidth: o.tasma.innerWidth,
      dokunmaDenetlenen: o.dokunmaDenetlenen, dokunmaKucuk: o.dokunma.length,
    };
    if (o.tasma.scrollWidth > o.tasma.clientWidth + 1) {
      bulguEkle(cur, 'yatay-tasma', `Yatay taşma: scrollWidth ${o.tasma.scrollWidth} > innerWidth ${o.tasma.innerWidth}`,
        { scrollWidth: o.tasma.scrollWidth, clientWidth: o.tasma.clientWidth, innerWidth: o.tasma.innerWidth, tasanlar: o.tasma.tasanlar }, 'sayfa', kare);
    }
    if (o.altsiz.length) {
      bulguEkle(cur, 'alt-eksik', `alt özniteliği olmayan görsel: ${o.altsiz.length}`, { sayi: o.altsiz.length, ornekler: o.altsiz.slice(0, 3) }, o.altsiz.join(';'), kare);
    }
    if (o.baslikAtlamalari.length) {
      const b = o.baslikAtlamalari[0];
      bulguEkle(cur, 'baslik-atlama', `Başlık hiyerarşisi atlıyor: h${b.kimden} → h${b.kime}`,
        { sayi: o.baslikAtlamalari.length, ilk: b }, o.baslikAtlamalari.map((x) => `${x.kimden}>${x.kime}`).join(';'), kare);
    }
    if (o.kucukYazi.length) {
      const en = Math.min(...o.kucukYazi.map((x) => x.px));
      bulguEkle(cur, 'kucuk-yazi', `12 px altında yazı: ${o.kucukYazi.length} öğe, en küçük ${en} px`,
        { sayi: o.kucukYazi.length, enKucukPx: en, ornekler: o.kucukYazi.slice(0, 3).map((x) => x.oge) }, o.kucukYazi.map((x) => x.oge).join(';'), kare);
    }
    if (o.dokunma.length) {
      const enKucuk = o.dokunma.reduce((m, x) => (Math.min(x.w, x.h) < Math.min(m.w, m.h) ? x : m));
      const siddet = Math.min(enKucuk.w, enKucuk.h) < 24 ? 'ÖNEMLİ' : 'KÜÇÜK';
      bulguEkle(cur, 'dokunma-hedefi', `44 px altında dokunmatik hedef: ${o.dokunma.length} öğe, en küçük ${enKucuk.w}x${enKucuk.h}`,
        { sayi: o.dokunma.length, enKucuk: { w: enKucuk.w, h: enKucuk.h }, ornekler: o.dokunma.slice(0, 3).map((x) => `${x.oge} ${x.w}x${x.h}`) },
        o.dokunma.map((x) => x.oge).join(';'), kare, siddet);
    }
  }
  try {
    const adsiz = await axAdsizOgeler(ctx);
    if (adsiz.length) {
      bulguEkle(cur, 'adsiz-oge', `Erişilebilirlik adı olmayan etkileşimli öğe: ${adsiz.length}`,
        { sayi: adsiz.length, ornekler: adsiz.slice(0, 3).map((x) => `${x.rol}: ${x.oge}`) }, adsiz.map((x) => x.oge).join(';'), kare);
    }
  } catch (err) { hata('erisilebilirlik', err); }
  try {
    const g = await odakGezintisi(ctx);
    cur.olcumler.odakGezintisi = { odaklanabilir: g.adet, kontrolEdilen: g.kontrolEdilen, odaksiz: g.odaksiz.length };
    cur.olcumler.odaklanabilir = g.adet;
    cur.olcumler.odakKontrolEdilen = g.kontrolEdilen;
    cur.olcumler.odakGorunen = g.kontrolEdilen - g.odaksiz.length;
    if (g.odaksiz.length) {
      bulguEkle(cur, 'odak-yok', `Tab ile odaklanınca görünür odak göstergesi yok: ${g.odaksiz.length} öğe`,
        { kontrolEdilen: g.kontrolEdilen, odaksiz: g.odaksiz.length, ornekler: g.odaksiz.slice(0, 3) }, g.odaksiz.join(';'), kare);
    }
  } catch (err) { hata('odak-gezintisi', err); }
}

async function adimCalistir(ctx, st, no) {
  const cdp = ctx.cdp;
  switch (st.adim) {
    case 'goto': {
      await yuklemeBekle(ctx, new URL(st.url, ctx.taban).href);
      return;
    }
    case 'click': {
      const nesne = await hedefBul(ctx, st, 3000);
      const k = await nesneyeCagir(cdp, nesne, tikKonumu);
      if (!k.gorunur || k.w === 0 || k.h === 0) throw new AdimHatasi(`hedef görünür değil: ${hedefAciklama(st)}`);
      if (k.ortulu) throw new AdimHatasi(`hedef başka bir öğe tarafından örtülü, tıklanamaz: ${hedefAciklama(st)}`);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: k.x, y: k.y });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: k.x, y: k.y, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: k.x, y: k.y, button: 'left', clickCount: 1 });
      return;
    }
    case 'kaydir': {
      const nesne = await hedefBul(ctx, st, 3000);
      let y = await nesneyeCagir(cdp, nesne, kaydirHedefe);
      // Kaydırma oturana kadar KOŞULLU bekleme (sabit sleep yok): iki ardışık okuma aynı olunca devam.
      for (let i = 0; i < 20; i++) {
        await sleep(40);
        const yeni = await degerlendir(cdp, 'Math.round(window.scrollY)');
        if (yeni === y) break;
        y = yeni;
      }
      return;
    }
    case 'fill': {
      const nesne = await hedefBul(ctx, st, 3000);
      await nesneyeCagir(cdp, nesne, odakla);
      if (st.deger === '') await tusBas(cdp, 'Backspace');
      else await cdp.send('Input.insertText', { text: st.deger });
      return;
    }
    case 'press': {
      await tusBas(cdp, st.tus);
      return;
    }
    case 'waitFor': {
      const sinir = Math.min(st.zamanAsimiMs ?? 5000, Math.max(0, ctx.requireTime('waitFor')));
      const bitis = Date.now() + sinir;
      for (;;) {
        let bulundu;
        if (st.metin) bulundu = trEsle(await govdeMetni(cdp)).includes(trEsle(st.metin));
        else bulundu = (await hedefDene(ctx, st)) !== null;
        if (st.kaybolur ? !bulundu : bulundu) return;
        if (Date.now() >= bitis) break;
        ctx.requireTime('waitFor');
        await sleep(50);
      }
      const ek = st.kaybolur ? '' : await yakinAdayEki(ctx, st).catch(() => '');
      throw new AdimHatasi(`zaman aşımı (${sinir} ms): ${st.kaybolur ? 'kaybolması beklenen' : 'beklenen'} ${hedefAciklama(st)}${ek}`);
    }
    case 'assertText': {
      const bulundu = trEsle(await govdeMetni(cdp)).includes(trEsle(st.metin));
      if (st.yok ? bulundu : !bulundu) throw new AdimHatasi(`${st.yok ? 'bulunmaması gereken' : 'beklenen'} metin ${st.yok ? 'sayfada' : 'sayfada yok'}: "${kisalt(st.metin, 80)}"`);
      return;
    }
    case 'assertVisible': {
      if (!(await hedefDene(ctx, st))) throw new AdimHatasi(`görünür öğe yok: ${hedefAciklama(st)}${await yakinAdayEki(ctx, st).catch(() => '')}`);
      return;
    }
    case 'screenshot': {
      await kontrolNoktasi(ctx, st.ad);
      return;
    }
    default:
      throw new Error(`bilinmeyen adım: ${st.adim}`);
  }
}

function yeniKayit(ctx, hucre) {
  return {
    hucre: hucre.id, senaryoAd: ctx.sen.ad,
    konsol: [], istisna: [], ag: [], dis: [],
    islenen: { konsol: 0, istisna: 0, ag: 0, dis: 0 },
    bulgular: new Map(), adimlar: [], olcumler: {}, olcumHatalari: [], kareler: [],
  };
}

async function hucreOrtaminiKur(ctx, hucre) {
  const cdp = ctx.cdp;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: hucre.genislik, height: hucre.yukseklik, deviceScaleFactor: 1, mobile: false });
  // --hareket serbest: prefers-reduced-motion ZORLANMAZ (tarayıcı varsayılanı: no-preference).
  const hareketOzelligi = ctx.a.hareket === 'serbest' ? [] : [{ name: 'prefers-reduced-motion', value: 'reduce' }];
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: hucre.tema === 'koyu' ? 'dark' : 'light' },
      ...hareketOzelligi,
    ],
  });
  ctx.cur = null;
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Storage.clearDataForOrigin', { origin: new URL(ctx.taban).origin, storageTypes: 'all' }).catch(() => {});
  const bos = cdp.waitForEvent('Page.loadEventFired');
  bos.catch(() => {});
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await bos.catch(() => {});
  ctx.bekleyen.clear();
  ctx.sonAg = Date.now();
}

/** Bir hücrede senaryoyu bir kez koşar; kayıt (adımlar + bulgular) döndürür. */
async function senaryoKos(ctx, hucre) {
  await hucreOrtaminiKur(ctx, hucre);
  const cur = yeniKayit(ctx, hucre);
  ctx.cur = cur;
  let basarisiz = false;
  for (let i = 0; i < ctx.sen.adimlar.length; i++) {
    const st = ctx.sen.adimlar[i];
    const kayit = { no: i + 1, adim: st.adim, durum: 'atlandi' };
    if (st.beklenti) kayit.beklenti = st.beklenti;
    cur.adimlar.push(kayit);
    if (basarisiz) continue;
    const t0 = Date.now();
    try {
      await adimCalistir(ctx, st, i + 1);
      kayit.durum = 'gecti';
    } catch (err) {
      if (!(err instanceof AdimHatasi)) throw err;
      kayit.durum = 'basarisiz';
      kayit.mesaj = err.message;
      basarisiz = true;
      bulguEkle(cur, 'adim-basarisiz', `Adım ${i + 1} (${st.adim}) başarısız: ${err.message}`,
        { adimNo: i + 1, adim: st.adim, ...(st.beklenti ? { beklenti: st.beklenti } : {}) }, `${i + 1}`, null);
    }
    kayit.sureMs = Date.now() - t0;
  }
  await kontrolNoktasi(ctx, 'son');
  // Hücre başına olay sayıları: "bulgu yok" olumlu kanıtla görünsün (rapordaki ölçüm özeti).
  Object.assign(cur.olcumler, { konsolHata: cur.konsol.length, istisna: cur.istisna.length, agHata: cur.ag.length, disIstek: cur.dis.length });
  const sonKare = cur.kareler[cur.kareler.length - 1];
  for (const b of cur.bulgular.values()) if (!b.kare) b.kare = sonKare;
  cur.sonKare = sonKare;
  ctx.cur = null;
  return cur;
}

function imzaUret(cur) {
  return JSON.stringify({ adimlar: cur.adimlar.map((a) => a.durum), bulgular: [...cur.bulgular.keys()].sort() });
}

function bulguListesi(cur) {
  return [...cur.bulgular.values()].map(({ anahtar, ...b }) => b);
}

function beklentileriDegerlendir(sonuc, beklenti, hucreKayitlari) {
  if (!beklenti) return [];
  return beklenti.beklentiler.map((b) => {
    let adimSayisi = 0;
    let basarisiz = 0;
    for (const h of hucreKayitlari) {
      for (const a of h.adimlar) {
        if (a.beklenti !== b.id) continue;
        adimSayisi++;
        if (a.durum !== 'gecti') basarisiz++;
      }
    }
    const durum = adimSayisi === 0 ? 'kanitsiz' : basarisiz === 0 ? 'karsilandi' : 'karsilanmadi';
    return { id: b.id, metin: b.metin, durum, kanitAdimi: adimSayisi, basarisizAdim: basarisiz };
  });
}

function tabloHucre(s) { return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }

function raporUret(sonuc, sablon) {
  const o = sonuc.ozet;
  const bulgular = sonuc.bulgular;
  const olcumMetni = (b) => tabloHucre(kisalt(JSON.stringify(b.olcum), 200));
  // Aynı (tür, ölçüm) bulgusu hücre×tema kadar tekrarlanmaz: tek satır, hücreler listelenir (sonuc.json ayrıntılı kalır).
  const gruplar = bulgulariGrupla(bulgular);
  const idler = (g) => (g.ids.length > 6 ? `${g.ids.slice(0, 6).join(', ')} (+${g.ids.length - 6})` : g.ids.join(', '));
  const bulguTablosu = gruplar.length
    ? ['| Kimlik | Şiddet | Tür | Senaryo | Hücreler | Ölçüm | Kare |', '|---|---|---|---|---|---|---|',
      ...gruplar.map((g) => `| ${idler(g)} | ${g.siddet} | ${g.tur} | ${tabloHucre(g.senaryo)} | ${g.hucreler.join(', ')} | \`${olcumMetni(g)}\` | ${g.kare ? `[${path.basename(g.kare)}](${g.kare})` : '-'} |`),
    ].join('\n')
    : 'Bulgu yok.';
  const mesajlar = gruplar.length ? gruplar.map((g) => `- **${idler(g)}** (${g.siddet}, ${g.tur}, ${g.hucreler.join(', ')}): ${tabloHucre(g.mesaj)}`).join('\n') : '';
  const sayi = (v) => (typeof v === 'number' ? String(v) : '-');
  const ozetTablosu = ['| Hücre | scrollWidth / clientWidth | Odak (görünür / kontrol / odaklanabilir) | Dokunma hedefi (denetlenen / <44 px) | Konsol hata / istisna | Ağ hata | Dış istek |', '|---|---|---|---|---|---|---|',
    ...sonuc.matris.map((h) => {
      const m = h.olcumler;
      const dokunma = typeof m.dokunmaDenetlenen === 'number' ? `${m.dokunmaDenetlenen} / ${sayi(m.dokunmaKucuk)}` : '- (yalnız ≤480 px)';
      return `| ${h.hucre} | ${sayi(m.scrollWidth)} / ${sayi(m.clientWidth)} | ${sayi(m.odakGorunen)} / ${sayi(m.odakKontrolEdilen)} / ${sayi(m.odaklanabilir)} | ${dokunma} | ${sayi(m.konsolHata)} / ${sayi(m.istisna)} | ${sayi(m.agHata)} | ${sayi(m.disIstek)} |`;
    })].join('\n');
  const kararsiz = sonuc.kararsiz.length
    ? sonuc.kararsiz.map((k) => `- ${k.hucre}: kararsız senaryo — ${k.fark}. Bu hücrenin bulguları ürün bulgusu SAYILMADI (sonuc.json > kararsizBulgular).`).join('\n')
    : 'Kararsız hücre yok.';
  const beklentiTablosu = sonuc.beklentiler.length
    ? ['| Kimlik | Beklenti | Durum | Kanıt adımı |', '|---|---|---|---|',
      ...sonuc.beklentiler.map((b) => `| ${b.id} | ${tabloHucre(b.metin ?? '')} | ${b.durum} | ${b.kanitAdimi} |`)].join('\n')
    : '(beklenti dosyası verilmedi)';
  const matrisTablosu = ['| Hücre | Adımlar | Bulgu | Son kare |', '|---|---|---|---|',
    ...sonuc.matris.map((h) => `| ${h.hucre} | ${h.adimlar.map((a) => a.durum).join(', ')} | ${bulgular.filter((b) => b.hucre === h.hucre).length} | [${path.basename(h.kare)}](${h.kare}) |`)].join('\n');
  const olcumUyarilari = sonuc.matris.flatMap((h) => h.olcumHatalari.map((m) => `- ${h.hucre}: ${m}`));
  const karar = o['ENGELLEYİCİ'] + o['ÖNEMLİ'] > 0 ? 'ENGELLEYİCİ/ÖNEMLİ bulgu var: düzeltilmeden geçirilmez (çıkış 1)' : o['KÜÇÜK'] > 0 ? 'Yalnız KÜÇÜK bulgu var (çıkış 0)' : 'Bulgu yok (çıkış 0)';
  const yer = {
    senaryo_ad: sonuc.senaryo.ad, hedef: sonuc.hedef.tur === 'sun' ? 'yerel salt-okunur sunucu (--sun, 127.0.0.1)' : sonuc.hedef.adres,
    matris: sonuc.ayarlar.matris.join(', '), tema: sonuc.ayarlar.tema.join(', '), tekrar: String(sonuc.ayarlar.tekrar),
    engelleyici: String(o['ENGELLEYİCİ']), onemli: String(o['ÖNEMLİ']), kucuk: String(o['KÜÇÜK']), karar,
    bulgu_tablosu: bulguTablosu, bulgu_mesajlari: mesajlar, kararsiz, beklenti_tablosu: beklentiTablosu, matris_tablosu: matrisTablosu,
    olcum_ozeti: ozetTablosu, hareket: sonuc.ayarlar.hareket === 'serbest' ? 'serbest (reduced-motion zorlanmadı)' : 'azalt (reduced-motion zorlandı)',
    olcum_uyarilari: olcumUyarilari.length ? olcumUyarilari.join('\n') : 'Ölçüm uyarısı yok.',
    tamamlandi: sonuc.tamamlandi ? 'evet' : `HAYIR (${sonuc.hata ?? 'bilinmeyen hata'})`,
  };
  return sablon.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in yer ? yer[k] : m));
}

function sonucuYaz(ctx, tamamlandi, hata) {
  const bulgular = [];
  const say = { 'ENGELLEYİCİ': 0, 'ÖNEMLİ': 0, 'KÜÇÜK': 0 };
  const sirali = ctx.sayilanBulgular.slice().sort((x, y) => SIDDET_SIRA.indexOf(x.siddet) - SIDDET_SIRA.indexOf(y.siddet) || x.hucre.localeCompare(y.hucre) || x.tur.localeCompare(y.tur));
  sirali.forEach((b, i) => { bulgular.push({ id: `F${i + 1}`, ...b }); say[b.siddet]++; });
  const beklentiler = beklentileriDegerlendir(null, ctx.beklenti, ctx.kararliKayitlar);
  for (const b of beklentiler) {
    if (b.durum !== 'kanitsiz') continue;
    const f = { id: `F${bulgular.length + 1}`, tur: 'beklenti-kanitsiz', siddet: 'ÖNEMLİ', senaryo: ctx.sen.ad, hucre: 'tum', mesaj: `Beklenti ${b.id} hiçbir senaryo adımıyla kanıtlanmıyor`, olcum: { beklenti: b.id, kanitAdimi: 0 }, kare: null };
    bulgular.push(f);
    say['ÖNEMLİ']++;
  }
  const kod = say['ENGELLEYİCİ'] + say['ÖNEMLİ'] > 0 ? 1 : 0;
  const sonuc = {
    surum: 1,
    senaryo: { ad: ctx.sen.ad },
    hedef: { tur: ctx.a.sun ? 'sun' : 'url', adres: ctx.taban },
    ayarlar: { matris: ctx.matris.map((m) => `${m.genislik}x${m.yukseklik}`), tema: ctx.temalar, hareket: ctx.a.hareket, tekrar: ctx.a.tekrar, setup: Boolean(ctx.a.setup) },
    tamamlandi, ...(hata ? { hata } : {}),
    ozet: say, cikis: tamamlandi ? kod : 3,
    bulgular, kararsizBulgular: ctx.kararsizBulgular, kararsiz: ctx.kararsiz, beklentiler,
    matris: ctx.hucreSonuclari,
  };
  const jsonMetni = `${JSON.stringify(sonuc, null, 2)}\n`;
  const raporMetni = raporUret(sonuc, readFileSync(ctx.raporSablon, 'utf8'));
  // Çıktı bekçisi: konsol/öğe metni çalışma zamanında yasak desen üretebilir (girdi bekçisi bunu göremez).
  // Eşleşirse dosyalar YAZILMAZ; eşleşen değer değil yalnız dosya:satır ve desen adı yazılır.
  const yasaklar = yasakTara({
    dosyalar: [{ ad: 'sonuc.json', metin: jsonMetni }, { ad: 'RAPOR.md', metin: raporMetni }],
    ozel: ctx.ozel ?? [],
  });
  if (yasaklar.length) {
    console.error('Hata: yasak desen bekçisi (ÇIKTI) — sınanan sayfa konsol/öğe metninde kişisel veri izlenimi veren içerik üretti; sonuc.json ve RAPOR.md YAZILMADI.');
    for (const y of yasaklar) console.error(`  ${y.dosya}:${y.satir}  desen=${y.desen}`);
    // Bu koşunun yazdığı kareler de ekran içeriği taşır: silinir (başkasının dosyasına dokunulmaz).
    const { silinen, kalan } = kareleriSil([...ctx.yazilanKareler]);
    console.error(`${silinen.length} kare silindi.`);
    for (const k of kalan) console.error(`KALDI, elle silin: ${path.relative(ctx.out, k).replace(/\\/g, '/')}`);
    console.error('Eşleşen metin bilerek yazılmaz. Sayfayı sahte/anonim veriyle sınayın; kişisel/sağlık verisi taşıyan arayüzü insan gözle sınayın.');
    return { kod: 2, say, yasak: true };
  }
  mkdirSync(ctx.out, { recursive: true });
  writeFileSync(path.join(ctx.out, 'sonuc.json'), jsonMetni);
  writeFileSync(path.join(ctx.out, 'RAPOR.md'), raporMetni);
  return { kod, say, yasak: false };
}

async function oturumuKur(ctx) {
  const { cdp, a } = ctx;
  ctx.bekleyen = new Set();
  ctx.sonAg = Date.now();
  ctx.urlHaritasi = new Map();
  ctx.cur = null;
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (!ctx.cur || (p.type !== 'error' && p.type !== 'assert')) return;
    ctx.cur.konsol.push((p.args ?? []).map((x) => x.value ?? x.description ?? '').join(' '));
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    if (!ctx.cur) return;
    const d = p.exceptionDetails;
    ctx.cur.istisna.push({ metin: describeException(d).split('\n')[0], konum: `${yolMetni(d.url ?? '')}:${d.lineNumber ?? '?'}` });
  });
  cdp.on('Network.requestWillBeSent', (p) => {
    ctx.bekleyen.add(p.requestId);
    ctx.sonAg = Date.now();
    ctx.urlHaritasi.set(p.requestId, p.request.url);
  });
  cdp.on('Network.responseReceived', (p) => {
    ctx.sonAg = Date.now();
    if (ctx.cur && p.response.status >= 400) ctx.cur.ag.push({ durum: p.response.status, yol: yolMetni(p.response.url), tur: p.type });
  });
  cdp.on('Network.loadingFinished', (p) => { ctx.bekleyen.delete(p.requestId); ctx.sonAg = Date.now(); });
  cdp.on('Network.loadingFailed', (p) => {
    ctx.bekleyen.delete(p.requestId);
    ctx.sonAg = Date.now();
    if (!ctx.cur || p.canceled || /ERR_BLOCKED_BY_CLIENT/.test(p.errorText ?? '')) return;
    ctx.cur.ag.push({ hata: p.errorText, yol: yolMetni(ctx.urlHaritasi.get(p.requestId) ?? ''), tur: p.type });
  });
  // URL bekçisinin çalışma zamanı kolu: 127.0.0.1 dışına giden HER istek (yönlendirmeler dahil) gönderilmeden ENGELLENİR.
  cdp.on('Fetch.requestPaused', (p) => {
    const url = p.request.url;
    if (izinliIstek(url)) {
      cdp.send('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
      return;
    }
    if (ctx.cur) ctx.cur.dis.push({ host: hostMetni(url) });
    cdp.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
  });
  for (const d of ['Page.enable', 'Runtime.enable', 'Network.enable', 'DOM.enable', 'Accessibility.enable']) await cdp.send(d);
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Istanbul' }).catch(() => {});
  await cdp.send('Emulation.setLocaleOverride', { locale: 'tr-TR' }).catch(() => {});
  const surum = await cdp.send('Browser.getVersion').catch(() => null);
  if (surum?.userAgent) {
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: surum.userAgent.replace('HeadlessChrome', 'Chrome'), acceptLanguage: 'tr-TR,tr' }).catch(() => {});
  }
  if (a.setup) await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: a.setup });
}

async function kosucuCalistir({ a, sen, beklenti, matris, temalar, tarayici, raporSablon, ozel }) {
  installSignalHandlers();
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'ux-sinama-'));
  // Tam yol yazılmaz (kullanıcı adı içerir); yalnız dizin adı.
  console.error(`profil: ${path.basename(profileDir)}`);
  const state = { child: null, ws: null, profileDir, done: false, sunucu: null };
  activeState = state;
  const deadline = Date.now() + a.timeoutMs;
  const remainingMs = () => deadline - Date.now();
  const requireTime = (label) => {
    const rem = remainingMs();
    if (rem <= 0) throw new Error(`Toplam süre sınırı aşıldı (${label}, --timeout-ms=${a.timeoutMs})`);
    return rem;
  };
  const ctx = {
    a, sen, beklenti, matris, temalar, raporSablon, ozel, out: path.resolve(a.out), remainingMs, requireTime,
    yazilanKareler: new Set(), taban: null, cdp: null, cur: null, hucreSonuclari: [], sayilanBulgular: [], kararsizBulgular: [], kararsiz: [], kararliKayitlar: [],
  };
  let kod = 3;
  try {
    if (a.sun) {
      state.sunucu = await statikSunucuBaslat(a.sun);
      ctx.taban = `http://127.0.0.1:${state.sunucu.port}/`;
      console.error(`sunucu: ${ctx.taban}`);
    } else {
      ctx.taban = a.url;
    }
    state.child = spawnBrowser(tarayici, profileDir);
    state.child.on('error', () => {});
    const port = await waitForDevToolsActivePort(profileDir, requireTime('DevToolsActivePort'));
    console.error(`cdp: port=${port} profil=${path.basename(profileDir)}`);
    const target = await waitForPageTarget(port, requireTime('page hedefi'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    state.ws = ws;
    await withTimeout(
      new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', () => reject(new Error('WebSocket bağlantı hatası')), { once: true });
      }),
      requireTime('WebSocket açılışı'),
      'WebSocket bağlantısı zaman aşımına uğradı',
    );
    ctx.cdp = new CdpClient(ws, remainingMs);
    await oturumuKur(ctx);

    for (const m of matris) {
      for (const tema of temalar) {
        const hucre = { id: `${m.genislik}x${m.yukseklik}-${tema}`, genislik: m.genislik, yukseklik: m.yukseklik, tema };
        console.error(`hücre: ${hucre.id}`);
        const kosular = [];
        for (let t = 0; t < a.tekrar; t++) kosular.push(await senaryoKos(ctx, hucre));
        const imzalar = kosular.map(imzaUret);
        const kararli = imzalar.every((s) => s === imzalar[0]);
        const ilk = kosular[0];
        if (!kararli) {
          const kumeler = kosular.map((k) => [...k.bulgular.keys()]);
          const farkli = new Set(kumeler.flat().filter((k) => !kumeler.every((c) => c.includes(k))));
          const adimFarki = kosular.map((k) => k.adimlar.map((x) => x.durum).join('/'));
          ctx.kararsiz.push({ hucre: hucre.id, fark: `tekrarlar arasında adım durumları [${adimFarki.join(' | ')}] ve ${farkli.size} bulgu farklı`, tekrarlar: kosular.length });
          ctx.kararsizBulgular.push(...bulguListesi(ilk));
        } else {
          ctx.sayilanBulgular.push(...bulguListesi(ilk));
          ctx.kararliKayitlar.push(ilk);
        }
        ctx.hucreSonuclari.push({
          hucre: hucre.id, genislik: hucre.genislik, yukseklik: hucre.yukseklik, tema, kararli,
          adimlar: ilk.adimlar, olcumler: ilk.olcumler, olcumHatalari: ilk.olcumHatalari, kare: ilk.sonKare,
        });
      }
    }
    await ctx.cdp.send('Browser.close').catch(() => {});
    const { kod: k, say, yasak } = sonucuYaz(ctx, true, null);
    kod = k;
    if (!yasak) {
      console.log(`ÖZET: ENGELLEYİCİ=${say['ENGELLEYİCİ']} ÖNEMLİ=${say['ÖNEMLİ']} KÜÇÜK=${say['KÜÇÜK']} kararsız=${ctx.kararsiz.length} çıkış=${kod}`);
      console.log(`Rapor: ${path.join(a.out, 'RAPOR.md')}`);
    }
  } catch (err) {
    console.error(`Hata: ${err.message}`);
    try { sonucuYaz(ctx, false, err.message); } catch {}
    kod = 3;
  } finally {
    await cleanupResources(state);
    activeState = null;
  }
  return kod;
}

// ---------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------

async function main() {
  let a;
  try {
    a = argumanAyristir(process.argv.slice(2));
  } catch (err) {
    console.error(`Hata: ${err.message}`);
    console.error(HELP);
    return 2;
  }
  if (a.help) { console.log(HELP); return 0; }

  let sen; let ozel = []; let beklenti = null; let matris; let temalar; let raporSablon;
  try {
    const eksik = [];
    if (!a.senaryo) eksik.push('--senaryo');
    if (!a.url && !a.sun) eksik.push('--url (ya da --sun)');
    if (!a.out) eksik.push('--out');
    if (eksik.length) throw new KullanimHatasi(`zorunlu parametre eksik: ${eksik.join(', ')}`);
    if (a.url && a.sun) throw new KullanimHatasi('--url ve --sun birlikte verilemez');
    matris = matrisAyristir(a.matris);
    temalar = temaAyristir(a.tema);
    if (a.url && !urlBekcisi(a.url)) {
      throw new KullanimHatasi(`--url reddedildi: yalnız http://127.0.0.1:PORT/... kabul edilir (localhost, başka IP, ana makine adı, https ve file: yasak)`);
    }
    if (a.sun && !(existsSync(a.sun) && statSync(a.sun).isDirectory())) throw new KullanimHatasi(`--sun dizini bulunamadı: ${a.sun}`);
    sen = senaryoDogrula(jsonOku(a.senaryo, '--senaryo dosyası'));
    beklenti = beklentiDogrula(a.beklenti ? jsonOku(a.beklenti, '--beklenti dosyası') : null, sen);
    if (a.yasakDesen) ozel = ozelDesenleriOku(a.yasakDesen);
    raporSablon = a.raporSablon ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'RAPOR-template.md');
    if (!existsSync(raporSablon)) throw new KullanimHatasi(`rapor şablonu bulunamadı: ${path.basename(raporSablon)}`);
  } catch (err) {
    if (!(err instanceof KullanimHatasi)) throw err;
    console.error(`Hata: ${err.message}`);
    return 2;
  }

  // Yasak desen bekçisi: tarayıcı açılmadan, hiçbir şey başlamadan.
  const dosyalar = [{ ad: path.basename(a.senaryo), metin: readFileSync(a.senaryo, 'utf8') }];
  if (a.beklenti) dosyalar.push({ ad: path.basename(a.beklenti), metin: readFileSync(a.beklenti, 'utf8') });
  if (a.setup) dosyalar.push({ ad: '--setup', metin: a.setup });
  if (a.sun) dosyalar.push(...sunMetinDosyalari(a.sun));
  const yasaklar = yasakTara({ dosyalar, ozel });
  if (yasaklar.length) {
    console.error('Hata: yasak desen bekçisi — gerçek kişisel veri izlenimi veren içerik bulundu; HİÇBİR ŞEY BAŞLATILMADI.');
    for (const y of yasaklar) console.error(`  ${y.dosya}:${y.satir}  desen=${y.desen}`);
    console.error('Eşleşen metin bilerek yazılmaz. Sahte/anonim değerle değiştirin ya da --yasak-desen dosyanızı gözden geçirin.');
    return 2;
  }

  const tarayici = tarayiciBul(a.browser);
  if (!tarayici) {
    console.error('Hata: Tarayıcı bulunamadı. --browser ile yol ver ya da CAPTURE_BROWSER ortam değişkenini ayarla.');
    return 2;
  }

  return kosucuCalistir({ a, sen, beklenti, matris, temalar, tarayici, raporSablon, ozel });
}

function anaModulMu() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (anaModulMu()) {
  main().then(
    (kod) => process.exit(kod),
    (err) => { console.error(`Hata: ${err?.message ?? err}`); process.exit(3); },
  );
}
