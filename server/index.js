import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendEmail, bookingNotificationEmail, confirmationEmail, denialEmail } from "../api/_email.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_SECRET}`;
}

function getProfileAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function authenticateProfile(username, password) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return null;

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) return null;

  return profile;
}

app.get("/api/available-slots", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("available_slots")
    .select("id, date, time_start, time_end")
    .eq("is_booked", false)
    .is("profile_id", null)
    .gte("date", today)
    .order("date")
    .order("time_start");

  if (error) return res.status(500).json({ error: error.message });

  const grouped = {};
  for (const slot of data) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  }

  res.json(grouped);
});

app.post("/api/booking", async (req, res) => {
  const { slot_id, name, email, activity } = req.body;
  if (!slot_id || !name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const { data: slot, error: fetchError } = await supabase
    .from("available_slots")
    .select("id, is_booked, profile_id, activity, date, time_start, time_end, profiles!inner ( username, display_name, email )")
    .eq("id", slot_id)
    .single();

  if (fetchError || !slot) {
    return res.status(404).json({ error: "Slot not found" });
  }

  if (slot.is_booked) {
    return res.status(409).json({ error: "Slot already booked" });
  }

  const { data: existingRsvp } = await supabase
    .from("rsvps")
    .select("id")
    .eq("slot_id", slot_id)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  if (existingRsvp) {
    return res.status(409).json({ error: "Slot already has a pending booking" });
  }

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
    return res.status(500).json({ error: "Failed to create booking request" });
  }

  const profile = slot.profiles;
  if (profile?.email) {
    const origin = req.headers.origin || `http://localhost:${PORT}`;
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
  }

  res.json({ success: true, status: "pending", activity: finalActivity });
});

app.post("/api/create-profile", async (req, res) => {
  const { username, display_name, password, email } = req.body;
  if (!username?.trim() || !display_name?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[a-z0-9-]+$/.test(username.trim())) {
    return res.status(400).json({ error: "Username can only contain lowercase letters, numbers, and hyphens" });
  }

  if (password.trim().length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const password_hash = createHash("sha256").update(password.trim()).digest("hex");

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      username: username.trim().toLowerCase(),
      display_name: display_name.trim(),
      password_hash,
      email: email?.trim() || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ id: data.id, username: data.username, display_name: data.display_name, email: data.email });
});

app.get("/api/public-profile", async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, likes")
    .eq("username", username)
    .maybeSingle();

  if (profileError) return res.status(500).json({ error: profileError.message });
  if (!profile) return res.status(404).json({ error: "Profile not found" });

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

  if (slotsError) return res.status(500).json({ error: slotsError.message });

  const available = slots.filter((s) => {
    const activeRsvps = (s.rsvps || []).filter(
      (r) => r.status === "pending" || r.status === "confirmed"
    );
    return activeRsvps.length === 0;
  });

  const grouped = {};
  for (const slot of available) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push({ id: slot.id, date: slot.date, time_start: slot.time_start, time_end: slot.time_end, activity: slot.activity });
  }

  res.json({
    profile: { username: profile.username, display_name: profile.display_name, likes: profile.likes },
    slots: grouped,
  });
});

app.post("/api/verify-profile", async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, password_hash")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const hash = createHash("sha256").update(password.trim()).digest("hex");
  if (hash !== profile.password_hash) {
    return res.status(401).json({ error: "Wrong password" });
  }

  res.json({
    success: true,
    profile: { id: profile.id, username: profile.username, display_name: profile.display_name, email: profile.email },
  });
});

app.get("/api/manage-slots", async (req, res) => {
  const password = getProfileAuth(req);
  const username = req.query.username;
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  const profile = await authenticateProfile(username, password);
  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("available_slots")
    .select(`
      id, date, time_start, time_end, activity, is_booked, created_at,
      rsvps ( id, name, booker_email, activity, status, deny_reason, created_at )
    `)
    .eq("profile_id", profile.id)
    .order("date", { ascending: false })
    .order("time_start");

  if (error) return res.status(500).json({ error: error.message });

  const slots = data.map((s) => ({
    id: s.id,
    date: s.date,
    time_start: s.time_start,
    time_end: s.time_end,
    activity: s.activity,
    is_booked: s.is_booked,
    booking: s.rsvps?.[0]
      ? {
          id: s.rsvps[0].id,
          name: s.rsvps[0].name,
          email: s.rsvps[0].booker_email,
          activity: s.rsvps[0].activity,
          status: s.rsvps[0].status,
          deny_reason: s.rsvps[0].deny_reason,
          created_at: s.rsvps[0].created_at,
        }
      : null,
    created_at: s.created_at,
  }));

  const { data: profileData } = await supabase
    .from("profiles")
    .select("likes, email")
    .eq("id", profile.id)
    .single();

  res.json({ slots, likes: profileData?.likes, email: profileData?.email });
});

