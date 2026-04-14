#!/usr/bin/env node
const [,, accessToken, hostArg] = process.argv;
const host = hostArg || 'http://localhost:3000';

if (!accessToken) {
  console.error('Usage: node scripts/list-api-keys.js <ACCESS_TOKEN> [host]');
  process.exit(1);
}

(async () => {
  try {
    const url = `${host.replace(/\/$/, '')}/api/dashboard/api-keys`;
    console.log('GET', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await res.json();
    console.log('Status:', res.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
})();
