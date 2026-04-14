'use client';

import React, { useState } from 'react';

export default function AIPlayground() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      setResult(json?.result?.text ?? JSON.stringify(json));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>AI Playground</h2>
      <textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <div>
        <button onClick={run} disabled={loading}>
          Generate
        </button>
      </div>
      <pre>{result}</pre>
    </div>
  );
}