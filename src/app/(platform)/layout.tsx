import Link from 'next/link';import {Search,ArrowRight,Bell,ShieldCheck} from 'lucide-react';
import {requireUser} from '@/lib/auth';import {Avatar} from '@/components/ui';
import {Navigation,MobileNav} from '@/components/navigation';import {Feedback} from '@/components/feedback';import {LiveAlerts} from '@/components/live-alerts';import {logout} from '@/app/actions';
export default async function PlatformLayout({children}:{children:React.ReactNode}){
 const {supabase,user}=await requireUser();
 const [{data:profile},{count:unread},{data:roles},{data:jobs},{data:events}]=await Promise.all([
   supabase.from('profiles').select('full_name,username,headline,category,affiliation_status,onboarding_done').eq('id',user.id).single(),
   supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false),
   supabase.from('user_roles').select('role').eq('user_id',user.id),
   supabase.from('job_listings').select('id,title,company').order('created_at',{ascending:false}).limit(2),
   supabase.from('events').select('id,title,starts_at').gte('starts_at',new Date().toISOString()).order('starts_at').limit(2),
 ]);
 const admin=roles?.some(r=>r.role==='platform_admin')||false;
 return <><LiveAlerts userId={user.id}/><div className="shell layout"><aside className="sidebar"><div className="panel mb-4"><div className="flex items-center gap-3"><Avatar name={profile?.full_name||'Member'}/><div className="min-w-0"><div className="font-bold text-sm truncate">{profile?.full_name||'Your profile'}</div><div className="muted text-xs truncate">@{profile?.username||'member'}</div></div></div>{!profile?.onboarding_done&&<Link href="/onboarding" className="block mt-4 text-xs text-blue-600 font-bold">Complete your academic profile →</Link>}</div><Navigation admin={admin}/><form action={logout} className="mt-5 px-3"><button className="text-sm muted font-semibold hover:text-blue-600">Sign out</button></form><p className="tiny muted mt-7 px-3">UIU community • UniConnect v0.1</p></aside>
 <main className="min-w-0"><Feedback/>{children}</main><aside className="right-rail"><div className="panel"><h3 className="h3 mb-4">Quick discovery</h3><Link href="/discover" className="flex gap-2 items-center text-sm text-slate-600 border rounded-xl border-slate-200 px-3 py-3"><Search size={17}/> Find a classmate or alumnus</Link><Link className="btn btn-secondary w-full mt-3" href="/network">Grow your network <ArrowRight size={14}/></Link></div>
 <div className="panel mt-4"><div className="flex justify-between items-center mb-4"><h3 className="h3">Notifications</h3><Bell size={17} className="text-blue-600"/></div><p className="text-sm muted"><b className="text-slate-900">{unread||0}</b> unread updates</p><Link href="/notifications" className="text-xs text-blue-600 font-bold mt-3 inline-block">View activity →</Link></div>
 <div className="panel mt-4"><h3 className="h3 mb-3">Career highlights</h3>{jobs?.length?jobs.map(job=><Link href="/jobs" className="block py-2 border-b last:border-0 border-slate-100" key={job.id}><div className="text-sm font-semibold">{job.title}</div><div className="tiny muted mt-1">{job.company}</div></Link>):<p className="tiny muted">Career opportunities will appear here.</p>}</div>
 <div className="panel mt-4"><h3 className="h3 mb-3">Coming up</h3>{events?.length?events.map(event=><Link href="/events" className="block text-sm py-2" key={event.id}>{event.title}<span className="block tiny muted">{new Date(event.starts_at).toLocaleDateString('en-GB')}</span></Link>):<p className="tiny muted">University events will appear here.</p>}</div>
 {admin&&<Link href="/admin" className="flex items-center gap-2 text-xs muted mt-4"><ShieldCheck size={14}/>Manage UniConnect</Link>}
 </aside></div><MobileNav/></>;
}
