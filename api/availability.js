// GET /api/availability?date=YYYY-MM-DD  ->  { ok, date, booked: ["09:00", ...] }
module.exports = async function (req, res) {
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'method' }); return; }

  var date = (req.query && req.query.date) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { res.status(400).json({ ok: false, error: 'bad_date' }); return; }

  res.setHeader('Cache-Control', 'no-store');
  try {
    var booked = await kv(['SMEMBERS', 'booked:' + date]);
    res.status(200).json({ ok: true, date: date, booked: Array.isArray(booked) ? booked : [] });
  } catch (e) {
    // sem KV configurado ou erro -> degrada mostrando tudo livre
    res.status(200).json({ ok: true, date: date, booked: [] });
  }
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
