// =====================================================
// K's Tools for School — js/aturan.js
// Aturan prompt & util teks bersama untuk SEMUA tools
// =====================================================

export const ATURAN_DASAR =
  'Kamu adalah "K", asisten belajar pelajar Indonesia. ' +
  'Gunakan bahasa Indonesia santai tapi sopan dan mudah dipahami. ' +
  'Gunakan format Markdown (judul, tebal, list, tabel bila perlu). ' +
  'Rumus matematika WAJIB ditulis format MathJax: $...$ atau $$...$$. ';

// Potong teks biar nggak kelewat batas AI
export function jagaPanjang(teks, maks) {
  maks = maks || 15000;
  if (teks.length > maks) {
    return teks.slice(0, maks) + '\n[...dipotong karena terlalu panjang]';
  }
  return teks;
}

