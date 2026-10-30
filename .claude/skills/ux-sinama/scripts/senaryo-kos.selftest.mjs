// senaryo-kos.mjs için testler (node:test). Bağımlılıksız: yalnız node:test + node:http + node:net +
// node:child_process. Çalıştırma: node --test .claude/skills/ux-sinama/scripts/senaryo-kos.selftest.mjs
//
// Dosya adı `.selftest.mjs`: host projede Vitest/Jest varsayılan desenine (`*.test.*`) takılmasın
// (aynı gerekçe capture-page.selftest.mjs'te açıklanmıştır).
//
// ÖNEMLİ: koşucu ASENKRON `spawn` ile çağrılır (spawnSync DEĞİL): test sunucuları bu süreçte, aynı
// olay döngüsünde çalışır; spawnSync döngüyü bloke edip alt süreçteki tarayıcıyı asılı bırakırdı.
//
// Test kümeleri:
//  A. TARAYICISIZ: URL bekçisi, yasak desen bekçisi, statik sunucu, kullanım hataları, yardım.
//  B. TARAYICILI: kusurlu/temiz fixture, adım türleri, dış istek engeli, kararsızlık, süreç hijyeni.
//     Tarayıcı bulunamazsa B kümesi "atlandı" olarak işaretlenir ve NEDENİ yazılır; ortamda
//     UX_SINAMA_TARAYICI_ZORUNLU=1 varsa sessiz atlama yerine test BAŞARISIZ olur.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'senaryo-kos.mjs');
const FIXTURES = path.join(__dirname, '..', 'fixtures');
const IS_WINDOWS = process.platform === 'win32';

let mod = null;
let modHata = null;
try {
  mod = await import(pathToFileURL(SCRIPT).href);
} catch (err) {
  modHata = err;
}

const TARAYICI_YOK_NEDENI =
  mod && typeof mod.tarayiciBul === 'function' && !mod.tarayiciBul(null)
    ? 'tarayıcı bulunamadı (Edge/Chrome yok; --browser ya da CAPTURE_BROWSER ile yol verin)'
    : false;
const B_ATLA = TARAYICI_YOK_NEDENI ? { skip: TARAYICI_YOK_NEDENI } : {};

let runRoot;
let tmpDir;

const BROWSER_PROCESS_NAMES_WIN = "'msedge.exe','chrome.exe','chromium.exe'";
const BROWSER_PROCESS_NAMES_POSIX = ['msedge', 'chrome', 'chromium', 'Google Chrome', 'Microsoft Edge'];

// capture-page.selftest.mjs ile aynı yöntem: bu koşuya özgü kök (runRoot) komut satırında geçen
// TARAYICI süreçlerini sayar; makine geneli sayım yapılmaz (başka oturumları yanlış nedenle saymasın).
function countProcessesWithProfile(profileDir) {
  if (IS_WINDOWS) {
    const escaped = profileDir.replace(/'/g, "''");
    const res = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @(${BROWSER_PROCESS_NAMES_WIN}) -and $_.CommandLine -and $_.CommandLine.Contains('${escaped}') } | Measure-Object).Count`,
      ],
      { encoding: 'utf8' },
    );
    const n = parseInt((res.stdout || '').trim(), 10);
    return Number.isFinite(n) ? n : -1;
  }
  const res = spawnSync('ps', ['-eo', 'comm,args'], { encoding: 'utf8' });
  return (res.stdout || '')
    .split('\n')
    .filter((l) => l.includes(profileDir) && BROWSER_PROCESS_NAMES_POSIX.some((n) => l.includes(n)))
    .length;
}

before(() => {
  runRoot = mkdtempSync(path.join(os.tmpdir(), 'ux-sinama-selftest-'));
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'ux-sinama-test-out-'));
});

after(() => {
  if (runRoot) {
    const kalan = countProcessesWithProfile(runRoot);
    try {
      rmSync(runRoot, { recursive: true, force: true });
    } catch {}
    assert.equal(kalan, 0, `test koşusu sonunda bu koşuya özgü kökte yetim tarayıcı süreci kaldı (${kalan})`);
  }
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
  if (TARAYICI_YOK_NEDENI) {
    console.error(`ATLANDI: tarayıcılı test kümesi (B) çalışmadı. Neden: ${TARAYICI_YOK_NEDENI}`);
  }
});

// Koşucuyu ASENKRON spawn ile çağırır. TEMP/TMP/TMPDIR runRoot'a yönlendirilir: koşucunun
// os.tmpdir() altındaki rastgele profil dizini runRoot altına düşer (yetim sayımı buna göre).
// Çağıran --timeout-ms vermezse kısa bir iç süre eklenir; düzenek süresi iç sürenin ÜSTÜNDE tutulur
// (koşucu kendi temizliğini yapabilsin).
const VARSAYILAN_IC_MS = 90000;
const TEMIZLIK_PAYI_MS = 30000;
function kos(args, { env = {} } = {}) {
  const ic = args.includes('--timeout-ms') ? Number(args[args.indexOf('--timeout-ms') + 1]) : VARSAYILAN_IC_MS;
  const efektif = args.includes('--timeout-ms') ? args : [...args, '--timeout-ms', String(VARSAYILAN_IC_MS)];
  return new Promise((resolve) => {
    const child = spawn('node', [SCRIPT, ...efektif], {
      windowsHide: true,
      env: { ...process.env, TEMP: runRoot, TMP: runRoot, TMPDIR: runRoot, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), ic + TEMIZLIK_PAYI_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

function yaz(ad, icerik) {
  const p = path.join(tmpDir, ad);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, typeof icerik === 'string' ? icerik : JSON.stringify(icerik, null, 2));
  return p;
}

const MIN_SENARYO = { ad: 'asgari', adimlar: [{ adim: 'goto', url: '/' }] };

// ---------------------------------------------------------------------------------------------
// A. TARAYICISIZ
// ---------------------------------------------------------------------------------------------

test('modül yüklenir ve beklenen işlevleri dışa aktarır', () => {
  assert.ok(mod, `senaryo-kos.mjs yüklenemedi: ${modHata}`);
  for (const ad of ['urlBekcisi', 'yasakTara', 'statikSunucuBaslat', 'tarayiciBul', 'tarayiciBayraklari', 'killByProfileDir', 'kareleriSil']) {
    assert.equal(typeof mod[ad], 'function', `${ad} dışa aktarılmalı`);
  }
});

test('urlBekcisi: yalnız http://127.0.0.1:PORT kabul edilir', () => {
  assert.ok(mod, 'modül yok');
  for (const iyi of ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/', 'http://127.0.0.1:5173/uygulama/ayar?x=1']) {
    assert.equal(mod.urlBekcisi(iyi), true, iyi);
  }
  const kotu = [
    'http://localhost:8080/',
    'http://192.168.1.5:8080/',
    'https://127.0.0.1:8080/',
    'file:///C:/gizli.html',
    'http://127.0.0.1/',
    'http://127.0.0.1:80@baska.example/',
    'http://127.0.0.1:80.baska.example/',
    'http://127.0.0.1.baska.example:80/',
    'http://ana-makine:80/',
    'ftp://127.0.0.1:21/',
    'about:blank',
    '',
  ];
  for (const k of kotu) assert.equal(mod.urlBekcisi(k), false, k);
});

test('yasakTara: 11 haneli sayı, TR cep telefonu ve e-posta yakalanır; eşleşen metin döndürülmez', () => {
  assert.ok(mod, 'modül yok');
  const eslesmeli = {
    'on-bir-hane': 'tc 12345678901 deneme',
    'tr-cep': 'ara: 0532 123 45 67',
    'tr-cep#2': 'ara: +905321234567',
    'tr-cep#3': 'ara: 05321234567',
    'tr-cep#4': 'ara: (0532) 123 45 67',
    'eposta': 'yaz: ayse.yilmaz@example.com',
    'tr-cep#5 (ayraçsız 10 hane)': 'ara: 5321234567',
  };
  for (const [ad, metin] of Object.entries(eslesmeli)) {
    const r = mod.yasakTara({ dosyalar: [{ ad: 'x.json', metin }], ozel: [] });
    assert.ok(r.length >= 1, `${ad} yakalanmadı: ${metin}`);
    assert.equal(r[0].dosya, 'x.json');
    assert.equal(r[0].satir, 1);
    assert.ok(typeof r[0].desen === 'string' && r[0].desen.length > 0);
    assert.equal(JSON.stringify(r).includes('12345678901'), false, 'eşleşen metin sızmamalı');
    assert.equal(JSON.stringify(r).includes('ayse.yilmaz'), false, 'eşleşen metin sızmamalı');
  }
  // yanlış pozitif kontrolleri
  const temiz = [
    'logo@2x.png',
    'sürüm 1.2.3, kod 1234567, sipariş 123456789',
    'fiyat 5.000 TL',
    'width: 1280px; height: 800px',
    '1767225600000',
    '1767225600',
    '532123456789',
    'sayaç 95321234567890 bitti',
  ];
  for (const metin of temiz) {
    assert.deepEqual(mod.yasakTara({ dosyalar: [{ ad: 'y.txt', metin }], ozel: [] }), [], metin);
  }
  // satır numarası
  const r = mod.yasakTara({ dosyalar: [{ ad: 'z.txt', metin: 'a\nb\n12345678901\n' }], ozel: [] });
  assert.equal(r[0].satir, 3);
  // özel desen
  const o = mod.yasakTara({ dosyalar: [{ ad: 'o.txt', metin: 'merhaba PROJEGIZLI kelimesi' }], ozel: [{ ad: 'ozel:1', re: /PROJEGIZLI/ }] });
  assert.equal(o.length, 1);
  assert.equal(o[0].desen, 'ozel:1');
});

async function hamIstek(port, hamYol, yontem = 'GET') {
  return new Promise((resolve, reject) => {
    const s = net.connect(port, '127.0.0.1', () => {
      s.write(`${yontem} ${hamYol} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });
    let veri = '';
    s.on('data', (d) => (veri += d));
    s.on('end', () => resolve(veri));
    s.on('error', reject);
  });
}

