// capture-page.mjs için testler (node:test). Bağımlılıksız: yalnız node:test +
// node:http (yerel test sunucusu) + node:child_process (betiği çağırmak için).
// Çalıştırma: node --test .claude/skills/prove-it/scripts/capture-page.selftest.mjs
//
// (pilot-dersleri-2 / kapsam C: dosya adı `capture-page.selftest.mjs` olarak
// değiştirildi — `capture-page.test.mjs` Vitest'in varsayılan test dosyası
// desenine (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) uyuyordu; bu betikleri
// kopyalayan bir host projede kökte Vitest çalışıyorsa `npm test` bu dosyayı
// KENDİ testi sanıp "No test suite found" ile başarısız oluyordu — bkz.
// scratchpad RED/GREEN tekrarı, PROOF.md "C" bölümü.)
//
// ÖNEMLİ: betik çağrıları ASENKRON `spawn` ile yapılır, ASLA `spawnSync` ile.
// Bu dosyadaki test sunucusu (node:http) AYNI süreçte, AYNI olay döngüsünde
// çalışır; `spawnSync` olay döngüsünü tamamen bloke eder, bu yüzden alt
// süreçteki tarayıcı test sunucusuna bağlanamaz ve gezinme sonsuza kadar
// asılı kalır (dış zaman aşımı süreci zorla öldürene kadar) — bu da betiğin
// kendi `finally` temizliğine hiç ulaşmadan yetim tarayıcı bırakır. Kök neden
// ve düzeltme budur; bkz. PROOF.md "RED / Önce".
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, rmdirSync, existsSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'capture-page.mjs');
const IS_WINDOWS = process.platform === 'win32';

const PAGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body { background-color: rgb(255, 255, 255); }
  @media (prefers-color-scheme: dark) {
    body { background-color: rgb(17, 17, 17); }
  }
</style>
</head>
<body>
<script>
  document.title = localStorage.getItem('x') || 'bos';
</script>
</body>
</html>`;

let server;
let baseUrl;
let tmpDir;
let runRoot;
let processesBefore;

// ÖNEMLİ: eşleşme yalnız TARAYICI süreç adlarıyla (msedge.exe/chrome.exe/
// chromium.exe) sınırlanır. Genel bir CommandLine joker araması, arama
// dizesini KENDİ komut satırında taşıyan powershell/ps sorgu sürecinin
// KENDİSİYLE eşleşir (yanlış pozitif) — bu yüzden isim filtresi zorunludur.
const BROWSER_PROCESS_NAMES_WIN = "'msedge.exe','chrome.exe','chromium.exe'";
const BROWSER_PROCESS_NAMES_POSIX = ['msedge', 'chrome', 'chromium', 'Google Chrome', 'Microsoft Edge'];

// spawnSync burada bilerek kullanılıyor: bu betiğin TEST SUNUCUSUNA bağlı
// değil, kısa ömürlü tanı komutları (powershell/ps). runCapture ile
// KARIŞTIRILMAMALI — o asla spawnSync kullanmaz (bkz. dosya başı yorumu).
//
// pilot-dersleri-2 A6 (başka bir oturumun Fable incelemesi, fabrika-pilot
// PR #6): bu fonksiyon MAKİNE GENELİNDE, bu koşuya özgü olmayan bir desenle
// (yalnız 'capture-page-' alt dizesi) arama yapar. Aynı makinede bu test
// süitinin BAŞKA bir oturumu eşzamanlı çalışıyorsa (gözlenen: başka bir
// oturumun canlı `capture-page-ULYu9w` profili), bu tarama o oturumun
// TAMAMEN MEŞRU süreçlerini de bulur ve bu süiti YANLIŞ NEDENLE düşürür.
// Bu yüzden artık before()/after()/testler İÇİNDE ASSERT EDİLMEZ — yalnız
// BİLGİ amaçlı (console.error) kullanılır. Gerçek yetim/izolasyon kontrolü
// aşağıdaki `countProcessesWithProfile(runRoot)` ile, bu koşuya özgü kök
// dizine (`runRoot`) göre yapılır (bkz. `before()`, `runCapture`).
function countCapturePageProcessesMachineWide() {
  if (IS_WINDOWS) {
    const res = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @(${BROWSER_PROCESS_NAMES_WIN}) -and $_.CommandLine -match 'capture-page-' } | Measure-Object).Count`,
      ],
      { encoding: 'utf8' },
    );
    const n = parseInt((res.stdout || '').trim(), 10);
    return Number.isFinite(n) ? n : -1;
  }
  const res = spawnSync('ps', ['-eo', 'comm,args'], { encoding: 'utf8' });
  return (res.stdout || '')
    .split('\n')
    .filter((l) => l.includes('capture-page-') && BROWSER_PROCESS_NAMES_POSIX.some((n) => l.includes(n)))
    .length;
}

