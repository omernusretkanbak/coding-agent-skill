// scripts/kur.mjs ve depo bekçileri için testler. Çalıştırma: node --test tests/*.test.mjs
// Tüm yazma işlemleri OS geçici dizininde yapılır; gerçek kullanıcı klasörüne ASLA yazılmaz.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KUR = path.join(REPO, 'scripts', 'kur.mjs');
const SKILLS = path.join(REPO, '.claude', 'skills');
const AGENTS = path.join(REPO, '.claude', 'agents');
const skillNames = fs.readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

// Geçici "proje kökü": yalnız kanonik .claude/skills ve .claude/agents kopyalanır.
const tmpler = [];
after(() => {
  for (const d of tmpler) fs.rmSync(d, { recursive: true, force: true });
});
function yeniTmp(onek) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), onek));
  tmpler.push(d);
  return d;
}
function yeniKok() {
  const kok = yeniTmp('kur-kok-');
  fs.cpSync(SKILLS, path.join(kok, '.claude', 'skills'), { recursive: true });
  fs.cpSync(AGENTS, path.join(kok, '.claude', 'agents'), { recursive: true });
  return kok;
}
function yeniEv() {
  return yeniTmp('kur-ev-');
}
function kos(args, { kok, ev, evYok } = {}) {
  const env = { ...process.env };
  // Güvenlik: ev de evYok da verilmediyse gerçek HOME/USERPROFILE ASLA çocuğa geçmez; atılabilir geçici ev kullanılır.
  const evEfektif = ev || (evYok ? null : yeniTmp('kur-varsayilan-ev-'));
  if (evEfektif) { env.HOME = evEfektif; env.USERPROFILE = evEfektif; }
  // Windows silinen USERPROFILE'i çocuk sürece geri ekleyebilir; boş değer güvenilir biçimde "tanımsız" sayılır.
  if (evYok) { env.HOME = ''; env.USERPROFILE = ''; }
  const a = [KUR, ...args];
  if (kok) a.push('--kok', kok);
  const r = spawnSync(process.execPath, a, { env, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
function tumDosyalar(dir) {
  const sonuc = [];
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p); else sonuc.push(path.relative(dir, p).split(path.sep).join('/'));
    }
  };
  gez(dir);
  return sonuc.sort();
}

test('kanonik kaynakta en az beş skill var ve fabrika dahil', () => {
  assert.ok(skillNames.length >= 5, skillNames.join(','));
  assert.ok(skillNames.includes('fabrika'));
});

test('--hedef codex: .agents/skills altında her skill dizini ve SKILL.md', () => {
  const kok = yeniKok();
  const r = kos(['--hedef', 'codex'], { kok });
  assert.equal(r.code, 0, r.out);
  for (const n of skillNames) {
    assert.ok(fs.existsSync(path.join(kok, '.agents', 'skills', n, 'SKILL.md')), n);
  }
  assert.ok(!fs.existsSync(path.join(kok, '.agents', 'agents')));
});

test('--hedef claude (kullanıcı kapsamı): .claude/skills + .claude/agents, iki ajan dosyası', () => {
  const kok = yeniKok();
  const ev = yeniEv();
  const r = kos(['--hedef', 'claude', '--kapsam', 'kullanici'], { kok, ev });
  assert.equal(r.code, 0, r.out);
  for (const n of skillNames) assert.ok(fs.existsSync(path.join(ev, '.claude', 'skills', n, 'SKILL.md')), n);
  const ajanlar = fs.readdirSync(path.join(ev, '.claude', 'agents')).sort();
  assert.deepEqual(ajanlar, ['fabrika-inceleyici.md', 'fabrika-yazar.md']);
});

test('--hedef claude (proje kapsamı): kanonik kaynak, hiçbir şey değişmez', () => {
  const kok = yeniKok();
  const once = tumDosyalar(kok);
  const r = kos(['--hedef', 'claude'], { kok });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(tumDosyalar(kok), once);
});

