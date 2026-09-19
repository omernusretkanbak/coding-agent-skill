#!/usr/bin/env node
// capture-page.mjs
//
// Amaç: Yalnız bir web sayfasının ekran görüntüsünü headless Edge/Chrome + CDP
// ile yakalar. Masaüstünü YAKALAMAZ — paylaşılan/masaüstü ortamlarda güvenlidir
// (IDE penceresi, özel sohbet içeriği vb. görüntüye girmez). Bağımlılıksız:
// yalnız Node ≥ 22 çekirdek API'leri (global fetch + WebSocket). Her çalıştırma
// kendi geçici profilinde, rastgele bir CDP portunda başlar; sabit port yoktur,
// bu yüzden chrome-devtools MCP'nin kullandığı profille çakışmaz.
//
// Kullanım:
//   node capture-page.mjs --url <url> --out <png> [--width 1280] [--height 800]
//     [--media <ad>=<değer>]... [--setup <js>] [--eval <js>] [--wait-ms 300]
//     [--timeout-ms 30000] [--browser <exe>]
//   node capture-page.mjs --help
//
// Çıkış kodları: 0 başarı, 1 çalışma hatası (ör. erişilemeyen URL),
//                2 kullanım hatası / tarayıcı bulunamadı.
//
// Süreç hijyeni: tarayıcı süreci ve geçici profili HER çıkış yolunda (normal,
// hata, iç zaman aşımı, SIGINT/SIGTERM) tek bir cleanup() fonksiyonuyla
// temizlenir. NOT (TDD sırasında bu makinede gözlendi, bkz. PROOF.md):
// Edge/Chrome kendini erken evrede yeniden başlatabilir — bu durumda
// `spawn()`'dan dönen PID gerçek tarayıcı sürecini temsil etmeyebilir;
// spawn PID'ine güvenilmez. Bu yüzden PID/ağaç tabanlı kapatma (`taskkill
// /PID <eski-pid> /T`) bazı durumlarda "process not found" ile SESSİZCE
// HİÇBİR ŞEY YAPMAZ. Güvenilir tek yöntem: komut satırında bu çalıştırmaya özgü,
// rastgele üretilmiş profil dizini yolunu taşıyan TÜM süreçleri (PID
// zincirinden bağımsız) tarayıp kapatmak — Windows'ta `Get-CimInstance
// Win32_Process` + `Stop-Process -Force`, POSIX'te `pkill -9 -f`. profileDir
// her çalıştırmada `mkdtempSync` ile üretildiği için bu eşleşme kesindir,
// başka bir sürece çarpmaz. Not: Windows'ta bu süreç dışarıdan
// `TerminateProcess` ile (ör. bir üst zaman aşımıyla) aniden öldürülürse
// hiçbir JS işleyicisi çalışmaz — bu yüzden çağıran taraf `--timeout-ms`
// değerini KENDİ dış zaman aşımından belirgin biçimde KISA tutmalı, aksi
// halde temizlik fırsatı bulunamaz.

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const HELP = `Kullanım:
  node capture-page.mjs --url <url> --out <png> [seçenekler]

Zorunlu:
  --url <url>            Yakalanacak sayfanın adresi
  --out <yol>             PNG çıktısının kaydedileceği yol

Seçenekler:
  --width <px>            Görüntü genişliği (varsayılan: 1280)
  --height <px>           Görüntü yüksekliği (varsayılan: 800)
  --media <ad>=<değer>    Emüle edilecek medya özelliği, tekrarlanabilir
                          (ör. --media prefers-color-scheme=dark)
  --setup <js>            Sayfa yüklendikten sonra çalıştırılacak JS (ör.
                          localStorage tohumlama); ardından sayfa yeniden
                          yüklenir
  --eval <js>             Ekran görüntüsünden hemen önce çalıştırılacak JS;
                          sonucu stdout'a "EVAL=<json>" olarak yazılır
  --wait-ms <ms>          Yükleme sonrası bekleme (varsayılan: 300)
  --timeout-ms <ms>       Genel zaman aşımı, ms (varsayılan: 30000). Bu
                          değeri çağıranın KENDİ dış zaman aşımından kısa
                          tut — aksi halde temizlik fırsatı bulunamaz.
  --browser <exe>         Tarayıcı çalıştırılabilir yolu (yoksa CAPTURE_BROWSER
                          ortam değişkeni, sonra platforma göre Edge/Chrome
                          aranır)
  --help                  Bu yardımı göster

Amaç: Yalnız sayfayı yakalar, masaüstünü yakalamaz — paylaşılan masaüstünde
güvenlidir. Bağımlılıksız (Node ≥ 22: global fetch + WebSocket).

Çıkış kodları: 0 başarı, 1 çalışma hatası, 2 kullanım/tarayıcı bulunamadı.
`;

