# Lamsaty

Mobile-first digital business cards for the Moroccan market. Each published profile is available at `/{username}` and can be opened from an NFC NTAG215 card or its QR code without an app.

## Requirements

- Node.js 20.9 or newer
- A Supabase project
- Google OAuth credentials if Google sign-in is enabled

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project. In its SQL Editor, run [`supabase/migrations/202611120001_initial_schema.sql`](./supabase/migrations/202611120001_initial_schema.sql).
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side seed script only; never expose it with a `NEXT_PUBLIC_` prefix)
   - `NEXT_PUBLIC_SITE_URL` (for local development, `http://localhost:3000`)
   - `DEMO_PASSWORD` (at least 12 characters, for demo seed accounts)
4. In Supabase Authentication, enable email/password and Google as providers. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Configure the Google OAuth client ID and secret in Supabase.
5. Start the app:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:3000`, create an account, and edit/publish the card in `/dashboard`.

The migration creates the profile, link, gallery, event, and order tables; row-level policies; the event-recording RPC; the `profile-media` Storage bucket and its policies; and a trigger that creates a profile for email and Google sign-ups. A newly created profile is unpublished until its owner publishes it. Media uploads are resized/compressed in the browser and are limited to 5 MB after compression.

## Admin access and plans

Admin authorization uses a trusted Supabase `app_metadata.role` claim (not user-editable metadata). After creating the account that should administer the project, set its claim in the Supabase SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'your-admin-email@example.com';
```

Sign out and back in so the updated claim is present in the session. `/admin` then lists profiles and card orders, creates orders (PVC, metal, or wood), updates order status, and exports CSV. Premium plan assignment is restricted to admins at the database layer; set `profiles.plan` to `premium` from a trusted admin environment/SQL Editor. The database prevents profile owners from changing their own plan.

## Demo profiles

Set `DEMO_PASSWORD` in `.env.local`, then run:

```sh
npm run seed
```

The script creates or updates two published example profiles: `/demo-classic` and `/demo-premium`. Both demo accounts use the configured `DEMO_PASSWORD`.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```

## Deploy to Vercel

1. Push the project to a Git provider and import it into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` to Vercel's environment variables for the target environments. `NEXT_PUBLIC_SITE_URL` should be the production site origin.
3. Do not configure `SUPABASE_SERVICE_ROLE_KEY` on the deployed frontend; it is only required by the local seed script.
4. In Supabase Authentication, set the production Site URL and allow `https://your-domain/auth/callback`. Configure Google OAuth's callback URL using the Supabase URL shown in Authentication → Providers.
5. Deploy. Supabase remains responsible for authentication, Postgres, and public profile media; Vercel runs the Next.js application.

## Product behavior

- Public profile reads are limited to published profiles. Gallery reads are also limited to published Premium profiles.
- Event rows record only the profile owner, event type, coarse device type, optional button kind, and timestamp. They do not store IP addresses or raw user-agent values.
- Free profiles show the Lamsaty badge. Premium profiles have 30-day stats and can publish services and gallery images.
- Arabic switches the profile layout to RTL. Profiles set to “Browser default” choose Arabic, French, or English from the visitor's browser language.
- Username syntax, uniqueness, and reserved names are checked in the UI/server and enforced by a database constraint.
