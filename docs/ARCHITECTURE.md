# UniConnect architecture decision record

## Scope and boundaries

- **Framework:** Next.js App Router, React Server Components, Server Actions.
- **Persistence:** Supabase PostgreSQL is the only source of truth. No localStorage-backed database or synthetic production data.
- **Authentication:** Supabase Auth cookies with `@supabase/ssr` and Next.js Proxy for refresh. Server guards call `getUser()`; database RLS is still required on every table.
- **Permissions:** `profiles.category` is self-selected but **not evidence of university affiliation**. `affiliation_status` can change only through an authorized database RPC; platform admin roles are assigned outside public registration.
- **Batch system:** mappings refer to specific department, academic term and admission year, not a mathematical shorthand. Client does not infer official UIU code semantics.
- **Data access:** RLS policies + restricted column grants + security-definer functions for sensitive transitions. Untrusted input is checked on the server; SQL constraints are final backstops.
- **Messaging:** conversations are between two accepted connections. Only their participants can read/insert messages; blocking prevents new messages. Supabase Realtime refreshes conversation view when new messages arrive.
- **Notifications:** database triggers store durable notification rows. They do not rely on a browser connection to exist.
- **Free tier:** simple SQL indexes and pagination; no Elasticsearch, Redis, microservices or paid APIs.

## Data flows

Registration: Auth email → profile trigger creates minimal record → email confirmation → `/onboarding` → controlled profile update under RLS → dynamic batch mapping displayed.

Connections: requester inserts pending row → recipient notified by SQL trigger → recipient calls authorized RPC → accepted state → both can open conversation via authorized RPC.

Messages: accepted pair → create or reuse conversation RPC → new message insert with RLS → notification trigger → Realtime event refreshes participant UI.

Verification: user writes pending request → trusted platform admin reviews independently → secured RPC updates request/profile and writes audit log + notification.

## Privacy boundaries

User public profile fields are currently visible to all authenticated members; fine-grained per-field privacy is **not yet implemented**. Do not upload ID cards or sensitive personal data to public profile fields. Staff permission rows and audit logs are protected by RLS. External job links are not an internal application processing system.

## Multi-university growth

Reference tables already support multiple universities. Academic policy must always be configured in the database. Future work must add institution-scoped administrator authorization functions and ownership rules for public groups, posts, institutions and affiliation review before enabling multiple institutional administrators.
