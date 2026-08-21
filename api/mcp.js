// =====================================================
// K's Tools for School — api/mcp.js
// MCP Server endpoint (JSON-RPC 2.0 over HTTP)
// Dual-provider: Gemini 2.5 Flash (primary) → Groq Qwen3-32b (fallback)
// =====================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GROQ_CHAT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'qwen/qwen3.6-27b';

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

function kunciGemini() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY belum di-set di Vercel.');
  return k;
}

function kunciGroq() {
  const k = process.env.GROQ_API_KEY;
  if (!k) throw new Error('GROQ_API_KEY belum di-set di Vercel.');
  return k;
}

async function callGemini(prompt) {
  const r = await fetch(GEMINI_BASE + GEMINI_MODEL + ':generateContent?key=' + kunciGemini(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });
  const d = await r.json();
  if (d.error) throw new Error('Gemini: ' + d.error.message);
  return (d.candidates && d.candidates[0] && d.candidates[0].content &&
    d.candidates[0].content.parts && d.candidates[0].content.parts[0] &&
    d.candidates[0].content.parts[0].text) || 'Tidak ada jawaban.';
}

async function callGroq(prompt) {
  const r = await fetch(GROQ_CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + kunciGroq()
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192
    })
  });
  const teks = await r.text();
  let d;
  try { d = JSON.parse(teks); }
  catch (e) { throw new Error('Groq membalas bukan JSON (status ' + r.status + ').'); }
  if (d.error) throw new Error('Groq: ' + d.error.message);
  return (d.choices && d.choices[0] && d.choices[0].message &&
    d.choices[0].message.content) || 'Tidak ada jawaban.';
}

async function callWithFallback(prompt) {
  try {
    return { text: await callGemini(prompt), provider: 'Gemini 2.5 Flash' };
  } catch (e) {
    console.error('[mcp.js] Gemini gagal, fallback ke Groq:', e.message);
    return { text: await callGroq(prompt), provider: 'Groq Qwen3-32b' };
  }
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
        const teks = args.teks.length > 15000 ? args.teks.slice(0, 15000) + '\n[...dipotong]' : args.teks;
        const hasil = await callWithFallback((MODES[mode] || MODES.poin)(teks));
        return reply({ content: [{ type: 'text', text: hasil.text }] });
      }
      return replyErr(-32601, 'Tool tidak ditemukan: ' + name);
    }

    return replyErr(-32601, 'Method tidak dikenal: ' + method);
  } catch (e) {
    console.error('[mcp.js] ERROR:', e.message);
    return replyErr(-32603, e.message || 'Internal error');
  }
};