test('statik sunucu: salt okunur, yalnız 127.0.0.1, dizin dışına çıkış (..) engelli, kapanınca port boşalır', async () => {
  assert.ok(mod, 'modül yok');
  const kok = path.join(tmpDir, 'sun-kok');
  mkdirSync(path.join(kok, 'alt'), { recursive: true });
  writeFileSync(path.join(kok, 'index.html'), '<!doctype html><title>kok</title>');
  writeFileSync(path.join(kok, 'alt', 'a.txt'), 'alt-icerik');
  writeFileSync(path.join(tmpDir, 'sir.txt'), 'DISARIDAKI-SIR');
  const sun = await mod.statikSunucuBaslat(kok);
  try {
    assert.ok(Number.isInteger(sun.port) && sun.port > 0);
    const kokYanit = await hamIstek(sun.port, '/');
    assert.match(kokYanit, /^HTTP\/1\.1 200/);
    assert.match(kokYanit, /<title>kok<\/title>/);
    assert.match(await hamIstek(sun.port, '/alt/a.txt'), /alt-icerik/);
    assert.match(await hamIstek(sun.port, '/yok.txt'), /^HTTP\/1\.1 404/);
    for (const yol of ['/../sir.txt', '/alt/../../sir.txt', '/%2e%2e/sir.txt', '/%2e%2e%2fsir.txt', '/..%5csir.txt', '/alt/..%2f..%2fsir.txt']) {
      const y = await hamIstek(sun.port, yol);
      assert.doesNotMatch(y, /DISARIDAKI-SIR/, `${yol} dizin dışını sızdırdı`);
      assert.doesNotMatch(y, /^HTTP\/1\.1 200/, `${yol} 200 döndü`);
    }
    assert.match(await hamIstek(sun.port, '/', 'POST'), /^HTTP\/1\.1 405/);
    assert.match(await hamIstek(sun.port, '/index.html', 'PUT'), /^HTTP\/1\.1 405/);
    // yalnız loopback: dinleme adresi 127.0.0.1
    assert.equal(sun.adres, '127.0.0.1');
  } finally {
    await sun.kapat();
  }
  await assert.rejects(
    fetch(`http://127.0.0.1:${sun.port}/`, { signal: AbortSignal.timeout(1000) }),
    'sunucu kapanmadı',
  );
});

test('CLI: URL bekçisi (--url) localhost / özel IP / https / file / port yok → çıkış 2, tarayıcı açılmaz', async () => {
  const sen = yaz('bekci/senaryo.json', MIN_SENARYO);
  for (const url of ['http://localhost:8080/', 'http://192.168.1.5:8080/', 'https://127.0.0.1:8080/', 'file:///C:/x.html', 'http://127.0.0.1/']) {
    const r = await kos(['--senaryo', sen, '--url', url, '--out', path.join(tmpDir, 'bekci/out')]);
    assert.equal(r.status, 2, `${url} → ${r.status}\n${r.stderr}`);
    assert.doesNotMatch(r.stderr, /profil:/, `${url}: tarayıcı AÇILMAMALIYDI`);
    assert.match(r.stderr, /127\.0\.0\.1/, 'mesaj izinli biçimi anlatmalı');
  }
});

test('CLI: senaryodaki mutlak goto URL\'si 127.0.0.1 dışındaysa başlamadan çıkış 2', async () => {
  const sen = yaz('bekci/dis-goto.json', { ad: 'dis', adimlar: [{ adim: 'goto', url: 'http://example.org/' }] });
  const kok = path.join(tmpDir, 'bekci/kok');
  mkdirSync(kok, { recursive: true });
  writeFileSync(path.join(kok, 'index.html'), '<title>x</title>');
  const r = await kos(['--senaryo', sen, '--sun', kok, '--out', path.join(tmpDir, 'bekci/out2')]);
  assert.equal(r.status, 2, r.stderr);
  assert.doesNotMatch(r.stderr, /profil:/);
});

