# End-to-end test plan (manual until automation is added)

Use a **development Supabase project** and distinct fictitious accounts.

## Accounts and academic identity

- [ ] Create a student, verify email, log in, log out, recover password.
- [ ] The profile trigger inserts one profile per new Auth user.
- [ ] Without an administrator-provided batch mapping, student onboarding shows the restriction.
- [ ] Add confirmed mappings through admin; complete onboarding with a matching department.
- [ ] Attempt to assign another department's mapping and confirm database denial.
- [ ] Attempt to set `affiliation_status='verified'` or `is_suspended=false` as ordinary member and confirm update is rejected.
- [ ] Attempt to insert `user_roles` as ordinary member and confirm rejection.

## Network, content and messaging

- [ ] Post from member A, comment and like from member B; confirm notification persists after refresh.
- [ ] Member A cannot delete member B's post.
- [ ] Member A sends B a connection request; B accepts; both can start same conversation.
- [ ] Only A and B can read conversation and insert message; C is denied by RLS.
- [ ] A blocked member cannot create new messages.
- [ ] Realtime insert refreshes B's conversation without manually reloading.
- [ ] A suspended account cannot make a new post or connection request.

## Careers / mentor / events / admin

- [ ] Unverified alumni cannot publish jobs or enable mentorship.
- [ ] Verified alumni can publish job and accept mentorship request.
- [ ] Capacity of a one-seat event cannot be oversubscribed by concurrent registrations.
- [ ] Normal user cannot access `/admin` or call a privileged admin RPC.
- [ ] Admin can approve/reject pending verifications, create mappings/events/communities and suspend/reactivate other members.
- [ ] Reported content appears in moderator queue.

## Deployment and quality

- [ ] `npm run typecheck`, `npm run lint`, `npm run build` succeed on a machine with dependency installation.
- [ ] Vercel credentials use only publishable browser key, never a service-role key.
- [ ] Supabase redirect allowlist includes the correct production callback URL.
- [ ] Test keyboard-only navigation, mobile widths, and high-contrast states.
- [ ] Conduct authorization/rate-limit/abuse review before any public release.
