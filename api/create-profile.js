import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
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

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    email: data.email,
  });
}
