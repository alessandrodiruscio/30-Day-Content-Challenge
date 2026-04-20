import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "../_lib/db";
import { verifyToken } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await initDb();
  const db = getPool();

  if (req.method === "GET") {
    try {
      const [rows]: any = await db.execute(
        'SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      );
      res.json(rows.map((s: any) => {
        try {
          return {
            id: s.id,
            title: s.title,
            data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
            start_date: s.start_date,
            completed_days: typeof s.completed_days === 'string' ? JSON.parse(s.completed_days) : (s.completed_days || []),
            day_checklist: typeof s.day_checklist === 'string' ? JSON.parse(s.day_checklist) : (s.day_checklist || {}),
            day_notes: (() => { try { return s.day_notes ? (typeof s.day_notes === 'string' ? JSON.parse(s.day_notes) : s.day_notes) : {}; } catch { return {}; } })(),
            created_at: s.created_at
          };
        } catch (e) {
          console.error("Error parsing strategy row:", s.id, e);
          return null;
        }
      }).filter(Boolean));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === "POST") {
    try {
      const { title, data, start_date } = req.body;
      if (!title || !data) {
        return res.status(400).json({ error: "Missing title or strategy data" });
      }

      const [result]: any = await db.query(
        'INSERT INTO strategies (user_id, title, data, start_date) VALUES (?, ?, ?, ?)',
        [user.id, title, JSON.stringify(data), start_date || null]
      );
      res.json({ id: result.insertId, title, data, start_date });
    } catch (error: any) {
      console.error("Strategy Create Error:", error);
      res.status(500).json({ error: "Failed to save strategy: " + error.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
