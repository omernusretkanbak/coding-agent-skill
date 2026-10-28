#!/usr/bin/env node
// kur.mjs — fabrika skill'lerini ve (Claude Code için) ajan tanımlarını araç klasörlerine KOPYALAR.
// Bağımlılıksız (Node >= 18), Windows/macOS/Linux. Sembolik bağlantı oluşturmaz, bağlantı içinden yazmaz.
//
// Kanonik kaynak: <kök>/.claude/skills/* ve <kök>/.claude/agents/*.md
// Kullanım:
//   node scripts/kur.mjs --hedef <claude|codex|cursor|antigravity|hepsi>
//        [--kapsam proje|kullanici] [--kuru] [--kontrol] [--zorla] [--kok <dizin>]
// Çıkış kodları: 0 başarı, 1 sapma/çatışma, 2 kullanım hatası.
//
// Güvenlik: önce TÜM dosyalar taranır; çakışma varsa (ve --zorla yoksa) hiçbir şey yazılmaz.
// --zorla yedek ALMAZ; farklı içerikli dosyaların üzerine yazar. Dizin ve sembolik bağlantı çakışmaları
// --zorla ile de aşılmaz.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Hedef tablosu. Yeni araç eklemek için yalnız buraya satır ekleyin.
// skills: skill klasörlerinin gideceği dizin; agents: alt ajan tanım dosyalarının dizini (yalnız Claude Code'da belgeli).
const HEDEFLER = {
  claude: { skills: '.claude/skills', agents: '.claude/agents' },
  codex: { skills: '.agents/skills' },
  // Cursor .claude/skills'i de okur: şablon depoda hem .claude/skills (kanonik) hem .agents/skills (ayna) varsa
  // aynı adlı skill iki kopya görünebilir (çift ad davranışı doğrulanmadı). Bkz. docs/KURULUM.md.
  cursor: { skills: '.agents/skills' },
  antigravity: { skills: '.agents/skills' }, // üçüncü taraf kaynağa dayanır, doğrulanmalı
};
const YOK_SAY = new Set(['.DS_Store', 'Thumbs.db', 'node_modules']);

function yardim() {
  return [
    'Kullanım: node scripts/kur.mjs --hedef <claude|codex|cursor|antigravity|hepsi> [--kapsam proje|kullanici] [--kuru] [--kontrol] [--zorla]',
    '  --kapsam proje (varsayılan): depo kökü altına; kullanici: HOME/USERPROFILE altına (tüm projelerinizi etkiler).',
    '  --kuru     yalnız ne yapacağını yazar, hiçbir şey yazmaz.',
    '  --kontrol  kanonik kaynak ile kopyaların birebir aynı olup olmadığını denetler (sapma varsa çıkış 1).',
    '             Kanonikte olmayan skill dizinleri için "fazla dosya uyarısı bilgilendiricidir": listelenir, çıkış kodunu değiştirmez.',
    '  --zorla    farklı içerikli mevcut dosyanın üzerine yazar. YEDEK ALMAZ: önce git status / yedek alın.',
    '  --kok      kaynak ve proje kapsamı kök dizini (varsayılan: bu betiğin üst dizini).',
    'Çakışma varsa (--zorla yoksa) önce tümü taranır ve hiçbir dosya yazılmaz.',
  ].join('\n');
}

function ayristir(argv) {
  const a = { hedef: null, kapsam: 'proje', kuru: false, kontrol: false, zorla: false, kok: null, yardim: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const deger = () => {
      if (i + 1 >= argv.length) throw new Error(`${k} için değer eksik`);
      return argv[++i];
    };
    if (k === '--hedef') a.hedef = deger();
    else if (k === '--kapsam') a.kapsam = deger();
    else if (k === '--kok') a.kok = deger();
    else if (k === '--kuru') a.kuru = true;
    else if (k === '--kontrol') a.kontrol = true;
    else if (k === '--zorla') a.zorla = true;
    else if (k === '--yardim' || k === '--help' || k === '-h') a.yardim = true;
    else throw new Error(`bilinmeyen bayrak: ${k}`);
  }
  return a;
}

// Yalnız normal dosyaları döndürür; sembolik bağlantıları atlar ve uyarı listesine yazar.
function dosyalar(dir, uyarilar) {
  const sonuc = [];
  if (!fs.existsSync(dir)) return sonuc;
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (YOK_SAY.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) { uyarilar.push(`sembolik bağlantı atlandı: ${p}`); continue; }
      if (e.isDirectory()) gez(p); else if (e.isFile()) sonuc.push(path.relative(dir, p));
    }
  };
  gez(dir);
  return sonuc.sort();
}

