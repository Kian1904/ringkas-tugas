// =====================================================
// K's Tools for School — js/ui.js
// Helper UI bersama: markdown, toast, salin, unduh, waktu
// =====================================================

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(t) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function kodeBlok(blok) {
  const m = blok.match(/```(\w*)\n?([\s\S]*?)```/);
  return '<pre><code>' + escapeHtml(m ? m[2].replace(/\n$/, '') : blok) + '</code></pre>';
}

// Renderer Markdown mini: heading, list, tabel, kode, bold/italic
export function renderMarkdown(src) {
  if (!src) return '';
  const blokKode = [];
  let s = String(src).replace(/```[\s\S]*?```/g, (m) => {
    blokKode.push(m);
    return '\u0000' + (blokKode.length - 1) + '\u0000';
  });

  s = escapeHtml(s);

  // tabel markdown
  s = s.replace(/(^|\n)\|(.+)\|\n\|([\s:|-]+)\|\n((?:\|.+\|\n?)+)/g, (m, pre, head, sep, body) => {
    const th = head.split('|').map(c => c.trim()).filter(Boolean)
      .map(c => '<th>' + inline(c) + '</th>').join('');
    const tr = body.trim().split('\n').map(r =>
      '<tr>' + r.replace(/^\||\|$/g, '').split('|')
        .map(c => '<td>' + inline(c.trim()) + '</td>').join('') + '</tr>').join('');
    return pre + '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>\n';
  });

  const lines = s.split('\n');
  let html = '', list = null, para = [];

  const tutupPara = () => { if (para.length) { html += '<p>' + para.join('<br>') + '</p>'; para = []; } };
  const tutupList = () => { if (list) { html += '</' + list + '>'; list = null; } };

  for (const baris of lines) {
    const t = baris.trim();

    const cb = t.match(/^\u0000(\d+)\u0000$/);
    if (cb) { tutupPara(); tutupList(); html += kodeBlok(blokKode[+cb[1]]); continue; }

    if (!t) { tutupPara(); tutupList(); continue; }

    const h = t.match(/^(#{1,4})\s+(.+)/);
    if (h) { tutupPara(); tutupList(); const tag = h[1].length <= 2 ? 'h3' : 'h4'; html += '<' + tag + '>' + inline(h[2]) + '</' + tag + '>'; continue; }

    const ul = t.match(/^[-*•]\s+(.+)/);
    if (ul) { tutupPara(); if (list !== 'ul') { tutupList(); html += '<ul>'; list = 'ul'; } html += '<li>' + inline(ul[1]) + '</li>'; continue; }

    const ol = t.match(/^\d+[.)]\s+(.+)/);
    if (ol) { tutupPara(); if (list !== 'ol') { tutupList(); html += '<ol>'; list = 'ol'; } html += '<li>' + inline(ol[1]) + '</li>'; continue; }

    para.push(inline(t));
  }
  tutupPara(); tutupList();
  return html;
}

// Render rumus MathJax setelah markdown masuk DOM
export function typeset(el) {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([el]).catch(() => {});
  }
}

let toastEl = null;
export function toast(pesan) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = pesan;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

export async function salin(teks) {
  try { await navigator.clipboard.writeText(teks); return true; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = teks;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e2) {}
    ta.remove();
    return true;
  }
}

export function unduh(nama, isi, tipe) {
  const blob = new Blob([isi], { type: tipe || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function formatWaktu(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' · ' +
         d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}
