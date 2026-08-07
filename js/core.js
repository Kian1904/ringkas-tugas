// =====================================================
// K's Tools for School — js/core.js
// SI INDUK: baca KTP tools, UI chat, kuota, riwayat
// =====================================================

import { tanyaAI } from './ai.js';
import { renderMarkdown, typeset, toast, salin, unduh, formatWaktu, el, escapeHtml } from './ui.js';
import { tool as ringkas } from '../tools/ringkas.js';
import { tool as foto } from '../tools/foto.js';
import { tool as pdf } from '../tools/pdf.js';
import { tool as youtube } from '../tools/youtube.js';
import { tool as kuis } from '../tools/kuis.js';
import { tool as translate } from '../tools/translate.js';

const TOOLS = [ringkas, foto, pdf, youtube, kuis, translate];
const KUOTA_HARIAN = 15;

// ---------- STATE ----------
let toolAktif = TOOLS[0];
let subAktif = null;
let fileAktif = null;
let sibuk = false;
let sesi = 0;
let terakhir = null; // { req, toolId } buat regenerate

// ---------- ELEMEN (kontrak dengan index.html) ----------
const $ = (id) => document.getElementById(id);
const chatLog = $('chat-log');
const chipsEl = $('chips');
const subEl = $('subchips');
const inputText = $('input-text');
const btnSend = $('btn-send');
const btnFile = $('btn-file');
const fileInput = $('file-input');
const preview = $('attach-preview');
const previewThumb = $('attach-thumb');
const previewName = $('attach-name');
const previewRemove = $('attach-remove');
const quotaEl = $('quota');

// ---------- KUOTA HARIAN ----------
function kuotaInfo() {
  const hari = new Date().toDateString();
  let q = null;
  try { q = JSON.parse(localStorage.getItem('ks_quota')); } catch (e) {}
  if (!q || q.hari !== hari) q = { hari: hari, pakai: 0 };
  return q;
}
function kuotaPakai() {
  const q = kuotaInfo();
  q.pakai++;
  localStorage.setItem('ks_quota', JSON.stringify(q));
  renderKuota();
}
function renderKuota() {
  quotaEl.textContent = '⚡ ' + kuotaInfo().pakai + '/' + KUOTA_HARIAN;
}

// ---------- CHIPS TOOLS & SUB-MODE ----------
function renderChips() {
  chipsEl.innerHTML = '';
  TOOLS.forEach(t => {
    const b = el('button', 'chip' + (t === toolAktif ? ' active' : ''), t.label);
    b.onclick = () => pilihTool(t);
    chipsEl.appendChild(b);
  });
}

function renderSub() {
  subEl.innerHTML = '';
  if (!toolAktif.subModes) { subEl.classList.add('hidden'); return; }
  subEl.classList.remove('hidden');
  toolAktif.subModes.forEach(m => {
    const b = el('button', 'chip' + (m.id === subAktif ? ' active' : ''), m.label);
    b.onclick = () => { subAktif = m.id; renderSub(); };
    subEl.appendChild(b);
  });
}

function pilihTool(t) {
  toolAktif = t;
  subAktif = t.defaultSub || (t.subModes ? t.subModes[0].id : null);
  inputText.placeholder = t.placeholder || 'Ketik sesuatu...';
  if (t.terima === 'file') {
    btnFile.classList.remove('hidden');
    fileInput.setAttribute('accept', t.accept || '*/*');
  } else {
    btnFile.classList.add('hidden');
    hapusFile();
  }
  renderChips();
  renderSub();
}

// ---------- LAMPIRAN FILE ----------
btnFile.onclick = () => fileInput.click();
fileInput.onchange = () => { if (fileInput.files[0]) pasangFile(fileInput.files[0]); };
previewRemove.onclick = hapusFile;

function pasangFile(f) {
  fileAktif = f;
  previewName.textContent = f.name;
  if (f.type.startsWith('image/')) {
    previewThumb.src = URL.createObjectURL(f);
    previewThumb.style.display = 'block';
  } else {
    previewThumb.style.display = 'none';
  }
  preview.classList.add('show');
}
function hapusFile() {
  fileAktif = null;
  fileInput.value = '';
  preview.classList.remove('show');
}

