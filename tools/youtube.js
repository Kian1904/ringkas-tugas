// =====================================================
// K's Tools for School — tools/youtube.js
// Tool: ringkas/jelaskan video YouTube (berbasis judul & topik)
// Catatan: transkrip ASLI = fitur premium (Phase B/C)
// =====================================================

import { ATURAN_DASAR } from '../js/aturan.js';

function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

async function infoYouTube(url) {
  try {
    const r = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(url));
    const d = await r.json();
    return { judul: d.title || 'video YouTube', channel: d.author_name || '' };
  } catch (e) {
    return { judul: 'video YouTube', channel: '' };
  }
}

export const tool = {
  id: 'youtube',
  label: '🎬 YouTube',
  thinkingLabe: 'THE FUHH WAS THAT?',
  terima: 'teks',
  teksWajib: true,
  placeholder: 'Tempel link YouTube... (perintah opsional di baris baru)',

  async siapkan(input) {
    const teks = (input.teks || '').trim();
    const mUrl = teks.match(/https?:\/\/\S+/);
    if (!mUrl || !youtubeId(mUrl[0])) {
      throw new Error('Link YouTube tidak valid. Contoh: https://youtu.be/xxxxxxxx');
    }
    const url = mUrl[0];
    const perintah = teks.replace(mUrl[0], '').trim();
    const info = await infoYouTube(url);

    return {
      prompt: ATURAN_DASAR +
        'User mengirim link YouTube. Judul video: "' + info.judul + '"' +
        (info.channel ? ' (channel: ' + info.channel + ')' : '') + '. ' +
        'Kamu TIDAK bisa menonton video, jadi berdasarkan judul dan pengetahuanmu, ' +
        'buatkan ringkasan/penjelasan paling berguna tentang topik yang kemungkinan dibahas. ' +
        'Awali jujur dengan: "⚠️ AI tidak bisa menonton video langsung — penjelasan ini berdasarkan judul & topiknya." ' +
        'Perintah user: ' + (perintah || 'Ringkas perkiraan isi video ini.')
    };
  }
};

