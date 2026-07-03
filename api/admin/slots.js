import { getSupabase } from "../_supabase.js";

function isAuthorized(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabase();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("available_slots")
      .select(`
        id, date, time_start, time_end, is_booked, created_at,
        rsvps ( name, activity )
      `)
      .order("date", { ascending: false })
      .order("time_start");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const slots = data.map((s) => ({
      id: s.id,
      date: s.date,
      time_start: s.time_start,
      time_end: s.time_end,
      is_booked: s.is_booked,
      booker_name: s.rsvps?.[0]?.name ?? null,
      booker_activity: s.rsvps?.[0]?.activity ?? null,
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
      .insert({ date, time_start, time_end })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
