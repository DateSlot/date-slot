import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const username = req.query?.username;
  if (!username) {
    return res.status(400).json({ error: "Missing username query param" });
  }

  const supabase = getSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, likes")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: slots, error: slotsError } = await supabase
    .from("available_slots")
    .select(`
      id, date, time_start, time_end, activity,
      rsvps!left ( id, status )
    `)
    .eq("profile_id", profile.id)
    .eq("is_booked", false)
    .gte("date", today)
    .order("date")
    .order("time_start");

  if (slotsError) {
    return res.status(500).json({ error: slotsError.message });
  }

  const available = slots.filter((s) => {
    const activeRsvps = (s.rsvps || []).filter(
      (r) => r.status === "pending" || r.status === "confirmed"
    );
    return activeRsvps.length === 0;
  });

  const grouped = {};
  for (const slot of available) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push({
      id: slot.id,
      date: slot.date,
      time_start: slot.time_start,
      time_end: slot.time_end,
      activity: slot.activity,
    });
  }

  return res.status(200).json({
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      likes: profile.likes,
    },
    slots: grouped,
  });
}
