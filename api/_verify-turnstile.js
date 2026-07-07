export async function verifyTurnstile(token) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return { success: true };
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
  });

  return res.json();
}