function countProcessesWithProfile(profileDir) {
  if (IS_WINDOWS) {
    const escaped = profileDir.replace(/'/g, "''");
    // REVIEW-2 KUCUK-1: `-like '*...*'` betikteki `.Contains()` ile aynı
    // filtreyi kullanmıyordu. `-like` deseni, profil yolu PowerShell joker
    // karakteri sayılan `[...]` (köşeli parantez) içerdiğinde YANLIŞ NEGATİF
    // verir: `[1]` bir karakter sınıfı olarak yorumlanır, ondan hemen önceki
    // sabit metinle bitişik konumda tek bir '1' karakteri BEKLER; gerçek
    // komut satırında o konumda '[' bulunduğundan eşleşme başarısız olur
    // (bkz. scratchpad demosu + REVIEW-2'nin kendi çoğaltması:
    // `%TEMP%\review2-w[1]-…` yolunda `-like` 0, `.Contains` 1 buldu).
    // Betikle (`buildProfileDirFilter`) aynı `.Contains()` filtresine geçildi.
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

before(async () => {
  // A6: bu koşuya ÖZGÜ, benzersiz bir kök dizin. `runCapture` her alt süreç
  // için TEMP/TMP/TMPDIR ortam değişkenlerini BU köke yönlendirir (betiğin
  // kendisi değişmeden — `os.tmpdir()` çağrıldığı süreçteki bu değişkenleri
  // okur), bu yüzden bu koşunun ürettiği TÜM tarayıcı profil dizinleri
  // `runRoot`'un altına düşer. Yetim/izolasyon sayımları artık bu köke göre
  // yapılır — başka bir eşzamanlı oturumun (farklı, kendi `runRoot`'u
  // altındaki) TAMAMEN MEŞRU süreçleri asla eşleşmez.
  runRoot = mkdtempSync(path.join(os.tmpdir(), 'capture-page-selftest-'));

  // REVIEW-1 KUCUK-3: önceden zorunlu kılınmıyordu (yalnız after() mesajında
  // görünüyordu) — önceden kalmış bir yetim, bu süiti YANLIŞ nedenle
  // düşürebilirdi. `runRoot` bu satırdan hemen önce YENİ üretildiği için bu
  // kontrol trivyal olarak 0'dır (başka hiçbir süreç henüz bu yolu
  // taşıyamaz) — yine de sözleşmeyi (ve olası gelecekteki bir yeniden
  // kullanım hatasını) burada açıkça belgelemek/yakalamak için tutulur.
  processesBefore = countProcessesWithProfile(runRoot);
  assert.equal(
    processesBefore,
    0,
    `test koşusu BAŞLAMADAN ÖNCE bu koşuya özgü kökte (${runRoot}) yetim capture-page-* tarayıcı süreci var (${processesBefore})`,
  );
  // Bilgi amaçlı (assert EDİLMEZ — A6): makine genelinde, izole edilmemiş
  // sayım. Başka bir eşzamanlı oturum çalışıyorsa burada >0 görülebilir; bu
  // NORMALDİR ve bu süiti etkilememelidir.
  console.error(`bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (başlangıç): ${countCapturePageProcessesMachineWide()}`);

  server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE_HTML);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/`;
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'capture-page-test-out-'));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  const processesAfter = countProcessesWithProfile(runRoot);
  assert.equal(
    processesAfter,
    0,
    `test koşusu sonunda bu koşuya özgü kökte (${runRoot}) yetim capture-page-* tarayıcı süreci kaldı (önce=${processesBefore}, sonra=${processesAfter})`,
  );
  console.error(`bilgi: makine geneli (izole edilmemiş) capture-page-* tarayıcı süreç sayısı (bitiş): ${countCapturePageProcessesMachineWide()}`);

  try {
    rmSync(runRoot, { recursive: true, force: true });
  } catch {}
});

// REVIEW-1 ONEMLI-2: bu düzenek daha önce alt süreci sabit 20000 ms'de
// `child.kill()` (Windows'ta TerminateProcess) ile öldürüyordu, ama testler
// `--timeout-ms` VERMEDİĞİNDEN betik kendi varsayımıyla (capture-page.mjs
// `timeoutMs: 30000`) çalışıyordu — düzenek zaman aşımı (20000) betiğin iç
// zaman aşımından (30000) KISAYDI. Betiğin kendi sözleşmesi (dosya başı
// yorum: "çağıran --timeout-ms'i KENDİ dış zaman aşımından KISA tutmalı,
// aksi halde temizlik fırsatı bulunamaz") tam tersini gerektirir; ihlal
// edilince Windows'ta `finally`/sinyal işleyicisi hiç çalışmadan yetim
// tarayıcı kalıyordu (PROOF.md'nin bizzat teşhis ettiği mekanizmanın aynısı).
// Düzeltme: düzenek --timeout-ms verilmemişse KENDİ küçük iç zaman aşımını
// enjekte eder ve düzenek zaman aşımını bundan TÜRETİR, sözleşmeyi burada da
// zorunlu kılar (aşağıdaki assert).
const DEFAULT_INNER_TIMEOUT_MS = 8000;
// capture-page.mjs'teki GERÇEK temizlik bütçesi (cleanupResources +
// removeProfileDir): waitForExit 1000 ms + en çok PROFILE_KILL_PASSES(3) tur
// x PROFILE_KILL_DELAY_MS(300 ms, 2 ara) = 600 ms + her tur ~1-2 kısa ömürlü
// powershell/pgrep çağrısı (yüklü makinede çağrı başına ~500 ms varsayımıyla
// ≈ 3000 ms) + removeProfileDir totalBudgetMs 15000 ms ≈ 19600 ms; güvenlik
// payıyla yukarı yuvarlandı.
const CLEANUP_BUDGET_MS = 25000;

// Betiği ASENKRON spawn ile çağırır (bkz. dosya başı yorumu — spawnSync BURADA
// YASAK). Node'un olay döngüsü boşta kalır, bu yüzden aynı süreçteki test
// sunucusu alt sürecin isteklerine cevap verebilir.
function runCapture(args) {
  const hasExplicitTimeout = args.includes('--timeout-ms');
  const innerTimeoutMs = hasExplicitTimeout
    ? Number(args[args.indexOf('--timeout-ms') + 1])
    : DEFAULT_INNER_TIMEOUT_MS;
  const effectiveArgs = hasExplicitTimeout ? args : [...args, '--timeout-ms', String(DEFAULT_INNER_TIMEOUT_MS)];
  // REVIEW-2 KUCUK-2: eski `opts.timeout` parametresi hiçbir çağıran
  // tarafından hiç kullanılmıyordu (ölü kod) ve sözleşmeyi delebilecek tek
  // kapıydı. Kaldırıldı — düzenek zaman aşımı artık HER ZAMAN
  // `innerTimeoutMs + CLEANUP_BUDGET_MS`'den türetilir.
  const harnessTimeoutMs = innerTimeoutMs + CLEANUP_BUDGET_MS;
  // Betiğin kendi sözleşmesi ("dış zaman aşımı iç olandan UZUN olmalı, en az
  // temizlik bütçesi kadar pay bırakmalı") testte de zorunlu kılınır — bu
  // formülü değiştirecek gelecekteki bir düzenleme sözleşmeyi ihlal ederse
  // burada patlar.
  assert.ok(
    harnessTimeoutMs >= innerTimeoutMs + CLEANUP_BUDGET_MS,
    `düzenek zaman aşımı (${harnessTimeoutMs}) iç zaman aşımı + temizlik bütçesinden (${innerTimeoutMs + CLEANUP_BUDGET_MS}) kısa olamaz`,
  );

  return new Promise((resolve) => {
    // A6: alt sürecin TEMP/TMP (Windows) ve TMPDIR (POSIX) ortam
    // değişkenleri `runRoot`'a yönlendirilir. Betik (`capture-page.mjs`)
    // profil dizinini `mkdtempSync(path.join(os.tmpdir(), 'capture-page-'))`
    // ile üretiyor; `os.tmpdir()` bu değişkenleri ÇAĞRILDIĞI sürecin kendi
    // ortamından okur — betikte hiçbir değişiklik gerekmez, yalnız burada
    // (çağıran tarafta) yönlendirmek yeterlidir. Sonuç: bu koşunun ürettiği
    // TÜM profil dizinleri `runRoot`'un altına düşer, izolasyon sayımları
    // (`countProcessesWithProfile(runRoot)`) yalnız BU koşunun süreçlerini
    // görür.
    const child = spawn('node', [SCRIPT, ...effectiveArgs], {
      windowsHide: true,
      env: { ...process.env, TEMP: runRoot, TMP: runRoot, TMPDIR: runRoot },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    const timer = setTimeout(() => {
      child.kill();
    }, harnessTimeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

function pngDims(buf) {
  assert.equal(buf.length >= 24, true, 'PNG dosyası çok kısa');
  const signature = buf.subarray(0, 8);
  const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(signature, expectedSig, 'PNG imzası eşleşmiyor');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function extractCdpDiag(stderr) {
  const m = stderr.match(/cdp: port=(\d+) profil=(.+)/);
  assert.ok(m, `stderr'de cdp tanı satırı bulunamadı:\n${stderr}`);
  return { port: Number(m[1]), profileDir: m[2].trim() };
}

function extractProfileDir(stderr) {
  const m = stderr.match(/profil: (.+)/);
  assert.ok(m, `stderr'de profil tanı satırı bulunamadı:\n${stderr}`);
  return m[1].trim();
}

test('temel yakalama: PNG imzası + IHDR boyutu istenenle eşleşir, çıkış 0', async () => {
  const out = path.join(tmpDir, 'basic.png');
  const res = await runCapture(['--url', baseUrl, '--out', out, '--width', '640', '--height', '400']);
  assert.equal(res.status, 0, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.ok(existsSync(out), 'PNG dosyası oluşmadı');
  const buf = readFileSync(out);
  const dims = pngDims(buf);
  assert.equal(dims.width, 640);
  assert.equal(dims.height, 400);
  assert.match(res.stdout, /Kaydedildi: .*\(640x400, \d+ B\)/);
});

test('--media prefers-color-scheme=dark karanlık CSS uygular, --media olmadan açık kalır', async () => {
  const outDark = path.join(tmpDir, 'dark.png');
  const resDark = await runCapture([
    '--url', baseUrl,
    '--out', outDark,
    '--width', '320', '--height', '200',
    '--media', 'prefers-color-scheme=dark',
    '--eval', 'getComputedStyle(document.body).backgroundColor',
  ]);
  assert.equal(resDark.status, 0, `stderr:\n${resDark.stderr}`);
  assert.match(resDark.stdout, /EVAL="rgb\(17, 17, 17\)"/);

  const outLight = path.join(tmpDir, 'light.png');
  const resLight = await runCapture([
    '--url', baseUrl,
    '--out', outLight,
    '--width', '320', '--height', '200',
    '--eval', 'getComputedStyle(document.body).backgroundColor',
  ]);
  assert.equal(resLight.status, 0, `stderr:\n${resLight.stderr}`);
  assert.match(resLight.stdout, /EVAL="rgb\(255, 255, 255\)"/);
});

test('--setup ile localStorage tohumlama sonrası DOM tohumu gösterir', async () => {
  const out = path.join(tmpDir, 'seed.png');
  const res = await runCapture([
    '--url', baseUrl,
    '--out', out,
    '--width', '320', '--height', '200',
    '--setup', "localStorage.setItem('x','tohum')",
    '--eval', 'document.title',
  ]);
  assert.equal(res.status, 0, `stderr:\n${res.stderr}`);
  assert.match(res.stdout, /EVAL="tohum"/);
});

test('temizlik: çıkıştan sonra profil dizini yok, CDP portu cevap vermiyor, yetim süreç kalmıyor', async () => {
  const out = path.join(tmpDir, 'cleanup.png');
  const res = await runCapture(['--url', baseUrl, '--out', out, '--width', '320', '--height', '200']);
  assert.equal(res.status, 0, `stderr:\n${res.stderr}`);
  const { port, profileDir } = extractCdpDiag(res.stderr);

  assert.equal(existsSync(profileDir), false, 'profil dizini hâlâ duruyor');

  await assert.rejects(
    fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) }),
    'CDP portu hâlâ cevap veriyor',
  );

  assert.equal(countProcessesWithProfile(profileDir), 0, 'yetim tarayıcı süreci kaldı (başarı yolu)');
});

test('erişilemeyen URL: çıkış 1, temizlik yapılmış, yetim süreç kalmıyor', async () => {
  const out = path.join(tmpDir, 'unreachable.png');
  const res = await runCapture(['--url', 'http://127.0.0.1:9/', '--out', out]);
  assert.equal(res.status, 1, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.equal(existsSync(out), false, 'başarısız yakalamada PNG oluşmamalı');
  const { profileDir } = extractCdpDiag(res.stderr);
  assert.equal(existsSync(profileDir), false, 'profil dizini hâlâ duruyor');
  assert.equal(countProcessesWithProfile(profileDir), 0, 'yetim tarayıcı süreci kaldı (hata yolu)');
});

test('iç zaman aşımı (--timeout-ms 1): çıkış 1, temizlik yapılmış, yetim süreç kalmıyor', async () => {
  const out = path.join(tmpDir, 'timeout.png');
  const res = await runCapture(['--url', baseUrl, '--out', out, '--timeout-ms', '1']);
  assert.equal(res.status, 1, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.equal(existsSync(out), false, 'zaman aşımında PNG oluşmamalı');
  const profileDir = extractProfileDir(res.stderr);
  assert.equal(existsSync(profileDir), false, 'profil dizini hâlâ duruyor');
  assert.equal(countProcessesWithProfile(profileDir), 0, 'yetim tarayıcı süreci kaldı (iç zaman aşımı yolu)');
});

// REVIEW-2 KUCUK-3: `--timeout-ms` betikte ADIM BAŞINA uygulanıyordu (her
// bekleme/gönderim kendi TAM --timeout-ms bütçesiyle, sıfırlanan bir saatle
// ölçülüyordu), TEK bir toplam süre sınırı değil. Bu senaryoda hiçbir TEK
// adım --timeout-ms'i aşmıyor (sayfa yükleme gecikmesi ve --wait-ms ayrı ayrı
// timeout-ms'in altında) ama TOPLAMLARI aşıyor — eski davranış bunu
// YAKALAYAMAZ, çıkış 0 ile başarıyla biter. Süreler bu makinede gözlenen
// gerçek headless Edge başlatma süresine (bkz. PROOF.md Tur 1/Tur 2, tam
// düzenek koşuları ~2.5–5.8 sn/test) geniş güvenlik payı bırakacak şekilde
// seçildi: delayMs(1500) tek başına timeout-ms'in (6000) çok altında (eski
// adım-bazlı sayfa-yükleme kontrolü her koşulda geçer); delayMs + waitMs
// (1500+6000=7500), en hızlı olası başlangıç süresinde bile timeout-ms'i
// (6000) aşacak kadar büyük (7500 > 6000, 1500 ms pay).
test('toplam süre sınırı: adım başına değil TÜM çalışmaya uygulanır (yavaş sayfa + --wait-ms toplamda aşar)', async () => {
  const delayMs = 1500;
  const waitMs = 6000;
  const timeoutMs = 6000;
  const delayServer = createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML);
    }, delayMs);
  });
  await new Promise((resolve) => delayServer.listen(0, '127.0.0.1', resolve));
  const { port: delayPort } = delayServer.address();
  const delayUrl = `http://127.0.0.1:${delayPort}/`;

  try {
    const out = path.join(tmpDir, 'global-timeout.png');
    const res = await runCapture([
      '--url', delayUrl,
      '--out', out,
      '--wait-ms', String(waitMs),
      '--timeout-ms', String(timeoutMs),
    ]);
    assert.equal(
      res.status,
      1,
      `beklenen: gecikme (${delayMs}ms) + --wait-ms (${waitMs}ms) toplamı --timeout-ms'i (${timeoutMs}ms) aşıyor, çıkış 1 olmalı; stderr:\n${res.stderr}\nstdout:\n${res.stdout}`,
    );
    assert.equal(existsSync(out), false, 'toplam süre sınırı aşıldığında PNG oluşmamalı');
    const profileDir = extractProfileDir(res.stderr);
    assert.equal(existsSync(profileDir), false, 'profil dizini hâlâ duruyor');
    assert.equal(countProcessesWithProfile(profileDir), 0, 'yetim tarayıcı süreci kaldı (toplam süre sınırı yolu)');
  } finally {
    await new Promise((resolve) => delayServer.close(resolve));
  }
});

