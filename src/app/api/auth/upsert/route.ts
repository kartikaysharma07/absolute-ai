import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken as string);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = userData.user;

    const profile = {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata as any)?.full_name ?? (user.user_metadata as any)?.name ?? null,
      avatar_url: (user.user_metadata as any)?.avatar_url ?? (user.user_metadata as any)?.picture ?? null,
      provider: (user.app_metadata as any)?.provider ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(profile, { returning: 'minimal' });
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to upsert profile', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
