import Link from 'next/link';import {notFound} from 'next/navigation';import {Send,ArrowLeft} from 'lucide-react';
import {requireUser} from '@/lib/auth';import {Avatar} from '@/components/ui';import {sendMessage} from '@/app/actions';import {ChatRefresh} from '@/components/chat-refresh';
export default async function Conversation({params}:{params:Promise<{conversationId:string}>}) {
 const {conversationId}=await params;const {supabase,user}=await requireUser();
 const {data:conversation}=await supabase.from('conversations').select('id,user_a,user_b').eq('id',conversationId).single();
 if(!conversation) notFound();
 const other=conversation.user_a===user.id?conversation.user_b:conversation.user_a;
 const [{data:profile},{data:messages}]=await Promise.all([
 supabase.from('profiles').select('full_name,username').eq('id',other).single(),
 supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:false}).limit(100),
 ]);
 return <><ChatRefresh conversationId={conversationId}/><Link href="/messages" className="text-xs text-blue-600 flex gap-1 items-center mb-4"><ArrowLeft size={13}/> Back to conversations</Link><div className="panel"><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><Avatar name={profile?.full_name||'Member'}/><div><h1 className="h3">{profile?.full_name||'Member'}</h1><span className="tiny muted">Private conversation</span></div></div><div className="space-y-3 overflow-y-auto py-6" style={{minHeight:260,maxHeight:540}}>{messages?.length?[...messages].reverse().map(m=><div className={`message-bubble ${m.sender_id===user.id?'mine':''}`} key={m.id}><p className="text-sm">{m.body}</p><time className="text-[10px] opacity-70 block mt-2">{new Date(m.created_at).toLocaleString('en-GB')}</time></div>):<p className="text-sm muted text-center py-15">Say hello and introduce yourself.</p>}</div><form action={sendMessage} className="flex gap-2 border-t border-slate-100 pt-4"><input name="conversation_id" type="hidden" value={conversationId}/><input className="field" name="body" maxLength={2000} placeholder="Write a message..." required autoComplete="off"/><button className="btn btn-primary"><Send size={17}/></button></form></div></>;
}
