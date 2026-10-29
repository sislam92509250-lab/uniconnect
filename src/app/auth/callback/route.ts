import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url=new URL(request.url);
  const code=url.searchParams.get('code');
  const next=url.searchParams.get('next') || '/feed';
  // Only allow internal static redirects; no protocol-relative or external URLs.
  const destination=['/onboarding','/reset-password','/feed'].includes(next)?next:'/feed';
  if(code) {
    const supabase=await createClient();
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(!error) return NextResponse.redirect(new URL(destination,url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=Unable%20to%20verify%20your%20email',url.origin));
}