test('CLI: yasak desen bekçisi — 11 haneli sayı içeren senaryo → çıkış 2; yalnız dosya:satır ve desen adı yazılır', async () => {
  const sen = yaz('yasak/senaryo.json', '{\n  "ad": "x",\n  "adimlar": [\n    {"adim":"goto","url":"/"},\n    {"adim":"fill","role":"textbox","name":"Kimlik","deger":"12345678901"}\n  ]\n}\n');
  const r = await kos(['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--out', path.join(tmpDir, 'yasak/out')]);
  assert.equal(r.status, 2, r.stderr);
  assert.doesNotMatch(r.stderr, /profil:/, 'tarayıcı AÇILMAMALIYDI');
  assert.match(r.stderr, /senaryo\.json:5/, 'dosya:satır yazılmalı');
  assert.match(r.stderr, /on-bir-hane/, 'desen adı yazılmalı');
  assert.doesNotMatch(r.stderr, /12345678901/, 'eşleşen metin ASLA yazılmamalı');
  assert.doesNotMatch(r.stdout, /12345678901/);
  assert.equal(existsSync(path.join(tmpDir, 'yasak/out/sonuc.json')), false, 'hiçbir şey başlamamalı');
});

test('CLI: yasak desen bekçisi — telefon/e-posta senaryoda, ve --sun dizinindeki metin dosyasında yakalanır', async () => {
  const sen1 = yaz('yasak2/tel.json', { ad: 'x', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'fill', role: 'textbox', name: 'Telefon', deger: '0532 123 45 67' }] });
  const r1 = await kos(['--senaryo', sen1, '--url', 'http://127.0.0.1:9/', '--out', path.join(tmpDir, 'yasak2/o1')]);
  assert.equal(r1.status, 2, r1.stderr);
  assert.match(r1.stderr, /tr-cep/);

  const kok = path.join(tmpDir, 'yasak2/site');
  mkdirSync(kok, { recursive: true });
  writeFileSync(path.join(kok, 'index.html'), '<p>iletişim:\n ayse.yilmaz@example.com</p>');
  const sen2 = yaz('yasak2/temiz.json', MIN_SENARYO);
  const r2 = await kos(['--senaryo', sen2, '--sun', kok, '--out', path.join(tmpDir, 'yasak2/o2')]);
  assert.equal(r2.status, 2, r2.stderr);
  assert.match(r2.stderr, /index\.html:2/);
  assert.match(r2.stderr, /eposta/);
  assert.doesNotMatch(r2.stderr, /ayse\.yilmaz/);
  assert.doesNotMatch(r2.stderr, /profil:/);
});

test('CLI: --yasak-desen <dosya> projeye özgü deseni uygular; geçersiz ifade çıkış 2', async () => {
  const desen = yaz('yasak3/desenler.txt', '# yorum satırı\n\nPROJEGIZLI-\\d+\n');
  const sen = yaz('yasak3/sen.json', { ad: 'x', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'assertText', metin: 'PROJEGIZLI-42' }] });
  const r = await kos(['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--yasak-desen', desen, '--out', path.join(tmpDir, 'yasak3/o')]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /sen\.json:1/);
  assert.match(r.stderr, /ozel:/);
  assert.doesNotMatch(r.stderr, /PROJEGIZLI-42/);

  const bozuk = yaz('yasak3/bozuk.txt', '([\n');
  const r2 = await kos(['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--yasak-desen', bozuk, '--out', path.join(tmpDir, 'yasak3/o2')]);
  assert.equal(r2.status, 2, r2.stderr);
  assert.match(r2.stderr, /yasak-desen/);
});

test('CLI: kullanım hataları çıkış 2 — --senaryo yok, --url ve --sun birlikte / hiçbiri yok, bilinmeyen bayrak, kötü matris, --out yok, bozuk senaryo', async () => {
  const sen = yaz('kullanim/sen.json', MIN_SENARYO);
  const out = path.join(tmpDir, 'kullanim/out');
  const durumlar = [
    [['--url', 'http://127.0.0.1:9/', '--out', out], '--senaryo'],
    [['--senaryo', sen, '--out', out], '--url'],
    [['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--sun', tmpDir, '--out', out], 'birlikte'],
    [['--senaryo', sen, '--url', 'http://127.0.0.1:9/'], '--out'],
    [['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--out', out, '--bilinmeyen', 'x'], 'Bilinmeyen'],
    [['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--out', out, '--matris', 'abc'], '--matris'],
    [['--senaryo', sen, '--url', 'http://127.0.0.1:9/', '--out', out, '--tema', 'mor'], '--tema'],
    [['--senaryo', path.join(tmpDir, 'yok.json'), '--url', 'http://127.0.0.1:9/', '--out', out], 'bulunamadı'],
    [['--senaryo', yaz('kullanim/bozuk.json', '{ bozuk'), '--url', 'http://127.0.0.1:9/', '--out', out], 'JSON'],
    [['--senaryo', yaz('kullanim/bos.json', { ad: 'x', adimlar: [] }), '--url', 'http://127.0.0.1:9/', '--out', out], 'adım'],
    [['--senaryo', yaz('kullanim/cssli.json', { ad: 'x', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'click', css: '.btn' }] }), '--url', 'http://127.0.0.1:9/', '--out', out], 'role'],
    [['--senaryo', yaz('kullanim/tur.json', { ad: 'x', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'uc-boyut' }] }), '--url', 'http://127.0.0.1:9/', '--out', out], 'adim'],
  ];
  for (const [args, beklenen] of durumlar) {
    const r = await kos(args);
    assert.equal(r.status, 2, `${args.join(' ')} → ${r.status}\n${r.stderr}`);
    assert.match(r.stderr, new RegExp(beklenen), `${beklenen} bekleniyordu:\n${r.stderr}`);
    assert.doesNotMatch(r.stderr, /profil:/, 'kullanım hatasında tarayıcı açılmamalı');
  }
});

test('CLI: --help çıkış 0 ve kullanım metni yazar; adım türlerini ve seçenekleri gerçekten verir', async () => {
  const r = await kos(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /senaryo-kos\.mjs/);
  assert.match(r.stdout, /127\.0\.0\.1/);
  // SKILL.md'den taşınan içerik: adım tablosu ve seçenekler yalnız burada durur
  for (const adim of ['goto', 'click', 'fill', 'press', 'waitFor', 'assertText', 'assertVisible', 'screenshot']) {
    assert.match(r.stdout, new RegExp(`\\b${adim}\\b`), `--help adım türünü anlatmalı: ${adim}`);
  }
  for (const alan of ['role', 'name', 'metin', 'deger', 'tus', 'kaybolur', 'zamanAsimiMs', 'beklenti']) {
    assert.match(r.stdout, new RegExp(alan), `--help adım alanını anlatmalı: ${alan}`);
  }
  for (const secenek of ['--matris', '--tema', '--tekrar', '--setup', '--yasak-desen', '--timeout-ms', '--browser', '--sun', '--url', '--out', '--beklenti']) {
    assert.match(r.stdout, new RegExp(secenek), `--help seçeneği anlatmalı: ${secenek}`);
  }
  assert.match(r.stdout, /ENGELLEY/, '--help çıkış kodlarını/şiddeti anlatmalı');
  assert.match(r.stdout, /480/, '--help dokunmatik hedef eşiğini (≤480) söylemeli');
});

// --- SKILL.md sözleşmesi (Fable Tur 1 bulguları) ---
const SKILL_MD = readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8');
const sozcukSayisi = (m) => m.split(/\s+/).filter(Boolean).length;

