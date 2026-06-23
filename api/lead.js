// POST /api/lead  { status, motivo, ...lead }
// Encaminha leads (ex.: desqualificados) ao n8n. Server-side, sem CORS.
var N8N = process.env.N8N_WEBHOOK_URL || 'https://aios-n8n-webhook.yspmhc.easypanel.host/webhook/aplicacao';

module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }
  var body = await readJson(req);
  try {
    await fetch(N8N, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) { /* não bloqueia a UI do visitante */ }
  res.status(200).json({ ok: true });
};

async function readJson(req) {
  if (req.body) { return typeof req.body === 'string' ? safeParse(req.body) : req.body; }
  var data = '';
  for await (var chunk of req) data += chunk;
  return safeParse(data);
}
function safeParse(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
