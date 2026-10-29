/**
 * Explicitly opt-in development-only fictional seed.
 * DO NOT RUN on a live university database. Requires local-only service key
 * and acknowledgement. Never use a NEXT_PUBLIC_ key for admin operations.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
const ack=process.env.UNICONNECT_DEMO_SEED_ACK;
if(ack!=='I_WILL_ONLY_USE_A_DISPOSABLE_DEVELOPMENT_PROJECT') {
 console.error('Demo seeding disabled. Read the README and set the explicit development-only acknowledgement.');
 process.exit(1);
}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Provide NEXT_PUBLIC_SUPABASE_URL and a PRIVATE SUPABASE_SERVICE_ROLE_KEY for this one-time local script.');process.exit(1);}
const sb=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
const {data:departments,error:dError}=await sb.from('departments').select('id,code').in('code',['CSE','EEE']);
const {data:terms,error:tError}=await sb.from('academic_terms').select('id,label').eq('label','Term 3');
if(dError||tError||!departments?.length||!terms?.length) throw new Error('Apply the migration first.');
const cse=departments.find(d=>d.code==='CSE')?.id,eee=departments.find(d=>d.code==='EEE')?.id;
for(const d of departments) {
 const {error}=await sb.from('batch_mappings').upsert({department_id:d.id,academic_term_id:terms[0].id,admission_year:2023,code:d.code==='CSE'?'DEMO-223':'DEMO-E23'},{onConflict:'department_id,academic_term_id,admission_year'});
 if(error)throw error;
}
const {data:mappings}=await sb.from('batch_mappings').select('id,department_id').eq('admission_year',2023).in('code',['DEMO-223','DEMO-E23']);
const cseBatch=mappings?.find(m=>m.department_id===cse)?.id,eeeBatch=mappings?.find(m=>m.department_id===eee)?.id;
if(!cseBatch||!eeeBatch) throw new Error('Missing demonstration batch mappings');
const instance=randomBytes(4).toString('hex');
const profiles=[
 {full_name:'Demo Ayesha Student',category:'student',department_id:cse,batch_mapping_id:cseBatch,headline:'[FICTIONAL DEMO] CSE student • React & database learner',skills:['React','TypeScript','SQL']},
 {full_name:'Demo Rahim Graduate',category:'alumni',department_id:cse,batch_mapping_id:cseBatch,headline:'[FICTIONAL DEMO] Software engineer • Alumni mentor',skills:['Next.js','PostgreSQL','Career guidance']},
 {full_name:'Demo Nusrat Student',category:'student',department_id:eee,batch_mapping_id:eeeBatch,headline:'[FICTIONAL DEMO] EEE student • Robotics enthusiast',skills:['Robotics','Python']},
 {full_name:'Demo Dr Farhan',category:'faculty',department_id:cse,batch_mapping_id:null,headline:'[FICTIONAL DEMO] Faculty member • AI research',skills:['Machine Learning','Research']},
];
const created=[];
for(let i=0;i<profiles.length;i++){
 const person=profiles[i];const email=`uniconnect-demo-${instance}-${i}@example.com`,password=randomBytes(15).toString('base64url');
 const {data,error}=await sb.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:person.full_name,category:person.category}});
 if(error||!data.user)throw error||new Error('Could not create demo user');
 const {error:profileError}=await sb.from('profiles').update({...person,affiliation_status:'verified',onboarding_done:true,bio:'This is a fictional demonstration account, not a real member of any university.'}).eq('id',data.user.id);
 if(profileError)throw profileError;
 created.push({id:data.user.id,email,password,displayName:person.full_name});
}
const [student,alumnus,eeeStudent,faculty]=created;
const posts=[
 {author_id:student.id,body:'[FICTIONAL DEMO] Excited to share our full-stack campus project built with React and PostgreSQL. What should we improve next?',category:'Project'},
 {author_id:alumnus.id,body:'[FICTIONAL DEMO] Career tip: keep your GitHub README clear and explain what you learned from bugs and trade-offs.',category:'Career'},
 {author_id:eeeStudent.id,body:'[FICTIONAL DEMO] Our robotics prototype made it to the final showcase!',category:'Achievement'},
 {author_id:faculty.id,body:'[FICTIONAL DEMO] Students interested in research: start with one small reproducible experiment.',category:'Research'},
];
for(const p of posts){const {error}=await sb.from('posts').insert(p);if(error)throw error;}
const {error:connectionError}=await sb.from('connections').insert({requester_id:student.id,recipient_id:alumnus.id,status:'accepted'});
if(connectionError)throw connectionError;
const {error:mentorError}=await sb.from('mentor_profiles').insert({user_id:alumnus.id,topics:['Career advice','Job interviews'],description:'[FICTIONAL DEMO] Ask me about career planning and your first internship.'});
if(mentorError)throw mentorError;
const {error:jobError}=await sb.from('job_listings').insert({posted_by:alumnus.id,title:'[FICTIONAL DEMO] Junior Developer Internship',company:'Example Software Ltd.',description:'This is a synthetic example opportunity. Do not apply.',location:'Dhaka (demo)',work_mode:'Hybrid',job_type:'Internship',application_url:'https://example.com'});
if(jobError)throw jobError;
console.log(`Created ${created.length} clearly fictional development accounts (instance ${instance}). Credentials are shown ONLY in this local console:`);
created.forEach(u=>console.log(`${u.displayName}: ${u.email} / ${u.password}`));
console.log('Delete the disposable Supabase project when done. Never commit credentials or save console output in the repository.');
