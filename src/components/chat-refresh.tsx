'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
export function ChatRefresh({conversationId}:{conversationId:string}) {
  const router=useRouter();
  useEffect(()=>{
    const supabase=createClient();
    const channel=supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conversationId}`},()=>router.refresh())
      .subscribe();
    return ()=>{void supabase.removeChannel(channel);};
  },[conversationId,router]);
  return null;
}
