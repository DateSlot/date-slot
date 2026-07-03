import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";

function unauthorized(res) {
  return res.status(401).json({ error: "Unauthorized" });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized(res);
  }

  const password = authHeader.slice(7);
  const username = req.query?.username;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const supabase = getSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return unauthorized(res);

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) return unauthorized(res);

  const profileId = profile.id;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("available_slots")
      .select(`
        id, date, time_start, time_end, is_booked, created_at,
        rsvps ( id, name, created_at )
      `)
      .eq("profile_id", profileId)
      .order("date", { ascending: false })
      .order("time_start");

    if (error) return res.status(500).json({ error: error.message });

    const slots = data.map((s) => ({
      id: s.id,
      date: s.date,
      time_start: s.time_start,
      time_end: s.time_end,
      is_booked: s.is_booked,
      booker_name: s.rsvps?.[0]?.name ?? null,
      created_at: s.created_at,
    }));

    return res.status(200).json(slots);
  }

  if (req.method === "POST") {
    const { date, time_start, time_end } = req.body;
    if (!date || !time_start || !time_end) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("available_slots")
      .insert({ profile_id: profileId, date, time_start, time_end })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json(data);
  }

  if (req.method === "DELETE") {
    const { slot_id } = req.body;
    if (!slot_id) {
      return res.status(400).json({ error: "Missing slot_id" });
    }

    const { data: slot } = await supabase
      .from("available_slots")
      .select("id, is_booked")
      .eq("id", slot_id)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!slot) return res.status(404).json({ error: "Slot not found" });

    if (slot.is_booked) {
      return res.status(400).json({ error: "Cannot delete a booked slot" });
    }

    const { error } = await supabase
      .from("available_slots")
      .delete()
      .eq("id", slot_id)
      .eq("profile_id", profileId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
