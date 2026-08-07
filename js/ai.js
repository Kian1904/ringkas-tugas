// js/ai.js - VERSI MODULE
export async function tanyaAI(prompt, opts) {
  opts = opts || {};
  const body = { prompt: prompt };
  if (opts.gambar) body.image = opts.gambar;
  if (opts.cari) body.cari = true;

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
  return d;
}