// ---------- BUBBLES ----------
function scrollBawah() { chatLog.scrollTop = chatLog.scrollHeight; }

function tambahBubble(peran, teks) {
  const wrap = el('div', 'msg ' + peran);
  wrap.appendChild(el('div', 'avatar', peran === 'user' ? '🧑' : '🤖'));
  const bubble = el('div', 'bubble', escapeHtml(teks).replace(/\n/g, '<br>'));
  wrap.appendChild(bubble);
  chatLog.appendChild(wrap);
  scrollBawah();
  return bubble;
}

function buatBubbleAI() {
  const wrap = el('div', 'msg ai');
  wrap.appendChild(el('div', 'avatar', '🤖'));
  const bubble = el('div', 'bubble');
  const isi = el('div', 'bubble-isi');
  bubble.appendChild(isi);
  wrap.appendChild(bubble);
  chatLog.appendChild(wrap);
  scrollBawah();
  return { bubble: bubble, isi: isi };
}

function tambahMeta(bubble, otak, teksMentah) {
  const meta = el('div', 'chips');
  meta.style.marginTop = '10px';
  meta.appendChild(el('span', 'badge', '🧠 ' + (otak || 'AI')));

  const bSalin = el('button', 'chip', '📋 Salin');
  bSalin.onclick = () => { salin(teksMentah); toast('📋 Tersalin!'); };
  meta.appendChild(bSalin);

  const bUnduh = el('button', 'chip', '📥 Export');
  bUnduh.onclick = () => { unduh('k-tools-' + toolAktif.id + '.md', teksMentah); toast('📥 Diunduh!'); };
  meta.appendChild(bUnduh);

  const bUlang = el('button', 'chip', '🔄 Ulangi');
  bUlang.onclick = () => {
    if (!terakhir) return;
    jalankan(terakhir.req, '🔄 (mengulangi permintaan)', terakhir.toolId);
  };
  meta.appendChild(bUlang);

  bubble.appendChild(meta);
}

function tambahTyping(label) {
  const wrap = el('div', 'msg ai typing-wrap');
  wrap.appendChild(el('div', 'avatar', '🤖'));
  
  const bubble = el('div', 'bubble');
  const thinkingText = el('div', 'typing-text');
  thinkingText.textContent = label || 'Berpikir...';
  
  const dots = el('div', 'typing-dots');
  for (let i = 0; i < 3; i++) {
    dots.appendChild(el('span', '', ''));
  }
  
  bubble.appendChild(thinkingText);
  bubble.appendChild(dots);
  wrap.appendChild(bubble);
  chatLog.appendChild(wrap);
  scrollBawah();
  return wrap;
}


// ---------- ALUR KIRIM ----------
btnSend.onclick = () => { if (sibuk) stop(); else kirim(); };

function stop() {
  sesi++;
  sibuk = false;
  btnSend.textContent = '➤';
  document.querySelectorAll('.typing-wrap').forEach(n => n.remove());
  toast('⏹ Dihentikan.');
}

async function kirim() {
  const q = kuotaInfo();
  if (q.pakai >= KUOTA_HARIAN) { toast('⚡ Kuota hari ini habis. Kembali besok ya!'); return; }

  const teks = inputText.value.trim();
  if (toolAktif.teksWajib && !teks) { toast('✍️ Isi teks dulu ya.'); return; }
  if (toolAktif.terima === 'file' && !fileAktif) { toast('📎 Pilih file dulu ya.'); return; }

  const input = { teks: teks, file: fileAktif, mode: subAktif };
  const tampilan = teks || '📎 ' + (fileAktif ? fileAktif.name : '');

  let req;
  try {
    req = await toolAktif.siapkan(input);
  } catch (e) {
    toast('⚠️ ' + e.message);
    return;
  }

  inputText.value = '';
  hapusFile();
  jalankan(req, tampilan, toolAktif.id);
}