app.post("/api/manage-slots", async (req, res) => {
  const password = getProfileAuth(req);
  const username = req.query.username;
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  const profile = await authenticateProfile(username, password);
  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const { date, time_start, time_end, activity } = req.body;
  if (!date || !time_start || !time_end) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("available_slots")
    .insert({ profile_id: profile.id, date, time_start, time_end, activity: activity?.trim() || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete("/api/manage-slots", async (req, res) => {
  const password = getProfileAuth(req);
  const username = req.query.username;
  if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

  const profile = await authenticateProfile(username, password);
  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const { slot_id } = req.body;
  if (!slot_id) return res.status(400).json({ error: "Missing slot_id" });

  const { data: slot } = await supabase
    .from("available_slots")
    .select("id, is_booked")
    .eq("id", slot_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!slot) return res.status(404).json({ error: "Slot not found" });
  if (slot.is_booked) return res.status(400).json({ error: "Cannot delete a booked slot" });

  const { error } = await supabase
    .from("available_slots")
    .delete()
    .eq("id", slot_id)
    .eq("profile_id", profile.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/confirm-booking", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const password = authHeader.slice(7);

  const { rsvp_id } = req.body;
  if (!rsvp_id) return res.status(400).json({ error: "Missing rsvp_id" });

  const { data: rsvp, error: rsvpFetchError } = await supabase
    .from("rsvps")
    .select("id, slot_id, name, booker_email, activity, status, profile_id, available_slots!inner ( date, time_start, time_end, profile_id )")
    .eq("id", rsvp_id)
    .single();

  if (rsvpFetchError || !rsvp) return res.status(404).json({ error: "Booking not found" });
  if (rsvp.status !== "pending") return res.status(400).json({ error: "Booking is not pending" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash, display_name")
    .eq("id", rsvp.profile_id)
    .single();

  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) return res.status(401).json({ error: "Unauthorized" });

  const { error: rsvpUpdateError } = await supabase
    .from("rsvps")
    .update({ status: "confirmed" })
    .eq("id", rsvp_id);

  if (rsvpUpdateError) return res.status(500).json({ error: "Failed to confirm booking" });

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

  res.json({ success: true });
});

app.post("/api/deny-booking", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const password = authHeader.slice(7);

  const { rsvp_id, reason } = req.body;
  if (!rsvp_id) return res.status(400).json({ error: "Missing rsvp_id" });

  const { data: rsvp, error: rsvpFetchError } = await supabase
    .from("rsvps")
    .select("id, name, booker_email, status, profile_id")
    .eq("id", rsvp_id)
    .single();

  if (rsvpFetchError || !rsvp) return res.status(404).json({ error: "Booking not found" });
  if (rsvp.status !== "pending") return res.status(400).json({ error: "Booking is not pending" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash, display_name")
    .eq("id", rsvp.profile_id)
    .single();

  if (!profile) return res.status(401).json({ error: "Unauthorized" });

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) return res.status(401).json({ error: "Unauthorized" });

  const { error: rsvpUpdateError } = await supabase
    .from("rsvps")
    .update({ status: "denied", deny_reason: reason?.trim() || null })
    .eq("id", rsvp_id);

  if (rsvpUpdateError) return res.status(500).json({ error: "Failed to deny booking" });

  if (rsvp.booker_email) {
    const notif = denialEmail({
      bookerName: rsvp.name,
      creatorName: profile.display_name,
      reason: reason?.trim(),
    });
    await sendEmail({ to: rsvp.booker_email, ...notif });
  }

  res.json({ success: true });
});

app.post("/api/update-likes", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const password = authHeader.slice(7);
  const { username, likes } = req.body;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== profile.password_hash) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await supabase
    .from("profiles")
    .update({ likes: likes?.trim() || null })
    .eq("id", profile.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  res.json({ success: password === process.env.ADMIN_SECRET });
});

app.get("/api/admin/slots", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("available_slots")
    .select(`id, date, time_start, time_end, is_booked, created_at, rsvps ( name, activity )`)
    .is("profile_id", null)
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
    booker_activity: s.rsvps?.[0]?.activity ?? null,
    created_at: s.created_at,
  }));

  res.json(slots);
});

app.post("/api/admin/slots", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { date, time_start, time_end } = req.body;
  if (!date || !time_start || !time_end) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("available_slots")
    .insert({ date, time_start, time_end })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get("/api/admin/bookings", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("rsvps")
    .select(`id, slot_id, name, activity, created_at, available_slots ( date, time_start, time_end )`)
    .is("profile_id", null)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

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

  res.json(bookings);
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve(__dirname, "..", "dist")));
  app.use((_req, res) => {
    res.sendFile(resolve(__dirname, "..", "dist", "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`date-me server running on port ${PORT}`);
});
