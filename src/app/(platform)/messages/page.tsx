import Link from 'next/link';import {MessageCircle} from 'lucide-react';import {requireUser} from '@/lib/auth';import {Heading,Avatar,Empty} from '@/components/ui';
export default async function Messages(){const {supabase,user}=await requireUser();
 const {data:conversations}=await supabase.from('conversations').select('id,user_a,user_b,created_at').order('created_at',{ascending:false});
 const ids=(conversations||[]).map(c=>c.user_a===user.id?c.user_b:c.user_a);
 const {data:people}=ids.length?await supabase.from('profiles').select('id,username,full_name,headline').in('id',ids):{data:[]};
 return <><Heading title="Messages" subtitle="Private conversations with your connections."/><div className="panel"><h2 className="h2 mb-3">Conversations</h2>{conversations?.length?conversations.map(c=>{const p=people?.find(x=>x.id===(c.user_a===user.id?c.user_b:c.user_a));return <Link className="list-row hover:bg-slate-50 rounded-lg px-2" href={`/messages/${c.id}`} key={c.id}><Avatar name={p?.full_name||'Member'}/><div className="flex-1"><div className="text-sm font-bold">{p?.full_name||'Member'}</div><div className="tiny muted">{p?.headline||'Open conversation'}</div></div><MessageCircle size={19} className="text-blue-500"/></Link>}):<Empty title="No conversations yet" subtitle="Accept a connection, then start chatting from My Network."/>}</div></>
}
