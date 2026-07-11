// POST /api/event  { event_name, event_id, ...lead, fbp, fbc, event_source_url }
// Dispara eventos CAPI (server-side) para marcos do funil. Não toca no n8n.
var meta = require('../lib/meta.js');

var ALLOWED = { Lead: 1, LeadCarros: 1, ViewContent: 1, IniciouFormulario: 1, TesteIntegracao: 1 };

module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }
  var body = await readJson(req);
  var name = body && body.event_name;
  if (!ALLOWED[name]) { res.status(400).json({ ok: false, error: 'event_not_allowed' }); return; }

  var result = await meta.sendEvent({
    event_name: name,
    event_time: meta.nowTs(),
    event_id: body.event_id || undefined,
    action_source: 'website',
    event_source_url: body.event_source_url || '',
    user_data: meta.buildUserData(body, req),
    custom_data: body.custom_data || { variante: body.variante || '' }
  });

  res.status(200).json({ ok: true, received: result && result.body && result.body.events_received });
};

async function readJson(req) {
  if (req.body) { return typeof req.body === 'string' ? safeParse(req.body) : req.body; }
  var data = '';
  for await (var chunk of req) data += chunk;
  return safeParse(data);
}
function safeParse(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
