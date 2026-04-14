import { NextRequest, NextResponse } from 'next/server';
import { createApiKeyForUser, listApiKeysForUser, revokeApiKey } from '../../../../lib/apiKeys';
import { supabaseAdmin } from '../../../../lib/supabase/server';

async function getUserFromToken(accessToken: string | null) {
  if (!accessToken) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken as string);
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.split('Bearer ')[1] : null;
  const user = await getUserFromToken(accessToken);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const keys = await listApiKeysForUser(user.id);
    return NextResponse.json({ keys });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List API keys failed', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.split('Bearer ')[1] : null;
  const user = await getUserFromToken(accessToken);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : undefined;

  try {
    const created = await createApiKeyForUser(user.id, name);
    return NextResponse.json({ key: { id: created.id, name: created.name, created_at: created.created_at }, rawKey: created.rawKey });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create API key failed', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.split('Bearer ')[1] : null;
  const user = await getUserFromToken(accessToken);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  try {
    await revokeApiKey(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Revoke API key failed', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
