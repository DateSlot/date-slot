import express from "express";
import { DatabaseSync } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

const dbDir = resolve(__dirname, "..", "data");
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(resolve(dbDir, "rsvp.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    activity TEXT NOT NULL,
    date TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

app.post("/api/rsvp", (req, res) => {
  const { name, activity, date, time_start, time_end } = req.body;
  if (!name || !activity || !date || !time_start || !time_end) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const stmt = db.prepare(
    "INSERT INTO rsvp (name, activity, date, time_start, time_end) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(name, activity, date, time_start, time_end);
  res.json({ success: true });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve(__dirname, "..", "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(resolve(__dirname, "..", "dist", "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`date-me server running on port ${PORT}`);
});