// Bir (kaynak -> hedef) çifti için iş listesi. skills: klasör bazlı; agents: yalnız .md.
function cifler(kokKaynak, hedefTaban, hedef, uyarilar) {
  const liste = [];
  const sk = path.join(kokKaynak, '.claude', 'skills');
  if (fs.existsSync(sk)) {
    for (const d of fs.readdirSync(sk, { withFileTypes: true })) {
      if (YOK_SAY.has(d.name)) continue;
      if (d.isSymbolicLink()) { uyarilar.push(`sembolik bağlantı atlandı: ${path.join(sk, d.name)}`); continue; }
      if (!d.isDirectory()) continue;
      liste.push({ tur: 'skill', ad: d.name, kaynak: path.join(sk, d.name), hedef: path.join(hedefTaban, hedef.skills, d.name) });
    }
  }
  if (hedef.agents) {
    const ag = path.join(kokKaynak, '.claude', 'agents');
    if (fs.existsSync(ag)) {
      for (const e of fs.readdirSync(ag, { withFileTypes: true })) {
        if (e.isSymbolicLink()) { uyarilar.push(`sembolik bağlantı atlandı: ${path.join(ag, e.name)}`); continue; }
        if (!e.isFile() || !e.name.endsWith('.md')) continue;
        liste.push({ tur: 'ajan', ad: e.name, kaynak: path.join(ag, e.name), hedef: path.join(hedefTaban, hedef.agents, e.name) });
      }
    }
  }
  return liste;
}

// Hedef dosyanın durumu: yaz (yok) | ayni | farkli | dizin | sembolik | engel (üst yol dosya)
function hedefDurum(k, h, taban) {
  const parcalar = path.relative(taban, h).split(path.sep);
  let p = taban;
  for (let i = 0; i < parcalar.length - 1; i++) {
    p = path.join(p, parcalar[i]);
    let st;
    try { st = fs.lstatSync(p); } catch { return 'yaz'; }
    if (st.isSymbolicLink()) return 'sembolik';
    if (!st.isDirectory()) return 'engel';
  }
  let st;
  try { st = fs.lstatSync(h); } catch { return 'yaz'; }
  if (st.isSymbolicLink()) return 'sembolik';
  if (st.isDirectory()) return 'dizin';
  if (!st.isFile()) return 'engel';
  return fs.readFileSync(k).equals(fs.readFileSync(h)) ? 'ayni' : 'farkli';
}

