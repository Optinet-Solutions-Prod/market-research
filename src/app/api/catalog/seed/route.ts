import { seedSupabase, supabaseConfigured } from "@/lib/db/supabase";

/** Load the starter catalog into Supabase (idempotent). */
export async function POST() {
  if (!supabaseConfigured()) return Response.json({ error: "Supabase not configured" }, { status: 400 });
  try {
    return Response.json(await seedSupabase());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
