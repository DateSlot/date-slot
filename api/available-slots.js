import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("available_slots")
    .select("id, date, time_start, time_end")
    .eq("is_booked", false)
    .is("profile_id", null)
    .gte("date", today)
    .order("date")
    .order("time_start");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const grouped = {};
  for (const slot of data) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json(grouped);
}
