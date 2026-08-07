// =====================================================
// K's Tools for School — tools/translate.js
// Tool: terjemahkan teks (mode = bahasa tujuan)
// =====================================================

const BAHASA = {
  en: 'Inggris',
  id: 'Indonesia',
  ar: 'Arab',
  ja: 'Jepang',
  ko: 'Korea'
};

export const tool = {
  id: 'translate',
  label: '🌐 Translate',
  terima: 'teks',
  teksWajib: true,
  placeholder: 'Tempel teks yang mau diterjemahkan...',
  subModes: [
    { id: 'en', label: '🇬🇧 Inggris' },
    { id: 'id', label: '🇮🇩 Indonesia' },
    { id: 'ar', label: '🇸🇦 Arab' },
    { id: 'ja', label: '🇯🇵 Jepang' },
    { id: 'ko', label: '🇰🇷 Korea' }
  ],
  defaultSub: 'en',

  siapkan(input) {
    const tujuan = BAHASA[input.mode] || 'Inggris';
    return {
      prompt: 'Kamu penerjemah profesional. Terjemahkan teks berikut ke bahasa ' + tujuan +
        ' secara natural dan akurat, pertahankan format Markdown. ' +
        'Kembalikan HANYA hasil terjemahan tanpa komentar tambahan.' +
        '\n\nTeks:\n' + input.teks
    };
  }
};
