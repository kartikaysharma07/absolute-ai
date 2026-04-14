import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '../../../../lib/apiKeys';
import { generateAIResponse } from '../../../../features/ai/application/generate';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    let rawKey = '';
    if (authHeader.startsWith('ApiKey ')) rawKey = authHeader.split('ApiKey ')[1];
    else if (authHeader && !authHeader.includes(' ')) rawKey = authHeader; // x-api-key or bare

    if (!rawKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const key = await verifyApiKey(rawKey);
    if (!key) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json();
    const prompt = body?.prompt ?? '';
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const result = await generateAIResponse(prompt, { userId: key.user_id, apiKeyId: key.id });

    return NextResponse.json({ result });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('External AI error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
