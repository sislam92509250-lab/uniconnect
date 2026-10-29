# UniConnect — University Professional Network

**Repository milestone:** Functional full-stack foundation and representative networking flows. This is an evolving portfolio application, **not** a finished production implementation of every feature in the original 28-section brief.

UniConnect is a university community for current students, alumni and faculty. Members can register, maintain professional academic profiles, discover people, request connections, chat, publish posts, find mentors, browse opportunities and RSVP to events. Administrators manage university batch identifiers and membership verification.

## Stack

- Next.js 16 App Router, TypeScript, React 19, Tailwind CSS 4, Lucide
- Supabase Auth, PostgreSQL with RLS, Supabase Realtime
- Cookie-based sessions via `@supabase/ssr` and Next.js `proxy.ts`
- Deployable to Vercel + Supabase, with no custom dedicated backend required

## Quick start (Windows / Mac / Linux)

1. Install Node.js 22+ and create a Supabase project.
2. In Supabase's **SQL Editor**, run `supabase/migrations/202610290001_initial.sql` **once**, on a fresh project. For repeatable team development, manage it with Supabase CLI migrations.
3. Copy `.env.example` to `.env.local`, then enter your real Supabase Project URL and **publishable key**. Never use a service-role/secret key in `NEXT_PUBLIC_...` variables.
4. Set Supabase **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add `http://localhost:3000/auth/callback` as an allowed redirect. Ensure email signup and confirmation are enabled.
5. In the project directory run:

   ```bash
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000`.
7. Create an account and confirm the email. This creates a profile using a database trigger.
8. To bootstrap the **first** platform administrator, go to Supabase Dashboard → Authentication → Users. Copy the UUID for a trusted account, and run this in the *SQL Editor* (never put it in public frontend code):

   ```sql
   insert into public.user_roles(user_id,role)
   values ('REPLACE_WITH_REAL_AUTH_USER_UUID','platform_admin');
   ```

9. Sign back in as that user, visit `/admin/batches`, and enter batch mappings **confirmed by the university**. The 211/212/213 or 223 examples in the project brief were expressly not confirmed as UIU's official format.
10. Complete student onboarding at `/onboarding` using a mapping that matches your department. Faculty can omit the batch field.

**Important:** If no academic mappings have been entered yet, new students and alumni **cannot finish the academic onboarding**. This is intentional: assigning a fabricated or guessed official code would be incorrect. An administrator must configure real mappings first.

## Optional fictional demo data

To populate a **disposable development-only Supabase project**, use `scripts/seed-demo.mjs`. This creates clearly labeled fictional students, alumni, faculty, posts, connections, a mentor, and a demonstration job. The demonstration batch codes are prefixed `DEMO-` and are **not** official university codes. The script requires explicit opt-in, a private service-role key and prints random credentials only in your local terminal. **Never run it on a real institutional or public database.**

```bash
# Set environment variables in your terminal (not in committed files):
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# UNICONNECT_DEMO_SEED_ACK=I_WILL_ONLY_USE_A_DISPOSABLE_DEVELOPMENT_PROJECT
node scripts/seed-demo.mjs
```

## What is implemented

| Area | Implemented features |
| --- | --- |
| Accounts | Email/password signup, email verification callback, login/logout, password recovery, protected server pages |
| University | University/department/term reference data, administrative batch mapping UI, consistency checks |
| Profiles | Onboarding, profile updates, username, professional bio, links, skills, category, affiliation verification workflow |
| Feed | Publish posts, recent feed pagination, likes/unlikes, comments, delete own post, persistent records |
| Discovery | Search by name, department, category, batch, basic member profiles, batch member pages |
| Connections | Request, accept/decline, display accepted and pending relationships |
| Messaging | Secure one-to-one conversations between connected members, message history, Realtime refresh |
| Mentorship | Opt-in verified alumni/faculty mentor profiles, requests and accept/decline |
| Jobs | Verified alumni/faculty publish opportunities, filtering and external application links |
| Events | Administrator-created events, RSVP capacity enforcement, cancellation |
| Communities | Administrator-created groups, public membership join/leave; private groups do not have invitation management yet |
| Notifications | Persistent event-triggered notifications, unread count, mark all as read |
| Admin | Dashboard metrics, affiliation review, batch creation, member suspension, report review, event/community creation |
| Privacy | Supabase RLS on all data tables, database authorization RPCs, no browser-stored primary database |