test('--hedef hepsi: hem .agents/skills hem .claude (kullanıcı kapsamı)', () => {
  const kok = yeniKok();
  const r1 = kos(['--hedef', 'hepsi'], { kok });
  assert.equal(r1.code, 0, r1.out);
  for (const n of skillNames) assert.ok(fs.existsSync(path.join(kok, '.agents', 'skills', n, 'SKILL.md')), n);
  const ev = yeniEv();
  const r2 = kos(['--hedef', 'hepsi', '--kapsam', 'kullanici'], { kok, ev });
  assert.equal(r2.code, 0, r2.out);
  assert.ok(fs.existsSync(path.join(ev, '.claude', 'agents', 'fabrika-yazar.md')));
  assert.ok(fs.existsSync(path.join(ev, '.agents', 'skills', 'fabrika', 'SKILL.md')));
});

test('--kuru hiçbir dosya yazmaz', () => {
  const kok = yeniKok();
  const once = tumDosyalar(kok);
  const r = kos(['--hedef', 'hepsi', '--kuru'], { kok });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(tumDosyalar(kok), once);
  assert.ok(!fs.existsSync(path.join(kok, '.agents')));
});

test('bekçi: kos() ev verilmezse gerçek HOME/USERPROFILE çocuk sürece geçmez (yalnız --kuru)', () => {
  // "Gerçek ev" yerine izlenebilir sahte bir dizin; içinde farklı içerikli bir .agents/skills nöbetçisi var.
  const sahteGercekEv = yeniTmp('kur-gercek-ev-');
  const nobetci = path.join(sahteGercekEv, '.agents', 'skills', skillNames[0], 'SKILL.md');
  fs.mkdirSync(path.dirname(nobetci), { recursive: true });
  fs.writeFileSync(nobetci, 'nobetci');
  const once = tumDosyalar(sahteGercekEv);
  const eskiHome = process.env.HOME;
  const eskiProfil = process.env.USERPROFILE;
  process.env.HOME = sahteGercekEv;
  process.env.USERPROFILE = sahteGercekEv;
  let r;
  try {
    r = kos(['--hedef', 'codex', '--kapsam', 'kullanici', '--kuru'], { kok: yeniKok() }); // ev VERİLMİYOR
  } finally {
    if (eskiHome === undefined) delete process.env.HOME; else process.env.HOME = eskiHome;
    if (eskiProfil === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = eskiProfil;
  }
  // Sızsaydı çocuk nöbetçiyle çakışır (içerik farklı, çıkış 1, ÇATIŞMA); izole ev boş olduğundan çıkış 0 olmalı.
  assert.equal(r.code, 0, r.out);
  assert.ok(!/ÇATIŞMA/.test(r.out), r.out);
  assert.deepEqual(tumDosyalar(sahteGercekEv), once);
  assert.equal(fs.readFileSync(nobetci, 'utf8'), 'nobetci');
});

test('--kontrol: kanonikte olmayan skill dizini yalnız uyarıdır, çıkış kodunu değiştirmez', () => {
  const kok = yeniKok();
  assert.equal(kos(['--hedef', 'codex'], { kok }).code, 0);
  fs.mkdirSync(path.join(kok, '.agents', 'skills', 'baska-skill'), { recursive: true });
  fs.writeFileSync(path.join(kok, '.agents', 'skills', 'baska-skill', 'SKILL.md'), 'x');
  const r = kos(['--hedef', 'codex', '--kontrol'], { kok });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /baska-skill/);
  assert.match(r.out, /Uyarı/);
});

test('--kontrol: ayna aynıysa 0; dosya bozulunca ya da fazlalık olunca 1', () => {
  const kok = yeniKok();
  assert.equal(kos(['--hedef', 'codex'], { kok }).code, 0);
  assert.equal(kos(['--hedef', 'codex', '--kontrol'], { kok }).code, 0);
  const hedef = path.join(kok, '.agents', 'skills', 'ship-it', 'SKILL.md');
  fs.appendFileSync(hedef, '\nbozuk\n');
  assert.equal(kos(['--hedef', 'codex', '--kontrol'], { kok }).code, 1);
  assert.equal(kos(['--hedef', 'codex', '--zorla'], { kok }).code, 0);
  assert.equal(kos(['--hedef', 'codex', '--kontrol'], { kok }).code, 0);
  fs.writeFileSync(path.join(kok, '.agents', 'skills', 'ship-it', 'fazla.md'), 'x');
  assert.equal(kos(['--hedef', 'codex', '--kontrol'], { kok }).code, 1);
  // eksik ayna da sapmadır
  const bos = yeniKok();
  assert.equal(kos(['--hedef', 'codex', '--kontrol'], { kok: bos }).code, 1);
});

