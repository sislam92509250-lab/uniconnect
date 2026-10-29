import Link from 'next/link';import {Search,UserPlus,Filter} from 'lucide-react';
import {requireUser} from '@/lib/auth';import {Heading,Avatar,Verified,Empty} from '@/components/ui';import {requestConnection} from '@/app/actions';
export default async function Discover({searchParams}:{searchParams:Promise<{q?:string;department?:string;batch?:string;category?:string}>}) {
 const {supabase,user}=await requireUser();const search=await searchParams;
 const q=(search.q||'').slice(0,80).replace(/[%_(),]/g,'');
 const [{data:departments},{data:mappings},{data:connections}]=await Promise.all([
 supabase.from('departments').select('id,code,name').order('code'),
 supabase.from('batch_mappings').select('id,code').order('code'),
 supabase.from('connections').select('requester_id,recipient_id,status'),
 ]);
 let query=supabase.from('profiles').select('id,full_name,username,headline,category,affiliation_status,department_id,batch_mapping_id,skills').neq('id',user.id).order('created_at',{ascending:false}).limit(30);
 if(q) query=query.ilike('full_name',`%${q}%`);
 if(search.department) query=query.eq('department_id',search.department);
 if(search.batch) query=query.eq('batch_mapping_id',search.batch);
 if(['student','alumni','faculty'].includes(search.category||'')) query=query.eq('category',search.category!);
 const {data:people,error}=await query;
 return <><Heading title="Discover people" subtitle="Find students, alumni and faculty who share your interests."/><form method="get" className="panel mb-5"><div className="flex gap-2 items-center mb-4"><Search size={18} className="muted"/><input name="q" className="field" placeholder="Search by name..." defaultValue={search.q||''}/></div><div className="form-grid"><select className="field" name="department" defaultValue={search.department||''}><option value="">All departments</option>{departments?.map(d=><option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}</select><select className="field" name="batch" defaultValue={search.batch||''}><option value="">All batches</option>{mappings?.map(b=><option key={b.id} value={b.id}>{b.code}</option>)}</select></div><div className="flex flex-wrap justify-between items-center gap-2 mt-3"><select className="field" name="category" style={{width:170}} defaultValue={search.category||''}><option value="">All member types</option><option value="student">Students</option><option value="alumni">Alumni</option><option value="faculty">Faculty</option></select><button className="btn btn-primary"><Filter size={15}/> Apply filters</button></div></form>
 <div className="panel"><div className="flex items-center justify-between mb-2"><h2 className="h2">People you may know</h2><span className="pill">{people?.length||0} results</span></div>{error&&<p className="notice notice-error">{error.message}</p>}{people?.length?people.map(person=>{
 const relation=connections?.find(c=>c.requester_id===person.id||c.recipient_id===person.id);
 return <div key={person.id} className="list-row"><Avatar name={person.full_name}/><div className="flex-1 min-w-0"><Link href={`/profile/${person.username}`} className="font-bold text-sm hover:text-blue-600">{person.full_name}</Link><div className="tiny muted mt-1">{person.headline||person.category} · {departments?.find(d=>d.id===person.department_id)?.code||'University member'}{mappings?.find(b=>b.id===person.batch_mapping_id)?.code?' · '+mappings?.find(b=>b.id===person.batch_mapping_id)?.code:''}</div><div className="mt-1"><Verified verified={person.affiliation_status==='verified'}/></div></div>{relation?<span className="pill">{relation.status==='accepted'?'Connected':relation.status==='pending'?'Request pending':'Previous request'}</span>:<form action={requestConnection}><input type="hidden" name="recipient_id" value={person.id}/><button className="btn btn-secondary btn-small"><UserPlus size={15}/> Connect</button></form>}</div>
 }):<Empty title="No members match" subtitle="Try a different name or change your filters."/>}</div></>;
}
