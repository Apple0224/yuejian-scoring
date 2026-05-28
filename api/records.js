import Redis from 'ioredis';

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });
  }
  return redis;
}

export default async function handler(req) {
  const { method } = req;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const r = getRedis();

    if (method === 'GET') {
      const raw = await r.get('records');
      const records = raw ? JSON.parse(raw) : [];
      return new Response(JSON.stringify({ success: true, data: records }), { headers });
    }

    if (method === 'POST') {
      const body = await req.json();
      const raw = await r.get('records');
      const records = raw ? JSON.parse(raw) : [];
      const existingIndex = records.findIndex(r => r.id === body.id);
      if (existingIndex >= 0) {
        records[existingIndex] = body;
      } else {
        records.push(body);
      }
      await r.set('records', JSON.stringify(records));
      return new Response(JSON.stringify({ success: true, data: body }), { headers });
    }

    if (method === 'DELETE') {
      const recordId = id;
      if (!recordId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { status: 400, headers });
      }
      const raw = await r.get('records');
      const records = raw ? JSON.parse(raw) : [];
      const filtered = records.filter(r => r.id !== recordId);
      await r.set('records', JSON.stringify(filtered));
      return new Response(JSON.stringify({ success: true, deleted: records.length - filtered.length }), { headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
