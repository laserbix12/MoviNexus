// api/chat.js — Proxy seguro para la API de Gemini
// Este archivo corre en Vercel como una Serverless Function (Node.js)
// La GEMINI_API_KEY nunca llega al cliente; solo existe en el servidor.

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const SYSTEM_INSTRUCTION = `Eres Nexus AI, el asistente cinematográfico de MovieNexus.
Tu personalidad es la de un crítico de cine apasionado, culto y amigable.
Conoces el cine mundial a profundidad: clásicos, blockbusters, cine de autor, series y documentales.

REGLAS ESTRICTAS:
1. Siempre responde en el mismo idioma que el usuario te escriba (español o inglés).
2. Cuando menciones o recomiendes películas, SIEMPRE incluye sus títulos exactos en el campo "movies".
3. Tu respuesta DEBE ser un JSON válido con exactamente este formato:
{
  "text": "Tu respuesta en texto con formato Markdown (usa **negritas**, *cursivas*, listas con - )",
  "movies": ["Título Exacto 1", "Título Exacto 2"]
}
4. Si no mencionas películas, devuelve "movies": [].
5. El campo "text" puede contener Markdown pero NO etiquetas HTML.
6. Nunca salgas del rol cinematográfico.
7. Limita tus recomendaciones a máximo 5 películas por respuesta para no saturar al usuario.`;

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY no está configurada en las variables de entorno de Vercel.');
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { history = [], message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "message" field.' });
  }

  // Construir el payload para la API de Gemini
  // Convertimos el historial del chat al formato que Gemini espera
  const contents = [
    ...history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    },
  };

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errorBody);
      return res.status(geminiRes.status).json({
        error: 'Error communicating with Gemini API.',
        details: errorBody,
      });
    }

    const data = await geminiRes.json();

    // Extraer el texto de la respuesta de Gemini
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({ error: 'Empty response from Gemini.' });
    }

    // Intentar parsear el JSON que Gemini devuelve
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Si Gemini no devolvió JSON válido, lo envolvemos manualmente
      parsed = { text: rawText, movies: [] };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Internal error in /api/chat:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
