// =====================================================
// K's Tools for School — tools/ringkas.js
// Tool: ringkas materi teks dengan 5 mode
// =====================================================

import { ATURAN_DASAR } from '../js/aturan.js';

const MODES = [
  {
    id: 'poin',
    label: '📌 Poin Penting',
    buat: (m) => ATURAN_DASAR +
      'Ringkas materi berikut MENJADI POIN-POIN PENTING SAJA (maksimal 10 poin). ' +
      'Pakai bullet list, tebalkan kata kunci di tiap poin. ' +
      'Tutup dengan satu kalimat "⚡ Ringkasan super singkat:". ' +
      'Materi:\n' + m
  },
  {
    id: 'detail',
    label: '📚 Detail',
    buat: (m) => ATURAN_DASAR +
      'Buat ringkasan LENGKAP dan terstruktur dari materi berikut. ' +
      'Pakai sub-judul (###) per sub-topik, sertakan definisi, penjelasan, dan contoh penting. ' +
      'Tutup dengan bagian "💡 Kesimpulan". ' +
      'Materi:\n' + m
  },
  {
    id: 'explain',
    label: '🧠 Explain',
    buat: (m) => ATURAN_DASAR +
      'Jelaskan materi berikut SEOLAH-OLAH mengajari anak SMP yang baru pertama dengar. ' +
      'Pakai analogi kehidupan sehari-hari, urut dari "apa itu?", "kenapa penting?", sampai "gimana cara kerjanya?". ' +
      'Materi:\n' + m
  },
  {
    id: 'tabel',
    label: '📊 Tabel & Rumus',
    buat: (m) => ATURAN_DASAR +
      'Ekstrak materi berikut menjadi: ' +
      '(1) TABEL Markdown berisi konsep/istilah penting dan penjelasannya, ' +
      '(2) daftar semua RUMUS/persamaan penting dalam format $$...$$ disertai penjelasan satu baris. ' +
      'Kalau tidak ada rumus, tulis "tidak ada rumus pada materi ini". ' +
      'Materi:\n' + m
  },
  {
    id: 'tutorial',
    label: '🛠️ Tutorial',
    buat: (m) => ATURAN_DASAR +
      'Ubah materi berikut menjadi TUTORIAL langkah demi langkah yang gampang diikuti. ' +
      'Pakai list bernomor, tiap langkah ada penjelasan singkat dan tips praktis. ' +
      'Tutup dengan bagian "⚠️ Kesalahan umum yang harus dihindari". ' +
      'Materi:\n' + m
  }
];

export const tool = {
  id: 'ringkas',
  label: '📌 Ringkas',
  thinkingLabel: 'LET HIM COOK!',
  terima: 'teks',
  teksWajib: true,
  placeholder: 'Tempel materi / catatan pelajaran di sini...',
  subModes: MODES.map(m => ({ id: m.id, label: m.label })),
  defaultSub: 'poin',

  siapkan(input) {
    const mode = MODES.find(m => m.id === input.mode) || MODES[0];
    return { prompt: mode.buat(input.teks) };
  }
};

