# Museum Login App

Minimal Node.js app that only demonstrates login, logout, session handling, and role display using the existing `users` table.

## Setup

1. Run these SQL files:
   - `001_create_database.sql`
   - `002_add_users_table.sql`
   - `003_extend_users_for_auth.sql`
   - optional: `004_seed_auth_users.sql`
2. Copy `.env.example` to `.env` and fill in your MySQL connection values.
   - Set `DB_SSL=false` for local MySQL.
   - Set `DB_SSL=true` only when your database requires SSL.
3. In `webapp`, run `npm install`.
4. Start the app with `npm start`.
5. Open `http://localhost:3000`.

## Test Login Accounts

If you run `004_seed_auth_users.sql`, use:

- `member@example.com` / `member123`
- `employee@example.com` / `employee123`
- `supervisor@example.com` / `supervisor123`

If you do not run `004_seed_auth_users.sql`, the `users` table will be empty and login attempts should fail with `Invalid login credentials.`

## What You Should See

- `/` shows a simple landing page with a login button
- `/login` shows the login form
- successful login redirects to `/dashboard`
- `/dashboard` shows the logged-in user's name, email, role, and linked ids
- logout returns you to `/`
