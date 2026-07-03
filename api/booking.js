import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slot_id, name, activity } = req.body;
  if (!slot_id || !name?.trim() || !activity?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = getSupabase();

  const { data: slot, error: fetchError } = await supabase
    .from("available_slots")
    .select("id, is_booked")
    .eq("id", slot_id)
    .single();

  if (fetchError || !slot) {
    return res.status(404).json({ error: "Slot not found" });
  }

  if (slot.is_booked) {
    return res.status(409).json({ error: "Slot already booked" });
  }

  const { error: bookError } = await supabase
    .from("available_slots")
    .update({ is_booked: true })
    .eq("id", slot_id)
    .eq("is_booked", false);

  if (bookError) {
    return res.status(500).json({ error: "Failed to book slot" });
  }

  const { error: rsvpError } = await supabase
    .from("rsvps")
    .insert({ slot_id, name: name.trim(), activity: activity.trim() });

  if (rsvpError) {
    await supabase
      .from("available_slots")
      .update({ is_booked: false })
      .eq("id", slot_id);
    return res.status(500).json({ error: "Failed to create RSVP" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({ success: true });
}
