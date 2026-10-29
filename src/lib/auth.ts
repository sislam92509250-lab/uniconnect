import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return { supabase, user };
}
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id',user.id);
  if (!roles?.some((item) => item.role === 'platform_admin')) redirect('/feed');
  return { supabase, user };
}
export function isConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT')); }