test('SKILL.md: kişisel/sağlık verisi taşıyan arayüzde çalıştırılmaz sınırı yazılı (ENGELLEYİCİ-1)', () => {
  assert.ok(
    SKILL_MD.includes('Kişisel ya da sağlık verisi taşıyan arayüzlerde çalıştırılmaz: kareler ekrandaki her şeyi alır, rapor konsol ve öğe metnini içerir; bu ekranları insan gözle sına.'),
    'SKILL.md bu sınır cümlesini içermeli',
  );
});

test('SKILL.md: hafif kalır (≤550 sözcük), ağ sınırı dürüst (WebSocket/WebRTC kapsam dışı), eşik ve bekçi iddiası hizalı (ÖNEMLİ-3, KÜÇÜK d/e)', () => {
  const n = sozcukSayisi(SKILL_MD);
  assert.ok(n <= 550, `SKILL.md ${n} sözcük (en çok 550)`);
  assert.match(SKILL_MD, /WebSocket/);
  assert.match(SKILL_MD, /WebRTC/);
  assert.match(SKILL_MD, /480/, 'dokunmatik hedef eşiği ≤480');
  assert.doesNotMatch(SKILL_MD, /bekçi bunu kodda zorlar/, 'abartılı bekçi iddiası kalmamalı');
  assert.match(SKILL_MD, /ad\/adres/i,'bekçinin yakalamadığı (ad/adres) sınayıcıya aittir');
  assert.match(SKILL_MD, /--help/, 'adım ve seçenek ayrıntısı --help\'e yönlendirilmeli');
  const sablon = readFileSync(path.join(__dirname, '..', 'RAPOR-template.md'), 'utf8');
  assert.doesNotMatch(sablon, /düzeltme önermez/, 'şablon SKILL.md ile çelişmemeli');
  assert.doesNotMatch(sablon, /yalnız 390/, 'eşik 390 değil ≤480 genişlik');
  assert.match(sablon, /480/);
});

// SÖZLEŞME KİLİDİ (tautolojik): bayrak listesinin kendisini sınar. Gerçek kanıt aşağıdaki "proxy:" testidir
// (gerçek tarayıcı + izleyen vekil): bayrakların işe yaradığını yalnız o gösterir.
test('tarayiciBayraklari: yeni hedefler engelli, loopback dışı trafik ölü proxy\'de, profil dizini ve about:blank korunur', () => {
  assert.ok(mod, 'modül yok');
  const b = mod.tarayiciBayraklari('PROFIL-X');
  assert.ok(b.includes('--block-new-web-contents'));
  assert.ok(b.includes('--proxy-server=127.0.0.1:1'));
  // Chromium'un örtük bypass'ı (loopback + link-local + localhost adları) kaldırılır, yalnız 127.0.0.1 muaf kalır
  assert.ok(b.includes('--proxy-bypass-list=<-loopback>;127.0.0.1'), b.join(' '));
  assert.ok(b.includes('--user-data-dir=PROFIL-X'));
  assert.ok(b.includes('--headless=new'));
  assert.equal(b[b.length - 1], 'about:blank');
  assert.ok(mod.tarayiciBayraklari('P', { proxyPort: 4242 }).includes('--proxy-server=127.0.0.1:4242'));
});

// ---------------------------------------------------------------------------------------------
// B. TARAYICILI
// ---------------------------------------------------------------------------------------------

test('tarayıcı gerekli mi: UX_SINAMA_TARAYICI_ZORUNLU=1 iken tarayıcı yoksa sessiz atlama YOK, test başarısız olur', () => {
  if (process.env.UX_SINAMA_TARAYICI_ZORUNLU === '1') {
    assert.equal(TARAYICI_YOK_NEDENI, false, `tarayıcı zorunlu ama yok: ${TARAYICI_YOK_NEDENI}`);
  } else if (TARAYICI_YOK_NEDENI) {
    console.error(`UYARI: tarayıcı yok → B kümesi ATLANACAK (${TARAYICI_YOK_NEDENI})`);
  }
  assert.ok(mod, 'modül yok');
});

const SIRALI_SIDDET = ['ENGELLEYİCİ', 'ÖNEMLİ', 'KÜÇÜK'];
let sayac = 0;

// Koşucuyu çalıştırır; sonuc.json'u okur.
async function calis(ad, args) {
  const out = path.join(tmpDir, `cikti-${++sayac}-${ad}`);
  const r = await kos([...args, '--out', out]);
  const sonucYol = path.join(out, 'sonuc.json');
  const sonuc = existsSync(sonucYol) ? JSON.parse(readFileSync(sonucYol, 'utf8')) : null;
  return { r, out, sonuc };
}

function bulguTurleri(sonuc) {
  return new Set(sonuc.bulgular.map((b) => b.tur));
}

const KUSURLU_SENARYO = { ad: 'kusurlu-sinama', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'screenshot', ad: 'acilis' }] };

