// 使用 Upstash Redis REST API（零原生依赖，纯 fetch）
// 环境变量：UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN

async function upstash(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    throw new Error('Missing Upstash Redis REST env vars. UPSTASH_REDIS_REST_URL=' + (url ? 'set' : 'missing') + ', UPSTASH_REDIS_REST_TOKEN=' + (token ? 'set' : 'missing'));
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Upstash error: ' + res.status + ' ' + text);
  }

  const json = await res.json();
  return json.result;
}

export default async function handler(req) {
  const urlObj = new URL(req.url);
  const id = urlObj.searchParams.get('id');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'GET') {
      const raw = await upstash(['GET', 'records']);
      const records = raw ? JSON.parse(raw) : [];
      return new Response(JSON.stringify({ success: true, data: records }), { headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const raw = await upstash(['GET', 'records']);
      const records = raw ? JSON.parse(raw) : [];
      const idx = records.findIndex(r => r.id === body.id);
      if (idx >= 0) {
        records[idx] = body;
      } else {
        records.push(body);
      }
      await upstash(['SET', 'records', JSON.stringify(records)]);
      return new Response(JSON.stringify({ success: true, data: body }), { headers });
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { status: 400, headers });
      }
      const raw = await upstash(['GET', 'records']);
      const records = raw ? JSON.parse(raw) : [];
      const filtered = records.filter(r => r.id !== id);
      await upstash(['SET', 'records', JSON.stringify(filtered)]);
      return new Response(JSON.stringify({ success: true, deleted: records.length - filtered.length }), { headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
