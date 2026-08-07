// =====================================================
// K's Tools for School — tools/pdf.js
// Tool: ekstrak teks PDF lalu ringkas/jawab
// Butuh: pdf.js dari CDN (dipasang di index.html nanti)
// =====================================================

import { ATURAN_DASAR, jagaPanjang } from '../js/aturan.js';

const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function ekstrakPdf(file) {
  if (typeof window.pdfjsLib === 'undefined') {
    throw new Error('Library PDF belum termuat. Refresh halaman ya.');
  }
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  }

  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;

  let teks = '';
  const maxHal = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxHal; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    teks += tc.items.map(it => it.str).join(' ') + '\n';
    if (teks.length > 15000) break;
  }

  teks = teks.trim();
  if (!teks) {
    throw new Error('PDF tidak punya teks (mungkin hasil scan/foto). Coba pakai tool 📷 Foto.');
  }
  return jagaPanjang(teks);
}

export const tool = {
  id: 'pdf',
  label: '📄 PDF',
  thinkingLabel: 'hmm.. interesting',
  terima: 'file',
  accept: 'application/pdf,.pdf',
  teksWajib: false,
  placeholder: 'Tambahkan perintah untuk PDF ini (opsional)...',

  async siapkan(input) {
    if (!input.file) throw new Error('Pilih file PDF dulu ya.');
    const teks = await ekstrakPdf(input.file);
    const perintah = input.teks
      ? 'Perintah user: ' + input.teks + ' Jika perintah tidak jelas, ringkas menjadi poin-poin penting.'
      : 'Ringkas materi ini menjadi poin-poin penting.';
    return {
      prompt: ATURAN_DASAR +
        'Berikut teks yang diekstrak dari PDF user. ' + perintah +
        '\n\nMateri:\n' + teks
    };
  }
};
