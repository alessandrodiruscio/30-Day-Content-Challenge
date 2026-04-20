import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "../_lib/db";
import { verifyToken } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  await initDb();
  const db = getPool();

  if (req.method === "GET") {
    try {
      const [rows]: any = await db.execute(
        'SELECT * FROM strategies WHERE id = ? AND user_id = ?',
        [id, user.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      const s = rows[0];
      res.json({
        id: s.id,
        title: s.title,
        data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
        start_date: s.start_date,
        completed_days: typeof s.completed_days === 'string' ? JSON.parse(s.completed_days) : (s.completed_days || []),
        day_checklist: typeof s.day_checklist === 'string' ? JSON.parse(s.day_checklist) : (s.day_checklist || {}),
        day_notes: (() => { try { return s.day_notes ? (typeof s.day_notes === 'string' ? JSON.parse(s.day_notes) : s.day_notes) : {}; } catch { return {}; } })(),
        created_at: s.created_at
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === "PATCH") {
    try {
      const { title, data, start_date } = req.body;
      await db.query(
        'UPDATE strategies SET title = ?, data = ?, start_date = ? WHERE id = ? AND user_id = ?',
        [title, JSON.stringify(data), start_date || null, id, user.id]
      );
      res.json({ id, title, data, start_date });
    } catch (error: any) {
      console.error("Strategy Update Error:", error);
      res.status(500).json({ error: "Failed to update strategy: " + error.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await db.execute('DELETE FROM strategies WHERE id = ? AND user_id = ?', [id, user.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