test('kusurlu fixture: koşucu kasıtlı kusurların HER BİRİNİ bulgu olarak üretir; bulgu = senaryo + ölçüm + kare; çıkış 1', B_ATLA, async () => {
  const sen = yaz('b/kusurlu.json', KUSURLU_SENARYO);
  const { r, out, sonuc } = await calis('kusurlu', [
    '--senaryo', sen, '--sun', path.join(FIXTURES, 'kusurlu'), '--matris', '390x844,1280x800', '--tema', 'acik',
  ]);
  assert.equal(r.status, 1, `stderr:\n${r.stderr}\nstdout:\n${r.stdout}`);
  assert.ok(sonuc, 'sonuc.json yazılmadı');
  const beklenen = ['konsol-hatasi', 'istisna', 'ag-hatasi', 'yatay-tasma', 'adsiz-oge', 'alt-eksik', 'baslik-atlama', 'dokunma-hedefi', 'odak-yok', 'kucuk-yazi'];
  const turler = bulguTurleri(sonuc);
  for (const t of beklenen) assert.ok(turler.has(t), `bulgu eksik: ${t} (üretilenler: ${[...turler].join(', ')})`);
  for (const b of sonuc.bulgular) {
    assert.ok(SIRALI_SIDDET.includes(b.siddet), `şiddet geçersiz: ${b.siddet}`);
    assert.equal(b.senaryo, 'kusurlu-sinama');
    assert.ok(b.hucre && /^\d+x\d+-(acik|koyu)$/.test(b.hucre), `hücre: ${b.hucre}`);
    assert.ok(b.olcum && typeof b.olcum === 'object' && Object.keys(b.olcum).length > 0, `ölçüm yok: ${b.tur}`);
    assert.ok(b.kare && existsSync(path.join(out, b.kare)), `kare yok: ${b.tur} → ${b.kare}`);
    assert.ok(b.id && b.mesaj);
  }
  // dokunmatik hedef yalnız 390 genişlikte denetlenir
  assert.ok(sonuc.bulgular.filter((b) => b.tur === 'dokunma-hedefi').every((b) => b.hucre.startsWith('390x')), 'dokunma-hedefi yalnız 390 hücresinde');
  assert.ok(sonuc.bulgular.some((b) => b.tur === 'yatay-tasma' && b.hucre.startsWith('1280x')), '1280 hücresinde de taşma var (1500px kutu)');
  // yatay taşma ölçümü sayısal
  const tasma = sonuc.bulgular.find((b) => b.tur === 'yatay-tasma' && b.hucre.startsWith('390x'));
  assert.equal(tasma.olcum.scrollWidth >= 1500, true);
  assert.equal(tasma.olcum.innerWidth, 390);
  // yapı
  assert.equal(sonuc.matris.length, 2);
  assert.ok(sonuc.ozet && sonuc.ozet['ÖNEMLİ'] > 0);
  assert.ok(sonuc.matris.every((h) => h.adimlar.every((a) => a.durum === 'gecti')));
  // RAPOR.md
  const rapor = readFileSync(path.join(out, 'RAPOR.md'), 'utf8');
  assert.match(rapor, /kusurlu-sinama/);
  assert.match(rapor, /ÖNEMLİ/);
  assert.match(rapor, /yatay-tasma/);
  assert.doesNotMatch(rapor, /\{\{/, 'şablonda doldurulmamış yer tutucu kaldı');
  // kare dosyaları gerçek PNG
  const kareler = readdirSync(path.join(out, 'kareler')).filter((f) => f.endsWith('.png'));
  assert.ok(kareler.length >= 2);
  const png = readFileSync(path.join(out, 'kareler', kareler[0]));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  // yerel yol sızmaz
  for (const metin of [readFileSync(path.join(out, 'sonuc.json'), 'utf8'), rapor]) {
    assert.equal(metin.includes(runRoot), false, 'geçici dizin yolu çıktıya sızdı');
    assert.equal(metin.includes(tmpDir), false, 'çıktı yolu çıktıya sızdı');
  }
  assert.match(r.stdout, /ÖZET/);
});

const TEMIZ_SENARYO = {
  ad: 'temiz-kayit',
  adimlar: [
    { adim: 'goto', url: '/' },
    { adim: 'fill', role: 'textbox', name: 'Ad', deger: 'Ayşe' },
    { adim: 'click', role: 'button', name: 'Kaydet' },
    { adim: 'waitFor', metin: 'Kaydedildi: Ayşe' },
    { adim: 'assertText', metin: 'Kaydedildi' },
    { adim: 'assertVisible', role: 'status' },
    { adim: 'screenshot', ad: 'kaydedildi' },
  ],
};

test('temiz fixture: tam 3x2 matris, --tekrar 2: bulgu yok, kararsızlık yok, tüm adımlar geçti, çıkış 0', B_ATLA, async () => {
  const sen = yaz('b/temiz.json', TEMIZ_SENARYO);
  const { r, out, sonuc } = await calis('temiz', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--tekrar', '2']);
  assert.equal(r.status, 0, `stderr:\n${r.stderr}\nstdout:\n${r.stdout}\n${sonuc ? JSON.stringify(sonuc.bulgular, null, 1) : ''}`);
  assert.deepEqual(sonuc.bulgular, []);
  assert.deepEqual(sonuc.kararsiz, []);
  assert.equal(sonuc.matris.length, 6, '3 görünüm alanı x 2 tema');
  for (const h of sonuc.matris) {
    assert.equal(h.adimlar.length, TEMIZ_SENARYO.adimlar.length);
    assert.ok(h.adimlar.every((a) => a.durum === 'gecti'), `${h.hucre}: ${JSON.stringify(h.adimlar)}`);
  }
  assert.ok(existsSync(path.join(out, 'RAPOR.md')));
  assert.match(readFileSync(path.join(out, 'RAPOR.md'), 'utf8'), /bulgu yok/i);
});

test('metin hedefi + press Enter ile gönderim çalışır; tema ve kararlılık emülasyonları hücreye yansır', B_ATLA, async () => {
  const sen = yaz('b/metin.json', {
    ad: 'metin-hedefi',
    adimlar: [
      { adim: 'goto', url: '/' },
      { adim: 'fill', role: 'textbox', name: 'Ad', deger: 'Mehmet' },
      { adim: 'press', tus: 'Enter' },
      { adim: 'waitFor', metin: 'Kaydedildi: Mehmet' },
      { adim: 'click', metin: 'Kaydet' },
      { adim: 'assertText', metin: 'Kaydedildi: Mehmet' },
    ],
  });
  const { r, sonuc } = await calis('metin', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'koyu']);
  assert.equal(r.status, 0, `stderr:\n${r.stderr}\n${JSON.stringify(sonuc?.matris?.[0]?.adimlar)}`);
  assert.equal(sonuc.matris[0].tema, 'koyu');
  assert.equal(sonuc.matris[0].olcumler.renkSemasiKoyu, true, 'prefers-color-scheme: dark emülasyonu uygulanmadı');
  assert.equal(sonuc.matris[0].olcumler.azaltilmisHareket, true, 'prefers-reduced-motion: reduce uygulanmadı');
  assert.equal(sonuc.matris[0].olcumler.dil, 'tr-TR');
});

test('favicon.ico 404 gürültüsü ÖNEMLİ sayılmaz: KÜÇÜK kalır, çıkış 0', B_ATLA, async () => {
  const kok = path.join(tmpDir, 'b/favikonsuz');
  mkdirSync(kok, { recursive: true });
  writeFileSync(path.join(kok, 'index.html'), '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>x</title></head><body><h1>Merhaba</h1></body></html>');
  const sen = yaz('b/favikonsuz.json', { ad: 'favikonsuz', adimlar: [{ adim: 'goto', url: '/' }] });
  const { r, sonuc } = await calis('favikonsuz', ['--senaryo', sen, '--sun', kok, '--matris', '1280x800', '--tema', 'acik']);
  assert.equal(r.status, 0, `stderr:\n${r.stderr}\n${JSON.stringify(sonuc?.bulgular)}`);
  for (const b of sonuc.bulgular) {
    assert.equal(b.tur, 'ag-hatasi');
    assert.equal(b.siddet, 'KÜÇÜK');
    assert.equal(b.olcum.yol, '/favicon.ico');
  }
});

test('--setup her belgeden önce çalışır (Date.now sabitleme)', B_ATLA, async () => {
  const sen = yaz('b/setup.json', { ad: 'setup', adimlar: [{ adim: 'goto', url: '/' }] });
  const { r, sonuc } = await calis('setup', [
    '--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik',
    '--setup', 'Date.now = () => 1767225600000;',
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(sonuc.matris[0].olcumler.dateNow, 1767225600000);
});

test('başarısız assert: çıkış 1, ENGELLEYİCİ adim-basarisiz bulgusu, sonraki adımlar atlandı', B_ATLA, async () => {
  const sen = yaz('b/basarisiz.json', {
    ad: 'basarisiz-assert',
    adimlar: [{ adim: 'goto', url: '/' }, { adim: 'assertText', metin: 'bu metin sayfada yok' }, { adim: 'screenshot', ad: 'asla' }],
  });
  const { r, sonuc } = await calis('basarisiz', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik']);
  assert.equal(r.status, 1, r.stderr);
  const b = sonuc.bulgular.find((x) => x.tur === 'adim-basarisiz');
  assert.ok(b, 'adim-basarisiz bulgusu yok');
  assert.equal(b.siddet, 'ENGELLEYİCİ');
  assert.equal(b.olcum.adimNo, 2);
  const durumlar = sonuc.matris[0].adimlar.map((a) => a.durum);
  assert.deepEqual(durumlar, ['gecti', 'basarisiz', 'atlandi']);
});

test('adım hedefi bulunamazsa (olmayan düğme) sonsuza dek beklemez: ENGELLEYİCİ adim-basarisiz', B_ATLA, async () => {
  const sen = yaz('b/yok-dugme.json', {
    ad: 'yok-dugme',
    adimlar: [{ adim: 'goto', url: '/' }, { adim: 'click', role: 'button', name: 'Olmayan Düğme' }],
  });
  const { r, sonuc } = await calis('yok-dugme', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik']);
  assert.equal(r.status, 1, r.stderr);
  assert.ok(sonuc.bulgular.some((b) => b.tur === 'adim-basarisiz' && /Olmayan Düğme/.test(b.mesaj)));
});

test('dış istek engeli: sayfa 127.0.0.1 dışına alt istek atarsa istek ENGELLENİR ve ENGELLEYİCİ dis-istek bulgusu olur', B_ATLA, async () => {
  const sen = yaz('b/dis.json', { ad: 'dis-istek', adimlar: [{ adim: 'goto', url: '/' }] });
  const { r, sonuc } = await calis('dis', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'disari-istek'), '--matris', '1280x800', '--tema', 'acik']);
  assert.equal(r.status, 1, r.stderr);
  const b = sonuc.bulgular.find((x) => x.tur === 'dis-istek');
  assert.ok(b, `dis-istek yok: ${[...bulguTurleri(sonuc)]}`);
  assert.equal(b.siddet, 'ENGELLEYİCİ');
  assert.match(b.olcum.host, /192\.0\.2\.1/);
});

test('dış yönlendirme: 127.0.0.1 → dış adrese 302 engellenir ve bulgu olur', B_ATLA, async () => {
  const sunucu = createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(302, { Location: 'http://192.0.2.1/gizli' });
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => sunucu.listen(0, '127.0.0.1', r));
  try {
    const sen = yaz('b/yonlendirme.json', { ad: 'yonlendirme', adimlar: [{ adim: 'goto', url: '/' }] });
    const { r, sonuc } = await calis('yonlendirme', [
      '--senaryo', sen, '--url', `http://127.0.0.1:${sunucu.address().port}/`, '--matris', '1280x800', '--tema', 'acik',
    ]);
    assert.equal(r.status, 1, r.stderr);
    assert.ok(sonuc.bulgular.some((b) => b.tur === 'dis-istek' && b.siddet === 'ENGELLEYİCİ'), JSON.stringify(sonuc.bulgular.map((b) => b.tur)));
  } finally {
    await new Promise((r) => sunucu.close(r));
  }
});

test('kararsız senaryo: --tekrar 2 sonuçları farklıysa kararsız uyarısı verilir, ürün bulgusu sayılmaz (çıkış 0)', B_ATLA, async () => {
  let sayim = 0;
  const sunucu = createServer((req, res) => {
    if (req.url === '/') {
      sayim++;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>k</title><link rel="icon" href="data:,"></head><body><h1>SÜRÜM ${sayim}</h1></body></html>`);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => sunucu.listen(0, '127.0.0.1', r));
  try {
    const sen = yaz('b/kararsiz.json', { ad: 'kararsiz-sinama', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'assertText', metin: 'SÜRÜM 1' }] });
    const { r, out, sonuc } = await calis('kararsiz', [
      '--senaryo', sen, '--url', `http://127.0.0.1:${sunucu.address().port}/`, '--matris', '1280x800', '--tema', 'acik', '--tekrar', '2',
    ]);
    assert.equal(r.status, 0, `stderr:\n${r.stderr}\n${JSON.stringify(sonuc?.bulgular)}`);
    assert.equal(sonuc.kararsiz.length, 1);
    assert.equal(sonuc.kararsiz[0].hucre, '1280x800-acik');
    assert.deepEqual(sonuc.bulgular, [], 'kararsız hücrenin bulguları ürün bulgusu sayılmamalı');
    assert.match(readFileSync(path.join(out, 'RAPOR.md'), 'utf8'), /1280x800-acik: kararsız senaryo/);
  } finally {
    await new Promise((r) => sunucu.close(r));
  }
});

test('beklenti.json: kanıtlı beklenti karşılandı, adımsız beklenti kanıtsız (ÖNEMLİ, çıkış 1), bilinmeyen kimlik çıkış 2', B_ATLA, async () => {
  const beklenti = yaz('b/beklenti.json', {
    senaryo: 'beklentili',
    beklentiler: [
      { id: 'B1', metin: 'Kaydet sonrası durum satırında Kaydedildi görünür' },
      { id: 'B2', metin: 'Hiçbir adımın kanıtlamadığı bir beklenti' },
    ],
  });
  const sen = yaz('b/beklentili.json', {
    ad: 'beklentili',
    adimlar: [
      { adim: 'goto', url: '/' },
      { adim: 'fill', role: 'textbox', name: 'Ad', deger: 'Ali' },
      { adim: 'click', role: 'button', name: 'Kaydet' },
      { adim: 'waitFor', metin: 'Kaydedildi: Ali', beklenti: 'B1' },
      { adim: 'assertText', metin: 'Kaydedildi', beklenti: 'B1' },
    ],
  });
  const ortak = ['--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik'];
  const { r, sonuc } = await calis('beklenti', ['--senaryo', sen, '--beklenti', beklenti, ...ortak]);
  assert.equal(r.status, 1, r.stderr);
  const durum = Object.fromEntries(sonuc.beklentiler.map((b) => [b.id, b.durum]));
  assert.deepEqual(durum, { B1: 'karsilandi', B2: 'kanitsiz' });
  assert.ok(sonuc.bulgular.some((b) => b.tur === 'beklenti-kanitsiz' && b.siddet === 'ÖNEMLİ'));

  const kotu = yaz('b/beklenti-kotu.json', {
    ad: 'beklentili',
    adimlar: [{ adim: 'goto', url: '/' }, { adim: 'assertText', metin: 'Kayıt formu', beklenti: 'B9' }],
  });
  const r2 = await calis('beklenti-kotu', ['--senaryo', kotu, '--beklenti', beklenti, ...ortak]);
  assert.equal(r2.r.status, 2, r2.r.stderr);
  assert.match(r2.r.stderr, /B9/);
  assert.doesNotMatch(r2.r.stderr, /profil:/);
});

function profilDizini(stderr) {
  const m = stderr.match(/profil: (.+)/);
  assert.ok(m, `stderr'de profil satırı yok:\n${stderr}`);
  const ad = m[1].trim();
  assert.equal(ad, path.basename(ad), 'stderr tam profil yolu (kullanıcı adı içerir) yazmamalı; yalnız dizin adı');
  assert.doesNotMatch(stderr, /cdp: port=\d+ profil=\S*[\\/]/, 'cdp satırı da tam yol yazmamalı');
  return path.join(runRoot, ad);
}

test('süreç hijyeni: başarı, ENGELLEYİCİ bulgu ve zaman aşımı yollarında profil dizini ve tarayıcı süreci kalmaz; --sun sunucusu kapanır', B_ATLA, async () => {
  // 1) başarı yolu (+ sunucu kapanışı)
  const sen = yaz('b/hijyen.json', { ad: 'hijyen', adimlar: [{ adim: 'goto', url: '/' }] });
  const ok = await calis('hijyen-ok', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik']);
  assert.equal(ok.r.status, 0, ok.r.stderr);
  const pd = profilDizini(ok.r.stderr);
  assert.equal(existsSync(pd), false, 'profil dizini hâlâ duruyor (başarı)');
  assert.equal(countProcessesWithProfile(pd), 0, 'yetim tarayıcı (başarı)');
  const portSatiri = ok.r.stderr.match(/sunucu: http:\/\/127\.0\.0\.1:(\d+)\//);
  assert.ok(portSatiri, 'sunucu satırı yok');
  await assert.rejects(fetch(`http://127.0.0.1:${portSatiri[1]}/`, { signal: AbortSignal.timeout(1000) }), '--sun sunucusu çıkışta kapanmadı');

  // 2) bulgu yolu (çıkış 1)
  const kus = yaz('b/hijyen-kus.json', KUSURLU_SENARYO);
  const k = await calis('hijyen-kus', ['--senaryo', kus, '--sun', path.join(FIXTURES, 'kusurlu'), '--matris', '390x844', '--tema', 'acik']);
  assert.equal(k.r.status, 1, k.r.stderr);
  const pd2 = profilDizini(k.r.stderr);
  assert.equal(existsSync(pd2), false, 'profil dizini hâlâ duruyor (bulgu)');
  assert.equal(countProcessesWithProfile(pd2), 0, 'yetim tarayıcı (bulgu)');

  // 3) iç zaman aşımı, tarayıcı başlamadan (çıkış 3)
  const t1 = await calis('hijyen-t1', ['--senaryo', sen, '--sun', path.join(FIXTURES, 'temiz'), '--timeout-ms', '1']);
  assert.equal(t1.r.status, 3, t1.r.stderr);
  const pd3 = profilDizini(t1.r.stderr);
  assert.equal(existsSync(pd3), false, 'profil dizini hâlâ duruyor (erken zaman aşımı)');
  assert.equal(countProcessesWithProfile(pd3), 0, 'yetim tarayıcı (erken zaman aşımı)');

  // 4) iç zaman aşımı, tarayıcı çalışırken (waitFor hiç gelmeyecek metni bekler)
  const bekle = yaz('b/hijyen-bekle.json', { ad: 'bekle', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'waitFor', metin: 'asla gelmeyecek', zamanAsimiMs: 120000 }] });
  const t2 = await calis('hijyen-t2', ['--senaryo', bekle, '--sun', path.join(FIXTURES, 'temiz'), '--matris', '1280x800', '--tema', 'acik', '--timeout-ms', '9000']);
  assert.equal(t2.r.status, 3, t2.r.stderr);
  const pd4 = profilDizini(t2.r.stderr);
  assert.equal(existsSync(pd4), false, 'profil dizini hâlâ duruyor (çalışırken zaman aşımı)');
  assert.equal(countProcessesWithProfile(pd4), 0, 'yetim tarayıcı (çalışırken zaman aşımı)');
  assert.equal(countProcessesWithProfile(runRoot), 0, 'runRoot altında yetim tarayıcı');
});

// ---------------------------------------------------------------------------------------------
// C. TUR 2 (Fable bulguları): çıktı bekçisi, yeni hedef / proxy savunması
// ---------------------------------------------------------------------------------------------

function sayfaSunucusu(govde, { ekBasliklar = {} } = {}) {
  return createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...ekBasliklar });
      res.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>s</title><link rel="icon" href="data:,"></head><body>${govde}</body></html>`);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
const dinle = (s) => new Promise((r) => s.listen(0, '127.0.0.1', r));
const kapat = (s) => new Promise((r) => s.close(r));

test('çıktı bekçisi: konsola 11 haneli sayı basan sayfa → sonuc.json ve RAPOR.md YAZILMAZ, yalnız dosya:satır ve desen adı stderr\'e, çıkış 2', B_ATLA, async () => {
  // 11 hane kaynakta bitişik yazılmaz; yalnız çalışma zamanında oluşur (girdi bekçisi bunu göremez)
  const sunucu = sayfaSunucusu('<h1>Sızıntı</h1><script>console.error("kimlik " + "1234567" + "8901")</script>');
  await dinle(sunucu);
  try {
    const sen = yaz('c/sizinti.json', { ad: 'sizinti', adimlar: [{ adim: 'goto', url: '/' }] });
    const { r, out, sonuc } = await calis('sizinti', [
      '--senaryo', sen, '--url', `http://127.0.0.1:${sunucu.address().port}/`, '--matris', '1280x800', '--tema', 'acik',
    ]);
    assert.equal(r.status, 2, `stderr:\n${r.stderr}\nstdout:\n${r.stdout}`);
    assert.equal(sonuc, null, 'sonuc.json YAZILMAMALI');
    assert.equal(existsSync(path.join(out, 'RAPOR.md')), false, 'RAPOR.md YAZILMAMALI');
    assert.match(r.stderr, /sonuc\.json:\d+\s+desen=on-bir-hane/, 'dosya:satır ve desen adı yazılmalı');
    assert.doesNotMatch(r.stderr + r.stdout, /12345678901/, 'eşleşen değer ASLA yazılmamalı');
    assert.doesNotMatch(r.stdout, /ÖZET/);
  } finally {
    await kapat(sunucu);
  }
});

