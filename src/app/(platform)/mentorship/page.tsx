
import Link from 'next/link';
import { GraduationCap, Send, Check, X } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Heading, Avatar, Empty } from '@/components/ui';
import {
    becomeMentor,
    requestMentorship,
    respondMentorship,
} from '@/app/actions';

export default async function Mentorship() {
    const { supabase, user } = await requireUser();

    const [
        { data: me },
        { data: mentors },
        { data: requests },
        { data: myMentor },
    ] = await Promise.all([
        supabase
            .from('profiles')
            .select('category,affiliation_status')
            .eq('id', user.id)
            .single(),

        supabase
            .from('mentor_profiles')
            .select(
                'user_id,description,topics,available,profiles(full_name,username,headline,category)'
            )
            .eq('available', true)
            .limit(25),

        supabase
            .from('mentorship_requests')
            .select(
                'id,mentor_id,mentee_id,introduction,status,profiles!mentorship_requests_mentee_id_fkey(full_name,username)'
            )
            .order('created_at', { ascending: false }),

        supabase
            .from('mentor_profiles')
            .select('topics,description')
            .eq('user_id', user.id)
            .maybeSingle(),
    ]);

    const eligible =
        (me?.category === 'alumni' || me?.category === 'faculty') &&
        me?.affiliation_status === 'verified';

    return (
        <>
            <Heading
                title="Alumni mentorship"
                subtitle="Ask questions, learn from experience, and give back to your university."
            />

            {eligible && (
                <div className="panel mb-5">
                    <h2 className="h2 mb-3">
                        {myMentor
                            ? 'Update your mentor profile'
                            : 'Become a mentor'}
                    </h2>

                    <form action={becomeMentor}>
                        <div className="form-group">
                            <label className="form-label">
                                Topics you can help with (comma separated)
                            </label>
                            <input
                                className="field"
                                name="topics"
                                defaultValue={myMentor?.topics?.join(', ') || ''}
                                placeholder="Interviews, Software Engineering, Higher Studies"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Short introduction
                            </label>
                            <textarea
                                className="field"
                                name="description"
                                defaultValue={myMentor?.description || ''}
                                placeholder="What can mentees learn from you?"
                            />
                        </div>

                        <button className="btn btn-primary">
                            {myMentor
                                ? 'Save mentor profile'
                                : 'Start mentoring'}
                        </button>
                    </form>
                </div>
            )}

            {requests?.some(
                (r) =>
                    r.mentor_id === user.id &&
                    r.status === 'pending'
            ) && (
                <section className="panel mb-5">
                    <h2 className="h2 mb-3">
                        Mentorship requests for you
                    </h2>

                    {requests
                        .filter(
                            (r) =>
                                r.mentor_id === user.id &&
                                r.status === 'pending'
                        )
                        .map((r) => {
                            const p = Array.isArray(r.profiles)
                                ? r.profiles[0]
                                : r.profiles;

                            return (
                                <div
                                    className="py-3 border-b border-slate-100"
                                    key={r.id}
                                >
                                    <b className="text-sm">
                                        {p?.full_name || 'Member'}
                                    </b>

                                    <p className="text-sm muted my-2">
                                        {r.introduction}
                                    </p>

                                    <form
                                        action={respondMentorship}
                                        className="flex gap-2"
                                    >
                                        <input
                                            name="request_id"
                                            type="hidden"
                                            value={r.id}
                                        />

                                        <button
                                            name="decision"
                                            value="accept"
                                            className="btn btn-primary btn-small"
                                        >
                                            <Check size={14} />
                                            Accept
                                        </button>

                                        <button
                                            name="decision"
                                            value="decline"
                                            className="btn btn-secondary btn-small"
                                        >
                                            <X size={14} />
                                            Decline
                                        </button>
                                    </form>
                                </div>
                            );
                        })}
                </section>
            )}

            <section className="panel">
                <h2 className="h2 mb-3">Meet our mentors</h2>

                {mentors?.length ? (
                    mentors.map((m) => {
                        const person = Array.isArray(m.profiles)
                            ? m.profiles[0]
                            : m.profiles;

                        const sent = requests?.find(
                            (r) =>
                                r.mentor_id === m.user_id &&
                                r.mentee_id === user.id
                        );

                        return (
                            <div
                                className="list-row items-start"
                                key={m.user_id}
                            >
                                <Avatar
                                    name={person?.full_name || 'Mentor'}
                                />

                                <div className="min-w-0 flex-1">
                                    <Link
                                        className="text-sm font-bold"
                                        href={`/profile/${person?.username}`}
                                    >
                                        {person?.full_name || 'Mentor'}
                                    </Link>

                                    <p className="tiny muted mt-1">
                                        {person?.headline || person?.category}
                                    </p>

                                    <p className="text-sm mt-2">
                                        {m.description}
                                    </p>

                                    <div className="mt-2">
                                        {m.topics?.map((t: string) => (
                                            <span className="tag" key={t}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    {user.id !== m.user_id &&
                                        (!sent ? (
                                            <form
                                                action={requestMentorship}
                                                className="mt-3"
                                            >
                                                <input
                                                    name="mentor_id"
                                                    type="hidden"
                                                    value={m.user_id}
                                                />

                                                <textarea
                                                    className="field"
                                                    name="introduction"
                                                    minLength={5}
                                                    maxLength={500}
                                                    rows={2}
                                                    required
                                                    placeholder="Introduce yourself and share what you want to learn..."
                                                />

                                                <button className="btn btn-secondary btn-small mt-2">
                                                    <Send size={14} />
                                                    Request mentorship
                                                </button>
                                            </form>
                                        ) : (
                                            <span className="pill mt-2">
                                                Request: {sent.status}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <Empty
                        title="No mentors available yet"
                        subtitle="Verified alumni and faculty can opt in as mentors."
                    />
                )}
            </section>

            {requests?.some(
                (r) => r.mentee_id === user.id
            ) && (
                <section className="panel mt-5">
                    <h2 className="h2 mb-3">
                        My mentorship requests
                    </h2>

                    {requests
                        .filter((r) => r.mentee_id === user.id)
                        .map((r) => (
                            <p
                                className="text-sm py-2"
                                key={r.id}
                            >
                                Request status:{' '}
                                <span className="pill">
                                    {r.status}
                                </span>
                            </p>
                        ))}
                </section>
            )}
        </>
    );
}
