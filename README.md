# parampara

## Environment

Create a `.env` file with:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database

See `supabase/parampara_schema.sql` for the MVP schema + RLS policies.
These policies are intentionally permissive for demo use and must be hardened
with Supabase Auth (or secure session tokens via edge functions) before production.

## Games

The game previously in `game/game-main` has been migrated into the main app.
Use `npm run dev` at the repo root; do not run `npm --prefix game/game-main`.
