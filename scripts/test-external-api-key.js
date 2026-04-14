#!/usr/bin/env node
const [,, rawKey, hostArg] = process.argv;
const host = hostArg || 'http://localhost:3000';

if (!rawKey) {
  console.error('Usage: node scripts/test-external-api-key.js <RAW_KEY> [host]');
  process.exit(1);
}

(async () => {
  try {
    const url = `${host.replace(/\/$/, '')}/api/external/ai/generate`;
    console.log('POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': rawKey,
      },
      body: JSON.stringify({ prompt: `API key test from CLI at ${new Date().toISOString()}` }),
    });

    const body = await res.text();
    console.log('Status:', res.status);
    try {
      console.log('Response JSON:', JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log('Response body:', body);
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
})();
