import Link from 'next/link';import {Users,GraduationCap,ShieldCheck,BookOpen,Flag,CalendarDays,UsersRound,ArrowUpRight} from 'lucide-react';
import {requireAdmin} from '@/lib/auth';import {Heading} from '@/components/ui';
export default async function Admin(){const {supabase}=await requireAdmin();
 const metrics=[['Registered members','profiles',Users],['Posts published','posts',BookOpen],['Pending verifications','affiliation_verifications',ShieldCheck],['Career opportunities','job_listings',GraduationCap],['Communities','communities',UsersRound],['Open reports','reports',Flag]] as const;
 const counts=await Promise.all(metrics.map(async ([,table])=>{
  let q=supabase.from(table).select('id',{count:'exact',head:true});
  if(table==='affiliation_verifications')q=q.eq('status','pending');
  if(table==='reports')q=q.eq('status','open');
  const {count}=await q;return count||0;
 }));
 return <><Heading title="Admin dashboard" subtitle="A secure overview of university community operations."/><div className="grid-two mb-6">{metrics.map(([label,,Icon],i)=><div className="stat" key={label}><div className="flex items-center justify-between mb-2"><span className="text-xs muted font-semibold">{label}</span><Icon size={19} className="text-blue-500"/></div><div className="stat-num">{counts[i]}</div></div>)}</div>
 <div className="panel"><h2 className="h2 mb-4">Administrator tools</h2>{[{name:'Review affiliations',href:'/admin/verifications',sub:'Approve or reject member verification',icon:ShieldCheck},{name:'Batch mapping',href:'/admin/batches',sub:'Configure official academic identifiers',icon:GraduationCap},{name:'Manage users',href:'/admin/users',sub:'Inspect and suspend accounts',icon:Users},{name:'Review reports',href:'/admin/reports',sub:'Moderate reported content',icon:Flag},{name:'Create event',href:'/admin/events',sub:'Add upcoming university events',icon:CalendarDays},{name:'Create community',href:'/admin/communities',sub:'Launch official campus groups',icon:UsersRound}].map(({name,href,sub,icon:Icon})=><Link key={name} href={href} className="list-row hover:bg-slate-50 px-2 rounded-lg"><span className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Icon size={20}/></span><div className="flex-1"><p className="text-sm font-bold">{name}</p><p className="tiny muted mt-1">{sub}</p></div><ArrowUpRight size={17} className="muted"/></Link>)}</div></>;
}
