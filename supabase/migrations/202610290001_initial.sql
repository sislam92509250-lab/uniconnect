-- UniConnect: database foundation. Apply in Supabase SQL Editor or via Supabase CLI.
-- Public demo schemas do NOT represent official UIU batch policy.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.member_category as enum ('student','alumni','faculty');
create type public.affiliation_state as enum ('pending','verified','rejected');
create type public.admin_role as enum ('platform_admin','university_admin','department_admin','community_moderator');
create type public.connection_state as enum ('pending','accepted','declined');
create type public.mentorship_state as enum ('pending','accepted','declined','ended');

create table public.universities (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 email_domain text, created_at timestamptz not null default now()
);
create table public.departments (
 id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
 code text not null, name text not null, created_at timestamptz not null default now(),
 unique(university_id,code)
);
create table public.academic_terms (
 id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
 label text not null, ordinal smallint not null check(ordinal between 1 and 6),
 unique(university_id,label), unique(university_id,ordinal)
);
create table public.batch_mappings (
 id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments on delete cascade,
 academic_term_id uuid not null references public.academic_terms,
 admission_year integer not null check(admission_year between 1970 and 2150),
 code text not null check(length(code) between 2 and 24),
 created_at timestamptz not null default now(),
 unique(department_id,academic_term_id,admission_year), unique(department_id,code)
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9_]{3,32}$'),
 full_name text not null check(length(full_name) between 2 and 120),
 category public.member_category not null default 'student',
 department_id uuid references public.departments,
 batch_mapping_id uuid references public.batch_mappings,
 program text,
 graduation_year integer check(graduation_year between 1970 and 2150),
 headline text not null default '', bio text not null default '',
 location text not null default '', skills text[] not null default '{}',
 github_url text, linkedin_url text,
 avatar_url text,
 affiliation_status public.affiliation_state not null default 'pending',
 onboarding_done boolean not null default false,
 is_suspended boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 role public.admin_role not null, university_id uuid references public.universities,
 department_id uuid references public.departments,
 assigned_at timestamptz not null default now(), unique(user_id,role,university_id,department_id)
);
create table public.affiliation_verifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 note text not null default '', status public.affiliation_state not null default 'pending',
 reviewer_id uuid references public.profiles, reviewer_note text,
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles on delete cascade,
 body text not null check(length(trim(body)) between 1 and 3000),
 category text not null default 'General',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.post_likes (
 post_id uuid not null references public.posts on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table public.comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,
 body text not null check(length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create table public.connections (
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.profiles on delete cascade,
 recipient_id uuid not null references public.profiles on delete cascade,
 status public.connection_state not null default 'pending',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(requester_id<>recipient_id)
);
create unique index connections_pair_idx on public.connections(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create table public.user_blocks (
 blocker_id uuid not null references public.profiles on delete cascade,
 blocked_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(),
 user_a uuid not null references public.profiles on delete cascade,
 user_b uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), check(user_a<>user_b)
);
create unique index conversations_pair_idx on public.conversations(least(user_a,user_b),greatest(user_a,user_b));
create table public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
 sender_id uuid not null references public.profiles on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000),
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 actor_id uuid references public.profiles on delete set null,
 kind text not null, body text not null, url text not null default '/notifications',
 is_read boolean not null default false, created_at timestamptz not null default now()
);
create table public.mentor_profiles (
 user_id uuid primary key references public.profiles on delete cascade,
 topics text[] not null default '{}', description text not null default '',
 available boolean not null default true, max_mentees integer not null default 3 check(max_mentees between 1 and 30),
 created_at timestamptz not null default now()
);
create table public.mentorship_requests (
 id uuid primary key default gen_random_uuid(), mentor_id uuid not null references public.profiles on delete cascade,
 mentee_id uuid not null references public.profiles on delete cascade,
 introduction text not null check(length(trim(introduction)) between 5 and 500),
 status public.mentorship_state not null default 'pending',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(mentor_id,mentee_id),check(mentor_id<>mentee_id)
);
create table public.job_listings (
 id uuid primary key default gen_random_uuid(), posted_by uuid not null references public.profiles on delete cascade,
 title text not null, company text not null, description text not null,
 location text not null default 'Bangladesh', work_mode text not null default 'On-site',
 job_type text not null default 'Internship', application_url text not null,
 deadline date, created_at timestamptz not null default now()
);
create table public.saved_jobs (
 job_id uuid not null references public.job_listings on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(job_id,user_id)
);
create table public.events (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles,
 title text not null, description text not null default '',
 location text not null, starts_at timestamptz not null,
 capacity integer check(capacity>0), created_at timestamptz not null default now()
);
create table public.event_registrations (
 event_id uuid not null references public.events on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(event_id,user_id)
);
create table public.communities (
 id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
 department_id uuid references public.departments, batch_mapping_id uuid references public.batch_mappings,
 is_private boolean not null default false,
 created_by uuid not null references public.profiles, created_at timestamptz not null default now()
);
create table public.community_members (
 community_id uuid not null references public.communities on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(community_id,user_id)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles,
 reported_post_id uuid references public.posts on delete cascade,
 reported_user_id uuid references public.profiles on delete cascade,
 reason text not null, status text not null default 'open', created_at timestamptz not null default now(),
 check((reported_post_id is not null) <> (reported_user_id is not null))
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles,
 event_type text not null, target_id uuid, context jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index profiles_department_idx on public.profiles(department_id,batch_mapping_id);
create index profiles_skills_idx on public.profiles using gin(skills);
create index profiles_name_search_idx on public.profiles using gin(full_name gin_trgm_ops);
create index posts_feed_idx on public.posts(created_at desc);
create index messages_convo_idx on public.messages(conversation_id,created_at desc);
create index notifications_user_idx on public.notifications(user_id,is_read,created_at desc);
create index jobs_recent_idx on public.job_listings(created_at desc);
create index events_starts_idx on public.events(starts_at);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.touch_updated_at();
create trigger connections_updated before update on public.connections for each row execute function public.touch_updated_at();
create trigger mentorship_updated before update on public.mentorship_requests for each row execute function public.touch_updated_at();

create function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='platform_admin');
$$;
create function public.is_active_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_suspended=false);
$$;
create function public.has_block(user_one uuid,user_two uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_blocks where
 (blocker_id=user_one and blocked_id=user_two) or (blocker_id=user_two and blocked_id=user_one));
