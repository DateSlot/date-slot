export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;
  const valid = password === process.env.ADMIN_SECRET;

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(valid ? 200 : 401).json({ success: valid });
}