test('farklı içerikli mevcut dosya --zorla olmadan ezilmez', () => {
  const kok = yeniKok();
  const hedef = path.join(kok, '.agents', 'skills', 'ship-it', 'SKILL.md');
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, 'kullanıcının kendi dosyası');
  const r = kos(['--hedef', 'codex'], { kok });
  assert.equal(r.code, 1, r.out);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'kullanıcının kendi dosyası');
  const z = kos(['--hedef', 'codex', '--zorla'], { kok });
  assert.equal(z.code, 0, z.out);
  assert.equal(fs.readFileSync(hedef, 'utf8'), fs.readFileSync(path.join(SKILLS, 'ship-it', 'SKILL.md'), 'utf8'));
});

test('--kapsam kullanici yalnız HOME/USERPROFILE altına yazar', () => {
  const kok = yeniKok();
  const ev = yeniEv();
  assert.notEqual(path.resolve(ev), path.resolve(os.homedir()));
  const r = kos(['--hedef', 'codex', '--kapsam', 'kullanici'], { kok, ev });
  assert.equal(r.code, 0, r.out);
  assert.ok(fs.existsSync(path.join(ev, '.agents', 'skills', 'fabrika', 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(kok, '.agents')));
});

test('geçersiz hedef kullanım hatasıdır (çıkış 2)', () => {
  assert.equal(kos(['--hedef', 'yok'], { kok: yeniKok() }).code, 2);
  assert.equal(kos([], { kok: yeniKok() }).code, 2);
});

test('hedefte aynı adlı DİZİN varsa yığın dökümü değil ÇATIŞMA (dizin) ve çıkış 1; hiçbir şey yazılmaz', () => {
  const kok = yeniKok();
  fs.mkdirSync(path.join(kok, '.agents', 'skills', 'ship-it', 'SKILL.md'), { recursive: true });
  const r = kos(['--hedef', 'codex'], { kok });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /ÇATIŞMA \(dizin\)/);
  assert.doesNotMatch(r.out, /EISDIR|at .*\.mjs:\d+/);
  assert.ok(!fs.existsSync(path.join(kok, '.agents', 'skills', 'fabrika')), 'çakışmada hiç dosya yazılmamalı');
  const z = kos(['--hedef', 'codex', '--zorla'], { kok });
  assert.equal(z.code, 1, 'dizin --zorla ile de ezilmez');
  assert.ok(!fs.existsSync(path.join(kok, '.agents', 'skills', 'fabrika')));
});

test('ön tarama: çakışma varsa (--zorla yoksa) HİÇ dosya yazılmaz, liste basılır, çıkış 1', () => {
  const kok = yeniKok();
  const hedef = path.join(kok, '.agents', 'skills', 'ship-it', 'SKILL.md');
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, 'kullanıcının dosyası');
  const once = tumDosyalar(path.join(kok, '.agents'));
  const r = kos(['--hedef', 'codex'], { kok });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /ÇATIŞMA .*ship-it\/SKILL\.md/);
  assert.deepEqual(tumDosyalar(path.join(kok, '.agents')), once, 'kısmi kurulum bırakılmamalı');
});

