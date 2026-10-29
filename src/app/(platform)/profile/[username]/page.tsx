
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    BriefcaseBusiness,
    GraduationCap,
    MapPin,
    ExternalLink,
    ArrowLeft,
    UserPlus,
} from 'lucide-react';

import { requireUser } from '@/lib/auth';
import { Avatar, Verified } from '@/components/ui';
import {
    requestConnection,
    startConversation,
    reportMember,
    toggleBlock,
} from '@/app/actions';

export default async function Profile({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const { supabase, user } = await requireUser();

    const { data: profile } = await supabase
        .from('profiles')
        .select(
            'id,username,full_name,headline,bio,category,affiliation_status,location,skills,github_url,linkedin_url,department_id,batch_mapping_id,graduation_year,program'
        )
        .eq('username', username)
        .single();

    if (!profile) notFound();

    const [
        { data: dept },
        { data: batch },
        { data: relation },
        { data: posts },
    ] = await Promise.all([
        profile.department_id
            ? supabase
                  .from('departments')
                  .select('name,code')
                  .eq('id', profile.department_id)
                  .single()
            : Promise.resolve({ data: null }),

        profile.batch_mapping_id
            ? supabase
                  .from('batch_mappings')
                  .select('code,admission_year')
                  .eq('id', profile.batch_mapping_id)
                  .single()
            : Promise.resolve({ data: null }),

        supabase
            .from('connections')
            .select('status')
            .or(
                `and(requester_id.eq.${user.id},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${user.id})`
            )
            .maybeSingle(),

        supabase
            .from('posts')
            .select('id,body,category,created_at')
            .eq('author_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5),
    ]);

    return (
        <>
            <Link
                className="text-xs text-blue-600 flex gap-2 items-center mb-4"
                href="/discover"
            >
                <ArrowLeft size={14} />
                Discover people
            </Link>

            <div className="panel mb-5 overflow-hidden relative">
                <div className="h-30 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 mb-[-35px]" />

                <div className="relative pl-4">
                    <div className="bg-white inline-block rounded-3xl p-1">
                        <Avatar name={profile.full_name} large />
                    </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3 mt-3">
                    <div>
                        <div className="flex gap-3 items-center">
                            <h1 className="h1">
                                {profile.full_name}
                            </h1>

                            <Verified
                                verified={
                                    profile.affiliation_status === 'verified'
                                }
                            />
                        </div>

                        <p className="text-sm muted mt-2">
                            {profile.headline ||
                                `${profile.category} at UniConnect`}
                        </p>

                        <div className="flex flex-wrap gap-3 text-xs muted mt-3">
                            <span className="flex gap-1 items-center">
                                <GraduationCap size={15} />
                                {dept?.name || 'University'}
                                {batch?.code
                                    ? ` · Batch ${batch.code}`
                                    : ''}
                            </span>

                            {profile.location && (
                                <span className="flex gap-1 items-center">
                                    <MapPin size={15} />
                                    {profile.location}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {profile.id === user.id ? (
                            <Link
                                className="btn btn-secondary"
                                href="/profile/edit"
                            >
                                Edit profile
                            </Link>
                        ) : relation?.status === 'accepted' ? (
                            <form action={startConversation}>
                                <input
                                    name="other_user"
                                    type="hidden"
                                    value={profile.id}
                                />
                                <button className="btn btn-primary">
                                    Message
                                </button>
                            </form>
                        ) : relation ? (
                            <span className="pill">
                                {relation.status}
                            </span>
                        ) : (
                            <form action={requestConnection}>
                                <input
                                    name="recipient_id"
                                    type="hidden"
                                    value={profile.id}
                                />

                                <button className="btn btn-primary">
                                    <UserPlus size={16} />
                                    Connect
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <section className="panel mb-5">
                <h2 className="h2 mb-3">About</h2>

                <p className="article-body text-sm muted">
                    {profile.bio ||
                        'This member has not added a bio yet.'}
                </p>
            </section>

            <div className="grid-two mb-5">
                <section className="panel">
                    <h2 className="h2 mb-4">
                        <GraduationCap
                            size={19}
                            className="inline mr-2 text-blue-600"
                        />
                        Academic details
                    </h2>

                    <p className="text-sm mb-2">
                        {dept?.name || 'Not specified'}
                    </p>

                    <p className="muted text-xs">
                        {profile.program || profile.category}
                    </p>

                    {batch && (
                        <p className="text-xs mt-2">
                            Batch <b>{batch.code}</b> · Admission{' '}
                            {batch.admission_year}
                        </p>
                    )}

                    {profile.graduation_year && (
                        <p className="text-xs muted mt-2">
                            Graduation: {profile.graduation_year}
                        </p>
                    )}

                    {profile.batch_mapping_id && (
                        <Link
                            className="text-xs text-blue-600 mt-3 inline-block"
                            href={`/batches/${profile.batch_mapping_id}`}
                        >
                            View batch community →
                        </Link>
                    )}
                </section>

                <section className="panel">
                    <h2 className="h2 mb-4">
                        <BriefcaseBusiness
                            size={18}
                            className="inline mr-2 text-blue-600"
                        />
                        Skills & links
                    </h2>

                    <div>
                        {profile.skills?.length ? (
                            profile.skills.map((skill: string) => (
                                <span key={skill} className="tag">
                                    {skill}
                                </span>
                            ))
                        ) : (
                            <p className="tiny muted">
                                No skills added yet.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        {profile.github_url && (
                            <a
                                href={profile.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 flex items-center gap-1"
                            >
                                GitHub
                                <ExternalLink size={12} />
                            </a>
                        )}

                        {profile.linkedin_url && (
                            <a
                                href={profile.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 flex items-center gap-1"
                            >
                                LinkedIn
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </section>
            </div>

            <section className="panel">
                <h2 className="h2 mb-4">
                    Recent activity
                </h2>

                {posts?.length ? (
                    posts.map((post) => (
                        <div
                            key={post.id}
                            className="py-3 border-b border-slate-100 last:border-0"
                        >
                            <span className="pill">
                                {post.category}
                            </span>

                            <p className="article-body text-sm mt-2">
                                {post.body}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="muted text-sm">
                        No public posts yet.
                    </p>
                )}
            </section>

            {profile.id !== user.id && (
                <div className="flex gap-3 flex-wrap mt-4">
                    <form action={toggleBlock}>
                        <input
                            name="other_user"
                            type="hidden"
                            value={profile.id}
                        />

                        <button className="btn btn-danger btn-small">
                            Block / unblock member
                        </button>
                    </form>

                    <form action={reportMember}>
                        <input
                            name="user_id"
                            type="hidden"
                            value={profile.id}
                        />

                        <input
                            name="reason"
                            type="hidden"
                            value="Inappropriate account reported by member"
                        />

                        <button className="btn btn-secondary btn-small">
                            Report member
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
