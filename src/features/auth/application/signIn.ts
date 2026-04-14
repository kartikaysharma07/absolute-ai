import { supabaseAuth } from '../infrastructure/supabaseAuth';

export async function signIn(email: string, password: string) {
  return supabaseAuth.signIn(email, password);
}