test('kareleriSil: yalnız verilen yolları siler, silinemeyeni "kalan" olarak döndürür (başkasının dosyasına dokunmaz)', () => {
  assert.ok(mod, 'modül yok');
  const silinmeyen = [];
  const sahteSil = (p) => {
    if (p.endsWith('kilitli.png')) throw new Error('EPERM');
    silinmeyen.push(p);
  };
  const r = mod.kareleriSil(['kareler/a.png', 'kareler/kilitli.png', 'kareler/b.png'], sahteSil);
  assert.deepEqual(r.silinen, ['kareler/a.png', 'kareler/b.png']);
  assert.deepEqual(r.kalan, ['kareler/kilitli.png']);
  assert.deepEqual(silinmeyen, ['kareler/a.png', 'kareler/b.png']);
  assert.deepEqual(mod.kareleriSil([], sahteSil), { silinen: [], kalan: [] });
  // yazılmamış (ENOENT) dosya "kaldı" sayılmaz
  const enoent = mod.kareleriSil(['x.png'], () => { const e = new Error('yok'); e.code = 'ENOENT'; throw e; });
  assert.deepEqual(enoent, { silinen: [], kalan: [] });
});

test('çıktı bekçisi: tetiklenince bu koşunun kareleri SİLİNİR (başkasının dosyası kalır), stderr\'de sayı yazılır, değer yazılmaz', B_ATLA, async () => {
  const sunucu = sayfaSunucusu('<h1>Sızıntı</h1><script>console.error("kimlik " + "1234567" + "8901")</script>');
  await dinle(sunucu);
  try {
    const sen = yaz('c/kare-sil.json', { ad: 'kare-sil', adimlar: [{ adim: 'goto', url: '/' }, { adim: 'screenshot', ad: 'ilk' }] });
    const out = path.join(tmpDir, 'c/kare-sil-out');
    mkdirSync(path.join(out, 'kareler'), { recursive: true });
    writeFileSync(path.join(out, 'kareler', 'baska.png'), 'BASKASININ');
    const r = await kos(['--senaryo', sen, '--url', `http://127.0.0.1:${sunucu.address().port}/`, '--matris', '1280x800', '--tema', 'acik', '--out', out]);
    assert.equal(r.status, 2, `stderr:\n${r.stderr}`);
    const kalan = readdirSync(path.join(out, 'kareler'));
    assert.deepEqual(kalan, ['baska.png'], `bu koşunun kareleri silinmeliydi; kalanlar: ${kalan.join(', ')}`);
    assert.equal(readFileSync(path.join(out, 'kareler', 'baska.png'), 'utf8'), 'BASKASININ');
    const m = r.stderr.match(/(\d+) kare silindi/);
    assert.ok(m && Number(m[1]) >= 2, `stderr'de "N kare silindi" (N>=2: screenshot + son kare) yok:\n${r.stderr}`);
    assert.doesNotMatch(r.stderr, /KALDI/);
    assert.doesNotMatch(r.stderr + r.stdout, /12345678901/);
    assert.equal(existsSync(path.join(out, 'sonuc.json')), false);
  } finally {
    await kapat(sunucu);
  }
});

