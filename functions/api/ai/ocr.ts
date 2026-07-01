// functions/api/ai/ocr.ts — Cloudflare Pages Function
interface Env { GEMINI_API_KEY: string; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function gemini(prompt: string, sys: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    for (let r = 2; r >= 0; r--) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: sys }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            }) }
        );
        const d: any = await res.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (e) { if (r > 0) await new Promise(x => setTimeout(x, 800)); }
    }
  }
  throw new Error('All Gemini attempts failed');
}

export const onRequestPost = async (ctx: { request: Request; env: Env }) => {
  if (!ctx.env.GEMINI_API_KEY)
    return Response.json({ error: 'GEMINI_API_KEY not configured.' }, { status: 500, headers: CORS });

  const { fileName, fileType } = await ctx.request.json() as any;
  const sys = `You are an AI OCR assistant. Reconstruct structured table data from an uploaded file.
Respond ONLY with valid JSON: { "sheetName": "Name", "data": { "A1": "value", ... } }`;
  const text = await gemini(
    `Convert the uploaded ${fileType} document "${fileName}" into structured spreadsheet cells.`,
    sys, ctx.env.GEMINI_API_KEY
  );
  return Response.json(JSON.parse(text.trim()), { headers: CORS });
};

export const onRequestOptions = () => new Response(null, { headers: CORS });
