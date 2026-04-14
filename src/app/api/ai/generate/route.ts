import type { NextRequest } from 'next/server';
import { generateAIResponse } from '../../../../features/ai/application/generate';
import { supabaseAdmin } from '../../../../lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prompt = body?.prompt ?? '';
  const userId = body?.userId ?? null;

  // Try to obtain access token from Authorization header if present
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.split('Bearer ')[1] : undefined;

  try {
    const result = await generateAIResponse(prompt, { userId, accessToken });
    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    // attempt to log to Supabase (optional)
    try {
      await supabaseAdmin.from('usage').insert([{ user_id: userId ?? null, tokens_used: 0 }]);
    } catch (e) {
      // ignore
    }
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}