function main() {
  let a;
  try { a = ayristir(process.argv.slice(2)); } catch (e) { console.error(`Hata: ${e.message}\n${yardim()}`); return 2; }
  if (a.yardim) { console.log(yardim()); return 0; }
  if (!a.hedef) { console.error(`Hata: --hedef zorunlu.\n${yardim()}`); return 2; }
  if (a.hedef !== 'hepsi' && !HEDEFLER[a.hedef]) { console.error(`Hata: bilinmeyen hedef "${a.hedef}". Geçerli: ${Object.keys(HEDEFLER).join(', ')}, hepsi`); return 2; }
  if (!['proje', 'kullanici'].includes(a.kapsam)) { console.error('Hata: --kapsam proje ya da kullanici olmalı.'); return 2; }

  const kok = path.resolve(a.kok || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const ev = process.env.HOME || process.env.USERPROFILE;
  if (a.kapsam === 'kullanici' && !ev) { console.error('Hata: HOME/USERPROFILE tanımlı değil.'); return 2; }
  const taban = a.kapsam === 'kullanici' ? path.resolve(ev) : kok;
  const adlar = a.hedef === 'hepsi' ? Object.keys(HEDEFLER) : [a.hedef];

  if (!fs.existsSync(path.join(kok, '.claude', 'skills'))) { console.error(`Hata: kanonik kaynak yok: ${path.join(kok, '.claude', 'skills')}`); return 2; }
  if (a.kapsam === 'kullanici') {
    console.log('Uyarı: kullanıcı kapsamı bu skill\'leri TÜM projelerinizde etkinleştirir; proje kapsamı önerilir.');
    if (adlar.includes('antigravity')) console.log('Uyarı: Antigravity skill konumu resmî dokümanda ayrıntılı değil (üçüncü taraf kaynağa dayanır, doğrulanmalı).');
  }

  const uyarilar = [];
  // Aynı hedef dizine giden tekrarları ele (cursor/codex/antigravity .agents/skills'i paylaşır).
  const isler = new Map();
  for (const ad of adlar) {
    for (const c of cifler(kok, taban, HEDEFLER[ad], uyarilar)) {
      const anahtar = path.resolve(c.hedef);
      if (!isler.has(anahtar)) isler.set(anahtar, { ...c, araclar: [ad] }); else isler.get(anahtar).araclar.push(ad);
    }
  }

  // 1. Aşama: bütün dosyalar için plan (hiçbir şey yazılmaz).
  const plan = [];
  for (const is of isler.values()) {
    const etiket = `${is.tur} ${is.ad} (${is.araclar.join('+')})`;
    if (path.resolve(is.kaynak) === path.resolve(is.hedef)) { console.log(`= ${etiket}: kanonik kaynak, atlandı`); continue; }
    const kaynakDosyalar = is.tur === 'skill' ? dosyalar(is.kaynak, uyarilar) : [''];
    const hedefDosyalar = is.tur === 'skill' ? dosyalar(is.hedef, []) : [''];
    for (const f of kaynakDosyalar) {
      const k = f ? path.join(is.kaynak, f) : is.kaynak;
      const h = f ? path.join(is.hedef, f) : is.hedef;
      plan.push({ k, h, goreli: path.relative(taban, h).split(path.sep).join('/'), durum: hedefDurum(k, h, taban) });
    }
    if (a.kontrol) {
      for (const f of hedefDosyalar) {
        if (f && !kaynakDosyalar.includes(f)) plan.push({ fazla: true, goreli: path.relative(taban, path.join(is.hedef, f)).split(path.sep).join('/') });
      }
    }
  }
  for (const u of uyarilar) console.log(`Uyarı: ${u}`);

  if (a.kontrol) {
    // Bilgilendirici: hedefte olup kanonikte olmayan skill dizinleri (çıkış kodunu etkilemez).
    const kanonikSkill = new Set([...isler.values()].filter((i) => i.tur === 'skill').map((i) => i.ad));
    const bakilan = new Set();
    for (const is of isler.values()) {
      if (is.tur !== 'skill') continue;
      const ust = path.dirname(is.hedef);
      if (bakilan.has(ust) || !fs.existsSync(ust)) continue;
      bakilan.add(ust);
      for (const e of fs.readdirSync(ust, { withFileTypes: true })) {
        if (e.isDirectory() && !YOK_SAY.has(e.name) && !kanonikSkill.has(e.name)) console.log(`Uyarı: kanonikte olmayan skill dizini: ${path.relative(taban, path.join(ust, e.name)).split(path.sep).join('/')}`);
      }
    }
    let sapma = 0;
    for (const p of plan) {
      if (p.fazla) { console.log(`! FAZLA  ${p.goreli}`); sapma++; }
      else if (p.durum === 'yaz') { console.log(`! EKSİK  ${p.goreli}`); sapma++; }
      else if (p.durum !== 'ayni') { console.log(`! FARKLI ${p.goreli} (${p.durum})`); sapma++; }
    }
    console.log(sapma ? `Kontrol: ${sapma} sapma.` : 'Kontrol: kanonik kaynak ile kopyalar birebir aynı.');
    return sapma ? 1 : 0;
  }

  // Çakışmalar: dizin/sembolik/engel her zaman engeldir; 'farkli' yalnız --zorla yoksa.
  const ACIKLAMA = { dizin: 'dizin', sembolik: 'sembolik bağlantı', engel: 'üst yol dosya' };
  const sert = plan.filter((p) => ACIKLAMA[p.durum]);
  const yumusak = plan.filter((p) => p.durum === 'farkli');
  const engel = sert.length > 0 || (yumusak.length > 0 && !a.zorla);
  if (engel) {
    for (const p of sert) console.log(`! ÇATIŞMA (${ACIKLAMA[p.durum]}) ${p.goreli}: ezilmez`);
    if (!a.zorla) for (const p of yumusak) console.log(`! ÇATIŞMA ${p.goreli}: içerik farklı, ezilmedi (--zorla ile ezilir; yedek alınmaz)`);
    console.log(`Hiçbir dosya yazılmadı: ${sert.length + (a.zorla ? 0 : yumusak.length)} çatışma.`);
    return 1;
  }

  // 2. Aşama: yaz.
  let yazilan = 0; let ayni = 0;
  for (const p of plan) {
    if (p.durum === 'ayni') { ayni++; continue; }
    if (a.kuru) { console.log(`+ (kuru) ${p.goreli}${p.durum === 'farkli' ? ' [ezilecek]' : ''}`); yazilan++; continue; }
    fs.mkdirSync(path.dirname(p.h), { recursive: true });
    fs.copyFileSync(p.k, p.h);
    console.log(`+ ${p.goreli}${p.durum === 'farkli' ? ' [ezildi]' : ''}`);
    yazilan++;
  }
  console.log(`${a.kuru ? 'Kuru çalışma: ' : ''}${yazilan} dosya ${a.kuru ? 'yazılacaktı' : 'yazıldı'}, ${ayni} zaten aynı.`);
  return 0;
}

process.exitCode = main();
