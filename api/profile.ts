import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, initDb } from "./_lib/db";
import { verifyToken } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await initDb();
    const { niche, products, problems, audience, tone, contentType, primaryCTA } = req.body;
    const db = getPool();

    await db.execute(
      'UPDATE users SET niche=?, products=?, problems=?, audience=?, tone=?, contentType=?, primaryCTA=? WHERE id=?',
      [niche || null, products || null, problems || null, audience || null, tone || null, contentType || null, primaryCTA || null, user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ error: error.message });
  }
}
