import { createHash } from "node:crypto";
import { getSupabase } from "./_supabase.js";
import { rateLimit } from "./_rate-limit.js";
import { sendEmail, registrationConfirmationEmail } from "./_email.js";
import { verifyTurnstile } from "./_verify-turnstile.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const limit = rateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later.", ...limit });
  }

  const { turnstile_token } = req.body;
  if (turnstile_token) {
    const verification = await verifyTurnstile(turnstile_token);
    if (!verification.success) {
      return res.status(400).json({ error: "Verification failed" });
    }
  }

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

  if (data.email) {
    const origin = req.headers.origin || `https://${req.headers.host || "date-slot.vercel.app"}`;
    const manageUrl = `${origin}/u/${data.username}/edit`;
    const welcome = registrationConfirmationEmail({
      username: data.username,
      displayName: data.display_name,
      email: data.email,
      manageUrl,
    });
    await sendEmail({ to: data.email, ...welcome });
  }

  return res.status(201).json({
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    email: data.email,
  });
}
