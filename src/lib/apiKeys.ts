import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from './supabase/server';

function toBase64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createApiKeyForUser(userId: string, name?: string) {
  const raw = toBase64Url(randomBytes(32));
  const hash = createHash('sha256').update(raw).digest('hex');

  const { data, error } = await supabaseAdmin.from('api_keys').insert([{ user_id: userId, key_hash: hash, name }]).select().single();
  if (error) throw error;

  return { id: data.id as string, rawKey: raw, created_at: data.created_at, name: data.name };
}

export async function verifyApiKey(rawKey: string) {
  if (!rawKey) return null;
  const hash = createHash('sha256').update(rawKey).digest('hex');
  const { data, error } = await supabaseAdmin.from('api_keys').select('id,user_id,revoked').eq('key_hash', hash).maybeSingle();
  if (error || !data) return null;
  if (data.revoked) return null;

  // update last_used_at (best-effort)
  try {
    await supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  } catch (e) {
    // ignore
  }

  return { id: data.id as string, user_id: data.user_id as string };
}

export async function revokeApiKey(userId: string, keyId: string) {
  const { data, error } = await supabaseAdmin.from('api_keys').update({ revoked: true }).eq('id', keyId).eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function listApiKeysForUser(userId: string) {
  const { data, error } = await supabaseAdmin.from('api_keys').select('id,name,last_used_at,revoked,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
