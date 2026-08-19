// =====================================================
// K's Tools for School — api/ai.js (v3)
// SERVER-SIDE (Vercel) — WAJIB CommonJS (module.exports)
// =====================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GROQ_CHAT = 'https://api.groq.com/openai/v1/chat/completions';

// ---------- PETA OTAK ----------
const MODEL = {
  flash:   'gemini-2.5-flash',
  tts:     'gemini-2.5-flash-preview-tts',
  embed:   'gemini-embedding-001',
  search:  'groq/compound',
  searchB: 'groq/compound-mini',
  pikir:   'openai/gpt-oss-120b',
  pikirB:  'qwen/qwen3.6-27b'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const { prompt, image, mesin } = req.body || {};
  if (!prompt) return res.status(400).json({ ok: false, error: 'Prompt kosong.' });

  try {
    if (mesin === 'search') return await lewatGroqSearch(prompt, res);
    if (mesin === 'pikir')  return await lewatGroqPikir(prompt, res);
    if (mesin === 'tts')    return await lewatGeminiTts(prompt, res);
    if (mesin === 'embed')  return await lewatGeminiEmbed(prompt, res);
    return await lewatGeminiFlash(prompt, image, res);
  } catch (e) {
    console.error('[ai.js] ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message || 'Server error.' });
  }
};

// ---------- util ----------
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
async function bacaJSON(r) {
  const teks = await r.text();
  try { return JSON.parse(teks); }
  catch (e) {
    throw new Error('Groq membalas bukan JSON (status ' + r.status + '). Servernya mungkin sedang ramai — coba lagi sebentar lagi.');
  }
}

// ---------- 1) GEMINI FLASH (default + vision) ----------
async function lewatGeminiFlash(prompt, image, res) {
  const parts = [{ text: prompt }];
  if (image && image.base64 && image.mimeType) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }
  const r = await fetch(GEMINI_BASE + MODEL.flash + ':generateContent?key=' + kunciGemini(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 16384 }
    })
  });
  const d = await r.json();
  if (d.error) throw new Error('Gemini: ' + d.error.message);
  const answer = (d.candidates && d.candidates[0] && d.candidates[0].content &&
    d.candidates[0].content.parts && d.candidates[0].content.parts[0] &&
    d.candidates[0].content.parts[0].text) || 'Tidak ada jawaban.';
  return res.status(200).json({ ok: true, answer: answer, otak: 'Gemini 2.5 Flash' });
}

// ---------- 2) GROQ SEARCH (3 jalur parasut) ----------
async function lewatGroqSearch(prompt, res) {
  const rencana = [
    { model: MODEL.search,  pakaiSearch: true  },
    { model: MODEL.search,  pakaiSearch: false },
    { model: MODEL.searchB, pakaiSearch: false }
  ];

  let errTerakhir = '';
  for (const rct of rencana) {
    const body = { model: rct.model, messages: [{ role: 'user', content: prompt }] };
    if (rct.pakaiSearch) body.search_settings = { country: 'ID', language: 'id' };

    const r = await fetch(GROQ_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + kunciGroq() },
      body: JSON.stringify(body)
    });
    const d = await bacaJSON(r);

    if (!d.error) {
      const m = d.choices && d.choices[0] && d.choices[0].message;
      let sumber = [];
      if (m && m.executed_tools && m.executed_tools[0] && m.executed_tools[0].search_results) {
        const s = m.executed_tools[0].search_results.results || m.executed_tools[0].search_results;
        sumber = s.slice(0, 5).map(function (x) { return { judul: x.title, url: x.url }; });
      }
      return res.status(200).json({
        ok: true,
        answer: (m && m.content) || 'Tidak ada jawaban.',
        otak: 'Groq Compound',
        sumber: sumber,
        proses: (m && m.reasoning) || ''
      });
    }

    errTerakhir = 'Groq ' + r.status + ': ' + (d.error.message || 'error');
    console.error('[ai.js] search gagal (' + rct.model + ') →', errTerakhir);
  }
  throw new Error(errTerakhir || 'Groq search gagal.');
}

// ---------- 3) GROQ DEEP THINK (+ cadangan) ----------
async function lewatGroqPikir(prompt, res) {
  let model = MODEL.pikir;
  let pasangan = await panggilGroq(model, prompt);
  if (pasangan.d.error) {
    model = MODEL.pikirB;
    pasangan = await panggilGroq(model, prompt);
  }
  if (pasangan.d.error) {
    throw new Error('Groq ' + pasangan.r.status + ': ' + (pasangan.d.error.message || 'error'));
  }
  const m = pasangan.d.choices && pasangan.d.choices[0] && pasangan.d.choices[0].message;
  return res.status(200).json({
    ok: true,
    answer: (m && m.content) || 'Tidak ada jawaban.',
    otak: model === MODEL.pikir ? 'GPT-OSS 120B' : 'Qwen3.6 27B',
    proses: (m && m.reasoning) || ''
  });
}
function panggilGroq(model, prompt) {
  return fetch(GROQ_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + kunciGroq() },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.6 })
  }).then(async function (r) { return { r: r, d: await bacaJSON(r) }; });
}

// ---------- 4) GEMINI TTS ----------
async function lewatGeminiTts(prompt, res) {
  const r = await fetch(GEMINI_BASE + MODEL.tts + ':generateContent?key=' + kunciGemini(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    })
  });
  const d = await r.json();
  if (d.error) throw new Error('Gemini TTS: ' + d.error.message);
  const inline = d.candidates && d.candidates[0] && d.candidates[0].content &&
    d.candidates[0].content.parts && d.candidates[0].content.parts[0] &&
    d.candidates[0].content.parts[0].inlineData;
  if (!inline) throw new Error('TTS tidak menghasilkan audio.');
  return res.status(200).json({
    ok: true, answer: '(audio)', otak: 'Gemini TTS',
    audio: { base64: inline.data, mimeType: inline.mimeType }
  });
}

// ---------- 5) GEMINI EMBEDDING ----------
async function lewatGeminiEmbed(prompt, res) {
  const r = await fetch(GEMINI_BASE + MODEL.embed + ':embedContent?key=' + kunciGemini(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text: prompt }] } })
  });
  const d = await r.json();
  if (d.error) throw new Error('Embedding: ' + d.error.message);
  return res.status(200).json({ ok: true, vector: d.embedding && d.embedding.values, otak: 'Embedding 001' });
}

