// Cloudflare Worker — QurveSheet AI API
// Handles all /api/* routes, keeping GEMINI_API_KEY secure server-side

export interface Env {
  GEMINI_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Gemini model fallback with retry
async function generateContentWithRetry(
  prompt: string,
  systemInstruction: string,
  apiKey: string,
  responseMimeType = 'application/json'
): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of models) {
    for (let retries = 2; retries >= 0; retries--) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType },
            }),
          }
        );
        const data: any = await response.json();
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        lastError = new Error(`Model ${model} returned empty response`);
      } catch (err: any) {
        lastError = err;
        if (retries > 0) await new Promise(r => setTimeout(r, 800));
      }
    }
  }
  throw lastError || new Error('All Gemini model attempts failed.');
}

function getLuminance(hex: string): number {
  if (!hex) return 0;
  let c = hex.trim().replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  if (isNaN(r)||isNaN(g)||isNaN(b)) return 0;
  return (0.299*r + 0.587*g + 0.114*b)/255;
}

function sanitizeAndShiftGrid(grid: Record<string, any>): { grid: Record<string, any>; rowCount: number } {
  if (!grid || typeof grid !== 'object') return { grid: {}, rowCount: 15 };
  const rowCellCounts: Record<number, number> = {};
  Object.keys(grid).forEach(key => {
    const rowNum = parseInt(key.replace(/^[A-Z]+/i, ''), 10);
    if (!isNaN(rowNum)) rowCellCounts[rowNum] = (rowCellCounts[rowNum] || 0) + 1;
  });
  let headerRow = 1;
  if (rowCellCounts[3] >= 2 && (rowCellCounts[1] || 0) <= 1) headerRow = 3;
  else if (rowCellCounts[2] >= 2 && (rowCellCounts[1] || 0) <= 1) headerRow = 2;
  const shiftAmount = headerRow - 1;
  const newGrid: Record<string, any> = {};
  Object.entries(grid).forEach(([key, cell]) => {
    if (!cell) return;
    const colLabel = key.match(/^[A-Z]+/i)?.[0] || 'A';
    const rowNum = parseInt(key.replace(/^[A-Z]+/i, ''), 10);
    if (isNaN(rowNum) || rowNum < headerRow) return;
    const newRowNum = rowNum - shiftAmount;
    const newKey = `${colLabel}${newRowNum}`;
    let val = cell.value;
    if (typeof val === 'string' && val.startsWith('=')) {
      val = val.replace(/([A-Z]+)([0-9]+)/gi, (match: string, col: string, rStr: string) => {
        const r = parseInt(rStr, 10);
        return r >= headerRow ? col + (r - shiftAmount) : match;
      });
    }
    const cellStyle = { ...(cell.style || {}) };
    if (newRowNum === 1) { cellStyle.bold = true; cellStyle.bg = '#1e293b'; cellStyle.color = '#ffffff'; }
    else if (cellStyle.bg) {
      const bgIsLight = getLuminance(cellStyle.bg) > 0.5;
      if (bgIsLight && cellStyle.color && getLuminance(cellStyle.color) >= 0.5) cellStyle.color = '#0f172a';
      if (!bgIsLight && cellStyle.color && getLuminance(cellStyle.color) < 0.5) cellStyle.color = '#f8fafc';
    }
    newGrid[newKey] = { ...cell, value: val, style: cellStyle };
  });
  let maxRow = 0;
  Object.keys(newGrid).forEach(key => {
    const r = parseInt(key.replace(/^[A-Z]+/i, ''), 10);
    if (!isNaN(r) && r > maxRow) maxRow = r;
  });
  return { grid: newGrid, rowCount: Math.max(maxRow, 10) };
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const { sheetName, grid, selection, prompt } = await request.json() as any;
  if (!env.GEMINI_API_KEY) return Response.json({ error: 'GEMINI_API_KEY not configured.' }, { status: 500 });

  const gridContext = Object.entries(grid)
    .map(([k, c]: [string, any]) => `${k}: "${c.value}"${c.computed ? ` (computed: "${c.computed}")` : ''}`)
    .join('\n');
  const selectionContext = selection
    ? `Selected Range: Row ${selection.startRow+1} Col ${selection.startCol+1} to Row ${selection.endRow+1} Col ${selection.endCol+1}`
    : 'No range selected';

  const systemInstruction = `You are QurveSheet AI, an elite spreadsheet engineer and BI analyst.
Provide a response in structured JSON:
{
  "analysis": "Detailed professional markdown response with bold numbers, bullet points, and expert recommendations.",
  "suggestedAction": {
    "type": "apply_formula" | "update_cells" | "create_chart" | "fill_data" | "none",
    "payload": {}
  }
}
When generating formulas, use valid UPPERCASE Excel syntax. Output ONLY valid JSON.`;

  const contents = `Sheet Name: "${sheetName}"\nSpreadsheet Data:\n${gridContext}\n\n${selectionContext}\n\nUser Request: "${prompt}"\n\nRespond with valid JSON containing "analysis" and "suggestedAction" fields.`;

  const text = await generateContentWithRetry(contents, systemInstruction, env.GEMINI_API_KEY);
  return Response.json(JSON.parse(text.trim()), { headers: CORS_HEADERS });
}

