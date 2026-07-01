// functions/api/health.ts — Cloudflare Pages Function
export const onRequest = () => {
  return Response.json({ status: 'ok', time: new Date().toISOString() });
};
