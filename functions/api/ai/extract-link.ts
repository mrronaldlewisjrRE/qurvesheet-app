// functions/api/ai/extract-link.ts — Cloudflare Pages Function
interface Env { GEMINI_API_KEY: string; }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getLuminance(hex: string): number {
  let c = hex.trim().replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const r = parseInt(c.substring(0,2),16), g = parseInt(c.substring(2,4),16), b = parseInt(c.substring(4,6),16);
  if (isNaN(r)||isNaN(g)||isNaN(b)) return 0;
  return (0.299*r+0.587*g+0.114*b)/255;
}

function sanitizeGrid(grid: Record<string,any>): { grid: Record<string,any>; rowCount: number } {
  const rowCounts: Record<number,number> = {};
  Object.keys(grid).forEach(k => { const r=parseInt(k.replace(/^[A-Z]+/i,''),10); if(!isNaN(r)) rowCounts[r]=(rowCounts[r]||0)+1; });
  let hRow = 1;
  if (rowCounts[3]>=2 && (rowCounts[1]||0)<=1) hRow=3;
  else if (rowCounts[2]>=2 && (rowCounts[1]||0)<=1) hRow=2;
  const shift = hRow-1, newGrid: Record<string,any> = {};
  Object.entries(grid).forEach(([k,cell]) => {
    if (!cell) return;
    const col=k.match(/^[A-Z]+/i)?.[0]||'A', row=parseInt(k.replace(/^[A-Z]+/i,''),10);
    if (isNaN(row)||row<hRow) return;
    const nr=row-shift, nk=`${col}${nr}`;
    let val=cell.value;
    if (typeof val==='string'&&val.startsWith('='))
      val=val.replace(/([A-Z]+)([0-9]+)/gi,(m:string,c:string,rs:string)=>{const r=parseInt(rs,10);return r>=hRow?c+(r-shift):m;});
    const s={...(cell.style||{})};
    if (nr===1){s.bold=true;s.bg='#1e293b';s.color='#ffffff';}
    else if(s.bg){const bl=getLuminance(s.bg)>0.5;if(bl&&s.color&&getLuminance(s.color)>=0.5)s.color='#0f172a';if(!bl&&s.color&&getLuminance(s.color)<0.5)s.color='#f8fafc';}
    newGrid[nk]={...cell,value:val,style:s};
  });
  let max=0;Object.keys(newGrid).forEach(k=>{const r=parseInt(k.replace(/^[A-Z]+/i,''),10);if(!isNaN(r)&&r>max)max=r;});
  return {grid:newGrid,rowCount:Math.max(max,10)};
}

async function gemini(prompt: string, sys: string, apiKey: string) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    for (let r = 2; r >= 0; r--) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              system_instruction:{parts:[{text:sys}]},
              contents:[{parts:[{text:prompt}]}],
              generationConfig:{responseMimeType:'application/json'}
            }) }
        );
        const d: any = await res.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch(e){ if(r>0) await new Promise(x=>setTimeout(x,800)); }
    }
  }
  throw new Error('All Gemini attempts failed');
}

export const onRequestPost = async (ctx: { request: Request; env: Env }) => {
  if (!ctx.env.GEMINI_API_KEY)
    return Response.json({error:'GEMINI_API_KEY not configured.'},{status:500,headers:CORS});

  const {url} = await ctx.request.json() as any;
  if (!url) return Response.json({error:'URL is required.'},{status:400,headers:CORS});

  let fetched = '';
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(()=>ctrl.abort(), 3000);
    const res = await fetch(url,{signal:ctrl.signal});
    clearTimeout(tid);
    if (res.ok){fetched=await res.text();if(fetched.length>15000)fetched=fetched.substring(0,15000)+'\n...[Truncated]';}
  } catch {}

  const sys = `You are QurveSheet AI, a world-class BI analyst. Analyze the URL and synthesize a professional spreadsheet dataset.
Respond ONLY with raw JSON: { "sheetName": "...", "grid": { "A1": { "value": "...", "style": {...} } }, "rowCount": 10, "colCount": 6, "analysis": "markdown...", "suggestedCharts": [] }`;
  const prompt = `Extract metrics from: ${url}\n${fetched?`Content:\n${fetched}`:'Secure dashboard — synthesize high-fidelity BI template for this platform.'}`;

  const text = await gemini(prompt, sys, ctx.env.GEMINI_API_KEY);
  const parsed = JSON.parse(text.trim());
  if (parsed?.grid) { const s=sanitizeGrid(parsed.grid); parsed.grid=s.grid; if(s.rowCount) parsed.rowCount=s.rowCount; }
  return Response.json(parsed, {headers:CORS});
};

export const onRequestOptions = () => new Response(null, {headers:CORS});