function requireValue(argv, i, flag) {
  if (i >= argv.length) throw new Error(`${flag} bir değer bekliyor`);
  return argv[i];
}

function parsePositiveInt(raw, flag, allowZero = false) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || (!allowZero && n === 0)) {
    throw new Error(`${flag} geçerli bir tamsayı olmalı: ${raw}`);
  }
  return n;
}

function parseArgs(argv) {
  const args = {
    url: null,
    out: null,
    width: 1280,
    height: 800,
    media: [],
    setup: null,
    evalExpr: null,
    waitMs: 300,
    timeoutMs: 30000,
    browser: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--url':
        args.url = requireValue(argv, ++i, '--url');
        break;
      case '--out':
        args.out = requireValue(argv, ++i, '--out');
        break;
      case '--width':
        args.width = parsePositiveInt(requireValue(argv, ++i, '--width'), '--width');
        break;
      case '--height':
        args.height = parsePositiveInt(requireValue(argv, ++i, '--height'), '--height');
        break;
      case '--media': {
        const raw = requireValue(argv, ++i, '--media');
        const eq = raw.indexOf('=');
        if (eq === -1) throw new Error(`--media <ad>=<değer> biçiminde olmalı: ${raw}`);
        args.media.push([raw.slice(0, eq), raw.slice(eq + 1)]);
        break;
      }
      case '--setup':
        args.setup = requireValue(argv, ++i, '--setup');
        break;
      case '--eval':
        args.evalExpr = requireValue(argv, ++i, '--eval');
        break;
      case '--wait-ms':
        args.waitMs = parsePositiveInt(requireValue(argv, ++i, '--wait-ms'), '--wait-ms', true);
        break;
      case '--timeout-ms':
        args.timeoutMs = parsePositiveInt(requireValue(argv, ++i, '--timeout-ms'), '--timeout-ms');
        break;
      case '--browser':
        args.browser = requireValue(argv, ++i, '--browser');
        break;
      default:
        throw new Error(`Bilinmeyen parametre: ${arg}`);
    }
  }
  return args;
}