test('sembolik bağlantı: kaynaktaki bağlantı atlanır ve uyarılır; hedefteki bağlantı içinden yazılmaz', (t) => {
  const kok = yeniKok();
  const dis = yeniTmp('kur-dis-');
  try {
    fs.symlinkSync(dis, path.join(kok, '.claude', 'skills', 'hayalet'), 'junction'); // Windows'ta ayrıcalık gerektirmez; POSIX'te dizin bağlantısı
  } catch (e) { t.skip(`sembolik bağlantı oluşturulamadı: ${e.code}`); return; }
  const r = kos(['--hedef', 'codex'], { kok });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /sembolik/i);
  assert.ok(!fs.existsSync(path.join(kok, '.agents', 'skills', 'hayalet')));
  // hedef taraf: .agents/skills bir bağlantı ise içine yazılmaz
  const kok2 = yeniKok();
  const dis2 = yeniTmp('kur-dis2-');
  fs.mkdirSync(path.join(kok2, '.agents'), { recursive: true });
  fs.symlinkSync(dis2, path.join(kok2, '.agents', 'skills'), 'junction');
  const r2 = kos(['--hedef', 'codex'], { kok: kok2 });
  assert.equal(r2.code, 1, r2.out);
  assert.match(r2.out, /sembolik/i);
  assert.deepEqual(fs.readdirSync(dis2), [], 'bağlantının gösterdiği dizine yazılmamalı');
});

test('--kapsam kullanici: HOME ve USERPROFILE tanımsızsa çıkış 2', () => {
  // --kuru: ev dizini bir şekilde çözülse bile gerçek kullanıcı klasörüne yazma ihtimali olmasın.
  const r = kos(['--hedef', 'codex', '--kapsam', 'kullanici', '--kuru'], { kok: yeniKok(), evYok: true });
  assert.equal(r.code, 2, r.out);
});

// ---- Depo bekçileri ----

function frontmatter(dosya) {
  const t = fs.readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, `${dosya}: frontmatter yok`);
  const satirlar = m[1].split('\n');
  const alan = {};
  for (let i = 0; i < satirlar.length; i++) {
    const k = satirlar[i].match(/^([A-Za-z-]+):\s*(.*)$/);
    if (!k) continue;
    let deger = k[2];
    if (/^[>|][-+]?$/.test(deger)) {
      deger = '';
      while (i + 1 < satirlar.length && /^\s+\S/.test(satirlar[i + 1])) deger += satirlar[++i].trim() + ' ';
    }
    alan[k[1]] = deger.trim();
  }
  return alan;
}

test('her skill: name (klasör adıyla aynı, küçük harf-rakam-tire) ve description dolu', () => {
  for (const n of skillNames) {
    const f = frontmatter(path.join(SKILLS, n, 'SKILL.md'));
    assert.equal(f.name, n, `${n}: name klasör adıyla aynı olmalı`);
    assert.match(f.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(f.description && f.description.length > 10, `${n}: description boş`);
  }
});

test('ajan sarmalayıcıları var olan roller/*.md dosyasına işaret ediyor', () => {
  const dosyalar = fs.readdirSync(AGENTS).filter((x) => x.endsWith('.md')).sort();
  assert.deepEqual(dosyalar, ['fabrika-inceleyici.md', 'fabrika-yazar.md']);
  for (const d of dosyalar) {
    const metin = fs.readFileSync(path.join(AGENTS, d), 'utf8');
    const f = frontmatter(path.join(AGENTS, d));
    assert.equal(f.name, d.replace(/\.md$/, ''));
    assert.ok(f.description && f.model && f.tools, `${d}: eksik alan`);
    const m = metin.match(/\.claude\/skills\/fabrika\/roller\/[a-z-]+\.md/);
    assert.ok(m, `${d}: rol dosyasına yol yok`);
    assert.ok(fs.existsSync(path.join(REPO, m[0])), `${d}: ${m[0]} yok`);
    assert.ok(metin.length < 2500, `${d}: sarmalayıcı ince kalmalı`);
  }
});

test('AGENTS.md 24000 bayttan küçük (Antigravity tek dosya sınırı)', () => {
  assert.ok(fs.statSync(path.join(REPO, 'AGENTS.md')).size < 24000);
});

test('depodaki .agents/skills aynası kanonik .claude/skills ile aynı', () => {
  const r = spawnSync(process.execPath, [KUR, '--hedef', 'hepsi', '--kontrol', '--kok', REPO], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});