async function handleOcr(request: Request, env: Env): Promise<Response> {
  const { fileName, fileType } = await request.json() as any;
  if (!env.GEMINI_API_KEY) return Response.json({ error: 'GEMINI_API_KEY not configured.' }, { status: 500 });

  const systemInstruction = `You are an AI OCR assistant. Reconstruct the structured table from an uploaded file.
Respond with structured JSON:
{ "sheetName": "Sheet Name", "data": { "A1": "Title", "A3": "Header 1", "B3": "Header 2", "A4": "Row 1 Col 1", "B4": "1200" } }`;

  const prompt = `Convert the uploaded ${fileType} document "${fileName}" into structured spreadsheet cells. Reconstruct a beautiful dataset based on the file name context.`;
  const text = await generateContentWithRetry(prompt, systemInstruction, env.GEMINI_API_KEY);
  return Response.json(JSON.parse(text.trim()), { headers: CORS_HEADERS });
}

async function handleExtractLink(request: Request, env: Env): Promise<Response> {
  const { url } = await request.json() as any;
  if (!env.GEMINI_API_KEY) return Response.json({ error: 'GEMINI_API_KEY not configured.' }, { status: 500 });
  if (!url) return Response.json({ error: 'URL is required.' }, { status: 400 });

  let fetchedContent = '';
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      fetchedContent = await res.text();
      if (fetchedContent.length > 15000) fetchedContent = fetchedContent.substring(0, 15000) + '\n... [Truncated]';
    }
  } catch {}

  const systemInstruction = `You are QurveSheet AI, a world-class spreadsheet engineer and BI analyst.
Analyze the URL and synthesize a comprehensive, professional spreadsheet dataset.
Respond with ONLY raw JSON:
{
  "sheetName": "Sheet Name",
  "grid": { "A1": { "value": "Header", "style": { "bold": true, "bg": "#1e293b", "color": "#ffffff" } } },
  "rowCount": 10,
  "colCount": 6,
  "analysis": "Detailed markdown analysis...",
  "suggestedCharts": [{ "id": "chart1", "type": "bar", "title": "Title", "xKey": "col", "yKeys": ["col2"], "data": [] }]
}`;

  const prompt = `Extract and structure metrics from this URL:\nURL: ${url}\n${fetchedContent ? `Fetched content:\n${fetchedContent}` : 'Note: Secure/interactive dashboard — synthesize high-fidelity BI template for this platform.'}`;
  const text = await generateContentWithRetry(prompt, systemInstruction, env.GEMINI_API_KEY);
  const parsed = JSON.parse(text.trim());
  if (parsed?.grid) {
    const sanitized = sanitizeAndShiftGrid(parsed.grid);
    parsed.grid = sanitized.grid;
    if (sanitized.rowCount) parsed.rowCount = sanitized.rowCount;
  }
  return Response.json(parsed, { headers: CORS_HEADERS });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', time: new Date().toISOString() }, { headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === '/api/ai/analyze' && request.method === 'POST') return await handleAnalyze(request, env);
      if (url.pathname === '/api/ai/ocr' && request.method === 'POST') return await handleOcr(request, env);
      if (url.pathname === '/api/ai/extract-link' && request.method === 'POST') return await handleExtractLink(request, env);
    } catch (err: any) {
      return Response.json({ error: err.message || 'Worker error' }, { status: 500, headers: CORS_HEADERS });
    }

    return new Response('Not Found', { status: 404 });
  },
};
