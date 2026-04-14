import { supabase } from '../../../../lib/supabase/browser';

export const supabaseAuth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, error };
  },
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data?.user ?? null, error };
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  async signInWithGoogle() {
    return supabase.auth.signInWithOAuth({ provider: 'google' });
  },
};