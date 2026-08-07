// api/ai.js
// OTAK SERVER - semua key AI aman di sini, nggak pernah ke browser
// Dipanggil web app & (nanti) KsBot lewat POST /api/ai

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Rate limit sederhana: 30 request / 10 menit per IP
const rateLimit = {};
function checkRate(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => now - t < 600000);
  if (rateLimit[ip].length >= 30) return false;
  rateLimit[ip].push(now);
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (!checkRate(ip)) {
    return res.status(429).json({ ok: false, error: 'Kuota server habis, coba lagi nanti ya!' });
  }

  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const image = body.image || null;

  if (!prompt && !image) return res.status(400).json({ ok: false, error: 'Tidak ada materi dikirim' });
  if (prompt.length > 20000) return res.status(400).json({ ok: false, error: 'Teks terlalu panjang (maks 20.000 karakter)' });

  // ── MODE GAMBAR: cuma model vision yang jalan ──
  if (image) {
    try {
      const answer = await callGeminiVision(prompt, image);
      console.log('Dijawab oleh: Gemini 2.5 Flash (vision)');
      return res.status(200).json({ ok: true, answer: answer, otak: 'Gemini 2.5 Flash (vision)' });
    } catch (e) {
      console.log('Gemini vision gagal: ' + e.message);
      return res.status(503).json({ ok: false, error: 'AI gambar sedang sibuk, coba lagi sebentar lagi.' });
    }
  }

  // ── MODE TEKS: rantai 3 otak ──
  const chain = [
    { nama: 'Gemini 2.5 Flash', fn: () => callGemini(prompt) },
    { nama: 'Gemma (Groq)', fn: () => callGroq('gemma2-9b-it', prompt) },
    { nama: 'Qwen 3.6 27B (Groq)', fn: () => callGroq('qwen/qwen3.6-27b', prompt) }
  ];

  for (let i = 0; i < chain.length; i++) {
    try {
      const answer = await chain[i].fn();
      console.log('Dijawab oleh: ' + chain[i].nama);
      return res.status(200).json({ ok: true, answer: answer, otak: chain[i].nama });
    } catch (e) {
      console.log(chain[i].nama + ' gagal: ' + e.message + ', pindah otak...');
    }
  }

  res.status(503).json({ ok: false, error: 'Semua AI sedang sibuk, coba lagi sebentar lagi.' });
};

// ===== GEMINI (TEKS) =====
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY belum di-set');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const d = await r.json();
  if (d.candidates && d.candidates[0] && d.candidates[0].content) {
    return d.candidates[0].content.parts[0].text;
  }
  throw new Error('Respons Gemini kosong');
}

// ===== GEMINI (GAMBAR / FOTO TUGAS) =====
async function callGeminiVision(prompt, image) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY belum di-set');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: image.mimeType, data: image.base64 } }
      ] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });
  if (!r.ok) throw new Error('Gemini vision ' + r.status);
  const d = await r.json();
  if (d.candidates && d.candidates[0] && d.candidates[0].content) {
    return d.candidates[0].content.parts[0].text;
  }
  throw new Error('Respons Gemini kosong');
}

// ===== GROQ (GEMMA / QWEN) =====
async function callGroq(model, prompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY belum di-set');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Kamu adalah asisten belajar untuk pelajar Indonesia. Jawab dengan bahasa Indonesia yang simpel dan jelas.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });
  if (!r.ok) throw new Error('Groq ' + model + ' error ' + r.status);
  const d = await r.json();
  if (d.choices && d.choices[0] && d.choices[0].message) {
    return d.choices[0].message.content;
  }
  throw new Error('Respons Groq kosong');
}
