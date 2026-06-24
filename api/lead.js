// POST /api/lead  { status, motivo, ...lead }
// Encaminha leads (ex.: desqualificados) ao n8n e dispara evento custom na Meta.
var N8N = process.env.N8N_WEBHOOK_URL || 'https://aios-n8n-webhook.yspmhc.easypanel.host/webhook/aplicacao';
var meta = require('../lib/meta.js');

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

  // Evento custom "Desqualificado" na Meta (pra visualizar o funil; não otimizar)
  try {
    await meta.sendEvent({
      event_name: 'Desqualificado',
      event_time: meta.nowTs(),
      event_id: body.event_id || undefined,
      action_source: 'website',
      event_source_url: body.event_source_url || '',
      user_data: meta.buildUserData(body, req),
      custom_data: { motivo: body.motivo || '', variante: body.variante || '' }
    });
  } catch (e) { /* silencioso */ }

  res.status(200).json({ ok: true });
};

async function readJson(req) {
  if (req.body) { return typeof req.body === 'string' ? safeParse(req.body) : req.body; }
  var data = '';
  for await (var chunk of req) data += chunk;
  return safeParse(data);
}
function safeParse(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