$$;
create function public.are_connected(user_one uuid,user_two uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.connections where status='accepted' and
 ((requester_id=user_one and recipient_id=user_two) or (requester_id=user_two and recipient_id=user_one)));
$$;
create function public.is_conversation_participant(conv_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversations where id=conv_id and (user_a=(select auth.uid()) or user_b=(select auth.uid())));
$$;
create function public.is_community_member(group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_members where community_id=group_id and user_id=(select auth.uid()));
$$;

-- The trigger's SECURITY DEFINER access is only for onboarding new Auth users.
create function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
declare raw_category text; safe_name text;
begin
 raw_category := new.raw_user_meta_data->>'category';
 if raw_category not in ('student','alumni','faculty') then raw_category:='student'; end if;
 safe_name:=left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'UniConnect Member'),120);
 insert into public.profiles(id,username,full_name,category)
 values(new.id,'member_'||replace(substr(new.id::text,1,8),'-',''),safe_name,raw_category::public.member_category);
 return new;
end; $$;
create trigger auth_profile_created after insert on auth.users for each row execute function public.on_auth_user_created();

-- Do not permit a mapping from a different department to be assigned to a profile.
create function public.verify_profile_batch() returns trigger language plpgsql set search_path='' as $$
begin
 if new.batch_mapping_id is not null and not exists (
   select 1 from public.batch_mappings where id=new.batch_mapping_id and department_id=new.department_id
 ) then raise exception 'Batch does not belong to your department'; end if;
 return new;
