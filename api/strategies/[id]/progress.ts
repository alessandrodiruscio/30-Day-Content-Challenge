import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "../../_lib/db";
import { verifyToken } from "../../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  try {
    await initDb();
    const { completed_days, day_checklist } = req.body;
    const db = getPool();
    await db.execute(
      'UPDATE strategies SET completed_days = ?, day_checklist = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(completed_days), JSON.stringify(day_checklist), id, user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
