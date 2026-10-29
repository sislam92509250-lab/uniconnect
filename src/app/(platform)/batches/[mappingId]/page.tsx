import Link from 'next/link';import {notFound} from 'next/navigation';import {ArrowLeft,Users,GraduationCap} from 'lucide-react';import {requireUser} from '@/lib/auth';import {Avatar,Empty,Verified} from '@/components/ui';
export default async function Batch({params}:{params:Promise<{mappingId:string}>}){
 const {mappingId}=await params;const {supabase}=await requireUser();
 const {data:batch}=await supabase.from('batch_mappings').select('id,code,admission_year,departments(id,code,name),academic_terms(label)').eq('id',mappingId).single();
 if(!batch)notFound();
 const [{data:members},{data:nearby}]=await Promise.all([
 supabase.from('profiles').select('id,username,full_name,headline,category,affiliation_status').eq('batch_mapping_id',mappingId).order('full_name').limit(100),
 supabase.from('batch_mappings').select('id,code,admission_year').order('admission_year',{ascending:false}).limit(100),
 ]);
 const dept=Array.isArray(batch.departments)?batch.departments[0]:batch.departments;
 const term=Array.isArray(batch.academic_terms)?batch.academic_terms[0]:batch.academic_terms;
 const peopleIds=members?.map(m=>m.id)||[];
 const {data:posts}=peopleIds.length?await supabase.from('posts').select('id,body,category,author_id,created_at').in('author_id',peopleIds).order('created_at',{ascending:false}).limit(10):{data:[]};
 return <><Link href="/discover" className="text-xs text-blue-600 flex gap-2 items-center mb-4"><ArrowLeft size={14}/> Discover people</Link><div className="panel mb-5"><span className="eyebrow">Academic batch</span><h1 className="h1 mt-2">Batch {batch.code}</h1><p className="text-sm muted mt-2">{dept?.name} · {batch.admission_year} · {term?.label}</p><div className="flex gap-2 items-center mt-5"><Users size={18} className="text-blue-600"/><b>{members?.length||0} members</b><span className="tiny muted">(first 100)</span></div></div>
 <div className="panel mb-5"><h2 className="h2 mb-3">Batchmates and alumni</h2>{members?.length?members.map(m=><Link key={m.id} href={`/profile/${m.username}`} className="list-row"><Avatar name={m.full_name}/><div className="flex-1"><div className="font-bold text-sm">{m.full_name}</div><div className="tiny muted">{m.headline||m.category}</div></div><Verified verified={m.affiliation_status==='verified'}/></Link>):<Empty title="No registered members in this batch"/>}</div>
 <div className="panel mb-5"><h2 className="h2 mb-3">Latest posts by this batch</h2>{posts?.length?posts.map(p=><article key={p.id} className="py-3 border-b border-slate-100 last:border-none"><span className="pill">{p.category}</span><p className="text-sm article-body mt-2">{p.body}</p></article>):<Empty title="No activity in this batch yet"/>}</div>
 <div className="panel"><div className="flex items-center gap-2 mb-3"><GraduationCap size={17} className="text-blue-600"/><h2 className="h2">Browse other batches</h2></div><div className="flex gap-2 flex-wrap">{nearby?.filter(b=>b.id!==batch.id).slice(0,20).map(b=><Link href={`/batches/${b.id}`} key={b.id} className="pill pill-blue">{b.code}</Link>)}</div></div></>;
}
