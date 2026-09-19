// capture-page.mjs için testler (node:test). Bağımlılıksız: yalnız node:test +
// node:http (yerel test sunucusu) + node:child_process (betiği çağırmak için).
// Çalıştırma: node --test .claude/skills/prove-it/scripts/capture-page.test.mjs
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
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
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
function countCapturePageProcesses() {
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
    const res = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @(${BROWSER_PROCESS_NAMES_WIN}) -and $_.CommandLine -like '*${escaped}*' } | Measure-Object).Count`,
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
  processesBefore = countCapturePageProcesses();
  // REVIEW-1 KUCUK-3: önceden zorunlu kılınmıyordu (yalnız after() mesajında
  // görünüyordu) — önceden kalmış bir yetim, bu süiti YANLIŞ nedenle
  // düşürebilirdi. Artık başlangıç koşulu burada assert edilir.
  assert.equal(processesBefore, 0, `test koşusu BAŞLAMADAN ÖNCE yetim capture-page-* tarayıcı süreci var (${processesBefore})`);

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

  const processesAfter = countCapturePageProcesses();
  assert.equal(
    processesAfter,
    0,
    `test koşusu sonunda yetim capture-page-* tarayıcı süreci kaldı (önce=${processesBefore}, sonra=${processesAfter})`,
  );
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
function runCapture(args, opts = {}) {
  const hasExplicitTimeout = args.includes('--timeout-ms');
  const innerTimeoutMs = hasExplicitTimeout
    ? Number(args[args.indexOf('--timeout-ms') + 1])
    : DEFAULT_INNER_TIMEOUT_MS;
  const effectiveArgs = hasExplicitTimeout ? args : [...args, '--timeout-ms', String(DEFAULT_INNER_TIMEOUT_MS)];
  const harnessTimeoutMs = opts.timeout ?? innerTimeoutMs + CLEANUP_BUDGET_MS;
  // Betiğin kendi sözleşmesi ("dış zaman aşımı iç olandan UZUN olmalı") testte
  // de sağlanır: sağlanmazsa düzenek, betiğin temizlik fırsatı bulmadan
  // TerminateProcess ile öldürür ve yetim bırakabilir.
  assert.ok(
    harnessTimeoutMs > innerTimeoutMs,
    `düzenek zaman aşımı (${harnessTimeoutMs}) iç zaman aşımından (${innerTimeoutMs}) uzun olmalı`,
  );

  return new Promise((resolve) => {
    const child = spawn('node', [SCRIPT, ...effectiveArgs], { windowsHide: true });
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

test('--url verilmezse çıkış 2', async () => {
  const out = path.join(tmpDir, 'nourl.png');
  const res = await runCapture(['--out', out]);
  assert.equal(res.status, 2, `stderr:\n${res.stderr}\nstdout:\n${res.stdout}`);
});

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
