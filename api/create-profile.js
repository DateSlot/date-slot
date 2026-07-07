import { createHash, randomBytes } from "node:crypto";
import { getSupabase } from "./_supabase.js";
import { rateLimit } from "./_rate-limit.js";
import { sendEmail, registrationConfirmationEmail } from "./_email.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const limit = rateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later.", ...limit });
  }

  const { username, display_name, password, email, turnstile_token } = req.body;

  if (turnstile_token) {
    const { verifyTurnstile } = await import("./_verify-turnstile.js");
    try {
      const verification = await verifyTurnstile(turnstile_token);
      if (!verification.success) {
        return res.status(400).json({ error: "Verification failed" });
      }
    } catch {
      return res.status(400).json({ error: "Verification failed" });
    }
  }

  if (!username?.trim() || !display_name?.trim() || !password?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!/^[a-z0-9-]+$/.test(username.trim())) {
    return res.status(400).json({ error: "Username can only contain lowercase letters, numbers, and hyphens" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (password.trim().length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const supabase = getSupabase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
    .maybeSingle();

  if (existingProfile) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const { data: existingPending } = await supabase
    .from("pending_registrations")
    .select("id")
    .eq("username", username.trim())
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingPending) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const password_hash = createHash("sha256").update(password.trim()).digest("hex");
  const token = randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from("pending_registrations")
    .insert({
      username: username.trim().toLowerCase(),
      display_name: display_name.trim(),
      email: email.trim(),
      password_hash,
      token,
      expires_at: expiresAt,
    });

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  const origin = req.headers.origin || `https://${req.headers.host || "date-slot.vercel.app"}`;
  const confirmUrl = `${origin}/api/confirm-registration?token=${token}`;

  const welcome = registrationConfirmationEmail({
    displayName: display_name.trim(),
    confirmUrl,
  });
  await sendEmail({ to: email.trim(), ...welcome });

  return res.status(200).json({ success: true, message: "Confirmation email sent. Check your inbox (and spam folder!)" });
}
