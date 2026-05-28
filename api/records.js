import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
  token: process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN,
});

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
    if (method === 'GET') {
      const records = await redis.get('records') || [];
      return new Response(JSON.stringify({ success: true, data: records }), { headers });
    }

    if (method === 'POST') {
      const body = await req.json();
      const records = await redis.get('records') || [];
      const existingIndex = records.findIndex(r => r.id === body.id);
      if (existingIndex >= 0) {
        records[existingIndex] = body;
      } else {
        records.push(body);
      }
      await redis.set('records', records);
      return new Response(JSON.stringify({ success: true, data: body }), { headers });
    }

    if (method === 'DELETE') {
      const recordId = id;
      if (!recordId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), { status: 400, headers });
      }
      const records = await redis.get('records') || [];
      const filtered = records.filter(r => r.id !== recordId);
      await redis.set('records', filtered);
      return new Response(JSON.stringify({ success: true, deleted: records.length - filtered.length }), { headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