end; $$;
create trigger profiles_batch_check before insert or update on public.profiles for each row execute function public.verify_profile_batch();

create function public.insert_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='connections' then
   if tg_op='INSERT' then
    insert into public.notifications(user_id,actor_id,kind,body,url) values(new.recipient_id,new.requester_id,'connection','sent you a connection request','/network');
   elsif new.status='accepted' and old.status is distinct from new.status then
    insert into public.notifications(user_id,actor_id,kind,body,url) values(new.requester_id,new.recipient_id,'connection','accepted your connection request','/network');
   end if;
 elsif tg_table_name='messages' then
    insert into public.notifications(user_id,actor_id,kind,body,url)
    select case when c.user_a=new.sender_id then c.user_b else c.user_a end,new.sender_id,'message','sent you a message','/messages/'||new.conversation_id::text
    from public.conversations c where c.id=new.conversation_id;
 elsif tg_table_name='post_likes' then
    insert into public.notifications(user_id,actor_id,kind,body,url)
    select p.author_id,new.user_id,'like','liked your post','/feed' from public.posts p where p.id=new.post_id and p.author_id<>new.user_id;
 elsif tg_table_name='comments' then
    insert into public.notifications(user_id,actor_id,kind,body,url)
    select p.author_id,new.author_id,'comment','commented on your post','/feed' from public.posts p where p.id=new.post_id and p.author_id<>new.author_id;
 elsif tg_table_name='mentorship_requests' then
    if tg_op='INSERT' then
      insert into public.notifications(user_id,actor_id,kind,body,url) values(new.mentor_id,new.mentee_id,'mentorship','requested mentorship','/mentorship');
    elsif new.status='accepted' and old.status is distinct from new.status then
      insert into public.notifications(user_id,actor_id,kind,body,url) values(new.mentee_id,new.mentor_id,'mentorship','accepted your mentorship request','/mentorship');
    end if;
 end if;
 return new;
end; $$;
create trigger connection_notify after insert or update on public.connections for each row execute function public.insert_notice();
create trigger message_notify after insert on public.messages for each row execute function public.insert_notice();
create trigger post_like_notify after insert on public.post_likes for each row execute function public.insert_notice();
create trigger comment_notify after insert on public.comments for each row execute function public.insert_notice();
create trigger mentor_notify after insert or update on public.mentorship_requests for each row execute function public.insert_notice();

