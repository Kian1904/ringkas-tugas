// =====================================================
// K's Tools for School — api/mcp.js
// MCP Server endpoint (JSON-RPC 2.0 over HTTP)
// =====================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_MODEL = 'gemini-2.5-flash';

const ATURAN_DASAR =
  'Kamu adalah "K", asisten belajar pelajar Indonesia. ' +
  'Gunakan bahasa Indonesia santai tapi sopan dan mudah dipahami. ' +
  'Gunakan format Markdown (judul, tebal, list, tabel bila perlu). ' +
  'Rumus matematika WAJIB ditulis format MathJax: $...$ atau $$...$$.';

const MODES = {
  poin:     t => ATURAN_DASAR + '\nRingkas MENJADI POIN-POIN PENTING (maks 10 poin). Bullet list, tebalkan kata kunci. Tutup dengan "⚡ Ringkasan super singkat:".\nMateri:\n' + t,
  detail:   t => ATURAN_DASAR + '\nRingkasan LENGKAP terstruktur. Sub-judul (###), definisi, penjelasan, contoh. Tutup dengan "💡 Kesimpulan".\nMateri:\n' + t,
  explain:  t => ATURAN_DASAR + '\nJelaskan seolah mengajari anak SMP. Analogi sehari-hari, dari "apa itu?", "kenapa penting?", "gimana cara kerjanya?".\nMateri:\n' + t,
  tabel:    t => ATURAN_DASAR + '\nEkstrak jadi: (1) TABEL Markdown konsep/istilah penting, (2) daftar RUMUS $$...$$ disertai penjelasan.\nMateri:\n' + t,
  tutorial: t => ATURAN_DASAR + '\nUbah jadi TUTORIAL langkah demi langkah. List bernomor + tips. Tutup dengan "⚠️ Kesalahan umum yang harus dihindari".\nMateri:\n' + t,
};

const TOOLS = [{
  name: 'summarize',
  description: 'Ringkas teks. Mode: poin (default), detail, explain, tabel, tutorial.',
  inputSchema: {
    type: 'object',
    properties: {
      teks: { type: 'string', description: 'Teks yang akan diringkas' },
      mode: { type: 'string', enum: ['poin','detail','explain','tabel','tutorial'], default: 'poin' }
    },
    required: ['teks']
  }
}];

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY belum di-set di Vercel.');
  const r = await fetch(`${GEMINI_BASE}${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });
  const d = await r.json();
  if (d.error) throw new Error('Gemini: ' + d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada jawaban.';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, method, params } = req.body || {};
  const reply = r => res.json({ jsonrpc: '2.0', id, result: r });
  const replyErr = (code, msg) => res.json({ jsonrpc: '2.0', id, error: { code, message: msg } });

  try {
    if (method === 'initialize') return reply({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ktools-mcp', version: '1.0.0' }
    });

    if (method === 'tools/list') return reply({ tools: TOOLS });

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      if (name === 'summarize') {
        if (!args?.teks) return replyErr(-32602, 'Parameter "teks" wajib diisi.');
        const mode = args.mode || 'poin';
        const teks = args.teks.length > 15000 ? args.teks.slice(0, 15000) + '\n[...dipotong]' : args.teks || args.text;
        const hasil = await callGemini((MODES[mode] || MODES.poin)(teks));
        return reply({ content: [{ type: 'text', text: hasil }] });
      }
      return replyErr(-32601, 'Tool tidak ditemukan: ' + name);
    }

    return replyErr(-32601, 'Method tidak dikenal: ' + method);
  } catch (e) {
    console.error('[mcp.js] ERROR:', e.message);
    return replyErr(-32603, e.message || 'Internal error');
  }
};