// A6 (başka bir oturumun Fable incelemesi, fabrika-pilot PR #6): bu koşuya
// özgü kök-taramalı izolasyon kontrolü, AYNI makinede eşzamanlı çalışan
// BAŞKA bir (tamamen meşru) capture-page çalıştırmasından ETKİLENMEMELİ.
// "Başka oturum" burada GERÇEK bir tarayıcıyla simüle edilir: `runCapture`
// (bu dosyanın kendi env override'ıyla) DEĞİL, DOĞRUDAN `spawn` ile, env
// override OLMADAN çağrılır — bu yüzden alt süreç GERÇEK sistem TEMP'ini
// kullanır ve profili bu koşunun `runRoot`'unun TAMAMEN DIŞINDA oluşur.
test('izolasyon: eşzamanlı YABANCI bir capture-page- profili (başka oturumu simüle eder) bu koşunun kök-taramalı kontrolünü yanlış nedenle düşürmez', async () => {
  // Önce: kendi (izole) capture'ımızın profilinin GERÇEKTEN `runRoot`
  // altına düştüğünü doğrula (A6: "betikte değişiklik gerekmez" iddiasının
  // kanıtı — yalnız `runCapture`'ın env override'ı).
  const ownOut = path.join(tmpDir, 'own-isolation-check.png');
  const ownRes = await runCapture(['--url', baseUrl, '--out', ownOut, '--width', '320', '--height', '200']);
  assert.equal(ownRes.status, 0, `stderr:\n${ownRes.stderr}`);
  const ownProfileDir = extractProfileDir(ownRes.stderr);
  assert.ok(
    ownProfileDir.toLowerCase().startsWith(runRoot.toLowerCase()),
    `kendi profil dizinimiz (${ownProfileDir}) runRoot (${runRoot}) altında değil — env override çalışmıyor`,
  );

  // Yabancı (simüle) süreç: env override YOK, gerçek sistem temp'inde,
  // uzunca bir --wait-ms ile canlı tutuluyor.
  const foreignOut = path.join(tmpDir, 'foreign.png');
  const foreignPromise = new Promise((resolve) => {
    const child = spawn(
      'node',
      [SCRIPT, '--url', baseUrl, '--out', foreignOut, '--wait-ms', '3000', '--timeout-ms', '15000'],
      { windowsHide: true },
    );
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => resolve({ code, stderr }));
  });

  // Yabancı sürecin gerçekten başlayıp profilini oluşturması için bekleme.
  await new Promise((r) => setTimeout(r, 2000));

  const scoped = countProcessesWithProfile(runRoot);
  assert.equal(
    scoped,
    0,
    `kök-taramalı (izole) kontrol, kendi runRoot'unun DIŞINDAKİ yabancı süreçten etkilenmemeli (bulunan: ${scoped})`,
  );
  // Bilgi amaçlı (assert edilmez): makine geneli tarama bu sırada yabancı
  // süreci GÖRMELİ (>=1) — eski (A6 öncesi) before()/after() burada YANLIŞ
  // NEDENLE düşerdi; yeni kök-taramalı kontrol düşmez.
  const machineWide = countCapturePageProcessesMachineWide();
  console.error(
    `bilgi: yabancı süreç aktifken makine geneli (izole edilmemiş) tarama: ${machineWide} ` +
      `(>=1 beklenir; A6 öncesi before()/after() bu payı YANLIŞ NEDENLE 0 sanıp düşerdi)`,
  );

  const foreignResult = await foreignPromise;
  assert.equal(foreignResult.code, 0, `yabancı (simüle) capture başarısız oldu: ${foreignResult.stderr}`);
  const foreignProfileDir = extractProfileDir(foreignResult.stderr);
  assert.equal(
    foreignProfileDir.toLowerCase().startsWith(runRoot.toLowerCase()),
    false,
    `yabancı profil (${foreignProfileDir}) beklenmedik biçimde runRoot (${runRoot}) altında`,
  );
});