-- These RPCs enforce changes that need more than a row-ownership check.
create function public.respond_connection(request_id uuid, accept boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_member() then raise exception 'Account not active'; end if;
 update public.connections set status=case when accept then 'accepted'::public.connection_state else 'declined'::public.connection_state end
 where id=request_id and recipient_id=auth.uid() and status='pending';
 if not found then raise exception 'Request not found or not allowed'; end if;
end; $$;
create function public.start_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare found_id uuid;
begin
 if auth.uid() is null or not public.is_active_member() or
    not public.are_connected(auth.uid(),other_user) or public.has_block(auth.uid(),other_user) then
    raise exception 'Only unblocked connections can message each other';
 end if;
 insert into public.conversations(user_a,user_b) values(auth.uid(),other_user)
 on conflict do nothing;
 select id into found_id from public.conversations where
 (user_a=auth.uid() and user_b=other_user) or (user_b=auth.uid() and user_a=other_user);
 return found_id;
end; $$;
create function public.respond_mentorship(request_id uuid, accept boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_member() then raise exception 'Account not active'; end if;
 update public.mentorship_requests set status=case when accept then 'accepted'::public.mentorship_state else 'declined'::public.mentorship_state end
 where id=request_id and mentor_id=auth.uid() and status='pending';
 if not found then raise exception 'Request not found or not allowed'; end if;
end; $$;
create function public.review_affiliation(request_id uuid, approve boolean, review_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare target_user uuid;
begin
 if not public.is_platform_admin() then raise exception 'Not an administrator'; end if;
 update public.affiliation_verifications
 set status=case when approve then 'verified'::public.affiliation_state else 'rejected'::public.affiliation_state end,
 reviewer_id=auth.uid(),reviewer_note=left(review_note,500),reviewed_at=now()
 where id=request_id and status='pending' returning user_id into target_user;
 if target_user is null then raise exception 'Pending request not found'; end if;
 update public.profiles set affiliation_status=case when approve then 'verified'::public.affiliation_state else 'rejected'::public.affiliation_state end where id=target_user;
 insert into public.notifications(user_id,actor_id,kind,body,url) values(target_user,auth.uid(),'verification',
 case when approve then 'Your affiliation has been verified' else 'Your affiliation request was not approved' end,'/settings');
 insert into public.audit_logs(actor_id,event_type,target_id,context) values(auth.uid(),'affiliation_review',target_user,jsonb_build_object('approved',approve));
end; $$;
-- Capacity cannot be bypassed with concurrent RSVP requests.
create function public.register_event(event_to_register uuid)
returns void language plpgsql security definer set search_path='' as $$
declare limit_count integer; signed_up integer;
begin
 if not public.is_active_member() then raise exception 'Account not active'; end if;
 select capacity into limit_count from public.events where id=event_to_register and starts_at>now() for update;
 if not found then raise exception 'Upcoming event not found'; end if;
 select count(*) into signed_up from public.event_registrations where event_id=event_to_register;
 if limit_count is not null and signed_up>=limit_count then raise exception 'Event is full'; end if;
 insert into public.event_registrations(event_id,user_id) values(event_to_register,auth.uid()) on conflict do nothing;
end; $$;

-- Enable RLS on every client-exposed table, including reference and audit tables.
alter table public.universities enable row level security;
alter table public.departments enable row level security;
alter table public.academic_terms enable row level security;
alter table public.batch_mappings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.affiliation_verifications enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.connections enable row level security;
alter table public.user_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.job_listings enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

create policy universities_read on public.universities for select to authenticated using (true);
create policy departments_read on public.departments for select to authenticated using (true);
create policy terms_read on public.academic_terms for select to authenticated using (true);
create policy mappings_read on public.batch_mappings for select to authenticated using (true);
create policy mappings_admin on public.batch_mappings for insert to authenticated with check (public.is_platform_admin());
create policy mappings_admin_update on public.batch_mappings for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid() and public.is_active_member()) with check(id=auth.uid());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_platform_admin());
create policy verify_read on public.affiliation_verifications for select to authenticated using(user_id=auth.uid() or public.is_platform_admin());
create policy verify_request on public.affiliation_verifications for insert to authenticated
 with check(user_id=auth.uid() and public.is_active_member() and status='pending' and reviewer_id is null);
create policy posts_read on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check(author_id=auth.uid() and public.is_active_member());
create policy posts_update on public.posts for update to authenticated using(author_id=auth.uid() and public.is_active_member()) with check(author_id=auth.uid());
create policy posts_delete on public.posts for delete to authenticated using(author_id=auth.uid() or public.is_platform_admin());
create policy likes_read on public.post_likes for select to authenticated using (true);
create policy likes_insert on public.post_likes for insert to authenticated with check(user_id=auth.uid() and public.is_active_member());
create policy likes_delete on public.post_likes for delete to authenticated using(user_id=auth.uid());
create policy comments_read on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check(author_id=auth.uid() and public.is_active_member());
create policy comments_delete on public.comments for delete to authenticated using(author_id=auth.uid() or public.is_platform_admin());
create policy connections_read on public.connections for select to authenticated using(requester_id=auth.uid() or recipient_id=auth.uid());
create policy connections_request on public.connections for insert to authenticated with check(
 requester_id=auth.uid() and public.is_active_member() and status='pending' and not public.has_block(requester_id,recipient_id));
create policy blocks_read on public.user_blocks for select to authenticated using(blocker_id=auth.uid());
create policy blocks_insert on public.user_blocks for insert to authenticated with check(blocker_id=auth.uid() and public.is_active_member());
create policy blocks_delete on public.user_blocks for delete to authenticated using(blocker_id=auth.uid());
create policy conversations_read on public.conversations for select to authenticated using(user_a=auth.uid() or user_b=auth.uid());
create policy messages_read on public.messages for select to authenticated using(public.is_conversation_participant(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check(
 sender_id=auth.uid() and public.is_active_member() and public.is_conversation_participant(conversation_id)
 and exists(select 1 from public.conversations c where c.id=conversation_id
 and public.are_connected(c.user_a,c.user_b) and not public.has_block(c.user_a,c.user_b))
);
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy mentors_read on public.mentor_profiles for select to authenticated using(true);
create policy mentors_insert on public.mentor_profiles for insert to authenticated with check(
 user_id=auth.uid() and public.is_active_member() and exists(select 1 from public.profiles where id=auth.uid() and affiliation_status='verified' and category in ('alumni','faculty')));
create policy mentors_update on public.mentor_profiles for update to authenticated using(user_id=auth.uid() and public.is_active_member()) with check(user_id=auth.uid());
create policy mentor_requests_read on public.mentorship_requests for select to authenticated using(mentor_id=auth.uid() or mentee_id=auth.uid());
create policy mentor_requests_insert on public.mentorship_requests for insert to authenticated with check(
 mentee_id=auth.uid() and public.is_active_member() and status='pending'
 and exists(select 1 from public.mentor_profiles m where m.user_id=mentor_id and m.available));
create policy jobs_read on public.job_listings for select to authenticated using(true);
create policy jobs_insert on public.job_listings for insert to authenticated with check(
 posted_by=auth.uid() and public.is_active_member() and
 exists(select 1 from public.profiles where id=auth.uid() and affiliation_status='verified' and category in ('alumni','faculty')));
create policy jobs_delete on public.job_listings for delete to authenticated using(posted_by=auth.uid() or public.is_platform_admin());
create policy saved_jobs_read on public.saved_jobs for select to authenticated using(user_id=auth.uid());
create policy saved_jobs_insert on public.saved_jobs for insert to authenticated with check(user_id=auth.uid());
create policy saved_jobs_delete on public.saved_jobs for delete to authenticated using(user_id=auth.uid());
create policy events_read on public.events for select to authenticated using(true);
create policy events_admin on public.events for insert to authenticated with check(created_by=auth.uid() and public.is_platform_admin());
create policy registrations_read on public.event_registrations for select to authenticated using(user_id=auth.uid() or public.is_platform_admin());
create policy registrations_cancel on public.event_registrations for delete to authenticated using(user_id=auth.uid());
create policy communities_read on public.communities for select to authenticated using(true);
create policy communities_admin on public.communities for insert to authenticated with check(created_by=auth.uid() and public.is_platform_admin());
create policy members_read on public.community_members for select to authenticated using(
 public.is_community_member(community_id) or exists(select 1 from public.communities where id=community_id and not is_private));
create policy members_join on public.community_members for insert to authenticated with check(
 user_id=auth.uid() and public.is_active_member() and exists(select 1 from public.communities where id=community_id and not is_private));
create policy members_leave on public.community_members for delete to authenticated using(user_id=auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and public.is_active_member() and status='open');
create policy reports_read on public.reports for select to authenticated using(reporter_id=auth.uid() or public.is_platform_admin());
create policy audits_admin on public.audit_logs for select to authenticated using(public.is_platform_admin());

-- Column-level permissions block unauthorized privilege changes even for a profile's owner.
revoke insert,update,delete on public.profiles from anon,authenticated;
grant update(username,full_name,department_id,batch_mapping_id,program,graduation_year,headline,bio,location,skills,github_url,linkedin_url,avatar_url,onboarding_done) on public.profiles to authenticated;
revoke insert,update,delete on public.user_roles from anon,authenticated;
revoke update,delete on public.affiliation_verifications from anon,authenticated;
revoke insert,update,delete on public.notifications from anon,authenticated;
grant update(is_read) on public.notifications to authenticated;
revoke insert,update,delete on public.conversations from anon,authenticated;
revoke update,delete on public.connections from anon,authenticated;
revoke update,delete on public.mentorship_requests from anon,authenticated;
revoke insert,update,delete on public.audit_logs from anon,authenticated;
revoke insert,update,delete on public.event_registrations from anon,authenticated;
grant delete on public.event_registrations to authenticated;
revoke update,delete on public.messages from anon,authenticated;
revoke insert,update,delete on public.reports from anon,authenticated;
grant insert on public.reports to authenticated;
-- Do not expose schema mutation and privileged RPCs to anonymous visitors.
revoke all on function public.respond_connection(uuid,boolean) from public;
revoke all on function public.start_conversation(uuid) from public;
revoke all on function public.respond_mentorship(uuid,boolean) from public;
revoke all on function public.review_affiliation(uuid,boolean,text) from public;
revoke all on function public.register_event(uuid) from public;
grant execute on function public.respond_connection(uuid,boolean),public.start_conversation(uuid),public.respond_mentorship(uuid,boolean),public.review_affiliation(uuid,boolean,text),public.register_event(uuid) to authenticated;

-- User-generated messages can be subscribed to over Supabase Realtime under RLS.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Reference data only. Batch mappings intentionally not seeded as 'official'.
insert into public.universities(name,slug,email_domain) values('United International University','uiu','uiu.ac.bd');
insert into public.departments(university_id,code,name)
select u.id,x.code,x.name from public.universities u cross join
 (values('CSE','Computer Science and Engineering'),('EEE','Electrical and Electronic Engineering'),
 ('BBA','Business Administration'),('ECO','Economics')) as x(code,name) where u.slug='uiu';
insert into public.academic_terms(university_id,label,ordinal)
select u.id,x.label,x.ordinal from public.universities u cross join
 (values('Term 1',1),('Term 2',2),('Term 3',3)) as x(label,ordinal) where u.slug='uiu';

-- Privileged moderation functions. Column-level privileges prevent self-suspension or privilege escalation.
create function public.admin_set_suspension(target_user uuid, suspended boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'Not an administrator'; end if;
 if target_user=auth.uid() then raise exception 'Administrators may not suspend themselves'; end if;
 update public.profiles set is_suspended=suspended where id=target_user;
 if not found then raise exception 'User not found'; end if;
 insert into public.audit_logs(actor_id,event_type,target_id,context)
 values(auth.uid(),'account_suspension',target_user,jsonb_build_object('suspended',suspended));
end; $$;
create function public.admin_resolve_report(report_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'Not an administrator'; end if;
 update public.reports set status='reviewed' where id=report_id and status='open';
 if not found then raise exception 'Open report not found'; end if;
 insert into public.audit_logs(actor_id,event_type,target_id) values(auth.uid(),'report_reviewed',report_id);
end; $$;
revoke all on function public.admin_set_suspension(uuid,boolean) from public;
revoke all on function public.admin_resolve_report(uuid) from public;
grant execute on function public.admin_set_suspension(uuid,boolean),public.admin_resolve_report(uuid) to authenticated;

-- Prevent academic term mappings being associated with a department in a different university.
create function public.verify_batch_university() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.departments d join public.academic_terms t
 on d.university_id=t.university_id where d.id=new.department_id and t.id=new.academic_term_id)
 then raise exception 'Academic term and department must belong to the same university'; end if;
 return new;
end; $$;
create trigger check_mapping_university before insert or update on public.batch_mappings
for each row execute function public.verify_batch_university();
