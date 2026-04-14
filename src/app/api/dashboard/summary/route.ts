import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getUsageSummary } from '../../../../lib/usage/usage';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.split('Bearer ')[1] : null;

  if (!accessToken) {
    return NextResponse.json({ message: 'Missing auth token' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken as string);
    if (error || !data?.user) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
    }

    const userId = data.user.id;
    const summary = await getUsageSummary(userId);

    return NextResponse.json({ summary });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch dashboard summary', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
