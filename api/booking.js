import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slot_id, name, activity } = req.body;
  if (!slot_id || !name?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = getSupabase();

  const { data: slot, error: fetchError } = await supabase
    .from("available_slots")
    .select("id, is_booked, profile_id")
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

  const rsvpData = {
    slot_id,
    profile_id: slot.profile_id,
    name: name.trim(),
    activity: activity?.trim() || null,
  };

  const { error: rsvpError } = await supabase
    .from("rsvps")
    .insert(rsvpData);

  if (rsvpError) {
    await supabase
      .from("available_slots")
      .update({ is_booked: false })
      .eq("id", slot_id);
    return res.status(500).json({ error: "Failed to create RSVP" });
  }

  return res.status(200).json({ success: true });
}
