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
    const strategyId = req.query.strategyId;

    // Get all achievements
    const [allAchievements]: any = await db.execute('SELECT * FROM achievements');

    // Get unlocked achievements for this user
    let unlockedQuery = 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?';
    let queryParams: any[] = [user.id];

    if (strategyId) {
      unlockedQuery += ' AND (strategy_id = ? OR strategy_id IS NULL)';
      queryParams.push(strategyId);
    }

    const [unlockedRows]: any = await db.execute(unlockedQuery, queryParams);

    const unlockedMap = new Map();
    unlockedRows.forEach((r: any) => unlockedMap.set(r.achievement_id, r.unlocked_at));

    const achievements = allAchievements.map((a: any) => ({
      ...a,
      unlocked_at: unlockedMap.get(a.id) || null
    }));

    res.json({ achievements });
  } catch (error: any) {
    console.error("Fetch achievements error:", error);
    res.status(500).json({ error: error.message });
  }
}