function findBrowser(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  if (process.env.CAPTURE_BROWSER) {
    return existsSync(process.env.CAPTURE_BROWSER) ? process.env.CAPTURE_BROWSER : null;
  }

  const candidates = [];
  const platform = process.platform;

  if (platform === 'win32') {
    const pf86 = process.env['ProgramFiles(x86)'];
    const pf = process.env['ProgramFiles'];
    const localAppData = process.env['LOCALAPPDATA'];
    if (pf86) candidates.push(path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    if (pf) candidates.push(path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    if (pf) candidates.push(path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (pf86) candidates.push(path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (localAppData) candidates.push(path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  } else if (platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    candidates.push('/usr/bin/google-chrome');
    candidates.push('/usr/bin/chromium');
    candidates.push('/usr/bin/chromium-browser');
    candidates.push('/usr/bin/microsoft-edge');
  }

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function pngDims(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function describeException(exceptionDetails) {
  return (
    exceptionDetails?.exception?.description ||
    exceptionDetails?.text ||
    JSON.stringify(exceptionDetails)
  );
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function waitForDevToolsActivePort(profileDir, timeoutMs) {
  const file = path.join(profileDir, 'DevToolsActivePort');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8').trim();
      const firstLine = content.split('\n')[0];
      const port = parseInt(firstLine, 10);
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
        const list = await res.json();
        const target = list.find((t) => t.type === 'page');
        if (target) return target;
      }
    } catch (err) {
      lastErr = err;
    }
    await sleep(50);
  }
  throw new Error(`CDP page hedefi bulunamadı (timeout): ${lastErr ?? ''}`);
}

function waitForExit(child, ms) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve(true);
    const timer = setTimeout(() => resolve(false), ms);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

// Bu çalıştırmaya özgü profil dizinini komut satırında taşıyan TÜM süreçleri
// (PID/ebeveyn zincirinden tamamen bağımsız) tarayıp kapatır. `child.pid`'e
// GÜVENİLMEZ: Edge/Chrome kendini erken evrede yeniden başlatabilir, bu
// yüzden `spawn()`'dan dönen PID gerçek tarayıcıyı temsil etmeyebilir (bkz.
// dosya başı yorumu + PROOF.md ölçümü). `profileDir` her çalıştırmada
// `mkdtempSync` ile rastgele üretildiği için bu eşleşme kesindir.
// Windows Where-Object filtresi: hem killByProfileDir hem countByProfileDir
// AYNI filtreyi kullanır (yalnız "say" ile "öldür" farklıdır), tutarsızlık
// riski olmasın diye tek yerden üretilir. REVIEW-1 ONEMLI-1: sorguyu
// ÇALIŞTIRAN powershell.exe'nin KENDİ komut satırında da profil yolu geçtiği
// için filtre `$_.ProcessId -ne $PID` İLE kendini dışlamalı — aksi halde
// sorgu süreci kendisiyle eşleşip kendini Stop-Process ile öldürür (gözlenen
// çıkış: 4294967295 / -1). Ayrıca `-like` joker deseni yerine `.Contains()`
// kullanılır (REVIEW-1 KUCUK-2): `profileDir` köşeli parantez/`*`/`?` gibi
// PowerShell joker karakterleri taşıyorsa (ör. kullanıcı adında `[...]`)
// `-like` sessizce eşleşmeyi kaçırabilir, `.Contains()` düz metin karşılaştırır.
// `$_.CommandLine` bazı (ör. korumalı/sistem) süreçlerde $null olabileceğinden
// önce varlığı kontrol edilir.
function buildProfileDirFilter(profileDir) {
  const escaped = profileDir.replace(/'/g, "''");
  return `$_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains('${escaped}')`;
}

function killByProfileDir(profileDir) {
  if (process.platform === 'win32') {
    const cmd =
      `Get-CimInstance Win32_Process | Where-Object { ${buildProfileDirFilter(profileDir)} } | ` +
      'ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }';
    try {
      return spawnSync('powershell', ['-NoProfile', '-Command', cmd], { stdio: 'ignore' });
    } catch (err) {
      return { error: err };
    }
  }
  // POSIX: komut satırında profil yolu geçen süreçleri ada/PID zincirine
  // bakmadan öldürür. `pkill -f` çağıran sürecin KENDİSİNİ eşleştirmez
  // (dokunulmadı — REVIEW-1: "POSIX pkill -f dalına dokunma").
  try {
    return spawnSync('pkill', ['-9', '-f', profileDir], { stdio: 'ignore' });
  } catch (err) {
    return { error: err };
  }
}

// Yalnız SAYAR, öldürmez. cleanupResources() bunu her tekrar turundan önce
// çağırıp eşleşen süreç KESİN olarak 0 ise kalan powershell/pgrep turlarını
// atlar (performans, REVIEW-1 KUCUK-5). Sayım başarısız olursa (-1) güvenlik
// amacıyla "bilinmiyor" döner — çağıran taraf bunu 0 SAYMAMALI, turu
// atlamamalıdır (yetim güvencesi zayıflatılmaz).
function countByProfileDir(profileDir) {
  if (process.platform === 'win32') {
    const cmd = `(Get-CimInstance Win32_Process | Where-Object { ${buildProfileDirFilter(profileDir)} } | Measure-Object).Count`;
    try {
      const res = spawnSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
      const n = parseInt((res.stdout || '').trim(), 10);
      return Number.isFinite(n) ? n : -1;
    } catch {
      return -1;
    }
  }
  try {
    const res = spawnSync('pgrep', ['-f', profileDir], { encoding: 'utf8' });
    if (res.error) return -1;
    return (res.stdout || '').split('\n').filter((l) => l.trim().length > 0).length;
  } catch {
    return -1;
  }
}

function spawnBrowser(browserPath, profileDir) {
  return spawn(
    browserPath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
}

// Tüm çıkış yollarının (başarı, hata, iç zaman aşımı, SIGINT/SIGTERM) aynı
// temizliğe uğramasını sağlayan tek nokta. İdempotenttir (state.done bayrağı).
async function cleanupResources(state) {
  if (!state || state.done) return;
  state.done = true;
  if (state.ws) {
    try {
      state.ws.close();
    } catch {}
  }
  if (state.child) {
    // Orijinal spawn PID'inin çıkışı yalnız bir alt sınır ipucudur (bkz. dosya
    // başı yorumu) — gerçek kapatma aşağıdaki profil-dizini taramasıyla olur.
    await waitForExit(state.child, 1000);
  }
  // Tarayıcı kendi başlangıç evresinde yeni alt süreçler doğurmaya devam
  // edebileceğinden (yarış durumu), profil-dizini taraması birkaç tur, kısa
  // aralıklarla tekrarlanır. Her turdan ÖNCE sayım yapılır (REVIEW-1
  // KUCUK-5): eşleşen süreç KESİN olarak 0 ise (countByProfileDir 0 döner,
  // -1 "bilinmiyor" değil) kalan turlar atlanır — başarı yolunda genelde
  // ilk turda 0 bulunur, ~2 powershell geçişi + 600 ms tasarruf edilir.
  const PROFILE_KILL_PASSES = 3;
  const PROFILE_KILL_DELAY_MS = 300;
  for (let i = 0; i < PROFILE_KILL_PASSES; i++) {
    if (countByProfileDir(state.profileDir) === 0) break;
    killByProfileDir(state.profileDir);
    if (i < PROFILE_KILL_PASSES - 1) await sleep(PROFILE_KILL_DELAY_MS);
  }
  await removeProfileDir(state.profileDir);
}

// Ölçüm notu (TDD sırasında bu makinede gözlendi): süreç ağacı taskkill /F ile
// kapatılsa bile Windows'un profildeki tüm dosya kilitlerini (EPERM) serbest
// bırakması bazen `rmSync`'in kendi `maxRetries:10, retryDelay:200` (2 sn)
// bütçesini aşıyor — gözlenen gecikme run başına ~0.4 sn ile >2 sn arasında
// değişken. Bu yüzden aynı `rmSync` çağrısı (spesifikasyondaki parametrelerle,
// değiştirilmeden) DIŞARIDAN, daha geniş bir toplam bütçe içinde tekrarlanır;
// son deneme de başarısız olursa sessizce bırakılır (OS'un kendi geçici
// dizin temizliği devreye girer).
async function removeProfileDir(profileDir, totalBudgetMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < totalBudgetMs) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      return;
    } catch {
      await sleep(500);
    }
  }
  try {
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch {}
}

class CdpClient {
  constructor(ws, timeoutMs) {
    this.ws = ws;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = [];
    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      } catch {
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.eventWaiters = this.eventWaiters.filter((w) => {
          if (w.method === msg.method) {
            w.resolve(msg.params);
            return false;
          }
          return true;
        });
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} zaman aşımına uğradı`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs = this.timeoutMs) {
    let entry;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.eventWaiters = this.eventWaiters.filter((w) => w !== entry);
        reject(new Error(`${method} eventi zaman aşımına uğradı`));
      }, timeoutMs);
      entry = {
        method,
        resolve: (params) => {
          clearTimeout(timer);
          resolve(params);
        },
      };
      this.eventWaiters.push(entry);
    });
    promise.cancel = () => {
      this.eventWaiters = this.eventWaiters.filter((w) => w !== entry);
    };
    return promise;
  }
}

// Sinyal işleyicilerinin erişebilmesi için etkin çalıştırmanın durumu.
let activeState = null;
let signalHandlersInstalled = false;

function installSignalHandlers() {
  if (signalHandlersInstalled) return;
  signalHandlersInstalled = true;
  const onSignal = (signal) => {
    console.error(`Hata: ${signal} alındı, temizleniyor...`);
    cleanupResources(activeState).finally(() => process.exit(1));
  };
  // Not: Windows'ta bu süreç dışarıdan TerminateProcess ile (ör. bir üst
  // zaman aşımı) öldürülürse bu işleyiciler HİÇ çalışmaz — orada tek güvence
  // çağıranın --timeout-ms'i kendi dış zaman aşımından kısa tutmasıdır.
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));
}

async function run(args, browserPath) {
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'capture-page-'));
  console.error(`profil: ${profileDir}`);
  const state = { child: null, ws: null, profileDir, done: false };
  activeState = state;

  try {
    state.child = spawnBrowser(browserPath, profileDir);
    state.child.on('error', () => {
      // Süreç başlatma hatası waitForDevToolsActivePort zaman aşımıyla yakalanır.
    });

    const port = await waitForDevToolsActivePort(profileDir, args.timeoutMs);
    console.error(`cdp: port=${port} profil=${profileDir}`);

    const target = await waitForPageTarget(port, args.timeoutMs);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    state.ws = ws;
    await withTimeout(
      new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', () => reject(new Error('WebSocket bağlantı hatası')), { once: true });
      }),
      args.timeoutMs,
      'WebSocket bağlantısı zaman aşımına uğradı',
    );

    const cdp = new CdpClient(ws, args.timeoutMs);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: args.width,
      height: args.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    if (args.media.length > 0) {
      await cdp.send('Emulation.setEmulatedMedia', {
        features: args.media.map(([name, value]) => ({ name, value })),
      });
    }

    const loadEventPromise = cdp.waitForEvent('Page.loadEventFired');
    loadEventPromise.catch(() => {});
    const navResult = await cdp.send('Page.navigate', { url: args.url });
    if (navResult.errorText) {
      loadEventPromise.cancel();
      throw new Error(`Sayfa yüklenemedi: ${navResult.errorText} (${args.url})`);
    }
    await loadEventPromise;

    if (args.setup) {
      const setupResult = await cdp.send('Runtime.evaluate', {
        expression: args.setup,
        awaitPromise: true,
      });
      if (setupResult.exceptionDetails) {
        throw new Error(`--setup hata: ${describeException(setupResult.exceptionDetails)}`);
      }
      const reloadEventPromise = cdp.waitForEvent('Page.loadEventFired');
      await cdp.send('Page.reload', {});
      await reloadEventPromise;
    }

    if (args.waitMs > 0) {
      await sleep(args.waitMs);
    }

    if (args.evalExpr) {
      const evalResult = await cdp.send('Runtime.evaluate', {
        expression: args.evalExpr,
        returnByValue: true,
        awaitPromise: true,
      });
      if (evalResult.exceptionDetails) {
        throw new Error(`--eval hata: ${describeException(evalResult.exceptionDetails)}`);
      }
      console.log(`EVAL=${JSON.stringify(evalResult.result.value ?? null)}`);
    }

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');

    const resolvedOut = path.resolve(args.out);
    mkdirSync(path.dirname(resolvedOut), { recursive: true });
    writeFileSync(resolvedOut, buf);

    const dims = pngDims(buf);
    console.log(`Kaydedildi: ${args.out} (${dims.width}x${dims.height}, ${buf.length} B)`);

    await cdp.send('Browser.close').catch(() => {});

    return { code: 0 };
  } catch (err) {
    return { code: 1, message: `Hata: ${err.message}` };
  } finally {
    await cleanupResources(state);
    activeState = null;
  }
}

async function main() {
  installSignalHandlers();

  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Hata: ${err.message}`);
    console.error(HELP);
    process.exit(2);
  }

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  const missing = [];
  if (!args.url) missing.push('--url');
  if (!args.out) missing.push('--out');
  if (missing.length > 0) {
    console.error(`Hata: zorunlu parametre eksik: ${missing.join(', ')}`);
    console.error(HELP);
    process.exit(2);
  }

  const browserPath = findBrowser(args.browser);
  if (!browserPath) {
    console.error(
      'Hata: Tarayıcı bulunamadı. --browser ile yol ver ya da CAPTURE_BROWSER ortam değişkenini ayarla.',
    );
    process.exit(2);
  }

  const result = await run(args, browserPath);
  if (result.message) {
    console.error(result.message);
  }
  process.exit(result.code);
}

// Betik doğrudan çalıştırıldığında (`node capture-page.mjs ...`) CLI olarak
// çalışır; testten `import()` edildiğinde main() ÇALIŞMAZ, yalnız aşağıdaki
// fonksiyonlar (ör. killByProfileDir) dışa aktarılır.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { killByProfileDir, countByProfileDir };
