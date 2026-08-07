// api/ai.js — SERVER-SIDE (CommonJS, BUKAN ES Module!)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { prompt, image, cari } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ ok: false, error: 'Prompt kosong.' });
  }

  try {
    // Panggil Gemini API (atau provider lain)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'API key tidak ditemukan.' });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    
    const parts = [{ text: prompt }];
    if (image) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada jawaban.';

    return res.status(200).json({ ok: true, answer: answer, otak: 'Gemini' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Server error.' });
  }
};
