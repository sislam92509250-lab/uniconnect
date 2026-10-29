import Link from 'next/link';
import { register } from '@/app/actions';
import { Feedback } from '@/components/feedback';
export default function Register(){return <section className="auth-card"><div className="eyebrow mb-2">Join your network</div><h1 className="h1 mb-2">Create your account</h1><p className="muted text-sm mb-6">Connect with students, faculty, and alumni.</p><Feedback/><form action={register}>
<label>Full name<input className="field" name="full_name" minLength={2} maxLength={120} required placeholder="Your full name" autoComplete="name"/></label>
<label>Email<input className="field" name="email" type="email" required placeholder="you@example.com" autoComplete="email"/></label>
<label>I am a<select className="field" name="category" defaultValue="student"><option value="student">Current student</option><option value="alumni">Alumni</option><option value="faculty">Faculty member</option></select></label>
<label>Password<input className="field" name="password" type="password" minLength={8} required autoComplete="new-password"/></label>
<label>Confirm password<input className="field" name="confirm" type="password" minLength={8} required autoComplete="new-password"/></label>
<p className="muted text-xs mb-4">Your university affiliation will require separate verification.</p><button type="submit" className="btn btn-primary w-full">Create account</button></form><p className="text-sm text-center muted mt-6">Already a member? <Link className="font-bold text-blue-600" href="/login">Sign in</Link></p></section>}
