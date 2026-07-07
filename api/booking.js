import { getSupabase } from "./_supabase.js";
import { sendEmail, bookingNotificationEmail } from "./_email.js";
import { rateLimit } from "./_rate-limit.js";
import { verifyTurnstile } from "./_verify-turnstile.js";

export default async function handler(req, res) {
  const log = (msg, data) => console.log(`[booking] ${msg}`, data ?? "");

  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const limit = rateLimit(req);
    if (!limit.allowed) return res.status(429).json({ error: "Too many requests", ...limit });

    const body = req.body || {};
    const { turnstile_token, slot_id, name, email, activity } = body;

    log("request", { slot_id, name, email, has_turnstile: !!turnstile_token });

    if (turnstile_token) {
      try {
        const verification = await verifyTurnstile(turnstile_token);
        if (!verification.success) return res.status(400).json({ error: "Verification failed" });
      } catch (e) {
        log("turnstile error", e?.message ?? e);
        return res.status(400).json({ error: "Verification failed" });
      }
    }

    if (!slot_id || !name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const supabase = getSupabase();
    log("fetching slot", slot_id);

    const { data: slot, error: fetchError } = await supabase
      .from("available_slots")
      .select("id, is_booked, profile_id, activity, date, time_start, time_end, profiles!inner ( username, display_name, email )")
      .eq("id", slot_id)
      .single();

    if (fetchError || !slot) {
      log("slot not found", fetchError?.message ?? fetchError);
      return res.status(404).json({ error: "Slot not found" });
    }
    log("slot found", { profile_email: !!slot.profiles?.email });

    if (slot.is_booked) return res.status(409).json({ error: "Slot already booked" });

    const { data: existingRsvp } = await supabase
      .from("rsvps")
      .select("id")
      .eq("slot_id", slot_id)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();

    if (existingRsvp) return res.status(409).json({ error: "Slot already has a pending booking" });

    const finalActivity = slot.activity || activity?.trim() || null;

    const { error: rsvpError } = await supabase
      .from("rsvps")
      .insert({
        slot_id,
        profile_id: slot.profile_id,
        name: name.trim(),
        booker_email: email.trim(),
        activity: finalActivity,
        status: "pending",
      });

    if (rsvpError) {
      log("rsvp insert error", rsvpError.message);
      return res.status(500).json({ error: "Failed to create booking request" });
    }
    log("rsvp created");

    const profile = slot.profiles;
    if (profile?.email) {
      const origin = req.headers.origin || `https://${req.headers.host || "date-slot.vercel.app"}`;
      const editUrl = `${origin}/u/${profile.username}/edit`;
      const notif = bookingNotificationEmail({
        bookerName: name.trim(),
        creatorName: profile.display_name,
        date: slot.date,
        timeStart: slot.time_start?.slice(0, 5),
        timeEnd: slot.time_end?.slice(0, 5),
        activity: finalActivity,
        bookerEmail: email.trim(),
        editUrl,
      });
      await sendEmail({ to: profile.email, ...notif });
      log("email sent to", profile.email);
    } else {
      log("no profile email to notify");
    }

    return res.status(200).json({ success: true, status: "pending", activity: finalActivity });
  } catch (err) {
    console.error("[booking] UNCAUGHT ERROR:", err?.message ?? err, err?.stack ?? "");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal error", detail: err?.message || "unknown" });
    }
  }
}
