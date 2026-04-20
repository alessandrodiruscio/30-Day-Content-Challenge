import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "./_lib/db";
import { verifyToken } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await initDb();
    const db = getPool();
    const [rows]: any = await db.execute(
      'SELECT id, email, niche, products, problems, audience, tone, contentType, primaryCTA FROM users WHERE id = ?',
      [user.id]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    console.error("Me Error:", error);
    res.status(500).json({ error: "Fetch failed" });
  }
}
