import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

app.get("/api/available-slots", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("available_slots")
    .select("id, date, time_start, time_end")
    .eq("is_booked", false)
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
  const { slot_id, name, activity } = req.body;
  if (!slot_id || !name?.trim() || !activity?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

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
    .select(`
      id, date, time_start, time_end, is_booked, created_at,
      rsvps ( name, activity )
    `)
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
    .select(`
      id, slot_id, name, activity, created_at,
      available_slots ( date, time_start, time_end )
    `)
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
