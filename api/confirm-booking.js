import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";
import { sendEmail, bookingConfirmationEmail } from "./_email.js";
import { rateLimit } from "./_rate-limit.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const limit = rateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later.", ...limit });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const password = authHeader.slice(7);

  const { rsvp_id } = req.body;
  if (!rsvp_id) {
    return res.status(400).json({ error: "Missing rsvp_id" });
  }

  const supabase = getSupabase();

  const { data: rsvp, error: rsvpFetchError } = await supabase
    .from("rsvps")
    .select("id, slot_id, name, booker_email, activity, status, profile_id, available_slots!inner ( date, time_start, time_end, profile_id )")
    .eq("id", rsvp_id)
    .single();

  if (rsvpFetchError || !rsvp) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (rsvp.status !== "pending") {
    return res.status(400).json({ error: "Booking is not pending" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash, display_name")
    .eq("id", rsvp.profile_id)
    .single();

  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { error: rsvpUpdateError } = await supabase
    .from("rsvps")
    .update({ status: "confirmed" })
    .eq("id", rsvp_id);

  if (rsvpUpdateError) {
    return res.status(500).json({ error: "Failed to confirm booking" });
  }

  const { error: slotUpdateError } = await supabase
    .from("available_slots")
    .update({ is_booked: true })
    .eq("id", rsvp.slot_id);

  if (slotUpdateError) {
    await supabase.from("rsvps").update({ status: "pending" }).eq("id", rsvp_id);
    return res.status(500).json({ error: "Failed to update slot" });
  }

  if (rsvp.booker_email) {
    const slot = rsvp.available_slots;
    const notif = confirmationEmail({
      bookerName: rsvp.name,
      creatorName: profile.display_name,
      date: slot.date,
      timeStart: slot.time_start?.slice(0, 5),
      timeEnd: slot.time_end?.slice(0, 5),
      activity: rsvp.activity,
    });
    await sendEmail({ to: rsvp.booker_email, ...notif });
  }

  return res.status(200).json({ success: true });
}
