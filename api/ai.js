// =====================================================
// K's Tools for School — js/ai.js
// Klien AI: satu pintu ke otak server (/api/ai)
// =====================================================

export async function tanyaAI(prompt, opts) {
  opts = opts || {};
  const body = { prompt: prompt };
  if (opts.gambar) body.image = opts.gambar;
  if (opts.cari) body.cari = true; // search web (Phase B, dukungan server menyusul)

  let r;
  try {
    r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error('Tidak bisa menghubungi server. Cek koneksi internetmu.');
  }

  let d;
  try { d = await r.json(); }
  catch (e) { throw new Error('Respons server tidak valid.'); }

  if (!d.ok) throw new Error(d.error || 'AI gagal menjawab.');
  return d; // { ok, answer, otak }
}

