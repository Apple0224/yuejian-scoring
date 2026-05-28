import Redis from 'ioredis';

function getRedis() {
  if (!global._redis) {
    let url = process.env.REDIS_URL;
    // Redis Cloud 要求 TLS，把 redis:// 改为 rediss://
    if (url && url.startsWith('redis://')) {
      url = url.replace('redis://', 'rediss://');
    }
    global._redis = new Redis(url, {
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });
  }
  return global._redis;
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
    const redis = getRedis();

    if (req.method === 'GET') {
      const raw = await redis.get('records');
      const records = raw ? JSON.parse(raw) : [];
      return new Response(JSON.stringify({ success: true, data: records }), { headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const raw = await redis.get('records');
      const records = raw ? JSON.parse(raw) : [];
      const idx = records.findIndex(r => r.id === body.id);
      if (idx >= 0) {
        records[idx] = body;
      } else {
        records.push(body);
      }
      await redis.set('records', JSON.stringify(records));
      return new Response(JSON.stringify({ success: true, data: body }), { headers });
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { status: 400, headers });
      }
      const raw = await redis.get('records');
      const records = raw ? JSON.parse(raw) : [];
      const filtered = records.filter(r => r.id !== id);
      await redis.set('records', JSON.stringify(filtered));
      return new Response(JSON.stringify({ success: true, deleted: records.length - filtered.length }), { headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
