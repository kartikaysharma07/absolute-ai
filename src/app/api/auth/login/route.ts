import type { NextRequest } from 'next/server';
import { supabaseAuth } from '../../../../features/auth/infrastructure/supabaseAuth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const result = await supabaseAuth.signIn(email, password);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}