test('--url verilmezse çıkış 2', async () => {
  const out = path.join(tmpDir, 'nourl.png');
  const res = await runCapture(['--out', out]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
});

// pilot-dersleri-2 B REFACTOR (G4 bulgusu): "iddia bölgesini kırpıp
// büyüterek incelenir" ifadesi tek adımlık bir araç OLMADAN zaman
// baskısında uygulanmadı (özne 5/5 görseli açtı ama hiç kırpıntı üretmedi,
// yanlış "eşleşti" iddiasını commit'ledi). `--zoom-image` bu boşluğu kapatır.
test('--zoom-image ve --url birlikte verilemez: çıkış 2', async () => {
  const out = path.join(tmpDir, 'zoom-conflict.png');
  const res = await runCapture(['--url', baseUrl, '--zoom-image', 'dummy-does-not-matter.png', '--out', out]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  // Yalnız çıkış kodu 2 yeterli DEĞİL: "Bilinmeyen parametre" (bayrak hiç
  // tanınmıyor) da 2 ile çıkar ve bu testi YANLIŞLIKLA geçirir. Gerçek
  // doğrulamanın (BİRLİKTE verilemez) çalıştığını, "Bilinmeyen parametre"
  // YAZMADIĞINI doğrulayarak ayırt et.
  assert.doesNotMatch(res.stderr, /Bilinmeyen parametre/, `--zoom-image bayrağı tanınmıyor gibi görünüyor:\n${res.stderr}`);
  assert.match(res.stderr, /BİRLİKTE verilemez/i, `beklenen "BİRLİKTE verilemez" hatası yok:\n${res.stderr}`);
});

test("--zoom-image: bilinen desenli PNG'ten bölge kırpıp büyütür, IHDR ve merkez piksel doğru; geçersiz bölge çıkış 2 verir", async () => {
  // 1. Bilinen desenli kaynak PNG üret: beyaz zemin, (50,50)-(70,70) kırmızı kare.
  const squareHtml =
    '<!doctype html><html><body style="margin:0;background:#ffffff">' +
    '<div style="position:absolute;left:50px;top:50px;width:20px;height:20px;background:#ff0000;"></div>' +
    '</body></html>';
  const squareServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(squareHtml);
  });
  await new Promise((resolve) => squareServer.listen(0, '127.0.0.1', resolve));
  const { port: squarePort } = squareServer.address();
  const squareUrl = `http://127.0.0.1:${squarePort}/`;

  try {
    const sourceOut = path.join(tmpDir, 'zoom-source.png');
    const genRes = await runCapture(['--url', squareUrl, '--out', sourceOut, '--width', '200', '--height', '150']);
    assert.equal(genRes.status, 0, `kaynak PNG üretimi başarısız; stderr:\n${genRes.stderr}`);
    assert.ok(existsSync(sourceOut), 'kaynak PNG oluşmadı');

    // 2. Geçersiz bölge: görsel 200x150, bölge (190,140,20,20) sağ/alt sınırı aşıyor → çıkış 2, PNG üretilmez.
    const badZoomOut = path.join(tmpDir, 'zoom-bad.png');
    const badRes = await runCapture(['--zoom-image', sourceOut, '--region', '190,140,20,20', '--out', badZoomOut]);
    assert.equal(badRes.status, 2, `geçersiz bölge çıkış 2 vermeli; stderr:\n${badRes.stderr}\nstdout:\n${badRes.stdout}`);
    assert.equal(existsSync(badZoomOut), false, 'geçersiz bölgede PNG oluşmamalı');

    // 3. Geçerli bölge: (50,50,20,20), scale 4 → çıkış 0, IHDR TAM 80x80 (20*4, 20*4).
    const zoomOut = path.join(tmpDir, 'zoom-out.png');
    const zoomRes = await runCapture(['--zoom-image', sourceOut, '--region', '50,50,20,20', '--scale', '4', '--out', zoomOut]);
    assert.equal(zoomRes.status, 0, `stderr:\n${zoomRes.stderr}\nstdout:\n${zoomRes.stdout}`);
    const zoomBuf = readFileSync(zoomOut);
    const zoomDims = pngDims(zoomBuf);
    assert.equal(zoomDims.width, 80, 'çıktı genişliği w*scale (20*4) olmalı');
    assert.equal(zoomDims.height, 80, 'çıktı yüksekliği h*scale (20*4) olmalı');

    // 4. Merkez VE iki köşe piksel kırmızı mı? Kendi capture-page.mjs'imizle
    // (--url file://… + --eval ile canvas'a çizip getImageData) doğrula —
    // yeni bağımlılık yok. REVIEW-1 KUCUK-3: yalnız MERKEZ pikseli kontrol
    // etmek, bölgenin left/top işaret hatasını ya da ±birkaç piksellik
    // kaymasını YAKALAMAZ (merkez her iki durumda da hâlâ kare içinde
    // kalabilir); bölge tam kareye eşit olduğundan (0,0) ve (79,79) köşeleri
    // de [255,0,0,255] olmalı — ikisi de eklendi.
    const verifyHtml = `<!doctype html><html><body style="margin:0"><img id="i" src="data:image/png;base64,${zoomBuf.toString('base64')}"></body></html>`;
    const verifyHtmlPath = path.join(tmpDir, 'zoom-verify.html');
    writeFileSync(verifyHtmlPath, verifyHtml);
    const verifyUrl = pathToFileURL(verifyHtmlPath).href;
    const pixelOut = path.join(tmpDir, 'zoom-pixel-check.png');
    const evalExpr =
      "(() => { const img = document.getElementById('i'); const c = document.createElement('canvas'); " +
      "c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext('2d'); " +
      "ctx.drawImage(img, 0, 0); const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data); " +
      "return { center: at(Math.floor(c.width / 2), Math.floor(c.height / 2)), topLeft: at(0, 0), " +
      'bottomRight: at(c.width - 1, c.height - 1) }; })()';
    const pixelRes = await runCapture(['--url', verifyUrl, '--out', pixelOut, '--eval', evalExpr, '--width', '10', '--height', '10']);
    assert.equal(pixelRes.status, 0, `piksel doğrulama başarısız; stderr:\n${pixelRes.stderr}\nstdout:\n${pixelRes.stdout}`);
    const m = pixelRes.stdout.match(/EVAL=(.+)/);
    assert.ok(m, `EVAL çıktısı bulunamadı:\n${pixelRes.stdout}`);
    const pixels = JSON.parse(m[1]);
    for (const [label, [r, g, b]] of Object.entries(pixels)) {
      assert.equal(r, 255, `${label} piksel kırmızı (R) olmalı, bulunan: [${pixels[label].join(',')}]`);
      assert.equal(g, 0, `${label} piksel kırmızı (G=0) olmalı, bulunan: [${pixels[label].join(',')}]`);
      assert.equal(b, 0, `${label} piksel kırmızı (B=0) olmalı, bulunan: [${pixels[label].join(',')}]`);
    }

    // Yetim/profil temizliği (A6 kökü): bu testin ÜÇ `runCapture` çağrısı da
    // `runRoot` altında çalıştı, hiçbiri yetim bırakmamalı.
    assert.equal(countProcessesWithProfile(runRoot), 0, 'zoom testlerinden sonra yetim tarayıcı kaldı');
  } finally {
    await new Promise((resolve) => squareServer.close(resolve));
  }
});

