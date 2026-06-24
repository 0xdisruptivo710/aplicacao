// Meta Conversions API (CAPI) — helper server-side. Lê credenciais de env vars.
// Nunca exponha META_ACCESS_TOKEN / META_APP_SECRET no cliente.
var crypto = require('crypto');

var VERSION = process.env.META_API_VERSION || 'v21.0';
var DATASET = process.env.META_DATASET_ID;
var TOKEN = process.env.META_ACCESS_TOKEN;
var SECRET = process.env.META_APP_SECRET;
var TEST_CODE = process.env.META_TEST_EVENT_CODE || '';

function sha256(v) { return crypto.createHash('sha256').update(v).digest('hex'); }
function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function hashEmail(e) { e = norm(e).replace(/\s+/g, ''); return e ? sha256(e) : null; }
function hashName(n) { n = norm(n).replace(/[^0-9a-zà-ú]/gi, ''); return n ? sha256(n) : null; }
function hashPhone(p) {
  var d = String(p == null ? '' : p).replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = '55' + d; // Brasil: DDD + número
  return sha256(d);
}

function clientIp(req) {
  var h = (req && req.headers) || {};
  var xff = h['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return h['x-real-ip'] || null;
}

// Monta user_data (PII com hash + sinais do navegador) a partir do lead + req.
function buildUserData(lead, req) {
  lead = lead || {};
  var ud = {};
  var ph = hashPhone(lead.whatsapp); if (ph) ud.ph = [ph];
  if (lead.email) { var em = hashEmail(lead.email); if (em) ud.em = [em]; }
  if (lead.nome) {
    var parts = norm(lead.nome).split(/\s+/).filter(Boolean);
    var fn = hashName(parts[0]); if (fn) ud.fn = [fn];
    if (parts.length > 1) { var ln = hashName(parts.slice(1).join(' ')); if (ln) ud.ln = [ln]; }
  }
  var ext = String(lead.whatsapp == null ? '' : lead.whatsapp).replace(/\D/g, '');
  if (ext) ud.external_id = [sha256(ext)];
  if (lead.fbp) ud.fbp = lead.fbp;
  if (lead.fbc) ud.fbc = lead.fbc;
  var ip = clientIp(req); if (ip) ud.client_ip_address = ip;
  var ua = lead.client_user_agent || (req && req.headers && req.headers['user-agent']);
  if (ua) ud.client_user_agent = ua;
  return ud;
}

// Envia 1 evento ao endpoint /events do dataset. Retorna { ok, body|error }.
async function sendEvent(ev) {
  if (!DATASET || !TOKEN) return { ok: false, skipped: 'no_config' };
  var proof = SECRET ? crypto.createHmac('sha256', SECRET).update(TOKEN).digest('hex') : null;
  var url = 'https://graph.facebook.com/' + VERSION + '/' + DATASET + '/events' +
    '?access_token=' + encodeURIComponent(TOKEN) + (proof ? ('&appsecret_proof=' + proof) : '');
  var payload = { data: [ev] };
  if (TEST_CODE) payload.test_event_code = TEST_CODE;
  try {
    var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var j = await r.json();
    return { ok: r.ok, body: j };
  } catch (e) {
    return { ok: false, error: String(e && e.message) };
  }
}

function nowTs() { return Math.floor(Date.now() / 1000); }

module.exports = { sendEvent, buildUserData, nowTs, VERSION: VERSION };
