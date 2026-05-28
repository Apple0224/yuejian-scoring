// 先用debug模式看看有哪些环境变量
export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Debug: 返回所有Redis/KV相关的环境变量名
  const envKeys = Object.keys(process.env).filter(k =>
    /REDIS|KV|UPSTASH/i.test(k)
  );
  const envInfo = {};
  envKeys.forEach(k => {
    const v = process.env[k];
    // 只显示URL的部分内容，隐藏密码
    envInfo[k] = v && v.length > 50 ? v.substring(0, 30) + '...' + v.substring(v.length - 20) : (v ? '***' : 'empty');
  });

  return new Response(JSON.stringify({
    message: "Debug mode - showing Redis/KV env vars",
    envVars: envInfo,
    allEnvKeys: Object.keys(process.env).sort()
  }, null, 2), { headers });
}
