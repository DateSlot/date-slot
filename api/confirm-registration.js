import { getSupabase } from "./_supabase.js";
import { sendEmail, registrationWelcomeEmail } from "./_email.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.query.token;
  if (!token) {
    return redirect(res, "?error=missing_token");
  }

  const supabase = getSupabase();

  const { data: pending, error: fetchError } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !pending) {
    return redirect(res, "?error=invalid_link");
  }

  if (new Date(pending.expires_at) < new Date()) {
    await supabase.from("pending_registrations").delete().eq("id", pending.id);
    return redirect(res, "?error=expired");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", pending.username)
    .maybeSingle();

  if (existingProfile) {
    await supabase.from("pending_registrations").delete().eq("id", pending.id);
    return redirect(res, "?error=already_registered");
  }

  const { data: profile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      username: pending.username,
      display_name: pending.display_name,
      password_hash: pending.password_hash,
      email: pending.email,
    })
    .select()
    .single();

  if (insertError) {
    return redirect(res, "?error=server_error");
  }

  await supabase.from("pending_registrations").delete().eq("id", pending.id);

  const origin = `https://${req.headers.host || "date-slot.vercel.app"}`;
  const manageUrl = `${origin}/u/${profile.username}/edit`;

  const welcome = registrationWelcomeEmail({
    username: profile.username,
    displayName: profile.display_name,
    manageUrl,
  });
  await sendEmail({ to: profile.email, ...welcome });

  return redirect(res, `/u/${profile.username}/edit?registered=1`);
}

function redirect(res, path) {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:5173";
  res.writeHead(302, { Location: `${base}${path}` });
  res.end();
}
