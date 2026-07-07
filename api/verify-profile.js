import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const supabase = getSupabase();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, password_hash")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const hash = createHash("sha256").update(password.trim()).digest("hex");

  if (hash !== profile.password_hash) {
    return res.status(401).json({ error: "Wrong password" });
  }

  return res.status(200).json({
    success: true,
    profile: { id: profile.id, username: profile.username, display_name: profile.display_name, email: profile.email },
  });
}
