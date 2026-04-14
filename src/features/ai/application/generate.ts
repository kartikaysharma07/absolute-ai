import { checkAndReserve, finalizeReservation, cancelReservation, estimateTokens } from '../../../lib/usage/usage';

type GenerateOpts = { userId?: string; accessToken?: string; apiKeyId?: string };

function base64UrlDecode(str: string) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(s, 'base64').toString('utf-8');
  }
  if (typeof atob !== 'undefined') {
    // atob returns a binary string; decodeURIComponent/escape convert it to utf8
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return decodeURIComponent(escape(atob(s)));
  }
  throw new Error('No base64 decode available');
}

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

export async function generateAIResponse(prompt: string, opts?: GenerateOpts) {
  if (!prompt) return { text: '', tokensUsed: 0 };

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'text-bison-001';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Resolve userId from opts or access token
  let userId = opts?.userId ?? null;
  if (!userId && opts?.accessToken) {
    const payload = decodeJwt(opts.accessToken);
    userId = payload?.sub ?? payload?.user_id ?? null;
  }

  const expectedMaxOutputTokens = Number(process.env.GEMINI_DEFAULT_MAX_OUTPUT_TOKENS ?? 1024);

  const check = await checkAndReserve(userId, prompt, expectedMaxOutputTokens, opts?.apiKeyId);
  if (!check.allowed) {
    throw new Error(check.reason === 'unauthenticated' ? 'Authentication required' : 'Quota exceeded');
  }

  const reservationId = check.reservationId;

  // Use Google Generative API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText?key=${apiKey}`;

  const body = {
    prompt: { text: prompt },
    maxOutputTokens: expectedMaxOutputTokens,
    temperature: 0.2,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    let text = '';
    if (json?.candidates && Array.isArray(json.candidates) && json.candidates.length) {
      text = json.candidates[0]?.content ?? json.candidates[0]?.output ?? '';
    } else if (json?.output && Array.isArray(json.output) && json.output.length) {
      text = json.output[0]?.content ?? '';
    } else if (typeof json?.text === 'string') {
      text = json.text;
    } else {
      text = JSON.stringify(json);
    }

    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(text);
    const tokensUsed = promptTokens + completionTokens;

    await finalizeReservation(reservationId, tokensUsed);

    return { text, tokensUsed, raw: json };
  } catch (err) {
    // If generation failed, cancel reservation so tokens are freed
    if (reservationId) await cancelReservation(reservationId);
    throw err;
  }
}