// REVIEW-1 KUCUK-2: --region/--scale yalnız --zoom-image ile ANLAMLIDIR;
// önceden --url moduyla verildiğinde SESSİZCE YUTULUYORDU (denendi: --url
// about:blank --region 0,0,10,10 --scale 2 → çıkış 0, 50x40).
test('--region/--scale yalnız --zoom-image ile geçerli: --url moduyla verilirse çıkış 2', async () => {
  const out = path.join(tmpDir, 'region-with-url.png');
  const res = await runCapture([
    '--url', baseUrl,
    '--out', out,
    '--region', '0,0,10,10',
    '--scale', '2',
  ]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.equal(existsSync(out), false, '--region/--scale --url ile kabul edilmemeli, PNG oluşmamalı');
});

// REVIEW-1 KUCUK-1: `pngDims`/`prepareZoom` önceden PNG imzası/IHDR kontrolü
// yapmıyordu. Denenen iki arıza biçimi: (a) 100+ baytlık metin dosyası
// `--region`'sız verilince tarayıcı BAŞLATILIP CDP hatasıyla çıkış 1
// veriyordu; (b) `--region` ile verilince 40x40'lık "kırık görsel" simgesi
// SESSİZCE üretilip çıkış 0 dönüyordu (SAHTE BAŞARI); (c) 3 baytlık dosya
// RangeError ile çöküyordu. Artık ikisi de (imza yoksa VEYA dosya çok
// kısaysa) tarayıcı hiç AÇILMADAN (stderr'de "profil:" satırı YOK), açık
// bir mesajla çıkış 2 verir.
test('geçersiz PNG (--zoom-image): imza eşleşmiyorsa tarayıcı açılmadan açık mesajla çıkış 2', async () => {
  const badPng = path.join(tmpDir, 'not-a-png.png');
  writeFileSync(badPng, 'bu bir PNG değil, düz metin dosyası, seksen bayttan uzun olacak şekilde dolduruldu.......');
  const out = path.join(tmpDir, 'zoom-from-bad-png.png');
  const res = await runCapture(['--zoom-image', badPng, '--out', out]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.equal(existsSync(out), false, 'geçersiz PNG ile çıktı oluşmamalı');
  assert.doesNotMatch(res.stderr, /profil:/, `tarayıcı AÇILMAMALIYDI (profil satırı görüldü):\n${res.stderr}`);
  assert.match(res.stderr, /geçersiz PNG/i, `beklenen "geçersiz PNG" mesajı yok:\n${res.stderr}`);
});

test('geçersiz PNG (--zoom-image): 3 baytlık dosya RangeError ile çökmez, tarayıcı açılmadan çıkış 2', async () => {
  const tinyFile = path.join(tmpDir, 'tiny.png');
  writeFileSync(tinyFile, Buffer.from([1, 2, 3]));
  const out = path.join(tmpDir, 'zoom-from-tiny.png');
  const res = await runCapture(['--zoom-image', tinyFile, '--out', out]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
  assert.equal(existsSync(out), false, '3 baytlık girdiyle çıktı oluşmamalı');
  assert.doesNotMatch(res.stderr, /profil:/, `tarayıcı AÇILMAMALIYDI (profil satırı görüldü):\n${res.stderr}`);
  assert.doesNotMatch(res.stderr, /RangeError/, `RangeError ile çökmemeli:\n${res.stderr}`);
  assert.match(res.stderr, /geçersiz PNG/i, `beklenen "geçersiz PNG" mesajı yok:\n${res.stderr}`);
});

// REVIEW-1 ONEMLI-2: --zoom-image ÖNCEDEN kaynak PNG'yi base64 gömüp
// `data:text/html;base64,…` URL'i olarak gezerdi. Ölçülen: 1.443.328 B
// kaynak → URL ~2,57 MB → Chromium'un `Page.navigate` ~2 MB URL sınırını
// aşıp `net::ERR_ABORTED` ile çıkış 1 veriyordu. Bu test önce (mevcut
// koddan ÖNCE, TDD KIRMIZI) ≥1,5 MB'lık gürültülü bir kaynak PNG'yle bu
// arızayı yeniden üretmeyi, düzeltmeden SONRA ise (`file://` + göreli yol)
// aynı senaryonun çıkış 0 ve beklenen IHDR ile bittiğini doğrular — kaynak
// PNG'nin GERÇEKTEN büyük olduğu `buf.length` assert'iyle güvenceye alınır.
test("--zoom-image: 1,5 MB üstü kaynak PNG'de eski data-URL sınırına takılmaz (file:// ile gezilir)", async () => {
  const NOISE_SIDE = 900; // 900*900*4 B ham veri (~3,09 MB); rastgele gürültü zor sıkışır, PNG'si güvenle ≥1,5 MB kalır.
  const noiseHtml = `<!doctype html><html><body style="margin:0">` +
    `<canvas id="c" width="${NOISE_SIDE}" height="${NOISE_SIDE}" style="display:block"></canvas>` +
    `<script>
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(${NOISE_SIDE}, ${NOISE_SIDE});
      const buf = img.data;
      for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
      for (let i = 3; i < buf.length; i += 4) buf[i] = 255; // tam opak
      ctx.putImageData(img, 0, 0);
    </script></body></html>`;
  const noiseServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(noiseHtml);
  });
  await new Promise((resolve) => noiseServer.listen(0, '127.0.0.1', resolve));
  const { port: noisePort } = noiseServer.address();
  const noiseUrl = `http://127.0.0.1:${noisePort}/`;

  try {
    const bigSourceOut = path.join(tmpDir, 'zoom-big-source.png');
    const genRes = await runCapture([
      '--url', noiseUrl,
      '--out', bigSourceOut,
      '--width', String(NOISE_SIDE),
      '--height', String(NOISE_SIDE),
      '--timeout-ms', '20000',
    ]);
    assert.equal(genRes.status, 0, `büyük gürültülü kaynak PNG üretimi başarısız; stderr:\n${genRes.stderr}`);
    const bigBuf = readFileSync(bigSourceOut);
    const MIN_BYTES = 1.5 * 1024 * 1024;
    assert.ok(
      bigBuf.length >= MIN_BYTES,
      `kaynak PNG en az 1,5 MB olmalı (gürültü yeterince sıkışmadı mı?), bulunan: ${bigBuf.length} B`,
    );

    const zoomOut = path.join(tmpDir, 'zoom-from-big-source.png');
    const zoomRes = await runCapture([
      '--zoom-image', bigSourceOut,
      '--region', '10,10,20,20',
      '--scale', '2',
      '--out', zoomOut,
      '--timeout-ms', '20000',
    ]);
    assert.equal(
      zoomRes.status,
      0,
      `≥1,5 MB kaynakla --zoom-image çıkış 0 vermeli (data-URL sınırına takılmamalı); ` +
        `stderr:\n${zoomRes.stderr}\nstdout:\n${zoomRes.stdout}`,
    );
    const zoomBuf = readFileSync(zoomOut);
    const zoomDims = pngDims(zoomBuf);
    assert.equal(zoomDims.width, 40, 'çıktı genişliği w*scale (20*2) olmalı');
    assert.equal(zoomDims.height, 40, 'çıktı yüksekliği h*scale (20*2) olmalı');

    assert.equal(countProcessesWithProfile(runRoot), 0, 'büyük zoom testinden sonra yetim tarayıcı kaldı');
  } finally {
    await new Promise((resolve) => noiseServer.close(resolve));
  }
});

// REVIEW-2 KUCUK-4: ana-modül koruması `pathToFileURL(process.argv[1])` ile
// karşılaştırıyordu. Node varsayılan olarak (--preserve-symlinks-main
// verilmedikçe) ana modülün GERÇEK (symlink/junction çözülmüş) yolunu
// kullanarak `import.meta.url`'i üretir, ama `process.argv[1]` ÇÖZÜLMEMİŞ
// (junction/symlink'in kendisi) kalır. Bu yüzden betik bir junction/symlink
// üzerinden çağrıldığında iki taraf asla eşleşmez, `main()` HİÇ çağrılmaz ve
// CLI hiçbir hata vermeden, PNG üretmeden, sessizce 0 ile çıkar. Bu test
// scripts dizinine geçici bir junction kurup üzerinden argümansız çağırır;
// beklenen kullanım hatası (çıkış 2), gözlenen eski davranış 0'dır.
test(
  'ana-modül koruması (Windows junction): junction üzerinden çağrıda CLI sessizce çıkmaz, kullanım hatasıyla çıkış 2 verir',
  { skip: IS_WINDOWS ? false : 'yalnız Windows junction senaryosu test ediliyor' },
  async () => {
    const junctionDir = path.join(os.tmpdir(), `capture-page-junction-test-${Date.now()}`);
    symlinkSync(__dirname, junctionDir, 'junction');
    try {
      const junctionScript = path.join(junctionDir, 'capture-page.mjs');
      const res = await new Promise((resolve) => {
        const child = spawn('node', [junctionScript], { windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => {
          stdout += d;
        });
        child.stderr.on('data', (d) => {
          stderr += d;
        });
        const timer = setTimeout(() => child.kill(), 10000);
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ status: code, stdout, stderr });
        });
      });
      assert.equal(
        res.status,
        2,
        `junction üzerinden argümansız çağrı kullanım hatasıyla (çıkış 2) bitmeli, sessizce 0 ile çıkmamalı; ` +
          `stdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
      );
    } finally {
      try {
        rmdirSync(junctionDir);
      } catch {}
    }
  },
);

// REVIEW-1 ONEMLI-1: killByProfileDir'in Windows dalı, sorguyu ÇALIŞTIRAN
// powershell.exe'nin KENDİ komut satırında da profil yolu geçtiği için
// kendisiyle eşleşip kendini Stop-Process ile öldürüyordu (gözlenen çıkış
// 4294967295 / -1). Bu test yardımcı (hedef) süreçler doğrudan
// killByProfileDir() çağrılarak öldürülürken sorguyu çalıştıran sürecin
// KENDİSİNİN hayatta kalıp 0 ile döndüğünü doğrular — betik doğrudan CLI
// olarak değil, fonksiyon olarak `import()` edilir (bkz. capture-page.mjs
// dosya sonu: doğrudan çalıştırıldığında CLI, import edildiğinde export).
test(
  'killByProfileDir (Windows): yardımcı süreçleri öldürür, sorguyu çalıştıran kendi PowerShell sürecini öldürmez',
  { skip: IS_WINDOWS ? false : 'yalnız Windows dalı test ediliyor' },
  async () => {
    const { killByProfileDir } = await import(pathToFileURL(SCRIPT).href);
    const profileDir = mkdtempSync(path.join(os.tmpdir(), 'capture-page-killtest-'));
    const helpers = [];
    try {
      for (let i = 0; i < 3; i++) {
        helpers.push(
          spawn('node', ['-e', 'setInterval(() => {}, 1000)', profileDir], {
            windowsHide: true,
            stdio: 'ignore',
          }),
        );
      }
      // Yardımcı süreçlerin Win32_Process'e görünür olması için kısa bekleme.
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = killByProfileDir(profileDir);
      assert.equal(
        result?.status,
        0,
        `powershell sorgusu kendi sürecini öldürüp 0 dışı çıkışla dönmemeli ` +
          `(status=${result?.status}, error=${result?.error})`,
      );

      for (const child of helpers) {
        const exited = await new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) return resolve(true);
          const timer = setTimeout(() => resolve(false), 5000);
          child.once('exit', () => {
            clearTimeout(timer);
            resolve(true);
          });
        });
        assert.equal(exited, true, `yardımcı süreç (PID ${child.pid}) öldürülmedi`);
      }
    } finally {
      for (const child of helpers) {
        try {
          if (child.exitCode === null && child.signalCode === null) child.kill();
        } catch {}
      }
      try {
        rmSync(profileDir, { recursive: true, force: true });
      } catch {}
    }
  },
);
