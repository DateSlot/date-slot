import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";
import { sendEmail, bookingDenialEmail } from "./_email.js";
import { rateLimit } from "./_rate-limit.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const limit = rateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later.", ...limit });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const password = authHeader.slice(7);

  const { rsvp_id, reason } = req.body;
  if (!rsvp_id) {
    return res.status(400).json({ error: "Missing rsvp_id" });
  }

  const supabase = getSupabase();

  const { data: rsvp, error: rsvpFetchError } = await supabase
    .from("rsvps")
    .select("id, name, booker_email, status, profile_id")
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
    .update({ status: "denied", deny_reason: reason?.trim() || null })
    .eq("id", rsvp_id);

  if (rsvpUpdateError) {
    return res.status(500).json({ error: "Failed to deny booking" });
  }

  if (rsvp.booker_email) {
    const notif = denialEmail({
      bookerName: rsvp.name,
      creatorName: profile.display_name,
      reason: reason?.trim(),
    });
    await sendEmail({ to: rsvp.booker_email, ...notif });
  }

  return res.status(200).json({ success: true });
}