## Known limitations / intentionally unfinished

The full original product brief calls for many additional features. **Do not advertise these as complete:** post image uploads, edit posts/replies/reposts/saved posts; rich skills and full employment/education records; profile pictures/cover images/resumes; multi-university scoping for non-platform admins; secure departmental role management UI; search across all entity types; invitation workflow for private communities; batch-specific community auto-generation; block management UI; messaging unread/read receipts; advanced event reminders; account deletion; mobile push; ranking algorithms; language localization; rate limiting and anti-spam; field-level privacy controls; comprehensive automated integration tests; production-grade audit monitoring. The current database has some tables for future work, but those features still require implementation.

The administrative UI currently supports **platform administrators** only; university/department/moderator roles exist as schema entries but their scoped control panels have not been implemented. Treat this as a technical foundation with an alpha feature set.

## Deployment to Vercel

1. Push the project to a **GitHub repository without `.env.local`** (`.gitignore` excludes it).
2. In Vercel, import the GitHub repository, choose Next.js and use `npm run build` as the build command.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN` in Vercel project settings.
4. Configure Supabase Authentication → URL Configuration → Site URL to your HTTPS production domain and allow `https://YOUR_VERCEL_DOMAIN/auth/callback` as a redirect.
5. Verify the production build, auth email callback, RLS, and all high-risk actions **on the deployed instance** before sharing publicly.
6. Keep Supabase database backups and ensure no real student records are used without authorization.

## Architecture overview

```text
src/
  app/
    (auth)/           Public account screens
    (platform)/       Authenticated pages and protected administrator pages
    actions.ts        Server Actions for validated database mutations
    auth/callback/    Supabase PKCE exchange
    globals.css       Responsive design system
  components/         UI, navigation, feedback, realtime subscription
  lib/auth.ts         Server guard helpers
  lib/supabase/       Server and browser Supabase clients
  proxy.ts            Cookie refresh for Next.js 16
supabase/
  migrations/         Reproducible SQL database + policies + triggers + RPCs
scripts/              Static checks (not a substitute for runtime tests)
```

**Data access:** Server Components read via a per-request cookie-aware Supabase client. Server Actions authenticate users, mutate data under RLS, then revalidate and/or redirect. Row policies restrict writes, while privileged operations run through security-definer PostgreSQL RPCs that perform their own permission checks. Realtime messages are visible only to conversation participants.

**Batch mapping:** UI filters by `department_id`, joins to `batch_mappings`, and displays configured `code`. PostgreSQL enforces department/term university consistency and profile department-to-batch consistency. No parsing of three-digit codes is used to infer a term.

**Admin bootstrap:** No publicly selectable admin role exists. The initial role must be provisioned by a trusted operator in Supabase SQL Editor. Never put privileged tokens in source code.

**Security caveat:** RLS is not sufficient alone for a public production launch. Carry out a real adversarial audit, automated authorization tests, input validation hardening, throttling, abuse prevention, storage access policy review and accessibility review.

## Testing

Because credentials for an actual Supabase instance are not included in the repository, the source cannot self-prove end-to-end functionality. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node scripts/structural-check.cjs` after installation. See `docs/TEST_PLAN.md` for an end-to-end checklist. The included smoke script checks file structure and policy coverage; it does **not** simulate a real database.

## Suggested continuation order

1. Stabilize initial deployment and test auth/onboarding/permissions using separate student, alumni, faculty and admin accounts.
2. Add private storage-backed media and detailed profile data plus privacy settings.
3. Complete social content actions, reporting/blocking UI, messaging read receipts and better Realtime experiences.
4. Expand mentorship, jobs, events, invitations, batch communities and search.
5. Implement scoped multi-university admin roles, rate limiting, monitoring, integration tests and accessible polish.

## Attribution

Inspired by patterns common to professional networking and alumni tools. No proprietary code, brand identity or images from LinkedIn, PeopleGrove, Almabase or Graduway are used.
