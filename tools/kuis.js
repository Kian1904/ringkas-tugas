// =====================================================
// K's Tools for School — tools/kuis.js
// Tool: kuis dari materi (PG interaktif & esai + rubrik)
// Punya 2 fungsi ekstra di KTP:
//   olah(d)      → parse JSON jawaban AI jadi data
//   render(...)  → UI khusus (tombol kuis), ganti markdown biasa
// =====================================================

import { ATURAN_DASAR } from '../js/aturan.js';
import { el, renderMarkdown, typeset } from '../js/ui.js';

function parseJsonAI(teks) {
  let t = String(teks).trim().replace(/```json/g, '').replace(/```/g, '');
  const awal = t.indexOf('[');
  const akhir = t.lastIndexOf(']');
  if (awal === -1 || akhir === -1) {
    throw new Error('AI tidak mengembalikan format kuis yang valid. Coba ulangi ya.');
  }
  return JSON.parse(t.slice(awal, akhir + 1));
}

// AI kadang balas index (0), kadang huruf ("A") — amankan keduanya
function kunciIndex(soal, jmlOpsi) {
  let a = soal.answer;
  if (typeof a === 'string') {
    a = a.trim();
    if (/^[A-Da-d]$/.test(a)) return a.toUpperCase().charCodeAt(0) - 65;
    a = parseInt(a, 10);
  }
  return (typeof a === 'number' && a >= 0 && a < jmlOpsi) ? a : -1;
}

export const tool = {
  id: 'kuis',
  label: '📝 Kuis',
  thinkingLabel: 'too weak..',
  terima: 'teks',
  teksWajib: true,
  placeholder: 'Tempel materi yang mau dijadikan kuis...',
  subModes: [
    { id: 'pg', label: '🔘 Pilihan Ganda (5 Soal)' },
    { id: 'esai', label: '✍️ Esai (3 Soal)' }
  ],
  defaultSub: 'pg',

  siapkan(input) {
    if (input.mode === 'esai') {
      return {
        prompt: ATURAN_DASAR +
          'Dari materi berikut, buat 3 SOAL ESAI KOMPREHENSIF lengkap dengan jawaban model dan rubrik penilaian. ' +
          'Kembalikan HANYA JSON dengan format ini tanpa teks lain: ' +
          '[{"q":"soal","answer":"jawaban model","rubrik":"rubrik penilaian"}] ' +
          'Materi:\n' + input.teks
      };
    }
    return {
      prompt: ATURAN_DASAR +
        'Dari materi berikut, buat 5 SOAL PILIHAN GANDA dengan 4 opsi masing-masing. ' +
        'Kembalikan HANYA JSON array tanpa teks lain dengan format ini: ' +
        '[{"q":"soal","options":["A","B","C","D"],"answer":0,"explain":"pembahasan jawaban"}] ' +
        '"answer" adalah INDEX opsi yang benar (0-3). ' +
        'Materi:\n' + input.teks
    };
  },

  // Sesudah AI menjawab: parse JSON jadi data kuis
  olah(d) {
    return { data: parseJsonAI(d.answer) };
  },

  // UI khusus kuis
  render(kontainer, hasil) {
    const data = hasil.data;
    if (Array.isArray(data) && data.length && Array.isArray(data[0].options)) {
      renderPG(kontainer, data);
    } else if (Array.isArray(data) && data.length) {
      renderEsai(kontainer, data);
    } else {
      kontainer.appendChild(el('p', '', 'Kuis kosong. Coba ulangi ya.'));
    }
    typeset(kontainer);
  }
};

// ---------- KUIS PILIHAN GANDA (interaktif + skor) ----------
function renderPG(kontainer, soalList) {
  let skor = 0, terjawab = 0;
  const skorEl = el('div', 'badge quiz-skor', 'Skor: 0/' + soalList.length);
  kontainer.appendChild(skorEl);

  soalList.forEach((s, i) => {
    const wrap = el('div', 'card');
    wrap.appendChild(el('div', 'quiz-q', renderMarkdown('**Soal ' + (i + 1) + '.** ' + s.q)));

    const kunci = kunciIndex(s, (s.options || []).length);
    const tombol = [];

    (s.options || []).forEach((opt, oi) => {
      const b = el('button', 'quiz-option');
      b.textContent = String.fromCharCode(65 + oi) + '. ' + opt;
      b.onclick = () => {
        if (wrap.dataset.done) return;
        wrap.dataset.done = '1';
        terjawab++;
        if (oi === kunci) { skor++; b.classList.add('correct'); }
        else {
          b.classList.add('wrong');
          if (kunci >= 0 && tombol[kunci]) tombol[kunci].classList.add('correct');
        }
        tombol.forEach(x => { x.disabled = true; });
        if (s.explain) {
          wrap.appendChild(el('div', 'quiz-explain', renderMarkdown('**Pembahasan:** ' + s.explain)));
        }
        skorEl.textContent = 'Skor: ' + skor + '/' + soalList.length + ' (terjawab ' + terjawab + ')';
        if (terjawab === soalList.length) {
          const puji = skor === soalList.length ? '🏆 Sempurna! '
            : skor >= soalList.length / 2 ? '💪 Lumayan! ' : '📖 Ayo baca lagi! ';
          kontainer.appendChild(el('div', 'badge', '🏁 ' + puji + 'Skor akhir: ' + skor + '/' + soalList.length));
        }
      };
      tombol.push(b);
      wrap.appendChild(b);
    });

    kontainer.appendChild(wrap);
  });
}

// ---------- KUIS ESAI (soal + jawaban model + rubrik) ----------
function renderEsai(kontainer, soalList) {
  soalList.forEach((s, i) => {
    const wrap = el('div', 'card');
    wrap.appendChild(el('div', 'quiz-q', renderMarkdown('**Soal ' + (i + 1) + '.** ' + s.q)));
    const isi = el('div', 'hidden',
      renderMarkdown('**Jawaban model:**\n' + (s.answer || '-') +
        '\n\n**Rubrik penilaian:**\n' + (s.rubrik || '-')));
    const btn = el('button', 'btn btn-ghost', '👀 Lihat Jawaban & Rubrik');
    btn.onclick = () => {
      isi.classList.toggle('hidden');
      btn.textContent = isi.classList.contains('hidden')
        ? '👀 Lihat Jawaban & Rubrik' : '🙈 Sembunyikan';
    };
    wrap.appendChild(btn);
    wrap.appendChild(isi);
    kontainer.appendChild(wrap);
  });
}

