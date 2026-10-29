'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireUser } from '@/lib/auth';

const val = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const link = (raw: string) => {
  if (!raw) return null;
  try { const parsed = new URL(raw); return ['https:','http:'].includes(parsed.protocol) ? parsed.href : null; } catch { return null; }
};
const bounce = (path: string, message: string, isError = false): never =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${isError ? 'error' : 'notice'}=${encodeURIComponent(message)}`);

export async function register(form: FormData) {
  const supabase = await createClient();
  const email = val(form,'email').toLowerCase(), password = val(form,'password');
  const full_name = val(form,'full_name'), category = val(form,'category');
  if (!/^\S+@\S+\.\S+$/.test(email) || full_name.length < 2 || full_name.length > 120 || password.length < 8 ||
    password !== val(form,'confirm') || !['student','alumni','faculty'].includes(category))
    bounce('/register','Check your details. Passwords must match and be at least 8 characters.',true);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { data, error } = await supabase.auth.signUp({email,password,options:{data:{full_name,category},emailRedirectTo:`${origin}/auth/callback?next=/onboarding`}});
  if (error) bounce('/register',error.message,true);
  if (data.session) redirect('/onboarding');
  bounce('/check-email','Check your email to verify your account.');
}
export async function login(form: FormData) {
  const supabase = await createClient();
  const {error}=await supabase.auth.signInWithPassword({email:val(form,'email'),password:val(form,'password')});
  if(error) bounce('/login',error.message,true);
  redirect('/feed');
}
export async function logout() { const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }
export async function forgotPassword(form:FormData) {
  const supabase=await createClient();
  const origin=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  await supabase.auth.resetPasswordForEmail(val(form,'email'),{redirectTo:`${origin}/auth/callback?next=/reset-password`});
  bounce('/forgot-password','If that account exists, a password reset email is on its way.');
}
export async function resetPassword(form:FormData) {
  const password=val(form,'password');
  if(password.length<8 || password!==val(form,'confirm')) bounce('/reset-password','Passwords must match and be at least 8 characters.',true);
  const supabase=await createClient();
  const {error}=await supabase.auth.updateUser({password});
  if(error) bounce('/reset-password',error.message,true);
  bounce('/feed','Password updated successfully.');
}
export async function saveProfile(form:FormData) {
  const {supabase,user}=await requireUser();
  const username=val(form,'username').toLowerCase();
  if(!/^[a-z0-9_]{3,32}$/.test(username)) bounce('/profile/edit','Username must be 3–32 lowercase letters, numbers or underscores.',true);
  const full_name=val(form,'full_name');
  if(full_name.length<2 || full_name.length>120) bounce('/profile/edit','Please enter a valid name.',true);
  const {error}=await supabase.from('profiles').update({
    username,full_name,headline:val(form,'headline').slice(0,180),bio:val(form,'bio').slice(0,2000),
    location:val(form,'location').slice(0,100),skills:val(form,'skills').split(',').map(s=>s.trim()).filter(Boolean).slice(0,30),
    github_url:link(val(form,'github_url')),linkedin_url:link(val(form,'linkedin_url')),
  }).eq('id',user.id);
  if(error) bounce('/profile/edit',error.message,true);
  revalidatePath('/feed'); bounce('/profile/edit','Profile saved.');
}
export async function saveOnboarding(form:FormData) {
  const {supabase,user}=await requireUser();
  const department_id=val(form,'department_id');
  const batch=val(form,'batch_mapping_id');
  const {data:currentProfile}=await supabase.from('profiles').select('category').eq('id',user.id).single();
  const category=currentProfile?.category||'student';
  const graduation=val(form,'graduation_year');
  if(!uuid(department_id)) bounce('/onboarding','Select a department.',true);
  if(batch && !uuid(batch)) bounce('/onboarding','Invalid batch.',true);
  if(category!=='faculty' && !batch) bounce('/onboarding','Choose a batch. Ask an administrator if it is missing.',true);
  const {error}=await supabase.from('profiles').update({
    department_id,batch_mapping_id:batch||null,program:val(form,'program').slice(0,90),
    graduation_year:graduation?Number(graduation):null,onboarding_done:true,
  }).eq('id',user.id);
  if(error) bounce('/onboarding',error.message,true);
  redirect('/feed');
}
export async function publishPost(form:FormData) {
  const {supabase,user}=await requireUser();
  const body=val(form,'body'); if(!body || body.length>3000) bounce('/feed','Post must be between 1 and 3000 characters.',true);
  const tag=val(form,'category');
  const {error}=await supabase.from('posts').insert({author_id:user.id,body,category:tag.slice(0,30)||'General'});
  if(error) bounce('/feed',error.message,true);
  revalidatePath('/feed'); bounce('/feed','Post published.');
}
export async function likePost(form:FormData) {
  const {supabase,user}=await requireUser(); const post_id=val(form,'post_id');
  if(!uuid(post_id)) return;
  const {data}=await supabase.from('post_likes').select('post_id').eq('post_id',post_id).eq('user_id',user.id).maybeSingle();
  if(data) await supabase.from('post_likes').delete().eq('post_id',post_id).eq('user_id',user.id);
  else await supabase.from('post_likes').insert({post_id,user_id:user.id});
  revalidatePath('/feed');
}
export async function commentPost(form:FormData) {
  const {supabase,user}=await requireUser(); const post_id=val(form,'post_id'),body=val(form,'body');
  if(!uuid(post_id)||!body||body.length>1000) return;
  await supabase.from('comments').insert({post_id,author_id:user.id,body}); revalidatePath('/feed');
}
export async function deletePost(form:FormData) {
  const {supabase,user}=await requireUser();
  await supabase.from('posts').delete().eq('id',val(form,'post_id')).eq('author_id',user.id);
  revalidatePath('/feed');
}
export async function requestConnection(form:FormData) {
  const {supabase,user}=await requireUser(); const other=val(form,'recipient_id');
  if(!uuid(other)||other===user.id) return;
  const {error}=await supabase.from('connections').insert({requester_id:user.id,recipient_id:other});
  if(error) bounce('/discover',error.message,true);
  revalidatePath('/network'); bounce('/network','Connection request sent.');
}
export async function respondConnection(form:FormData) {
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('respond_connection',{request_id:val(form,'request_id'),accept:val(form,'decision')==='accept'});
  if(error) bounce('/network',error.message,true);
  revalidatePath('/network'); bounce('/network','Connection request updated.');
}
export async function startConversation(form:FormData) {
  const {supabase}=await requireUser();
  const {data,error}=await supabase.rpc('start_conversation',{other_user:val(form,'other_user')});
  if(error||!data) bounce('/network',error?.message??'Unable to start conversation',true);
  redirect(`/messages/${data}`);
}
export async function sendMessage(form:FormData) {
  const {supabase,user}=await requireUser(); const conversation_id=val(form,'conversation_id'),body=val(form,'body');
  if(!uuid(conversation_id)||!body||body.length>2000) return;
  const {error}=await supabase.from('messages').insert({conversation_id,sender_id:user.id,body});
  if(error) bounce(`/messages/${conversation_id}`,error.message,true);
  revalidatePath(`/messages/${conversation_id}`);
}
export async function markNotificationsRead() {
  const {supabase,user}=await requireUser();
  await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false);
  revalidatePath('/notifications'); redirect('/notifications');
}
export async function submitVerification(form:FormData) {
  const {supabase,user}=await requireUser();
  const note=val(form,'note'); if(note.length<10 || note.length>1000) bounce('/settings','Write 10–1000 characters explaining your affiliation.',true);
  const {data:existing}=await supabase.from('affiliation_verifications').select('id').eq('user_id',user.id).eq('status','pending').limit(1);
  if(existing?.length) bounce('/settings','You already have a pending request.',true);
  const {error}=await supabase.from('affiliation_verifications').insert({user_id:user.id,note});
  if(error) bounce('/settings',error.message,true);
  bounce('/settings','Verification request submitted for administrator review.');
}
export async function reviewVerification(form:FormData) {
  const {supabase}=await requireAdmin();
  const {error}=await supabase.rpc('review_affiliation',{
    request_id:val(form,'request_id'),approve:val(form,'decision')==='approve',review_note:val(form,'review_note')
  });
  if(error) bounce('/admin/verifications',error.message,true);
  revalidatePath('/admin'); bounce('/admin/verifications','Review saved.');
}
export async function createBatchMapping(form:FormData) {
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from('batch_mappings').insert({
    department_id:val(form,'department_id'),academic_term_id:val(form,'academic_term_id'),
    admission_year:Number(val(form,'admission_year')),code:val(form,'code').slice(0,24),
  });
  if(error) bounce('/admin/batches',error.message,true);
  revalidatePath('/onboarding'); bounce('/admin/batches','Batch mapping added.');
}
export async function becomeMentor(form:FormData) {
  const {supabase,user}=await requireUser();
  const {error}=await supabase.from('mentor_profiles').upsert({
    user_id:user.id,description:val(form,'description').slice(0,500),
    topics:val(form,'topics').split(',').map(v=>v.trim()).filter(Boolean).slice(0,12),available:true,
  });
  if(error) bounce('/mentorship',error.message,true);
  bounce('/mentorship','Mentor profile saved.');
}
export async function requestMentorship(form:FormData) {
  const {supabase,user}=await requireUser(); const mentor_id=val(form,'mentor_id');
  const introduction=val(form,'introduction');
  if(!uuid(mentor_id)||introduction.length<5||introduction.length>500) bounce('/mentorship','Include a short introduction (5–500 characters).',true);
  const {error}=await supabase.from('mentorship_requests').insert({mentor_id,mentee_id:user.id,introduction});
  if(error) bounce('/mentorship',error.message,true);
  bounce('/mentorship','Mentorship request sent.');
}
export async function respondMentorship(form:FormData) {
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('respond_mentorship',{request_id:val(form,'request_id'),accept:val(form,'decision')==='accept'});
  if(error) bounce('/mentorship',error.message,true);
  bounce('/mentorship','Request updated.');
}
export async function createJob(form:FormData) {
  const {supabase,user}=await requireUser();
  const application_url=link(val(form,'application_url'));
  if(!application_url) bounce('/jobs/new','Enter a valid HTTP(S) application URL.',true);
  const {error}=await supabase.from('job_listings').insert({
    posted_by:user.id,title:val(form,'title').slice(0,150),company:val(form,'company').slice(0,150),
    description:val(form,'description').slice(0,4000),location:val(form,'location').slice(0,120),
    job_type:val(form,'job_type'),work_mode:val(form,'work_mode'),application_url,
    deadline:val(form,'deadline')||null,
  });
  if(error) bounce('/jobs/new',error.message,true);
  bounce('/jobs','Opportunity published.');
}
export async function registerEvent(form:FormData) {
  const {supabase}=await requireUser();
  const {error}=await supabase.rpc('register_event',{event_to_register:val(form,'event_id')});
  if(error) bounce('/events',error.message,true);
  bounce('/events','RSVP confirmed.');
}
export async function cancelEvent(form:FormData) {
  const {supabase,user}=await requireUser();
  await supabase.from('event_registrations').delete().eq('event_id',val(form,'event_id')).eq('user_id',user.id);
  bounce('/events','RSVP cancelled.');
}
export async function joinCommunity(form:FormData) {
  const {supabase,user}=await requireUser();
  const {error}=await supabase.from('community_members').insert({community_id:val(form,'community_id'),user_id:user.id});
  if(error) bounce('/communities',error.message,true);
  bounce('/communities','Joined community.');
}
export async function leaveCommunity(form:FormData) {
  const {supabase,user}=await requireUser();
  await supabase.from('community_members').delete().eq('community_id',val(form,'community_id')).eq('user_id',user.id);
  bounce('/communities','Left community.');
}
export async function createCommunity(form:FormData) {
  const {supabase,user}=await requireAdmin();
  const {error}=await supabase.from('communities').insert({
    created_by:user.id,name:val(form,'name').slice(0,100),description:val(form,'description').slice(0,500),
    is_private:val(form,'is_private')==='on',
  });
  if(error) bounce('/admin/communities',error.message,true);
  bounce('/admin/communities','Community created.');
}
export async function createEvent(form:FormData) {
  const {supabase,user}=await requireAdmin();
  const rawDate=val(form,'starts_at');
  const parsedDate=new Date(`${rawDate}+06:00`); // UIU phase: administrator enters Dhaka local time.
  if(!rawDate||Number.isNaN(parsedDate.getTime())) bounce('/admin/events','Enter a valid Dhaka date and time.',true);
  const {error}=await supabase.from('events').insert({
    created_by:user.id,title:val(form,'title').slice(0,150),description:val(form,'description').slice(0,1000),
    location:val(form,'location').slice(0,150),starts_at:parsedDate.toISOString(),
    capacity:val(form,'capacity')?Number(val(form,'capacity')):null,
  });
  if(error) bounce('/admin/events',error.message,true);
  bounce('/admin/events','Event created.');
}
export async function adminSetSuspension(form:FormData) {
  const {supabase}=await requireAdmin();
  const {error}=await supabase.rpc('admin_set_suspension',{target_user:val(form,'user_id'),suspended:val(form,'suspended')==='true'});
  if(error) bounce('/admin/users',error.message,true);
  bounce('/admin/users','Account status updated.');
}
export async function reportPost(form:FormData){
  const {supabase,user}=await requireUser();const post=val(form,'post_id');
  if(!uuid(post)) return;
  const {error}=await supabase.from('reports').insert({reporter_id:user.id,reported_post_id:post,reason:'Reported by member for administrator review'});
  if(error) bounce('/feed',error.message,true);
  bounce('/feed','Report submitted for review.');
}
export async function reportMember(form:FormData){
  const {supabase,user}=await requireUser();const target=val(form,'user_id');
  if(!uuid(target)||target===user.id) return;
  const {error}=await supabase.from('reports').insert({reporter_id:user.id,reported_user_id:target,reason:val(form,'reason').slice(0,500)||'Member report'});
  if(error) bounce('/discover',error.message,true);
  bounce('/discover','Account report submitted.');
}
export async function adminResolveReport(form:FormData) {
  const {supabase}=await requireAdmin();
  const {error}=await supabase.rpc('admin_resolve_report',{report_id:val(form,'report_id')});
  if(error) bounce('/admin/reports',error.message,true);
  bounce('/admin/reports','Report marked reviewed.');
}
export async function toggleBlock(form:FormData) {
  const {supabase,user}=await requireUser();const other=val(form,'other_user');
  if(!uuid(other)||other===user.id) return;
  const {data}=await supabase.from('user_blocks').select('blocked_id').eq('blocker_id',user.id).eq('blocked_id',other).maybeSingle();
  const result=data?await supabase.from('user_blocks').delete().eq('blocker_id',user.id).eq('blocked_id',other)
   :await supabase.from('user_blocks').insert({blocker_id:user.id,blocked_id:other});
  if(result.error) bounce('/network',result.error.message,true);
  bounce('/network',data?'Member unblocked.':'Member blocked.');
}