test('çıktı bekçisi: --yasak-desen özel desenleri de çıktıda uygulanır', B_ATLA, async () => {
  const sunucu = sayfaSunucusu('<h1>Sızıntı</h1><script>console.error("GIZLIMARKA-" + 7)</script>');
  await dinle(sunucu);
  try {
    const desen = yaz('c/desenler.txt', 'GIZLIMARKA-\\d+\n');
    const sen = yaz('c/sizinti2.json', { ad: 'sizinti2', adimlar: [{ adim: 'goto', url: '/' }] });
    const { r, out, sonuc } = await calis('sizinti2', [
      '--senaryo', sen, '--url', `http://127.0.0.1:${sunucu.address().port}/`, '--yasak-desen', desen, '--matris', '1280x800', '--tema', 'acik',
    ]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(sonuc, null);
    assert.equal(existsSync(path.join(out, 'RAPOR.md')), false);
    assert.match(r.stderr, /desen=ozel:/);
    assert.doesNotMatch(r.stderr, /GIZLIMARKA-7/);
  } finally {
    await kapat(sunucu);
  }
});

// Savunma derinliği: CDP Fetch bekçisi yalnız ana sayfa hedefini görür; window.open ile açılan yeni hedefin
// loopback dışı trafiği (192.0.2.1 = TEST-NET-1) ölü proxy'ye düşmelidir. Burada proxy yerine İZLEYEN bir
// vekil sunucu kullanılır: dış istek vekile düşer (= doğrudan çıkmadı), loopback vekile uğramaz (= muaf).
test('proxy: loopback proxy\'den muaftır (sınama bozulmaz), loopback dışı trafik proxy\'ye düşer; window.open ile açılan yeni hedef doğrudan dışarı çıkmaz', B_ATLA, async () => {
  const proxyGoruldu = [];
  const proxy = createServer((req, res) => {
    proxyGoruldu.push(req.url);
    res.writeHead(502);
    res.end();
  });
  proxy.on('connect', (req, soket) => {
    proxyGoruldu.push(req.url);
    soket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });
  await dinle(proxy);
  const yerelGoruldu = [];
  const yerel = createServer((req, res) => {
    yerelGoruldu.push(req.url);
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>p</title><img alt="dış" src="http://192.0.2.1/dis.png"><img alt="iç" src="/ok.svg">'
        // Chromium'un örtük bypass kuralları (link-local, *.localhost) <-loopback> ile kaldırılmış olmalı: bunlar da vekile düşer.
        // Adresler kasıtlı olarak "metadata ucu" (169.254.169.254) DEĞİL; vekil ölü/izleyici olduğundan dışarı bir şey çıkmaz.
        + '<img alt="ll4" src="http://169.254.1.1/ll4.png"><img alt="ll6" src="http://[fe80::1]/ll6.png"><img alt="lh" src="http://deneme.localhost/lh.png">'
        + `<script>window.open('http://127.0.0.1:${yerel.address().port}/popup-yerel'); window.open('http://192.0.2.1/popup-dis');</script>`);
    } else {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    }
  });
  await dinle(yerel);
  const profil = mkdtempSync(path.join(runRoot, 'proxy-profil-'));
  let child = null;
  try {
    const args = mod.tarayiciBayraklari(profil, { proxyPort: proxy.address().port });
    // yalnız bu testte: script ile açılan popup'a (kullanıcı hareketi olmadan) izin ver
    args.splice(args.length - 1, 1, '--disable-popup-blocking', `http://127.0.0.1:${yerel.address().port}/`);
    child = spawn(mod.tarayiciBul(null), args, { stdio: 'ignore' });
    const bitis = Date.now() + 25000;
    const hepsiGoruldu = () => /192\.0\.2\.1/.test(proxyGoruldu.join(' ')) && /169\.254\.1\.1/.test(proxyGoruldu.join(' '))
      && /fe80::1/.test(proxyGoruldu.join(' ')) && /deneme\.localhost/.test(proxyGoruldu.join(' ')) && yerelGoruldu.includes('/ok.svg');
    while (Date.now() < bitis && !hepsiGoruldu()) {
      await new Promise((res) => setTimeout(res, 200));
    }
    await new Promise((res) => setTimeout(res, 2000)); // popup'ların oturması için
    assert.ok(yerelGoruldu.includes('/ok.svg'), `loopback hedefi proxy'siz yüklenmeli: ${yerelGoruldu.join(',')}`);
    assert.ok(proxyGoruldu.some((u) => /192\.0\.2\.1/.test(u)), `dış istek proxy'ye düşmeli: ${proxyGoruldu.join(',')}`);
    assert.equal(proxyGoruldu.some((u) => /127\.0\.0\.1/.test(u)), false, 'loopback proxy\'ye gitmemeli');
    // örtük bypass kaldırıldı: link-local ve *.localhost adları proxy'siz doğrudan çıkmaz, vekile düşer
    for (const [ad, re] of [['169.254.x', /169\.254\.1\.1/], ['fe80::', /fe80::1/], ['*.localhost', /deneme\.localhost/]]) {
      assert.ok(proxyGoruldu.some((u) => re.test(u)), `${ad} vekile düşmeli (örtük bypass kaldırılmalı): ${proxyGoruldu.join(',')}`);
    }
    // yeni hedef: açıldıysa (loopback popup yüklendiyse) dış popup'ı da proxy'ye düşmüş olmalı; açılmadıysa
    // (--block-new-web-contents etkiliyse) yeni hedef zaten yok. İki durumda da doğrudan dış çıkış yok.
    if (yerelGoruldu.includes('/popup-yerel')) {
      assert.ok(proxyGoruldu.some((u) => /192\.0\.2\.1.*popup-dis/.test(u)), `dış popup proxy'ye düşmeli: ${proxyGoruldu.join(',')}`);
    }
    console.error(`bilgi: yeni hedef ${yerelGoruldu.includes('/popup-yerel') ? 'AÇILDI (dış trafiği proxy\'ye düştü)' : 'ENGELLENDİ'}`);
  } finally {
    if (mod?.killByProfileDir) mod.killByProfileDir(profil);
    child?.kill();
    await new Promise((res) => setTimeout(res, 500));
    try { rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
    await kapat(proxy);
    await kapat(yerel);
  }
});
