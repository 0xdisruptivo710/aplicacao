// POST /api/book  { date:"YYYY-MM-DD", time:"HH:MM", ...lead }
// Reserva ATÔMICA do horário (SET NX no KV), encaminha o lead ao n8n
// e dispara o evento Schedule na Meta (CAPI).
var N8N = process.env.N8N_WEBHOOK_URL || 'https://aios-n8n-webhook.yspmhc.easypanel.host/webhook/aplicacao';
var meta = require('../lib/meta.js');

module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  var body = await readJson(req);
  var date = body && body.date;
  var time = body && body.time;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) {
    res.status(400).json({ ok: false, error: 'bad_slot' });
    return;
  }

  // 1) Reserva atômica (evita dois leads no mesmo horário)
  var value = JSON.stringify({ nome: body.nome || '', whatsapp: body.whatsapp || '', at: new Date().toISOString() });
  try {
    var ok = await kv(['SET', 'slot:' + date + ':' + time, value, 'NX', 'EX', '5184000']); // 60 dias
    if (ok !== 'OK') { res.status(409).json({ ok: false, error: 'slot_taken' }); return; }
    await kv(['SADD', 'booked:' + date, time]);
  } catch (e) {
    // KV não configurado ainda: segue sem a trava (será conflito-safe assim que o KV existir)
    if (String(e.message) !== 'kv_not_configured') {
      res.status(500).json({ ok: false, error: 'kv_error' });
      return;
    }
  }

  // 2) Encaminha o lead agendado ao n8n (não derruba o agendamento se o n8n falhar)
  try {
    await fetch(N8N, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ status: 'agendado', data: date, horario: time }, body))
    });
  } catch (e) { /* lead reservado; entrega ao n8n pode ser reconciliada */ }

  // 3) Evento Schedule na Meta (CAPI) — dedup pelo mesmo event_id do Pixel
  var metaResult = null;
  try {
    metaResult = await meta.sendEvent({
      event_name: 'Schedule',
      event_time: meta.nowTs(),
      event_id: body.event_id || ('sch_' + date + '_' + time),
      action_source: 'website',
      event_source_url: body.event_source_url || '',
      user_data: meta.buildUserData(body, req),
      custom_data: { content_name: 'Agendamento de demonstração', variante: body.variante || '', data: date, horario: time }
    });
  } catch (e) { /* não derruba o agendamento se a Meta falhar */ }

  // 4) Evento Purchase na Meta — espelha o agendamento na família "Compra"
  //    para poder otimizar em campanhas de VENDAS (dedup pelo Pixel via 'pur_' + event_id).
  try {
    await meta.sendEvent({
      event_name: 'Purchase',
      event_time: meta.nowTs(),
      event_id: 'pur_' + (body.event_id || (date + '_' + time)),
      action_source: 'website',
      event_source_url: body.event_source_url || '',
      user_data: meta.buildUserData(body, req),
      custom_data: { currency: 'BRL', value: Number(process.env.META_BOOKING_VALUE || 1), content_name: 'Agendamento de demonstração', variante: body.variante || '', data: date, horario: time }
    });
  } catch (e) { /* silencioso */ }

  // 5) Rotas de carros (variantes C e D): espelham o agendamento em eventos
  //    próprios do nicho, para separar o dado de lojas de carros do de estética
  //    no Gerenciador de Eventos. Dedup com o Pixel via 'agc_' / 'purc_' + event_id.
  if (body.variante === 'C' || body.variante === 'D') {
    var baseId = body.event_id || (date + '_' + time);
    var udC = meta.buildUserData(body, req);
    var customC = { content_name: 'Agendamento de demonstração (carros)', variante: body.variante, data: date, horario: time };
    try {
      await meta.sendEvent({
        event_name: 'AgendamentoCarros',
        event_time: meta.nowTs(),
        event_id: 'agc_' + baseId,
        action_source: 'website',
        event_source_url: body.event_source_url || '',
        user_data: udC,
        custom_data: customC
      });
    } catch (e) { /* silencioso */ }
    try {
      await meta.sendEvent({
        event_name: 'PurchaseCarros',
        event_time: meta.nowTs(),
        event_id: 'purc_' + baseId,
        action_source: 'website',
        event_source_url: body.event_source_url || '',
        user_data: udC,
        custom_data: Object.assign({ currency: 'BRL', value: Number(process.env.META_BOOKING_VALUE || 1) }, customC)
      });
    } catch (e) { /* silencioso */ }
  }

  res.status(200).json({ ok: true, meta_received: metaResult && metaResult.body && metaResult.body.events_received });
};

async function kv(cmd) {
  var url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('kv_not_configured');
  var r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  var j = await r.json();
  if (j && j.error) throw new Error(j.error);
  return j ? j.result : null;
}

async function readJson(req) {
  if (req.body) { return typeof req.body === 'string' ? safeParse(req.body) : req.body; }
  var data = '';
  for await (var chunk of req) data += chunk;
  return safeParse(data);
}
function safeParse(s) { try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
