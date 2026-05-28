export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // 列出所有环境变量名
  const allKeys = Object.keys(process.env).sort();
  const redisKeys = allKeys.filter(k => /REDIS|KV|UPSTASH/i.test(k));
  
  return new Response(JSON.stringify({ redisKeys, allKeys }, null, 2), { headers });
}