async function jalankan(req, tampilan, toolId) {
  const tool = TOOLS.find(t => t.id === toolId) || toolAktif;
  terakhir = { req: req, toolId: toolId };

  tambahBubble('user', tampilan);
  sibuk = true;
  btnSend.textContent = '⏹';
  const idSesi = ++sesi;
  const typing = tambahTyping();

  const d = await tanyaAI(req.prompt, { gambar: req.image }).catch(e => ({ ok: false, error: e.message }));

  typing.remove();
  if (idSesi !== sesi) return; // dihentikan
  sibuk = false;
  btnSend.textContent = '➤';

  if (!d.ok) {
    tambahBubble('ai', '❌ ' + (d.error || 'AI gagal menjawab.'));
    return;
  }

  kuotaPakai();

  let hasil = { markdown: d.answer };
  if (tool.olah) {
    try { hasil = tool.olah(d); }
    catch (e) { hasil = { markdown: d.answer }; toast('⚠️ ' + e.message); }
  }

  const b = buatBubbleAI();
  if (tool.render && hasil.data) tool.render(b.isi, hasil);
  else b.isi.innerHTML = renderMarkdown(hasil.markdown || d.answer);
  typeset(b.isi);
  tambahMeta(b.bubble, d.otak, d.answer);

  simpanRiwayat({ tool: toolId, teks: tampilan, jawaban: d.answer, otak: d.otak, waktu: Date.now() });
}

// ---------- RIWAYAT ----------
const RIWAYAT_KEY = 'ks_riwayat';

function simpanRiwayat(entri) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(RIWAYAT_KEY)); } catch (e) {}
  if (!Array.isArray(list)) list = [];
  list.unshift(entri);
  if (list.length > 50) list.length = 50;
  localStorage.setItem(RIWAYAT_KEY, JSON.stringify(list));
}

function renderRiwayat() {
  const wrap = $('history-list');
  let list = [];
  try { list = JSON.parse(localStorage.getItem(RIWAYAT_KEY)); } catch (e) {}
  if (!Array.isArray(list) || !list.length) {
    wrap.innerHTML = '<div class="history-empty">Belum ada riwayat. 🗒️</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(e => {
    const item = el('div', 'history-item');
    const judul = (e.teks || '(tanpa teks)').slice(0, 70);
    item.innerHTML =
      '<div class="time">' + formatWaktu(e.waktu) + ' · ' + escapeHtml(e.tool) + ' · 🧠 ' + escapeHtml(e.otak || '?') + '</div>' +
      escapeHtml(judul);
    item.onclick = () => muatRiwayat(e);
    wrap.appendChild(item);
  });
}

function muatRiwayat(e) {
  document.querySelector('[data-page="chat"]').click();
  chatLog.innerHTML = '';
  tambahBubble('user', e.teks || '(riwayat)');
  const t = TOOLS.find(x => x.id === e.tool);
  let hasil = { markdown: e.jawaban };
  if (t && t.olah) { try { hasil = t.olah({ answer: e.jawaban }); } catch (err) {} }
  const b = buatBubbleAI();
  if (t && t.render && hasil.data) t.render(b.isi, hasil);
  else b.isi.innerHTML = renderMarkdown(e.jawaban);
  typeset(b.isi);
}

// ---------- NAVIGASI HALAMAN ----------
document.querySelectorAll('[data-page]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('[data-page]').forEach(b => b.classList.remove('active'));
    $('page-' + btn.dataset.page).classList.add('active');
    btn.classList.add('active');
    if (btn.dataset.page === 'history') renderRiwayat();
  };
});

// ---------- INIT ----------
renderKuota();
pilihTool(TOOLS[0]);
buatBubbleAI().isi.innerHTML = renderMarkdown(
  'Halo! Aku **K** 👋 asisten belajarmu.\n\n' +
  'Pilih tool di bawah, kirim materi, dan aku olah jadi ringkasan, kuis, terjemahan, dan lainnya. ' +
  'Kuota harian: ' + KUOTA_HARIAN + ' permintaan. Selamat belajar! 🚀'
);

