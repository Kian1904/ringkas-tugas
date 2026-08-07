
// =====================================================
// K's Tools for School — tools/foto.js
// Tool: baca foto tugas/materi (vision) + kompres otomatis
// =====================================================

import { ATURAN_DASAR } from '../js/aturan.js';

const PROMPT_FOTO = ATURAN_DASAR +
  'User mengirim FOTO tugas/materi. Baca seluruh teks pada foto dengan teliti, ' +
  'lalu ikuti perintah user tentang materi itu. Jika perintah tidak jelas, ' +
  'ringkas isi foto menjadi poin-poin penting.';

// Kompres foto (maks 1024px, JPEG 80%) biar nggak kegedean dikirim
function fotoKeBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ mimeType: 'image/jpeg', base64: dataUrl.split(',')[1] });
      };
      img.onerror = () => reject(new Error('File foto rusak / tidak didukung.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}

export const tool = {
  id: 'foto',
  label: '📷 Foto',
  terima: 'file',
  accept: 'image/*',
  teksWajib: false,
  placeholder: 'Tambahkan perintah untuk foto ini (opsional)...',

  async siapkan(input) {
    if (!input.file) throw new Error('Pilih foto dulu ya.');
    if (!input.file.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar (JPG/PNG).');
    }
    const gambar = await fotoKeBase64(input.file);
    const perintah = input.teks ? '\n\nPerintah user: ' + input.teks : '';
    return { prompt: PROMPT_FOTO + perintah, image: gambar };
  }
};
