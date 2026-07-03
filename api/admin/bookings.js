import { getSupabase } from "../_supabase.js";

function isAuthorized(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("rsvps")
    .select(`
      id, slot_id, name, activity, created_at,
      available_slots ( date, time_start, time_end )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const bookings = data.map((b) => ({
    id: b.id,
    slot_id: b.slot_id,
    name: b.name,
    activity: b.activity,
    date: b.available_slots?.date,
    time_start: b.available_slots?.time_start,
    time_end: b.available_slots?.time_end,
    created_at: b.created_at,
  }));

  return res.status(200).json(bookings);
}
