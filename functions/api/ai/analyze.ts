// functions/api/ai/analyze.ts — Cloudflare Pages Function
interface Env { GEMINI_API_KEY: string; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function gemini(prompt: string, systemInstruction: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    for (let r = 2; r >= 0; r--) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
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

  const { sheetName, grid, selection, prompt } = await ctx.request.json() as any;
  const gridContext = Object.entries(grid)
    .map(([k, c]: [string, any]) => `${k}: "${c.value}"${c.computed ? ` (computed: "${c.computed}")` : ''}`)
    .join('\n');
  const selCtx = selection
    ? `Selected Range: Row ${selection.startRow+1} Col ${selection.startCol+1} to Row ${selection.endRow+1} Col ${selection.endCol+1}`
    : 'No range selected';

  const sys = `You are QurveSheet AI, an elite spreadsheet engineer and BI analyst.
Respond ONLY with valid JSON: { "analysis": "markdown string", "suggestedAction": { "type": "apply_formula"|"update_cells"|"create_chart"|"fill_data"|"none", "payload": {} } }
Use valid UPPERCASE Excel formula syntax.`;

  const text = await gemini(
    `Sheet: "${sheetName}"\n${gridContext}\n${selCtx}\nRequest: "${prompt}"`,
    sys, ctx.env.GEMINI_API_KEY
  );
  return Response.json(JSON.parse(text.trim()), { headers: CORS });
};

export const onRequestOptions = () => new Response(null, { headers: CORS });
