import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const password = authHeader.slice(7);
  const { username, likes } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  const supabase = getSupabase();

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

  return res.status(200).json({ success: true });
}
